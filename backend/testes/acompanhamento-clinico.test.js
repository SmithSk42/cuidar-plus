const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const raiz = join(__dirname, '..');
const rota = readFileSync(join(raiz, 'src/rotas/acompanhamento-clinico.js'), 'utf8');
const servidor = readFileSync(join(raiz, 'server.js'), 'utf8');
const sql = readFileSync(join(raiz, '../database/cuidar_plus_completo.sql'), 'utf8');

test('painel individual exige autenticação e filtra pelo fisioterapeuta', () => {
  assert.match(rota, /rotasAcompanhamentoClinico\.use\(exigirAutenticacao\)/);
  assert.match(rota, /p\.fisioterapeuta_id = \?/);
  assert.match(rota, /r\.fisioterapeuta_id = \?/);
  assert.match(rota, /a\.fisioterapeuta_id = \?/);
  assert.match(rota, /WHERE id = \? AND paciente_id = \? AND fisioterapeuta_id = \? AND status = 'Pendente'/);
});

test('painel individual usa somente tabelas existentes no SQL consolidado', () => {
  const tabelas = [...rota.matchAll(/\b(?:FROM|JOIN|UPDATE)\s+([a-z_]+)/gi)].map(resultado => resultado[1]);
  for (const nome of new Set(tabelas)) {
    assert.match(sql, new RegExp(`CREATE TABLE ${nome}\\s*\\(`), `Tabela ${nome} não definida`);
  }
});

test('API registra a nova rota do acompanhamento individual', () => {
  assert.match(servidor, /aplicacao\.use\('\/api\/acompanhamento-clinico',rotasAcompanhamentoClinico\)/);
});
