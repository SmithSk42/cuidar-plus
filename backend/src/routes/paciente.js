const express = require('express');
const router = express.Router();
// Você importando o SEU motor aqui em baixo:
const pacienteService = require('../services/paciente');

router.post('/', async (req, res) => {
    try {
        // Manda os dados do corpo da requisição para o seu motor
        const idGerado = await pacienteService.criarPaciente(req.body);
        
        res.status(201).json({
            mensagem: "Paciente criado com sucesso pelo motor!",
            paciente_id: idGerado
        });
    } catch (erro) {
        console.error("Erro no motor de pacientes:", erro);
        res.status(500).json({ erro: "Erro ao cadastrar paciente no banco de dados." });
    }
});

router.get('/', async (req, res) => {
    try {
        const pacientes = await pacienteService.listarPacientes();
        res.status(200).json(pacientes);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar pacientes." });
    }
});

module.exports = { router };