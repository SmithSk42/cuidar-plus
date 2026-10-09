const express = require('express');
const { autenticar } = require('../middleware/authenticate');
// Importa o SEU motor
const checkinsService = require('../services/checkins'); 

const router = express.Router();

router.post('/', autenticar, async (req, res) => {
  if (req.usuario.perfil !== 'paciente') {
    return res.status(403).json({ erro: 'Somente pacientes podem registrar o próprio check-in.' });
  }

  const body = req.body || {};
  const { status_atividades: statusAtividades, nivel_dor: nivelDor } = body;
  const observacoes = body.observacoes === undefined ? null : body.observacoes;

  if (typeof statusAtividades !== 'boolean') {
    return res.status(400).json({ erro: 'Informe se realizou as atividades.' });
  }
  if (!Number.isInteger(nivelDor) || nivelDor < 0 || nivelDor > 10) {
    return res.status(400).json({ erro: 'O nível de dor deve ser um número inteiro entre 0 e 10.' });
  }
  if (observacoes !== null && (typeof observacoes !== 'string' || observacoes.length > 2000)) {
    return res.status(400).json({ erro: 'As observações devem ter até 2000 caracteres.' });
  }

  try {
    // Aciona o seu motor passando os dados limpos
    const novoCheckin = await checkinsService.registrarCheckin(req.usuario.id, {
        statusAtividades,
        nivelDor,
        observacoes
    });
    
    return res.status(201).json({ mensagem: 'Check-in registrado.', checkin: novoCheckin });
  } catch (error) {
    console.error('Erro ao salvar check-in:', error);
    return res.status(500).json({ erro: 'Não foi possível salvar o check-in.' });
  }
});

router.get('/meus', autenticar, async (req, res) => {
  if (req.usuario.perfil !== 'paciente') {
    return res.status(403).json({ erro: 'Este recurso é exclusivo para pacientes.' });
  }

  try {
    // Aciona o seu motor para listar
    const checkins = await checkinsService.listarMeusCheckins(req.usuario.id);
    return res.json({ checkins });
  } catch (error) {
    console.error('Erro ao consultar check-ins:', error);
    return res.status(500).json({ erro: 'Não foi possível consultar os check-ins.' });
  }
});

module.exports = { router };