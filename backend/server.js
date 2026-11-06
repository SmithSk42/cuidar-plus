
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const banco = require('./src/banco/conexao');
const { verificarEstrutura } = require('./src/banco/verificar-estrutura');
const { rotasAutenticacao } = require('./src/rotas/autenticacao');
const { rotasDashboard } = require('./src/rotas/dashboard');
const { rotasPacientes } = require('./src/rotas/pacientes');
const { rotasRotinas } = require('./src/rotas/rotinas');
const { rotasConvites } = require('./src/rotas/convites');
const { rotasCuidado } = require('./src/rotas/cuidado');
const { rotasCuidadoMobile } = require('./src/rotas/cuidado-mobile');
const { rotasAcompanhamentoClinico } = require('./src/rotas/acompanhamento-clinico');

if (
  !process.env.SEGREDO_JWT ||
  process.env.SEGREDO_JWT.length < 32 ||
  process.env.SEGREDO_JWT.includes('substitua')
) {
  throw new Error(
    'Defina SEGREDO_JWT (ao menos 32 caracteres aleatórios) no backend/.env.'
  );
}

const aplicacao = express();

aplicacao.disable('x-powered-by');
aplicacao.disable('etag');

const origens = (
  process.env.ORIGEM_FRONTEND || 'http://localhost:5173'
).split(',').map(x => x.trim());

aplicacao.use(cors({
  origin(origem, cb) {
    cb(null, !origem || origens.includes(origem));
  }
}));

aplicacao.use(express.json({ limit: '100kb' }));

aplicacao.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, private');
  next();
});

aplicacao.get('/api/saude', async (_req, res, next) => {
  try {
    await banco.query('SELECT 1');
    res.json({ ok: true, banco: 'conectado' });
  } catch (e) {
    next(e);
  }
});

aplicacao.use('/api', rotasAutenticacao);
aplicacao.use('/api/dashboard', rotasDashboard);
aplicacao.use('/api/pacientes', rotasPacientes);
aplicacao.use('/api/rotinas', rotasRotinas);
aplicacao.use('/api/acompanhamento-clinico', rotasAcompanhamentoClinico);
aplicacao.use('/api', rotasConvites);

// CORREÇÃO: primeiro as rotas de ativação e login.
// Elas possuem autenticação própria quando necessário.
aplicacao.use('/api/cuidado', rotasCuidado);

// Depois as rotas mobile protegidas por autenticação.
aplicacao.use('/api/cuidado', rotasCuidadoMobile);

aplicacao.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

aplicacao.use((erro, _req, res, _next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }

  console.error('Falha na API:', {
    codigo: erro.code || 'INDEFINIDO',
    mensagem: erro.message
  });

  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const porta = Number(process.env.PORTA || 3000);

async function iniciarServidor() {
  await verificarEstrutura(banco);

  return aplicacao.listen(porta, () => {
    console.log(`API Cuidar+ disponível em http://localhost:${porta}`);
  });
}

if (require.main === module) {
  iniciarServidor().catch(erro => {
    console.error('ERRO AO INICIAR CUIDAR+:', erro.message);
    console.error('Confira o banco com: npm run verificar:banco');

    process.exitCode = 1;
    banco.end().catch(() => {});
  });
}

module.exports = { aplicacao, iniciarServidor };
