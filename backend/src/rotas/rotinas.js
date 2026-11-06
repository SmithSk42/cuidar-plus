const express=require('express');
const banco=require('../banco/conexao');
const {exigirAutenticacao}=require('../intermediarios/autenticacao');
const {idPositivo,texto,dataValida,inteiroEntre,requisicaoInvalida}=require('../utilitarios/validacao');
const rotasRotinas=express.Router();
rotasRotinas.use(exigirAutenticacao);
rotasRotinas.get('/exercicios',async(_req,res,next)=>{
  try{const [itens]=await banco.execute('SELECT id,nome,descricao,categoria FROM exercicios ORDER BY nome');res.json({exercicios:itens});}
  catch(e){next(e);}
});
rotasRotinas.post('/exercicios',async(req,res,next)=>{
  const nome=texto(req.body?.nome,100),descricao=texto(req.body?.descricao,255);
  const categoria=req.body?.categoria;
  if(!nome||!descricao||!['Alongamento','Fortalecimento','Mobilidade','Respiratorio','Outros'].includes(categoria))
    return requisicaoInvalida(res,'Informe nome, descrição e uma categoria válida.');
  try{
    const [resultado]=await banco.execute('INSERT INTO exercicios(nome,descricao,categoria) VALUES(?,?,?)',[nome,descricao,categoria]);
    res.status(201).json({id:resultado.insertId,mensagem:'Exercício adicionado ao catálogo compartilhado.'});
  }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({erro:'Já existe um exercício com esse nome.'});next(e);}
});
rotasRotinas.get('/',async(req,res,next)=>{
  const paciente=idPositivo(req.query.paciente_id);
  if(!paciente)return requisicaoInvalida(res,'Informe paciente_id.');
  try{
    const [p]=await banco.execute('SELECT id FROM pacientes WHERE id=? AND fisioterapeuta_id=?',[paciente,req.usuario.id]);
    if(!p.length)return res.status(404).json({erro:'Paciente não encontrado.'});
    const [rotinas]=await banco.execute(`SELECT r.id,r.titulo,r.status,
      DATE_FORMAT(r.data_inicio,'%Y-%m-%d') AS data_inicio,
      DATE_FORMAT(r.data_fim,'%Y-%m-%d') AS data_fim,COUNT(ri.id) AS total_exercicios
      FROM rotinas r LEFT JOIN rotinas_itens ri ON ri.rotina_id=r.id
      WHERE r.paciente_id=? AND r.fisioterapeuta_id=? GROUP BY r.id ORDER BY r.data_inicio DESC`,[paciente,req.usuario.id]);
    res.json({rotinas});
  }catch(e){next(e);}
});
rotasRotinas.post('/',async(req,res,next)=>{
  const paciente=idPositivo(req.body?.paciente_id);
  const titulo=texto(req.body?.titulo,100),inicio=req.body?.data_inicio,fim=req.body?.data_fim||null;
  const itens=req.body?.itens;
  if(!paciente||!titulo||!dataValida(inicio)||(fim&&(!dataValida(fim)||fim<inicio))||!Array.isArray(itens)||itens.length<1||itens.length>30)
    return requisicaoInvalida(res,'Informe paciente, título, datas válidas e 1 a 30 exercícios.');
  const ids=new Set();
  for(const item of itens){
    const id=idPositivo(item?.exercicio_id);
    if(!id||ids.has(id)||!inteiroEntre(item.series,1,50)||!inteiroEntre(item.repeticoes,1,1000)|| (item.observacoes!=null&&item.observacoes!==''&&!texto(item.observacoes,150)))
      return requisicaoInvalida(res,'Exercícios duplicados ou séries/repetições inválidas.');
    ids.add(id);
  }
  let conexao;
  try{
    conexao=await banco.getConnection();await conexao.beginTransaction();
    const [p]=await conexao.execute("SELECT id FROM pacientes WHERE id=? AND fisioterapeuta_id=? AND status='Ativo' FOR UPDATE",[paciente,req.usuario.id]);
    if(!p.length){await conexao.rollback();return res.status(404).json({erro:'Paciente ativo não encontrado.'});}
    const lista=[...ids];
    const [exercicios]=await conexao.query(`SELECT id FROM exercicios WHERE id IN (${lista.map(()=>'?').join(',')})`,lista);
    if(exercicios.length!==lista.length){await conexao.rollback();return requisicaoInvalida(res,'Há exercício não cadastrado no catálogo.');}
    const [resultado]=await conexao.execute(`INSERT INTO rotinas(paciente_id,fisioterapeuta_id,titulo,data_inicio,data_fim)
      VALUES(?,?,?,?,?)`,[paciente,req.usuario.id,titulo,inicio,fim]);
    for(const item of itens){
      await conexao.execute(`INSERT INTO rotinas_itens(rotina_id,exercicio_id,series,repeticoes,observacoes)
        VALUES(?,?,?,?,?)`,[resultado.insertId,Number(item.exercicio_id),item.series,item.repeticoes,(item.observacoes||'').trim()||null]);
    }
    await conexao.commit();res.status(201).json({id:resultado.insertId,mensagem:'Rotina criada.'});
  }catch(e){if(conexao)await conexao.rollback();next(e);}finally{conexao?.release();}
});
module.exports={rotasRotinas};
