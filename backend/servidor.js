const express = require('express');
const cors = require('cors'); // 1. Importa o CORS

const app = express();

// 2. Libera o acesso para qualquer Front-end conversar com a API
app.use(cors()); 
app.use(express.json());

// Importando as rotas
const rotasPacientes = require('./rotas/pacientes');
app.use('/pacientes', rotasPacientes);

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});