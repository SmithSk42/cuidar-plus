require('dotenv').config();
const bcrypt = require('bcryptjs');
const banco = require('../src/banco/conexao');
async function principal(){
  const senha=process.env.SENHA_FISIOTERAPEUTA_INICIAL;
  const email=(process.env.EMAIL_FISIOTERAPEUTA_INICIAL||'fisio@cuidarplus.com').toLowerCase();
  const nome=process.env.NOME_FISIOTERAPEUTA_INICIAL||'Fisioterapeuta Teste';
  const crefito=process.env.CREFITO_FISIOTERAPEUTA_INICIAL||'TESTE-001';
  if(!senha||senha.length<12)throw Error('Configure SENHA_FISIOTERAPEUTA_INICIAL com pelo menos 12 caracteres no backend/.env.');
  const [existentes]=await banco.execute('SELECT id FROM fisioterapeutas WHERE email=? LIMIT 1',[email]);
  if(existentes.length) {console.log('Conta já cadastrada. Nada foi alterado: '+email);return;}
  const hash=await bcrypt.hash(senha,12);
  await banco.execute('INSERT INTO fisioterapeutas(nome,crefito,email,senha_hash,ativo) VALUES(?,?,?,?,TRUE)',[nome,crefito,email,hash]);
  console.log('Conta de teste criada: '+email+' (senha não exibida).');
}
principal().catch(e=>{console.error('Falha no cadastro:',e.message);process.exitCode=1;}).finally(()=>banco.end());
