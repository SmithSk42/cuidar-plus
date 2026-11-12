'use strict';

const jwt = require('jsonwebtoken');

/**
 * As permissoes sao consultadas no MySQL em toda rota sensivel.
 * Os vinculos no JWT servem somente para identificar o contexto inicial de acesso.
 */
async function buscarVinculosAtivos(conexao, usuarioId) {
  const [vinculos] = await conexao.execute(`
    SELECT v.paciente_id, p.nome AS paciente, v.papel,
           v.pode_registrar, v.pode_ver_medicamentos, v.pode_ver_evolucao
      FROM vinculos_cuidado v
      JOIN pacientes p ON p.id = v.paciente_id AND p.status = 'Ativo'
     WHERE v.usuario_id = ? AND v.status = 'Ativo'
     ORDER BY p.nome, v.paciente_id
  `, [usuarioId]);
  return vinculos;
}

function prepararSessaoDomiciliar(usuario, vinculos) {
  const principal = vinculos[0] || null;
  const dadosUsuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: 'domiciliar'
  };
  const token = jwt.sign({
    id: usuario.id,
    email: usuario.email,
    perfil: 'domiciliar',
    papel: principal?.papel || null,
    paciente_id: principal?.paciente_id || null
  }, process.env.SEGREDO_JWT, { algorithm: 'HS256', expiresIn: '12h' });
  return { token, usuario: dadosUsuario, vinculos };
}

module.exports = { buscarVinculosAtivos, prepararSessaoDomiciliar };
