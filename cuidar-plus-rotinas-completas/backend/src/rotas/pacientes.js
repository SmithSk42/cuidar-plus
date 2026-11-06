const express = require('express');
const banco = require('../banco/conexao');
const {exigirAutenticacao} = require('../intermediarios/autenticacao');
const {idPositivo,texto,emailValido,dataValida,requisicaoInvalida} = require('../utilitarios/validacao');
const rotasPacientes = express.Router();
rotasPacientes.use(exigirAutenticacao);

rotasPacientes.get('/', async (req,res,next)=>{
  try {
    const [linhas]=await banco.execute(`SELECT id,nome,DATE_FORMAT(data_nascimento,'%Y-%m-%d') AS data_nascimento,
      patologia_principal,status,email,telefone,nome_familiar,telefone_familiar,data_ultimo_checkin
      FROM pacientes WHERE fisioterapeuta_id=? ORDER BY nome`,[req.usuario.id]);
    res.json({pacientes:linhas});
  }catch(erro){next(erro);}
});
rotasPacientes.post('/',async(req,res,next)=>{
  const nome=texto(req.body?.nome,100),patologia=texto(req.body?.patologia_principal,100);
  const data=req.body?.data_nascimento;
  const email=req.body?.email ? emailValido(req.body.email) : null;
  if(!nome||!patologia||!dataValida(data)||data>new Date().toISOString().slice(0,10)|| (req.body?.email&&!email))
    return requisicaoInvalida(res,'Informe nome, nascimento válido e patologia.');
  const telefone=req.body?.telefone ? texto(req.body.telefone,20) : null;
  const familiar=req.body?.nome_familiar ? texto(req.body.nome_familiar,100) : null;
  const telFamiliar=req.body?.telefone_familiar ? texto(req.body.telefone_familiar,20) : null;
  if((req.body?.telefone&&!telefone)||(req.body?.nome_familiar&&!familiar)||(req.body?.telefone_familiar&&!telFamiliar))
    return requisicaoInvalida(res,'Contato informado inválido.');
  try {
    const [resultado]=await banco.execute(`INSERT INTO pacientes
      (fisioterapeuta_id,nome,data_nascimento,email,telefone,patologia_principal,nome_familiar,telefone_familiar)
      VALUES(?,?,?,?,?,?,?,?)`,[req.usuario.id,nome,data,email,telefone,patologia,familiar,telFamiliar]);
    res.status(201).json({id:resultado.insertId,mensagem:'Paciente cadastrado.'});
  }catch(erro){if(erro.code==='ER_DUP_ENTRY') return res.status(409).json({erro:'E-mail de paciente já cadastrado.'}); next(erro);}
});
rotasPacientes.get('/:id/acompanhamento',async(req,res,next)=>{
  const id=idPositivo(req.params.id);if(!id)return requisicaoInvalida(res);
  try {
    const [p]=await banco.execute('SELECT id,nome,patologia_principal,status FROM pacientes WHERE id=? AND fisioterapeuta_id=?',[id,req.usuario.id]);
    if(!p[0])return res.status(404).json({erro:'Paciente não encontrado.'});
    const [registros]=await banco.execute(`SELECT c.id,c.rotina_id,r.titulo AS rotina,
      DATE_FORMAT(c.data_registro,'%Y-%m-%d') AS data_registro,c.nivel_dor,
      c.observacoes_paciente,c.origem_registro,u.nome AS registrado_por,
      COUNT(ci.rotina_item_id) AS total_itens,
      COALESCE(SUM(ci.concluido=1),0) AS itens_concluidos
      FROM checkins c JOIN rotinas r ON r.id=c.rotina_id
      LEFT JOIN usuarios_domiciliares u ON u.id=c.registrado_por_usuario_id
      LEFT JOIN checkins_itens ci ON ci.checkin_id=c.id
      WHERE c.paciente_id=? AND r.fisioterapeuta_id=?
      GROUP BY c.id,r.titulo,u.nome ORDER BY c.data_registro DESC,c.id DESC LIMIT 40`,[id,req.usuario.id]);
    res.json({paciente:p[0],checkins:registros});
  }catch(erro){next(erro);}
});
module.exports={rotasPacientes};
