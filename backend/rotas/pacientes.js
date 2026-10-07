const express = require('express');
const roteador = express.Router();

const pacienteControlador = require('../controladores/pacienteControlador');
// Importamos o novo controlador que criamos no passo anterior
const cuidadosControlador = require('../controladores/cuidadosControlador');

// Rotas Base de Pacientes
roteador.post('/', pacienteControlador.criarPaciente);
roteador.get('/', pacienteControlador.listarPacientes);

// Rotas do Diário de Cuidados do Paciente (Substitui exercícios e medicamentos)
roteador.post('/:id/cuidados', cuidadosControlador.adicionarTarefaDiario);


// roteador.get('/:id/cuidados', cuidadosControlador.listarTarefasDiario);

module.exports = roteador;