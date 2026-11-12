const test = require('node:test');
const assert = require('node:assert/strict');
const { obterOrigemConvite } = require('../src/utilitarios/origem-convite');

const req = (cabecalhos = {}) => ({
  get(nome) { return cabecalhos[nome.toLowerCase()]; }
});

const ambiente = { ORIGEM_FRONTEND: 'http://localhost:5173' };

test('gera link com domínio temporário Cloudflare acessado no navegador', () => {
  assert.equal(
    obterOrigemConvite(req({ origin: 'https://reef-request-trails-stood.trycloudflare.com' }), ambiente),
    'https://reef-request-trails-stood.trycloudflare.com'
  );
});

test('usa Referer quando Origin não estiver presente', () => {
  assert.equal(
    obterOrigemConvite(req({ referer: 'https://reef-request-trails-stood.trycloudflare.com/acompanhamento?paciente_id=2' }), ambiente),
    'https://reef-request-trails-stood.trycloudflare.com'
  );
});

test('aceita localhost e IP privado da rede local', () => {
  assert.equal(obterOrigemConvite(req({ origin: 'http://localhost:5173' }), ambiente), 'http://localhost:5173');
  assert.equal(obterOrigemConvite(req({ origin: 'http://192.168.15.12:5173' }), ambiente), 'http://192.168.15.12:5173');
});

test('origem pública configurada prevalece mesmo quando painel é acessado por localhost', () => {
  assert.equal(
    obterOrigemConvite(req({ origin: 'http://localhost:5173' }), {
      ...ambiente,
      ORIGEM_PUBLICA_FRONTEND: 'https://reef-request-trails-stood.trycloudflare.com/'
    }),
    'https://reef-request-trails-stood.trycloudflare.com'
  );
});

test('rejeita origens externas arbitrárias e domínios parecidos com Cloudflare', () => {
  for (const origin of [
    'https://site-malicioso.example',
    'https://reef-request-trails-stood.trycloudflare.com.site-malicioso.example',
    'http://reef-request-trails-stood.trycloudflare.com',
    'https://reef-request-trails-stood.trycloudflare.com:8443',
    'https://site-malicioso.example@reef-request-trails-stood.trycloudflare.com'
  ]) {
    assert.equal(obterOrigemConvite(req({ origin }), ambiente), 'http://localhost:5173');
  }
});

test('não aceita configuração pública com caminho ou credenciais', () => {
  assert.throws(() => obterOrigemConvite(req(), {
    ...ambiente,
    ORIGEM_PUBLICA_FRONTEND: 'https://reef-request-trails-stood.trycloudflare.com/cuidado'
  }), /ORIGEM_PUBLICA_FRONTEND inválida/);
});

test('mantém origem configurada como fallback sem cabeçalhos', () => {
  assert.equal(obterOrigemConvite(req(), ambiente), 'http://localhost:5173');
});
