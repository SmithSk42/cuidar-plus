/** Portal mobile: somente pacientes autorizados, relatos e correcoes auditadas. */
const express = require('express');
const banco = require('../banco/conexao');
const { exigirAcessoDomiciliar } = require('../intermediarios/acesso-domiciliar');
const { idPositivo, inteiroEntre, requisicaoInvalida } = require('../utilitarios/validacao');
const rotasCuidadoMobile = express.Router();
rotasCuidadoMobile.use(exigirAcessoDomiciliar);
const OPCOES = ['Realizado','Parcial','Nao_Realizado'];
const SITUACOES = ['Administrado','Nao_Administrado','Adiado'];
const TIPOS = ['Dor','Queda','Exercicio','Medicamento','Outro'];
const nomeTipo = { Dor:'Dor ou desconforto', Queda:'Queda', Exercicio:'Dificuldade com exercício', Medicamento:'Problema com medicamento', Outro:'Outro problema' };
const textoCurto = (v,max) => typeof v === 'string' && v.trim().length <= max ? v.trim() : null;

async function vinculo(conn, usuarioId, pacienteId) {
  const [linhas] = await conn.execute(`SELECT v.pode_registrar, v.pode_ver_medicamentos, v.pode_ver_evolucao
    FROM vinculos_cuidado v JOIN pacientes p ON p.id=v.paciente_id AND p.status='Ativo'
    WHERE v.usuario_id=? AND v.paciente_id=? AND v.status='Ativo' LIMIT 1`, [usuarioId,pacienteId]);
  return linhas[0];
}
rotasCuidadoMobile.get('/pacientes',async(req,res,next)=>{
  try{
    const [pacientes]=await banco.execute(`SELECT p.id,p.nome,v.papel,v.pode_registrar,v.pode_ver_medicamentos,v.pode_ver_evolucao
      FROM vinculos_cuidado v JOIN pacientes p ON p.id=v.paciente_id AND p.status='Ativo'
      WHERE v.usuario_id=? AND v.status='Ativo' ORDER BY p.nome`,[req.usuarioDomiciliar.id]);
    res.json({pacientes});
  }catch(e){next(e);}
});
rotasCuidadoMobile.get('/historico',async(req,res,next)=>{
  const pacienteId=idPositivo(req.query.paciente_id);
  if(!pacienteId)return requisicaoInvalida(res,'Selecione um paciente válido.');
  try{
    const acesso=await vinculo(banco,req.usuarioDomiciliar.id,pacienteId);
    if(!acesso?.pode_ver_evolucao)return res.status(403).json({erro:'Sem autorização para consultar o histórico.'});
    const [checkins]=await banco.execute(`SELECT c.id,c.rotina_id,r.titulo AS rotina,c.registrado_por_usuario_id AS autor_id,
       DATE_FORMAT(c.data_registro,'%Y-%m-%d') AS data, c.nivel_dor,c.observacoes_paciente,c.criado_em,
       (SELECT COUNT(*) FROM correcoes_checkins cc WHERE cc.checkin_id=c.id) AS correcoes
       FROM checkins c JOIN rotinas r ON r.id=c.rotina_id AND r.paciente_id=c.paciente_id
       WHERE c.paciente_id=? ORDER BY c.data_registro DESC,c.id DESC LIMIT 60`,[pacienteId]);
    if(checkins.length){
      const ids=checkins.map(c=>c.id);
      const [itens]=await banco.query(`SELECT ci.checkin_id,ci.rotina_item_id,e.nome,ci.concluido,ci.resultado,ci.motivo_nao_realizacao
        FROM checkins_itens ci JOIN rotinas_itens ri ON ri.id=ci.rotina_item_id
        JOIN exercicios e ON e.id=ri.exercicio_id
        WHERE ci.checkin_id IN (${ids.map(()=>'?').join(',')}) ORDER BY ci.rotina_item_id`,ids);
      for(const c of checkins)c.itens=itens.filter(i=>Number(i.checkin_id)===Number(c.id)).map(i=>({
        rotina_item_id:i.rotina_item_id,nome:i.nome,
        situacao:i.resultado||(i.concluido?'Realizado':'Nao_Realizado'),
        motivo_nao_realizacao:i.motivo_nao_realizacao
      }));
    }
    let medicamentos=[];
    if(acesso.pode_ver_medicamentos){
      [medicamentos]=await banco.execute(`SELECT reg.id,reg.horario_id,m.nome,mp.dose_informada,reg.situacao,
        reg.usuario_domiciliar_id AS autor_id,reg.horario_programado,
        DATE_FORMAT(reg.data_hora_real,'%H:%i') AS hora_real,
        DATE_FORMAT(reg.data_programada,'%Y-%m-%d') AS data,reg.data_hora_real,reg.criado_em,
        (SELECT COUNT(*) FROM correcoes_medicamentos cm WHERE cm.registro_medicamento_id=reg.id) AS correcoes
        FROM registros_medicamentos reg
        JOIN medicamentos_pacientes mp ON mp.id=reg.medicamento_paciente_id
        JOIN medicamentos m ON m.id=mp.medicamento_id
        WHERE reg.paciente_id=? ORDER BY reg.data_programada DESC,reg.horario_programado DESC LIMIT 80`,[pacienteId]);
    }
    const [ocorrencias]=await banco.execute(`SELECT id,tipo,descricao,intensidade_dor,status,ocorrido_em,criado_em
      FROM ocorrencias WHERE paciente_id=? ORDER BY ocorrido_em DESC,id DESC LIMIT 60`,[pacienteId]);
    res.json({checkins,medicamentos,ocorrencias});
  }catch(e){next(e);}
});
rotasCuidadoMobile.post('/ocorrencias',async(req,res,next)=>{
  const pacienteId=idPositivo(req.body?.paciente_id);
  const tipo=req.body?.tipo;
  const descricao=textoCurto(req.body?.descricao,1000);
  const dor=req.body?.intensidade_dor;
  if(!pacienteId||!TIPOS.includes(tipo)||!descricao||descricao.length<8||
    (dor!==null&&dor!==undefined&&!inteiroEntre(dor,0,10))||
    (dor!==null&&dor!==undefined&&tipo!=='Dor'))
    return requisicaoInvalida(res,'Informe paciente, tipo, descrição (mínimo 8 caracteres) e dor válida, quando aplicável.');
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const acesso=await vinculo(conn,req.usuarioDomiciliar.id,pacienteId);
    if(!acesso?.pode_registrar){await conn.rollback();return res.status(403).json({erro:'Sem autorização para registrar ocorrência.'});}
    const [[paciente]]=await conn.execute('SELECT fisioterapeuta_id FROM pacientes WHERE id=?',[pacienteId]);
    const [criado]=await conn.execute(`INSERT INTO ocorrencias
      (paciente_id,usuario_domiciliar_id,tipo,descricao,intensidade_dor,ocorrido_em,origem_registro)
      VALUES(?,?,?,?,?,NOW(),'Aplicativo')`,[pacienteId,req.usuarioDomiciliar.id,tipo,descricao,dor??null]);
    const prioridade=tipo==='Queda'||(tipo==='Dor'&&dor>=7)?'Atencao':'Info';
    await conn.execute(`INSERT INTO alertas(paciente_id,fisioterapeuta_id,nivel_urgencia,descricao,ocorrencia_id)
       VALUES(?,?,?,?,?)`,[pacienteId,paciente.fisioterapeuta_id,prioridade,
       `Ocorrência domiciliar — ${nomeTipo[tipo]}: ${descricao}`.slice(0,200),criado.insertId]);
    await conn.execute(`INSERT INTO auditoria_acessos(tipo_ator,ator_id,paciente_id,acao,recurso,recurso_id)
      VALUES('Domiciliar',?,?,'Criou ocorrência','ocorrencias',?)`,[req.usuarioDomiciliar.id,pacienteId,String(criado.insertId)]);
    await conn.commit();res.status(201).json({id:criado.insertId,mensagem:'Relato registrado. A equipe poderá consultá-lo no painel, sem garantia de atendimento imediato.'});
  }catch(e){if(conn)await conn.rollback();next(e);}finally{conn?.release();}
});
rotasCuidadoMobile.patch('/checkins/:id',async(req,res,next)=>{
  const id=idPositivo(req.params.id),dor=req.body?.nivel_dor;
  const observacoes=textoCurto(req.body?.observacoes_paciente??'',255);
  const motivo=textoCurto(req.body?.motivo_correcao,250);
  const lista=req.body?.itens;
  if(!id||!inteiroEntre(dor,0,10)||observacoes===null||!motivo||motivo.length<8||!Array.isArray(lista)||lista.length>30)
    return requisicaoInvalida(res,'Informe nível de dor, atividades e motivo de correção (mínimo 8 caracteres).');
  const novos=new Map();
  for(const item of lista){
    const itemId=idPositivo(item?.rotina_item_id);
    const situacao=item?.situacao;
    const nota=textoCurto(item?.motivo_nao_realizacao??'',150);
    if(!itemId||!OPCOES.includes(situacao)||nota===null||novos.has(itemId))return requisicaoInvalida(res,'Atividade inválida.');
    novos.set(itemId,{situacao,motivo_nao_realizacao:nota});
  }
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const [rows]=await conn.execute(`SELECT c.id,c.paciente_id,c.rotina_id,c.nivel_dor,c.observacoes_paciente
      FROM checkins c JOIN vinculos_cuidado v ON v.paciente_id=c.paciente_id AND v.usuario_id=?
      AND v.status='Ativo' AND v.pode_registrar=TRUE
      WHERE c.id=? AND c.registrado_por_usuario_id=? LIMIT 1 FOR UPDATE`,
      [req.usuarioDomiciliar.id,id,req.usuarioDomiciliar.id]);
    const original=rows[0];
    if(!original){await conn.rollback();return res.status(403).json({erro:'Você só pode corrigir seus próprios registros com vínculo ativo.'});}
    const [itens]=await conn.execute(`SELECT rotina_item_id,concluido,resultado,motivo_nao_realizacao
       FROM checkins_itens WHERE checkin_id=? FOR UPDATE`,[id]);
    if(itens.length!==novos.size||itens.some(i=>!novos.has(Number(i.rotina_item_id)))){
      await conn.rollback();return requisicaoInvalida(res,'Informe exatamente os exercícios registrados neste check-in.');
    }
    const anterior={nivel_dor:original.nivel_dor,observacoes_paciente:original.observacoes_paciente,itens:itens.map(i=>({
      rotina_item_id:i.rotina_item_id,situacao:i.resultado||(i.concluido?'Realizado':'Nao_Realizado'),motivo_nao_realizacao:i.motivo_nao_realizacao||''
    }))};
    const atualizado={nivel_dor:dor,observacoes_paciente:observacoes||null,itens:itens.map(i=>({rotina_item_id:i.rotina_item_id,...novos.get(Number(i.rotina_item_id))}))};
    if(JSON.stringify(anterior)===JSON.stringify(atualizado)){
      await conn.rollback();return res.status(409).json({erro:'Nenhuma informação foi alterada.'});
    }
    await conn.execute(`INSERT INTO correcoes_checkins(checkin_id,usuario_domiciliar_id,motivo,dados_anteriores,dados_novos)
      VALUES(?,?,?,?,?)`,[id,req.usuarioDomiciliar.id,motivo,JSON.stringify(anterior),JSON.stringify(atualizado)]);
    await conn.execute('UPDATE checkins SET nivel_dor=?,observacoes_paciente=? WHERE id=?',
      [dor,observacoes||null,id]);
    for(const item of atualizado.itens){
      await conn.execute(`UPDATE checkins_itens SET concluido=?,resultado=?,motivo_nao_realizacao=?
       WHERE checkin_id=? AND rotina_item_id=?`,[
        item.situacao==='Realizado',item.situacao,item.motivo_nao_realizacao||null,id,item.rotina_item_id]);
    }
    await conn.commit();res.json({mensagem:'Check-in corrigido. A versão anterior foi preservada no histórico de alterações.'});
  }catch(e){if(conn)await conn.rollback();next(e);}finally{conn?.release();}
});
rotasCuidadoMobile.patch('/medicamentos/registros/:id',async(req,res,next)=>{
  const id=idPositivo(req.params.id),situacao=req.body?.situacao;
  const motivo=textoCurto(req.body?.motivo_correcao,250);
  const hora=req.body?.hora_administracao;
  if(!id||!SITUACOES.includes(situacao)||!motivo||motivo.length<8||
    (situacao==='Administrado'&& !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora||'')))
    return requisicaoInvalida(res,'Informe a situação, o motivo e o horário real se foi administrado.');
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const [rows]=await conn.execute(`SELECT rm.id,rm.paciente_id,rm.situacao,rm.data_hora_real,
      DATE_FORMAT(rm.data_programada,'%Y-%m-%d') AS data_programada,
      DATE_FORMAT(rm.data_hora_real,'%Y-%m-%d %H:%i:%s') AS horario_real_anterior
      FROM registros_medicamentos rm
      JOIN vinculos_cuidado v ON v.paciente_id=rm.paciente_id AND v.usuario_id=? AND v.status='Ativo'
      AND v.pode_registrar=TRUE AND v.pode_ver_medicamentos=TRUE
      WHERE rm.id=? AND rm.usuario_domiciliar_id=? LIMIT 1 FOR UPDATE`,
      [req.usuarioDomiciliar.id,id,req.usuarioDomiciliar.id]);
    const original=rows[0];
    if(!original){await conn.rollback();return res.status(403).json({erro:'Você só pode corrigir seus próprios registros de medicamentos.'});}
    const novaData=situacao==='Administrado'?`${original.data_programada} ${hora}:00`:null;
    const anteriorFormatada=original.horario_real_anterior;
    if(original.situacao===situacao && (situacao!=='Administrado'||String(anteriorFormatada||'').slice(0,16)===novaData.slice(0,16))){
      await conn.rollback();return res.status(409).json({erro:'Nenhuma informação foi alterada.'});
    }
    await conn.execute(`INSERT INTO correcoes_medicamentos(registro_medicamento_id,usuario_domiciliar_id,motivo,
      situacao_anterior,situacao_nova,horario_real_anterior,horario_real_novo) VALUES(?,?,?,?,?,?,?)`,
      [id,req.usuarioDomiciliar.id,motivo,original.situacao,situacao,anteriorFormatada||null,novaData]);
    await conn.execute(`UPDATE registros_medicamentos SET situacao=?,data_hora_real=? WHERE id=?`,[situacao,novaData,id]);
    await conn.commit();res.json({mensagem:'Registro corrigido, mantendo o histórico da informação anterior.'});
  }catch(e){if(conn)await conn.rollback();next(e);}finally{conn?.release();}
});
module.exports={rotasCuidadoMobile};
