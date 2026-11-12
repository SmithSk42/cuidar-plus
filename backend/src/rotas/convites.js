const express = require('express');
const {randomBytes,createHash}=require('node:crypto');
const banco = require('../banco/conexao');
const {exigirAutenticacao}=require('../intermediarios/autenticacao');
const {idPositivo,texto,emailValido,requisicaoInvalida}=require('../utilitarios/validacao');
const {obterOrigemConvite}=require('../utilitarios/origem-convite');
const rotasConvites=express.Router();
const hashToken=(codigo)=>createHash('sha256').update(codigo).digest('hex');
rotasConvites.post('/pacientes/:pacienteId/convites',exigirAutenticacao,async(req,res,next)=>{
  const pacienteId=idPositivo(req.params.pacienteId);
  const nome=texto(req.body?.nome,100),email=emailValido(req.body?.email);
  const papel=req.body?.papel;
  const autorizadoPor=texto(req.body?.autorizado_por,100);
  if(!pacienteId||!nome||!email||!['Paciente','Cuidador'].includes(papel)||!autorizadoPor||req.body?.confirmou_autorizacao!==true)
    return requisicaoInvalida(res,'Preencha o convidado e confirme a autorização de acesso concedida pelo paciente/responsável.');
  try{
    // Descobre a origem antes de gravar o convite, para não criar um token se a configuração for inválida.
    const origem=obterOrigemConvite(req);
    const [p]=await banco.execute('SELECT id FROM pacientes WHERE id=? AND fisioterapeuta_id=? AND status=?',[pacienteId,req.usuario.id,'Ativo']);
    if(!p.length)return res.status(404).json({erro:'Paciente ativo não encontrado.'});
    const codigo=randomBytes(32).toString('hex');
    await banco.execute(`INSERT INTO convites_cuidado
      (paciente_id,fisioterapeuta_id,nome_convidado,email,papel,token_hash,autorizado_por,expira_em)
      VALUES(?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 48 HOUR))`,
      [pacienteId,req.usuario.id,nome,email,papel,hashToken(codigo),autorizadoPor]);
    // O código não é armazenado em texto claro. Exibido somente uma vez ao profissional.
    res.status(201).json({link:`${origem}/cuidado?convite=${codigo}`,expira_em_horas:48,mensagem:'Convite criado. Compartilhe somente com a pessoa autorizada.'});
  }catch(e){next(e);}
});
module.exports={rotasConvites,hashToken};
