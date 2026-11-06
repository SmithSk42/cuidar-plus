require('dotenv').config();
const bcrypt=require('bcryptjs');
const banco=require('../src/banco/conexao');
async function executar(){
 if(process.env.NODE_ENV==='production') throw Error('Operação manual desabilitada em produção.');
 const email=(process.env.EMAIL_FISIOTERAPEUTA_INICIAL||'').trim().toLowerCase();
 const senha=process.env.SENHA_FISIOTERAPEUTA_INICIAL;
 if(!email||!senha||senha.length<12||senha.length>128) throw Error('Informe EMAIL_FISIOTERAPEUTA_INICIAL e SENHA_FISIOTERAPEUTA_INICIAL (12–128 caracteres).');
 const hash=await bcrypt.hash(senha,12);
 const [resultado]=await banco.execute('UPDATE fisioterapeutas SET senha_hash=? WHERE email=? AND ativo=TRUE',[hash,email]);
 if(resultado.affectedRows!==1) throw Error('Conta profissional ativa não encontrada para este e-mail.');
 console.log('Senha redefinida com sucesso para '+email+'. Remova a senha inicial do .env.');
}
executar().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>banco.end());
