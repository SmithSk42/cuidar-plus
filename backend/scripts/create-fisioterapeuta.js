// Responsável por esta implementação: Filipe Alves Sousa Julio.
require('dotenv').config();

const { StringDecoder } = require('node:string_decoder');
const { AccountError, createAccount } = require('../src/services/accounts');

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
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const nome = (await prompt.question('Nome completo: ')).trim();
    const crefito = (await prompt.question('CREFITO: ')).trim();
    const email = (await prompt.question('E-mail: ')).trim().toLowerCase();
    prompt.close();

    const senha = await perguntarSenhaOculta('Senha (mínimo 8 caracteres; não será exibida): ');
    await createAccount('fisioterapeuta', { nome, crefito, email, senha });
    console.log('Conta de fisioterapeuta criada. Já pode entrar em /fisioterapeuta.');
  } catch (error) {
    if (error instanceof AccountError) {
      console.error(`Não foi possível criar a conta: ${error.message}`);
      process.exitCode = 1;
    } else {
      console.error(`Não foi possível criar a conta de fisioterapeuta: ${error.message}`);
      process.exitCode = 1;
    }
  } finally {
    prompt.close();
  }
}

main();
