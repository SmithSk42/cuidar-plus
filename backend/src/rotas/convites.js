const express = require('express');
const { randomBytes, createHash } = require('node:crypto');

const banco = require('../banco/conexao');
const {
  exigirAutenticacao,
} = require('../intermediarios/autenticacao');

const {
  idPositivo,
  texto,
  emailValido,
  requisicaoInvalida,
} = require('../utilitarios/validacao');

const rotasConvites = express.Router();

function hashToken(codigo) {
  return createHash('sha256')
    .update(codigo)
    .digest('hex');
}

// Somente fisioterapeutas autenticados podem gerar convites.
// A autenticação se aplica apenas a esta rota.
rotasConvites.post(
  '/pacientes/:pacienteId/convites',
  exigirAutenticacao,
  async (requisicao, resposta, proximo) => {
    const pacienteId = idPositivo(requisicao.params.pacienteId);

    const nome = texto(requisicao.body?.nome, 100);
    const email = emailValido(requisicao.body?.email);
    const papel = requisicao.body?.papel;

    const autorizadoPor = texto(
      requisicao.body?.autorizado_por,
      100
    );

    if (
      !pacienteId ||
      !nome ||
      !email ||
      !['Paciente', 'Cuidador'].includes(papel) ||
      !autorizadoPor ||
      requisicao.body?.confirmou_autorizacao !== true
    ) {
      return requisicaoInvalida(
        resposta,
        'Preencha os dados do convidado e confirme a autorização de acesso.'
      );
    }

    try {
      // O profissional só pode convidar pessoas para
      // pacientes ativos vinculados à sua conta.
      const [pacientes] = await banco.execute(
        `SELECT id
         FROM pacientes
         WHERE id = ?
           AND fisioterapeuta_id = ?
           AND status = 'Ativo'`,
        [pacienteId, requisicao.usuario.id]
      );

      if (pacientes.length === 0) {
        return resposta.status(404).json({
          erro: 'Paciente ativo não encontrado.',
        });
      }

      // Código individual e criptograficamente aleatório.
      const codigo = randomBytes(32).toString('hex');

      await banco.execute(
        `INSERT INTO convites_cuidado (
          paciente_id,
          fisioterapeuta_id,
          nome_convidado,
          email,
          papel,
          token_hash,
          autorizado_por,
          expira_em
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
        [
          pacienteId,
          requisicao.usuario.id,
          nome,
          email,
          papel,
          hashToken(codigo),
          autorizadoPor,
        ]
      );

      const origem = (
        process.env.ORIGEM_FRONTEND ||
        'http://localhost:5173'
      )
        .split(',')[0]
        .trim()
        .replace(/\/$/, '');

      return resposta.status(201).json({
        link: `${origem}/cuidado?convite=${codigo}`,
        expira_em_horas: 48,
        mensagem:
          'Convite criado. Compartilhe somente com a pessoa autorizada.',
      });
    } catch (erro) {
      return proximo(erro);
    }
  }
);

module.exports = {
  rotasConvites,
  hashToken,
};
