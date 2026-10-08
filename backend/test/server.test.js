const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const testSecret = 'test-secret-with-at-least-32-bytes-long';
process.env.JWT_SECRET = testSecret;

const { app, pool } = require('../server');
const patients = [];
const physiotherapists = [];
const checkins = [];
let server;
let baseUrl;
const originalExecute = pool.execute;
const originalGetConnection = pool.getConnection;

before(async () => {
  pool.getConnection = async () => ({
    async execute(sql, values = []) {
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql.includes('FROM fisioterapeutas')) {
        if (sql.includes('crefito =')) {
          const exists = physiotherapists.some((person) => person.crefito === values[0]);
          return [exists ? [{ '?': 1 }] : []];
        }
        const emails = new Set(values);
        const exists = [...patients, ...physiotherapists].some((user) => emails.has(user.email));
        return [exists ? [{ '?': 1 }] : []];
      }
      if (sql.includes('INSERT INTO pacientes')) {
        const patient = {
          id: patients.length + 1,
          nome: values[0],
          email: values[1],
          senha_hash: values[2],
        };
        patients.push(patient);
        return [{ insertId: patient.id }];
      }
      if (sql.includes('INSERT INTO fisioterapeutas')) {
        const person = {
          id: physiotherapists.length + 1,
          nome: values[0],
          crefito: values[1],
          email: values[2],
          senha_hash: values[3],
        };
        physiotherapists.push(person);
        return [{ insertId: person.id }];
      }
      throw new Error(`Consulta inesperada no teste: ${sql}`);
    },
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  });

  pool.execute = async (sql, values = []) => {
    if (sql === 'SELECT 1') return [[{ 1: 1 }]];
    if (sql.includes("'fisioterapeuta' AS perfil")) {
      const matches = patients
        .filter((patient) => patient.email === values[0])
        .map((patient) => ({ ...patient, perfil: 'paciente' }));
      matches.push(...physiotherapists
        .filter((person) => person.email === values[0])
        .map((person) => ({ ...person, perfil: 'fisioterapeuta' })));
      return [matches.slice(0, 2)];
    }
    if (sql.includes('INSERT INTO checkins')) {
      const checkin = {
        id: checkins.length + 1,
        paciente_id: values[0],
        data_registro: new Date().toISOString(),
        status_atividades: values[1],
        nivel_dor: values[2],
        observacoes: values[3],
      };
      checkins.push(checkin);
      return [{ insertId: checkin.id }];
    }
    if (sql.includes('FROM checkins WHERE id')) {
      const checkin = checkins.find((item) => item.id === values[0]);
      return [checkin ? [checkin] : []];
    }
    if (sql.includes('FROM checkins WHERE paciente_id')) {
      const rows = checkins.filter((checkin) => checkin.paciente_id === values[0]);
      return [rows];
    }
    throw new Error(`Consulta inesperada no teste: ${sql}`);
  };

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  pool.execute = originalExecute;
  pool.getConnection = originalGetConnection;
  await pool.end();
});

test('cadastro, login JWT e check-in ficam associados ao paciente autenticado', async () => {
  const password = 'senha-segura-123';
  const registration = await fetch(`${baseUrl}/api/pacientes/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Paciente Teste', email: 'paciente@example.com', senha: password }),
  });
  assert.equal(registration.status, 201);
  assert.equal((await registration.json()).usuario.perfil, 'paciente');

  const duplicate = await fetch(`${baseUrl}/api/pacientes/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Paciente Teste', email: 'paciente@example.com', senha: password }),
  });
  assert.equal(duplicate.status, 409);

  assert.notEqual(patients[0].senha_hash, password);
  assert.equal(await bcrypt.compare(password, patients[0].senha_hash), true);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'paciente@example.com', senha: password }),
  });
  assert.equal(login.status, 200);
  const { token, usuario } = await login.json();
  assert.equal(usuario.perfil, 'paciente');
  assert.ok(token);

  const unauthorized = await fetch(`${baseUrl}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status_atividades: true, nivel_dor: 2 }),
  });
  assert.equal(unauthorized.status, 401);

  const clinicianToken = jwt.sign(
    { id: 7, perfil: 'fisioterapeuta' },
    testSecret,
    { algorithm: 'HS256' }
  );
  const forbidden = await fetch(`${baseUrl}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clinicianToken}` },
    body: JSON.stringify({ status_atividades: true, nivel_dor: 2 }),
  });
  assert.equal(forbidden.status, 403);

  const invalidCheckin = await fetch(`${baseUrl}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status_atividades: true, nivel_dor: 11 }),
  });
  assert.equal(invalidCheckin.status, 400);

  const saved = await fetch(`${baseUrl}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      paciente_id: 999,
      status_atividades: true,
      nivel_dor: 3,
      observacoes: 'Fiz os exercícios pela manhã.',
    }),
  });
  assert.equal(saved.status, 201);
  const savedData = await saved.json();
  assert.equal(savedData.checkin.paciente_id, usuario.id);

  const history = await fetch(`${baseUrl}/api/checkins/meus`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(history.status, 200);
  assert.equal((await history.json()).checkins.length, 1);
});

test('health check confirma acesso à camada MySQL', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'mysql' });
});

test('login de fisioterapeuta emite token com perfil correto', async () => {
  const password = 'senha-fisio-123';
  const registration = await fetch(`${baseUrl}/api/fisioterapeutas/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Fisioterapeuta Teste',
      crefito: 'CREFITO-12345',
      email: 'fisio@example.com',
      senha: password,
    }),
  });
  assert.equal(registration.status, 201);
  const created = await registration.json();
  assert.equal(created.usuario.perfil, 'fisioterapeuta');
  assert.equal(created.usuario.crefito, 'CREFITO-12345');
  assert.notEqual(physiotherapists[0].senha_hash, password);
  assert.equal(await bcrypt.compare(password, physiotherapists[0].senha_hash), true);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fisio@example.com', senha: password }),
  });
  assert.equal(login.status, 200);
  const { token, usuario } = await login.json();
  assert.equal(usuario.perfil, 'fisioterapeuta');
  assert.equal(jwt.verify(token, testSecret).perfil, 'fisioterapeuta');

  const duplicate = await fetch(`${baseUrl}/api/fisioterapeutas/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Outra Pessoa',
      crefito: 'CREFITO-99999',
      email: 'fisio@example.com',
      senha: password,
    }),
  });
  assert.equal(duplicate.status, 409);

  const duplicateCrefito = await fetch(`${baseUrl}/api/fisioterapeutas/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Outra Pessoa',
      crefito: 'CREFITO-12345',
      email: 'outra-fisio@example.com',
      senha: password,
    }),
  });
  assert.equal(duplicateCrefito.status, 409);
});
