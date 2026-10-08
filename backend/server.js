// Responsável por esta implementação: Filipe Alves Sousa Julio.
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { createHash } = require('node:crypto');
const dotenv = require('dotenv');
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

dotenv.config();

const app = express();
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cuidar_plus',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tokenLifetime = '1h';

pool.on('error', (error) => {
  console.error('Erro inesperado na conexão com o MySQL:', error);
});

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

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith('SUBSTITUA_') || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 bytes.');
  }
  return secret;
}

function validarConfiguracaoBanco() {
  if (!process.env.DB_USER || process.env.DB_PASSWORD === undefined) {
    throw new Error('Configure DB_USER e DB_PASSWORD no arquivo backend/.env.');
  }
  if (process.env.DB_PASSWORD.startsWith('COLOQUE_')) {
    throw new Error('Substitua DB_PASSWORD no arquivo backend/.env pela senha do usuário MySQL.');
  }
}

function autenticar(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Autenticação necessária.' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (
      !payload ||
      !Number.isInteger(payload.id) ||
      !['paciente', 'fisioterapeuta'].includes(payload.perfil)
    ) {
      return res.status(401).json({ erro: 'Token inválido.' });
    }
    req.usuario = { id: payload.id, perfil: payload.perfil };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    return next(error);
  }
}

