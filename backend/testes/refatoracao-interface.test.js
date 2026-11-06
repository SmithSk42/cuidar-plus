const teste = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname,'../..');
const ler = arquivo => fs.readFileSync(path.join(raiz,arquivo),'utf8');

teste('sidebar navega para acompanhamento pelo React Router, sem alert',()=>{
 const menu=ler('frontend/src/componentes/MenuLateral.jsx');
 assert.match(menu,/to:'\/acompanhamento-clinico'/);
 assert.match(menu,/<NavLink/);
 assert.match(menu,/<Link to="\/dashboard"/);
 assert.doesNotMatch(menu,/window\.alert|window\.location\.href/);
});
teste('logout requer confirmação explícita',()=>{
 const fonte=ler('frontend/src/componentes/ConfirmacaoSaida.jsx');
 assert.match(fonte,/Tem certeza que deseja sair do sistema\?/);
 assert.match(fonte,/Cancelar/);assert.match(fonte,/Sim, sair/);
 assert.match(fonte,/setShowLogoutModal\(true\)/);
 assert.match(fonte,/aoSair\?\.\(\)/);
});
teste('Dashboard e tela clínica abrem nova rotina no modal',()=>{
 for(const nome of ['Dashboard.jsx','AcompanhamentoClinico.jsx']){
   const codigo=ler(`frontend/src/paginas/${nome}`);
   assert.match(codigo,/isNovaRotinaModalOpen/);
   assert.match(codigo,/<NovaRotinaModal/);
 }
});
teste('editor utiliza PATCH com autorização e transação',()=>{
 const cliente=ler('frontend/src/paginas/AcompanhamentoClinico.jsx');
 const rota=ler('backend/src/rotas/rotinas.js');
 assert.match(cliente,/method:'PATCH'/);
 assert.match(cliente,/Editar Rotina/);
 assert.match(rota,/rotasRotinas\.patch\('\/:rotinaId'/);
 assert.match(rota,/fisioterapeuta_id=\?/);
 assert.match(rota,/beginTransaction\(\)/);
 assert.match(rota,/checkins WHERE rotina_id/);
 assert.match(rota,/UPDATE rotinas SET status='Concluida'/);
 assert.match(rota,/await conexao\.commit\(\)/);
});
teste('banco consolidado possui relacionamentos de edição',()=>{
 const sql=ler('database/cuidar_plus_completo.sql');
 for(const t of ['rotinas','rotinas_itens','rotinas_medicamentos','medicamentos_pacientes','horarios_medicamentos','checkins','registros_medicamentos'])
  assert.match(sql,new RegExp(`CREATE TABLE ${t} \\(`));
});
