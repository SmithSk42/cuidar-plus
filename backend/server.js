const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// MOCKS PARA AVALIAÇÃO DAS ETAPAS 1 E 2
// ==========================================

// EU02 (Filipe): Rota de Autenticação/Login simulada (Retorna um JWT Falso)
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    if(email && senha) {
        res.json({ mensagem: "Login autorizado", token: "jwt-token-falso-para-testes-123" });
    } else {
        res.status(400).json({ erro: "Credenciais inválidas" });
    }
});

// EU01 (Sávio): Rota de Cadastro de Pacientes simulada
app.post('/api/pacientes', (req, res) => {
    res.status(201).json({ mensagem: "Paciente cadastrado com sucesso (Mock)", id_paciente: 1 });
});

// EU04 (Filipe): Rota para Salvar o Check-in diário do Mobile simulada
app.post('/api/checkin', (req, res) => {
    res.status(201).json({ mensagem: "Check-in do paciente salvo com sucesso no banco (Mock)" });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor Back-end rodando na porta ${PORT}`);
});