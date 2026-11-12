const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { createHash } = require('node:crypto');

function configurarSimulacao(opcoes = {}) {
  const eventos = [];
  const rotas = { post: new Map(), get: new Map() };
  const convite = {
    id: 5, paciente_id: 17, nome_convidado: 'Pessoa Convidada',
    email: 'cuidador@example.com', papel: 'Cuidador',
    usado_em: opcoes.usado ? new Date() : null,
    expirado: opcoes.expirado ? 1 : 0
  };
  const usuario = {
    id: 77, nome: 'Pessoa Convidada', email: 'cuidador@example.com',
    senha_hash: 'bcrypt:senhasegura123', ativo: 1
  };
  const vinculos = opcoes.multiplos
    ? [{ paciente_id: 17, papel: 'Cuidador' }, { paciente_id: 18, papel: 'Paciente' }]
    : [{ paciente_id: 17, papel: 'Cuidador' }];

  async function execute(sql, valores = []) {
    eventos.push({ sql: sql.trim(), valores });
    if (/FROM convites_cuidado/.test(sql)) return [[opcoes.inexistente ? undefined : convite].filter(Boolean)];
    if (/FROM usuarios_domiciliares/.test(sql)) {
      if (/SELECT id FROM/.test(sql)) return [[opcoes.contaExistente ? usuario : undefined].filter(Boolean)];
      return [[usuario]];
    }
    if (/FROM vinculos_cuidado/.test(sql)) return [vinculos];
    if (/INSERT INTO usuarios_domiciliares/.test(sql)) return [{ insertId: 77 }];
    return [{ affectedRows: 1 }];
  }
  const conexao = {
    execute,
    beginTransaction: async () => { eventos.push('begin'); },
    commit: async () => { eventos.push('commit'); },
    rollback: async () => { eventos.push('rollback'); },
    release: () => { eventos.push('release'); }
  };
  const db = { execute, getConnection: async () => conexao, query: execute };
  const exp = { Router: () => ({
    post: (rota, ...handlers) => rotas.post.set(rota, handlers.at(-1)),
    get: (rota, ...handlers) => rotas.get.set(rota, handlers.at(-1))
  }) };
  const jwt = {
    sign: (payload, _segredo, configuracao) => {
      eventos.push({ jwt: payload, configuracao });
      return 'token-assinado';
    }
  };
  const bcrypt = {
    hash: async (senha, custo) => { eventos.push({ hash: senha, custo }); return `bcrypt:${senha}`; },
    compare: async (senha, hash) => senha === hash.replace(/^bcrypt:/, '')
  };
  const antigoLoad = Module._load;
  Module._load = function (nome, pai, ehMain) {
    if (nome === 'express') return exp;
    if (nome === 'bcryptjs') return bcrypt;
    if (nome === 'jsonwebtoken') return jwt;
    if (nome === '../banco/conexao') return db;
    if (nome === '../intermediarios/acesso-domiciliar') return { exigirAcessoDomiciliar: (_req, _res, next) => next() };
    return antigoLoad.call(this, nome, pai, ehMain);
  };
  const caminhoServico = require.resolve('../src/services/sessao-domiciliar');
  const caminhoRotas = require.resolve('../src/rotas/cuidado');
  delete require.cache[caminhoServico];
  delete require.cache[caminhoRotas];
  process.env.SEGREDO_JWT = 'A'.repeat(64);
  try { require('../src/rotas/cuidado'); }
  finally { Module._load = antigoLoad; }

  async function chamar(metodo, rota, body = {}, usuarioDomiciliar = usuario) {
    let resultado;
    const req = { body, ip: '127.0.0.1', usuarioDomiciliar };
    const res = {
      status(codigo) { resultado = { ...(resultado || {}), status: codigo }; return this; },
      json(dados) { resultado = { status: resultado?.status || 200, dados }; return this; }
    };
    const next = erro => { if (erro) throw erro; };
    const handler = rotas[metodo].get(rota);
    assert.ok(handler, `Rota nao encontrada: ${metodo.toUpperCase()} ${rota}`);
    await handler(req, res, next);
    return resultado;
  }
  return { eventos, rotas, chamar, convite, vinculos };
}

