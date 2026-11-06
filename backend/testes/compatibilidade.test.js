const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ler=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('rotinas e SQL concordam nas colunas do vínculo de medicamentos',()=>{
 const rota=ler('src/rotas/rotinas.js');
 const sql=fs.readFileSync(path.join(__dirname,'../../database/cuidar_plus_completo.sql'),'utf8');
 assert.match(sql,/CREATE TABLE rotinas_medicamentos \([\s\S]*?paciente_id INT NOT NULL/);
 assert.match(rota,/INSERT INTO rotinas_medicamentos\(rotina_id,medicamento_paciente_id,paciente_id\)/);
});
test('dashboard respeita dia semanal prescrito em vez de contar todos os dias',()=>{
 const rota=ler('src/rotas/dashboard.js');
 assert.match(rota,/WEEKDAY\(d\.dia\)/);
 assert.match(rota,/ri\.dias_semana/);
});
test('registro domiciliar confere permissões e datas',()=>{
 const rota=ler('src/rotas/cuidado.js');
 assert.match(rota,/v\.pode_registrar=TRUE/);
 assert.match(rota,/v\.pode_ver_medicamentos=TRUE/);
 assert.match(rota,/CURDATE\(\)/);
});
