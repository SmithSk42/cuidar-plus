// Responsável por esta implementação: Filipe Alves Sousa Julio.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { createHash } = require('node:crypto');
const { StringDecoder } = require('node:string_decoder');
const mysql = require('mysql2/promise');

function perguntarSenhaOculta(prompt) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new Error('Execute este comando em um terminal interativo para ocultar a senha.'));
  }

  return new Promise((resolve, reject) => {
    let senha = '';
    const decoder = new StringDecoder('utf8');
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();

    function finalizar(error) {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', receber);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(senha);
    }

    function receber(buffer) {
      for (const character of decoder.write(buffer)) {
        if (character === '\u0003') return finalizar(new Error('Operação cancelada.'));
        if (character === '\r' || character === '\n') return finalizar();
        if (character === '\b' || character === '\u007f') {
          if (senha.length) senha = senha.slice(0, -1);
          continue;
        }
        if (character >= ' ') senha += character;
      }
    }

    input.on('data', receber);
  });
}

async function main() {
  const readline = require('node:readline/promises');
  const { stdin, stdout } = require('node:process');
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  let connection;

  try {
    const nome = (await prompt.question('Nome completo: ')).trim();
    const crefito = (await prompt.question('CREFITO: ')).trim();
    const email = (await prompt.question('E-mail: ')).trim().toLowerCase();
    prompt.close();

    const senha = await perguntarSenhaOculta('Senha (mínimo 8 caracteres; não será exibida): ');
    if (nome.length < 2 || nome.length > 100) throw new Error('Informe um nome entre 2 e 100 caracteres.');
    if (!crefito || crefito.length > 20) throw new Error('Informe um CREFITO válido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      throw new Error('Informe um e-mail válido.');
    }
    if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
      throw new Error('A senha deve ter entre 8 e 72 bytes.');
    }
    if (!process.env.DB_USER || process.env.DB_PASSWORD === undefined) {
      throw new Error('Configure DB_USER e DB_PASSWORD em backend/.env.');
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'cuidar_plus',
    });

    const lockName = `cuidar_email_${createHash('sha256').update(email).digest('hex').slice(0, 48)}`;
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    if (lockRows[0]?.acquired !== 1) throw new Error('Cadastro ocupado. Tente novamente.');

    try {
      await connection.beginTransaction();
      const [existing] = await connection.execute(
        `SELECT 1 FROM fisioterapeutas WHERE lower(email) = ?
         UNION ALL
         SELECT 1 FROM pacientes WHERE lower(email) = ?
         LIMIT 1`,
        [email, email]
      );
      if (existing.length) throw new Error('Já existe uma conta com este e-mail.');

      const senhaHash = await bcrypt.hash(senha, 12);
      await connection.execute(
        'INSERT INTO fisioterapeutas (nome, crefito, email, senha_hash) VALUES (?, ?, ?, ?)',
        [nome, crefito, email, senhaHash]
      );
      await connection.commit();
      console.log('Conta de fisioterapeuta criada. Já pode entrar em /fisioterapeuta.');
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Este e-mail ou CREFITO já está cadastrado.');
      }
      throw error;
    } finally {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
    }
  } finally {
    prompt.close();
    if (connection) await connection.end();
  }
}

main().catch((error) => {
  console.error(`Não foi possível criar a conta de fisioterapeuta: ${error.message}`);
  process.exitCode = 1;
});
