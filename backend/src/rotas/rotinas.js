const express=require('express');
const banco=require('../banco/conexao');
const {exigirAutenticacao}=require('../intermediarios/autenticacao');
const {idPositivo,texto,dataValida,inteiroEntre,requisicaoInvalida}=require('../utilitarios/validacao');
const rotasRotinas=express.Router();
rotasRotinas.use(exigirAutenticacao);
const diasPermitidos=['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];
function validarDias(dias){return Array.isArray(dias)&&dias.length>=1&&dias.length<=7&&new Set(dias).size===dias.length&&dias.every(d=>diasPermitidos.includes(d));}
function normalizarDias(dias){return dias.length===7?null:dias.join(',');}
function horarioValido(h){return typeof h==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h);}
rotasRotinas.get('/exercicios',async(_req,res,next)=>{try{const [itens]=await banco.execute('SELECT id,nome,descricao,categoria FROM exercicios ORDER BY nome');res.json({exercicios:itens});}catch(e){next(e);}});
rotasRotinas.post('/exercicios',async(req,res,next)=>{
  const nome=texto(req.body?.nome,100),descricao=texto(req.body?.descricao,255),categoria=req.body?.categoria;
  if(!nome||!descricao||!['Alongamento','Fortalecimento','Mobilidade','Respiratorio','Outros'].includes(categoria))return requisicaoInvalida(res,'Informe nome, descrição e categoria.');
  try{const [r]=await banco.execute('INSERT INTO exercicios(nome,descricao,categoria) VALUES(?,?,?)',[nome,descricao,categoria]);res.status(201).json({id:r.insertId,nome,mensagem:'Exercício adicionado.'});}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({erro:'Exercício já cadastrado.'});next(e);}
});
rotasRotinas.get('/medicamentos',async(_req,res,next)=>{try{const [itens]=await banco.execute('SELECT id,nome,apresentacao FROM medicamentos ORDER BY nome');res.json({medicamentos:itens});}catch(e){next(e);}});
rotasRotinas.post('/medicamentos',async(req,res,next)=>{
  const nome=texto(req.body?.nome,150),apresentacao=req.body?.apresentacao?texto(req.body.apresentacao,120):null;
  if(!nome||(req.body?.apresentacao&&!apresentacao))return requisicaoInvalida(res,'Nome ou apresentação inválidos.');
  try{const [r]=await banco.execute('INSERT INTO medicamentos(nome,apresentacao) VALUES(?,?)',[nome,apresentacao]);res.status(201).json({id:r.insertId,nome});}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({erro:'Medicamento já cadastrado.'});next(e);}
});
rotasRotinas.get('/',async(req,res,next)=>{
  const paciente=idPositivo(req.query.paciente_id);if(!paciente)return requisicaoInvalida(res,'Informe paciente_id.');
  try{const [p]=await banco.execute('SELECT id FROM pacientes WHERE id=? AND fisioterapeuta_id=?',[paciente,req.usuario.id]);if(!p.length)return res.status(404).json({erro:'Paciente não encontrado.'});
  const [rotinas]=await banco.execute(`SELECT r.id,r.titulo,r.status,DATE_FORMAT(r.data_inicio,'%Y-%m-%d') AS data_inicio,DATE_FORMAT(r.data_fim,'%Y-%m-%d') AS data_fim,
  (SELECT COUNT(*) FROM rotinas_itens ri WHERE ri.rotina_id=r.id) AS total_exercicios,
  (SELECT COUNT(*) FROM rotinas_medicamentos rm WHERE rm.rotina_id=r.id) AS total_medicamentos FROM rotinas r WHERE r.paciente_id=? AND r.fisioterapeuta_id=? ORDER BY r.data_inicio DESC`,[paciente,req.usuario.id]);
  res.json({rotinas});}catch(e){next(e);}
});
rotasRotinas.post('/',async(req,res,next)=>{
  const paciente=idPositivo(req.body?.paciente_id),titulo=texto(req.body?.titulo,100),inicio=req.body?.data_inicio,fim=req.body?.data_fim||null;
  const itens=req.body?.itens||[],medicamentos=req.body?.medicamentos||[];
  if(!paciente||!titulo||!dataValida(inicio)||(fim&&(!dataValida(fim)||fim<inicio))||!Array.isArray(itens)||!Array.isArray(medicamentos)||itens.length>30||medicamentos.length>20||(!itens.length&&!medicamentos.length))return requisicaoInvalida(res,'Informe paciente, título, datas válidas e ao menos uma atividade.');
  const idsEx=new Set(),idsMed=new Set();
  for(const i of itens){const id=idPositivo(i?.exercicio_id);if(!id||idsEx.has(id)||!inteiroEntre(i.series,1,50)||!inteiroEntre(i.repeticoes,1,1000)||!validarDias(i.dias_semana)|| (i.observacoes&&!texto(i.observacoes,150)))return requisicaoInvalida(res,'Exercícios duplicados ou programação inválida.');idsEx.add(id);}
  for(const m of medicamentos){const id=idPositivo(m?.medicamento_id),horarios=m?.horarios;
    if(!id||idsMed.has(id)||!texto(m.prescritor_nome,150)||!texto(m.referencia_prescricao,200)||!texto(m.orientacao_prescrita,500)||!texto(m.dose_informada,100)||!texto(m.via_administracao,80)||!texto(m.frequencia_texto,120)||!validarDias(m.dias_semana)||!Array.isArray(horarios)||horarios.length<1||horarios.length>12||new Set(horarios).size!==horarios.length||!horarios.every(horarioValido))return requisicaoInvalida(res,'Confira os dados da prescrição existente e seus horários.');
    idsMed.add(id);
  }
  let conexao;
  try{
    conexao=await banco.getConnection();await conexao.beginTransaction();
    const [p]=await conexao.execute("SELECT id FROM pacientes WHERE id=? AND fisioterapeuta_id=? AND status='Ativo' FOR UPDATE",[paciente,req.usuario.id]);
    if(!p.length){await conexao.rollback();return res.status(404).json({erro:'Paciente ativo não encontrado.'});}
    if(idsEx.size){const lista=[...idsEx];const [a]=await conexao.query(`SELECT id FROM exercicios WHERE id IN (${lista.map(()=>'?').join(',')})`,lista);if(a.length!==lista.length){await conexao.rollback();return requisicaoInvalida(res,'Exercício inexistente.');}}
    if(idsMed.size){const lista=[...idsMed];const [a]=await conexao.query(`SELECT id FROM medicamentos WHERE id IN (${lista.map(()=>'?').join(',')})`,lista);if(a.length!==lista.length){await conexao.rollback();return requisicaoInvalida(res,'Medicamento inexistente.');}}
    const [r]=await conexao.execute('INSERT INTO rotinas(paciente_id,fisioterapeuta_id,titulo,data_inicio,data_fim) VALUES(?,?,?,?,?)',[paciente,req.usuario.id,titulo,inicio,fim]);
    for(const i of itens)await conexao.execute('INSERT INTO rotinas_itens(rotina_id,exercicio_id,series,repeticoes,observacoes,dias_semana) VALUES(?,?,?,?,?,?)',[r.insertId,i.exercicio_id,i.series,i.repeticoes,i.observacoes?.trim()||null,normalizarDias(i.dias_semana)]);
    for(const m of medicamentos){
      const [pr]=await conexao.execute(`INSERT INTO medicamentos_pacientes(paciente_id,medicamento_id,registrado_por_fisioterapeuta_id,prescritor_nome,referencia_prescricao,orientacao_prescrita,dose_informada,via_administracao,frequencia_texto,data_inicio,data_fim)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[paciente,m.medicamento_id,req.usuario.id,m.prescritor_nome.trim(),m.referencia_prescricao.trim(),m.orientacao_prescrita.trim(),m.dose_informada.trim(),m.via_administracao.trim(),m.frequencia_texto.trim(),inicio,fim]);
      await conexao.execute('INSERT INTO rotinas_medicamentos(rotina_id,medicamento_paciente_id) VALUES(?,?)',[r.insertId,pr.insertId]);
      for(const horario of m.horarios)await conexao.execute('INSERT INTO horarios_medicamentos(medicamento_paciente_id,horario,dias_semana) VALUES(?,?,?)',[pr.insertId,`${horario}:00`,normalizarDias(m.dias_semana)]);
    }
    await conexao.commit();res.status(201).json({id:r.insertId,mensagem:'Rotina salva com exercícios e medicamentos.'});
  }catch(e){if(conexao)await conexao.rollback();next(e);}finally{conexao?.release();}
});
module.exports={rotasRotinas};
