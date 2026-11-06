require('dotenv').config();
const banco=require('../src/banco/conexao');
const {verificarEstrutura}=require('../src/banco/verificar-estrutura');
(async()=>{
 try {
   const resultado=await verificarEstrutura(banco);
   console.log(`Banco Cuidar+ compatível: ${resultado.tabelas} tabelas e ${resultado.views} views.`);
 } catch(erro) {
   console.error('Estrutura incompatível:',erro.message);
   process.exitCode=1;
 } finally { await banco.end(); }
})();
