const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=arquivo=>fs.readFileSync(path.join(root,arquivo),'utf8');

test('portal reutiliza as seis telas e informa de forma clara o uso do check-in',()=>{
 const ui=read('frontend/src/paginas/PortalCuidador.jsx');
 for(const titulo of ['Medicamentos de hoje','Exercícios de hoje','Como o paciente está hoje?','Relatar um problema','Registros anteriores','Olá,'])
  assert.ok(ui.includes(titulo),`Falta ${titulo}`);
 assert.match(ui,/Marque todos os exercícios antes de enviar o check-in/);
 assert.match(ui,/tipoOcorrencia==='Dor'/);
 assert.match(ui,/podeRegistrar/);
});
test('portal mantém autenticação e restringe pacientes por vínculo ativo',()=>{
 const api=read('backend/src/rotas/cuidado-mobile.js');
 assert.match(api,/rotasCuidadoMobile\.use\(exigirAcessoDomiciliar\)/);
 assert.match(api,/v\.usuario_id=\?/);
 assert.match(api,/v\.status='Ativo'/);
 assert.match(api,/pode_ver_evolucao/);
 assert.match(api,/registros_medicamentos/);
});
test('ocorrências e alertas são gravados dentro de transação',()=>{
 const api=read('backend/src/rotas/cuidado-mobile.js');
 assert.match(api,/post\('\/ocorrencias'/);
 assert.match(api,/INSERT INTO ocorrencias/);
 assert.match(api,/INSERT INTO alertas/);
 assert.match(api,/await conn\.beginTransaction\(\)/);
 assert.match(api,/await conn\.commit\(\)/);
});
test('correção requer motivo e preserva histórico de informações',()=>{
 const api=read('backend/src/rotas/cuidado-mobile.js');
 assert.match(api,/patch\('\/checkins\/:id'/);
 assert.match(api,/patch\('\/medicamentos\/registros\/:id'/);
 assert.match(api,/motivo\.length<8/);
 assert.match(api,/INSERT INTO correcoes_checkins/);
 assert.match(api,/INSERT INTO correcoes_medicamentos/);
 assert.match(api,/c\.registrado_por_usuario_id=\?/);
 assert.match(api,/rm\.usuario_domiciliar_id=\?/);
});
test('não apaga banco na migração para versões existentes',()=>{
 const sql=read('database/migracao_portal_mobile.sql');
 assert.doesNotMatch(sql,/^\s*DROP\s+(TABLE|DATABASE)/mi);
 for(const parte of ['ALTER TABLE checkins_itens','ALTER TABLE ocorrencias','CREATE TABLE correcoes_checkins','CREATE TABLE correcoes_medicamentos'])
  assert.ok(sql.includes(parte));
});
test('painel profissional mostra relatos e correções',()=>{
 const api=read('backend/src/rotas/acompanhamento-clinico.js');
 const ui=read('frontend/src/paginas/AcompanhamentoClinico.jsx');
 assert.match(api,/JOIN pacientes p ON p\.id=o\.paciente_id/);
 assert.match(api,/JOIN pacientes p ON p\.id=rm\.paciente_id/);
 assert.match(api,/patch\('\/:pacienteId\/ocorrencias\/:ocorrenciaId'/);
 assert.match(ui,/Ocorrências domiciliares/);
 assert.match(ui,/Histórico de correções/);
});