test('ativa uma unica vez, com dados somente do convite, transacao e token', async () => {
  const sim = configurarSimulacao();
  const codigo = 'a'.repeat(64);
  const resultado = await sim.chamar('post', '/ativar', { codigo_convite: codigo, senha: 'senhasegura123', email: 'falso@x.com' });
  assert.equal(resultado.status, 201);
  assert.equal(resultado.dados.usuario.email, 'cuidador@example.com');
  assert.deepEqual(resultado.dados.vinculos, sim.vinculos);
  assert.equal(resultado.dados.token, 'token-assinado');
  assert.ok(sim.eventos.includes('begin'));
  assert.ok(sim.eventos.includes('commit'));
  assert.ok(sim.eventos.find(e => e.sql?.includes('FOR UPDATE') && e.valores[0] === createHash('sha256').update(codigo).digest('hex')));
  assert.deepEqual(sim.eventos.find(e => e.sql?.includes('INSERT INTO usuarios_domiciliares')).valores,
    ['Pessoa Convidada', 'cuidador@example.com', 'bcrypt:senhasegura123']);
  assert.equal(sim.eventos.find(e => e.jwt).jwt.paciente_id, 17);
  assert.equal(sim.eventos.find(e => e.jwt).jwt.papel, 'Cuidador');
});

test('convite ja utilizado nao gera conta nem vinculo', async () => {
  const sim = configurarSimulacao({ usado: true });
  const resposta = await sim.chamar('post', '/ativar', { codigo_convite: 'b'.repeat(64), senha: 'senha-super-123' });
  assert.equal(resposta.status, 409);
  assert.equal(resposta.dados.codigo, 'CONVITE_UTILIZADO');
  assert.ok(sim.eventos.includes('rollback'));
  assert.ok(!sim.eventos.some(e => e.sql?.includes('INSERT INTO')));
});

test('convite expirado e conta existente retornam codigos distintos', async () => {
  for (const [opcoes, status, codigo] of [
    [{ expirado: true }, 410, 'CONVITE_EXPIRADO'],
    [{ contaExistente: true }, 409, 'CONTA_EXISTENTE']
  ]) {
    const sim = configurarSimulacao(opcoes);
    const resp = await sim.chamar('post', '/ativar', { codigo_convite: 'a'.repeat(64), senha: 'senha-super-123' });
    assert.equal(resp.status, status);
    assert.equal(resp.dados.codigo, codigo);
  }
});

test('login informa todos os vinculos ativos e envia identidade no JWT', async () => {
  const sim = configurarSimulacao({ multiplos: true });
  const resposta = await sim.chamar('post', '/login', { email: 'cuidador@example.com', senha: 'senhasegura123' });
  assert.equal(resposta.status, 200);
  assert.equal(resposta.dados.vinculos.length, 2);
  assert.equal(resposta.dados.usuario.email, 'cuidador@example.com');
  assert.equal(sim.eventos.find(e => e.jwt).jwt.id, 77);
  assert.equal(sim.eventos.find(e => e.jwt).configuracao.expiresIn, '12h');
});

test('login rejeita credenciais invalidas e sessao recupera perfil', async () => {
  const sim = configurarSimulacao();
  const invalido = await sim.chamar('post', '/login', { email: 'cuidador@example.com', senha: 'incorreta' });
  assert.equal(invalido.status, 401);
  const sessao = await sim.chamar('get', '/sessao');
  assert.equal(sessao.status, 200);
  assert.equal(sessao.dados.usuario.perfil, 'domiciliar');
  assert.equal(sessao.dados.vinculos.length, 1);
});
