const express = require('express');
const roteador = express.Router();
const pacienteControlador = require('../controladores/pacienteControlador');
const cuidadosControlador = require('../controladores/cuidadosControlador');
const verificarToken = require('../middlewares/verificarToken'); // <-- Importa o guarda-costas

// Rotas Base de Pacientes (Agora protegidas pelo verificarToken)
roteador.post('/', verificarToken, pacienteControlador.criarPaciente);
roteador.get('/', verificarToken, pacienteControlador.listarPacientes);

// Rotas do Diário de Cuidados (Protegida)
roteador.post('/:id/cuidados', verificarToken, cuidadosControlador.adicionarTarefaDiario);

module.exports = roteador;