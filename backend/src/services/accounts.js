const bcrypt = require('bcryptjs');
const { createHash } = require('node:crypto');
const { pool } = require('../db');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const accountTables = {
  paciente: 'pacientes',
  fisioterapeuta: 'fisioterapeutas',
};

class AccountError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function validateAccount(profile, body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';
  const crefito = typeof body.crefito === 'string' ? body.crefito.trim() : '';

  if (nome.length < 2 || nome.length > 100) {
    throw new AccountError('Informe um nome entre 2 e 100 caracteres.', 400);
  }
  if (profile === 'fisioterapeuta' && (!crefito || crefito.length > 20)) {
    throw new AccountError('Informe um CREFITO válido.', 400);
  }
  if (email.length > 100 || !emailPattern.test(email)) {
    throw new AccountError('Informe um e-mail válido.', 400);
  }
  if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
    throw new AccountError('A senha deve ter entre 8 e 72 caracteres.', 400);
  }
  return { nome, email, senha, crefito };
}

async function createAccount(profile, body) {
  const table = accountTables[profile];
  if (!table) throw new Error(`Perfil de conta desconhecido: ${profile}`);

  const account = validateAccount(profile, body || {});
  const { nome, email, senha, crefito } = account;
  const lockName = `cuidar_email_${createHash('sha256').update(email).digest('hex').slice(0, 48)}`;
  let connection;
  let lockAcquired = false;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    lockAcquired = lockRows[0]?.acquired === 1;
    if (!lockAcquired) {
      throw new AccountError('Cadastro temporariamente ocupado. Tente novamente.', 503);
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
      throw new AccountError('Já existe uma conta com este e-mail.', 409);
    }

    if (profile === 'fisioterapeuta') {
      const [existingCrefito] = await connection.execute(
        'SELECT 1 FROM fisioterapeutas WHERE crefito = ? LIMIT 1',
        [crefito]
      );
      if (existingCrefito.length) {
        throw new AccountError('Já existe uma conta com este CREFITO.', 409);
      }
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const columns = profile === 'fisioterapeuta'
      ? '(nome, crefito, email, senha_hash) VALUES (?, ?, ?, ?)'
      : '(nome, email, senha_hash) VALUES (?, ?, ?)';
    const values = profile === 'fisioterapeuta'
      ? [nome, crefito, email, senhaHash]
      : [nome, email, senhaHash];
    const [result] = await connection.execute(`INSERT INTO ${table} ${columns}`, values);

    await connection.commit();
    transactionStarted = false;

    const usuario = { id: result.insertId, nome, email, perfil: profile };
    if (profile === 'fisioterapeuta') usuario.crefito = crefito;
    return usuario;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(`Erro ao desfazer o cadastro de ${profile}:`, rollbackError);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      const message = profile === 'fisioterapeuta'
        ? 'E-mail ou CREFITO já cadastrado.'
        : 'Já existe uma conta com este e-mail.';
      throw new AccountError(message, 409);
    }
    throw error;
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
}

module.exports = { AccountError, createAccount };
