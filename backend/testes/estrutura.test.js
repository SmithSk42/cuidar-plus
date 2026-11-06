const test=require('node:test');
const assert=require('node:assert/strict');
const {verificarEstrutura,tabelasObrigatorias,colunasObrigatorias}=require('../src/banco/verificar-estrutura');
function falsoBanco(removerTabela=null,removerColuna=null){
  const linhas=[];
  for(const nome of tabelasObrigatorias){
    if(nome===removerTabela)continue;
    const campos=colunasObrigatorias[nome]||['id'];
    for(const campo of campos)if(`${nome}.${campo}`!==removerColuna)linhas.push({TABLE_NAME:nome,COLUMN_NAME:campo});
  }
  return {async query(sql){if(sql.includes('information_schema.COLUMNS'))return [linhas];
    if(sql.includes('information_schema.VIEWS'))return [[{TABLE_NAME:'vw_dashboard_pacientes'},{TABLE_NAME:'vw_resumo_medicamentos'}]];
    throw Error('Consulta inesperada');}};
}
test('Validação do banco aceita esquema completo',async()=>{
  assert.deepEqual(await verificarEstrutura(falsoBanco()),{tabelas:26,views:2});
});
test('Validação do banco detecta tabela ausente antes da API iniciar',async()=>{
  await assert.rejects(()=>verificarEstrutura(falsoBanco('rotinas_medicamentos')),/rotinas_medicamentos/);
});
test('Validação do banco detecta coluna ausente antes da API iniciar',async()=>{
  await assert.rejects(()=>verificarEstrutura(falsoBanco(null,'rotinas_medicamentos.paciente_id')),/rotinas_medicamentos.paciente_id/);
});
