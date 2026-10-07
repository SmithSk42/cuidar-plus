const express = require('express');
const cors = require('cors');

const app = express();

// Libera o acesso para o Front-end
app.use(cors()); 
app.use(express.json());

// Rota Pública de Login (criada agora)
const authControlador = require('./controladores/authControlador');
app.post('/login', authControlador.login);

// Rotas Privadas de Pacientes
const rotasPacientes = require('./rotas/pacientes');
app.use('/pacientes', rotasPacientes);

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});