app.post('/api/pacientes/registro', async (req, res) => {
  const body = req.body || {};
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';

  if (nome.length < 2 || nome.length > 100) {
    return res.status(400).json({ erro: 'Informe um nome entre 2 e 100 caracteres.' });
  }
  if (email.length > 100 || !emailPattern.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }
  if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
    return res.status(400).json({ erro: 'A senha deve ter entre 8 e 72 caracteres.' });
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  const lockName = `cuidar_email_${createHash('sha256').update(email).digest('hex').slice(0, 48)}`;
  try {
    connection = await pool.getConnection();
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    lockAcquired = lockRows[0]?.acquired === 1;
    if (!lockAcquired) {
      return res.status(503).json({ erro: 'Cadastro temporariamente ocupado. Tente novamente.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [existing] = await connection.execute(
      `SELECT 1 FROM fisioterapeutas WHERE lower(email) = ?
       UNION ALL
       SELECT 1 FROM pacientes WHERE lower(email) = ?
       LIMIT 1`,
      [email, email]
    );
    if (existing.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const [result] = await connection.execute(
      `INSERT INTO pacientes (nome, email, senha_hash)
       VALUES (?, ?, ?)`,
      [nome, email, senhaHash]
    );
    await connection.commit();
    transactionStarted = false;
    return res.status(201).json({
      usuario: { id: result.insertId, nome, email, perfil: 'paciente' },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erro ao desfazer o cadastro do paciente:', rollbackError);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    }
    console.error('Erro ao cadastrar paciente:', error);
    return res.status(500).json({ erro: 'Não foi possível criar a conta.' });
  } finally {
    if (lockAcquired) {
      try {
        await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch (error) {
        console.error('Erro ao liberar bloqueio do cadastro:', error);
      }
    }
    connection?.release();
  }
});

app.post('/api/fisioterapeutas/registro', async (req, res) => {
  const body = req.body || {};
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const crefito = typeof body.crefito === 'string' ? body.crefito.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';

  if (nome.length < 2 || nome.length > 100) {
    return res.status(400).json({ erro: 'Informe um nome entre 2 e 100 caracteres.' });
  }
  if (!crefito || crefito.length > 20) {
    return res.status(400).json({ erro: 'Informe um CREFITO válido.' });
  }
  if (email.length > 100 || !emailPattern.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }
  if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
    return res.status(400).json({ erro: 'A senha deve ter entre 8 e 72 caracteres.' });
  }

  let connection;
  let lockAcquired = false;
  let transactionStarted = false;
  const lockName = `cuidar_email_${createHash('sha256').update(email).digest('hex').slice(0, 48)}`;
  try {
    connection = await pool.getConnection();
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    lockAcquired = lockRows[0]?.acquired === 1;
    if (!lockAcquired) {
      return res.status(503).json({ erro: 'Cadastro temporariamente ocupado. Tente novamente.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;
    const [existingEmail] = await connection.execute(
      `SELECT 1 FROM fisioterapeutas WHERE lower(email) = ?
       UNION ALL
       SELECT 1 FROM pacientes WHERE lower(email) = ?
       LIMIT 1`,
      [email, email]
    );
    if (existingEmail.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    }

    const [existingCrefito] = await connection.execute(
      'SELECT 1 FROM fisioterapeutas WHERE crefito = ? LIMIT 1',
      [crefito]
    );
    if (existingCrefito.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ erro: 'Já existe uma conta com este CREFITO.' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const [result] = await connection.execute(
      `INSERT INTO fisioterapeutas (nome, crefito, email, senha_hash)
       VALUES (?, ?, ?, ?)`,
      [nome, crefito, email, senhaHash]
    );
    await connection.commit();
    transactionStarted = false;
    return res.status(201).json({
      usuario: { id: result.insertId, nome, crefito, email, perfil: 'fisioterapeuta' },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erro ao desfazer o cadastro do fisioterapeuta:', rollbackError);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'E-mail ou CREFITO já cadastrado.' });
    }
    console.error('Erro ao cadastrar fisioterapeuta:', error);
    return res.status(500).json({ erro: 'Não foi possível criar a conta.' });
  } finally {
    if (lockAcquired) {
      try {
        await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch (error) {
        console.error('Erro ao liberar bloqueio do cadastro:', error);
      }
    }
    connection?.release();
  }
});

app.post('/api/login', async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';
  if (!emailPattern.test(email) || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha válidos.' });
  }

  try {
    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, senha_hash, 'fisioterapeuta' AS perfil
       FROM fisioterapeutas WHERE lower(email) = ?
       UNION ALL
       SELECT id, nome, email, senha_hash, 'paciente' AS perfil
       FROM pacientes WHERE lower(email) = ? AND senha_hash IS NOT NULL
       LIMIT 2`,
      [email, email]
    );

    if (usuarios.length !== 1 || !(await bcrypt.compare(senha, usuarios[0].senha_hash))) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const usuario = usuarios[0];
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: tokenLifetime }
    );
    return res.json({
      token,
      tipo: 'Bearer',
      expiraEm: tokenLifetime,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return res.status(500).json({ erro: 'Não foi possível realizar o login.' });
  }
});

app.post('/api/checkin', autenticar, async (req, res) => {
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
    const [insertResult] = await pool.execute(
      `INSERT INTO checkins (paciente_id, status_atividades, nivel_dor, observacoes)
       VALUES (?, ?, ?, ?)`,
      [req.usuario.id, statusAtividades, nivelDor, observacoes]
    );
    const [checkins] = await pool.execute(
      `SELECT id, paciente_id, data_registro, status_atividades, nivel_dor, observacoes
       FROM checkins WHERE id = ?`,
      [insertResult.insertId]
    );
    if (!checkins.length) {
      throw new Error('O check-in foi inserido, mas não foi possível recuperá-lo.');
    }
    return res.status(201).json({ mensagem: 'Check-in registrado.', checkin: checkins[0] });
  } catch (error) {
    console.error('Erro ao salvar check-in:', error);
    return res.status(500).json({ erro: 'Não foi possível salvar o check-in.' });
  }
});

app.get('/api/checkins/meus', autenticar, async (req, res) => {
  if (req.usuario.perfil !== 'paciente') {
    return res.status(403).json({ erro: 'Este recurso é exclusivo para pacientes.' });
  }

  try {
    const [checkins] = await pool.execute(
      `SELECT id, paciente_id, data_registro, status_atividades, nivel_dor, observacoes
       FROM checkins WHERE paciente_id = ?
       ORDER BY data_registro DESC, id DESC
       LIMIT 30`,
      [req.usuario.id]
    );
    return res.json({ checkins });
  } catch (error) {
    console.error('Erro ao consultar check-ins:', error);
    return res.status(500).json({ erro: 'Não foi possível consultar os check-ins.' });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Erro não tratado na API:', error);
  if (error.status === 400) {
    return res.status(400).json({ erro: 'Corpo da requisição inválido.' });
  }
  return res.status(500).json({ erro: 'Ocorreu um erro interno.' });
});

async function start() {
  getJwtSecret();
  validarConfiguracaoBanco();
  await pool.execute('SELECT 1');

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`API Cuidar+ rodando na porta ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Não foi possível iniciar a API:', error);
    process.exitCode = 1;
  });
}

module.exports = { app, pool, start };
