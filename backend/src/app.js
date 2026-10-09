const cors = require('cors');
const express = require('express');
const { pool } = require('./db');
const { router: authRoutes } = require('./routes/auth');
const { router: checkinRoutes } = require('./routes/checkins');
// 1. A sua importação sobe para o topo com as restantes
const { router: pacienteRouter } = require('./routes/paciente'); 

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    return res.json({ status: 'ok', database: 'mysql' });
  } catch (error) {
    console.error('Falha no teste de conexão com o MySQL:', error);
    return res.status(503).json({ status: 'error', erro: 'Banco de dados indisponível.' });
  }
});

// 2. A sua rota junta-se ao bloco de rotas da equipa (com o prefixo /api)
app.use('/api', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/pacientes', pacienteRouter); 

// 3. A rede de segurança (tratador de erros) fica no fim, protegendo todas as rotas acima
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Erro não tratado na API:', error);
  if (error.status === 400) {
    return res.status(400).json({ erro: 'Corpo da requisição inválido.' });
  }
  return res.status(500).json({ erro: 'Ocorreu um erro interno.' });
});

module.exports = { app };