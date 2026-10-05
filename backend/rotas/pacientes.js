const express = require('express');
const roteador = express.Router();

const pacienteControlador = require('../controladores/pacienteControlador');
const exercicioControlador = require('../controladores/exercicioControlador');
const medicamentoControlador = require('../controladores/medicamentoControlador');

// Rotas Base de Pacientes
roteador.post('/', pacienteControlador.cadastrarPaciente);
roteador.get('/', pacienteControlador.listarPacientes);

// Rotas de Exercícios do Paciente
roteador.post('/:id/exercicios', exercicioControlador.vincularExercicio);
roteador.get('/:id/exercicios', exercicioControlador.listarExerciciosPaciente);

// Rotas de Medicamentos do Paciente
roteador.post('/:id/medicamentos', medicamentoControlador.vincularMedicamento);
roteador.get('/:id/medicamentos', medicamentoControlador.listarMedicamentosPaciente);

module.exports = roteador;