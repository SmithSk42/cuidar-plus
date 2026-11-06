const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {createHash}=require('node:crypto');
const banco=require('../banco/conexao');
const {exigirAcessoDomiciliar}=require('../intermediarios/acesso-domiciliar');
const {idPositivo,emailValido,inteiroEntre,requisicaoInvalida}=require('../utilitarios/validacao');
const rotasCuidado=express.Router();
const tentativasLogin=new Map();
const tokenHash=(valor)=>createHash('sha256').update(valor).digest('hex');
const tokenDomiciliar=(id)=>jwt.sign({id,perfil:'domiciliar'},process.env.SEGREDO_JWT,{algorithm:'HS256',expiresIn:'12h'});

rotasCuidado.post('/ativar',async(req,res,next)=>{
  const codigo=req.body?.convite,senha=req.body?.senha;
  if(typeof codigo!=='string'||!/^[0-9a-f]{64}$/.test(codigo)||typeof senha!=='string'||senha.length<10||senha.length>128)
    return requisicaoInvalida(res,'Convite inválido ou senha com menos de 10 caracteres.');
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const [convites]=await conn.execute(`SELECT id,paciente_id,nome_convidado,email,papel FROM convites_cuidado
      WHERE token_hash=? AND usado_em IS NULL AND expira_em>NOW() LIMIT 1 FOR UPDATE`,[tokenHash(codigo)]);
    const convite=convites[0];
    if(!convite){await conn.rollback();return res.status(400).json({erro:'Convite expirado ou já utilizado.'});}
    const [existentes]=await conn.execute('SELECT id FROM usuarios_domiciliares WHERE email=? LIMIT 1',[convite.email]);
    if(existentes.length){await conn.rollback();return res.status(409).json({erro:'Este e-mail já possui conta. Entre e use a opção Aceitar convite.'});}
    const hash=await bcrypt.hash(senha,12);
    const [criado]=await conn.execute('INSERT INTO usuarios_domiciliares(nome,email,senha_hash) VALUES(?,?,?)',
      [convite.nome_convidado,convite.email,hash]);
    await conn.execute('INSERT INTO vinculos_cuidado(usuario_id,paciente_id,papel) VALUES(?,?,?)',
      [criado.insertId,convite.paciente_id,convite.papel]);
    await conn.execute('UPDATE convites_cuidado SET usado_em=NOW() WHERE id=?',[convite.id]);
    await conn.commit();
    res.status(201).json({token:tokenDomiciliar(criado.insertId),usuario:{id:criado.insertId,nome:convite.nome_convidado,perfil:'domiciliar'}});
  }catch(e){if(conn)await conn.rollback();next(e);}finally{conn?.release();}
});

rotasCuidado.post('/login',async(req,res,next)=>{
  const email=emailValido(req.body?.email),senha=req.body?.senha;
  if(!email||typeof senha!=='string'||senha.length>128)return requisicaoInvalida(res,'Informe e-mail e senha.');
  const chave=`${req.ip}:${email}`;const agora=Date.now();const controle=tentativasLogin.get(chave);
  if(controle && controle.ate>agora && controle.contagem>=8)return res.status(429).json({erro:'Muitas tentativas. Tente novamente mais tarde.'});
  try{
    const [p]=await banco.execute('SELECT id,nome,senha_hash,ativo FROM usuarios_domiciliares WHERE email=? LIMIT 1',[email]);
    const pessoa=p[0];
    const correto=await bcrypt.compare(senha,pessoa?.senha_hash||'$2b$12$C6UzMDM.H6dfI/f/IKcEeOeG0C.BmT9T8xHlYfXLaZ5IrI0jOs5P6');
    if(!pessoa?.ativo||!correto){tentativasLogin.set(chave,{ate:agora+15*60000,contagem:(controle?.ate>agora?controle.contagem:0)+1});return res.status(401).json({erro:'Credenciais inválidas.'});}
    tentativasLogin.delete(chave);
    res.json({token:tokenDomiciliar(pessoa.id),usuario:{id:pessoa.id,nome:pessoa.nome,perfil:'domiciliar'}});
  }catch(e){next(e);}
});

rotasCuidado.post('/aceitar-convite',exigirAcessoDomiciliar,async(req,res,next)=>{
  const codigo=req.body?.convite;
  if(typeof codigo!=='string'||!/^[0-9a-f]{64}$/.test(codigo))return requisicaoInvalida(res);
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const [rows]=await conn.execute(`SELECT id,paciente_id,papel,email FROM convites_cuidado
      WHERE token_hash=? AND usado_em IS NULL AND expira_em>NOW() LIMIT 1 FOR UPDATE`,[tokenHash(codigo)]);
    const convite=rows[0];
    if(!convite||convite.email.toLowerCase()!==req.usuarioDomiciliar.email.toLowerCase()){
      await conn.rollback();return res.status(403).json({erro:'Este convite não pertence à sua conta ou expirou.'});
    }
    await conn.execute(`INSERT INTO vinculos_cuidado(usuario_id,paciente_id,papel,status)
      VALUES(?,?,?,'Ativo') ON DUPLICATE KEY UPDATE status='Ativo',papel=VALUES(papel)`,
      [req.usuarioDomiciliar.id,convite.paciente_id,convite.papel]);
    await conn.execute('UPDATE convites_cuidado SET usado_em=NOW() WHERE id=?',[convite.id]);
    await conn.commit();res.json({mensagem:'Paciente vinculado à sua conta.'});
  }catch(e){if(conn)await conn.rollback();next(e);}finally{conn?.release();}
});

rotasCuidado.get('/meu-dia',exigirAcessoDomiciliar,async(req,res,next)=>{
  try{
    const [[{data_atual}]] = await banco.query("SELECT DATE_FORMAT(CURDATE(),'%Y-%m-%d') AS data_atual");
    const [rotinas]=await banco.execute(`SELECT p.id AS paciente_id,p.nome AS paciente,r.id AS rotina_id,r.titulo,
      c.id AS checkin_id,c.nivel_dor,c.observacoes_paciente,
      v.pode_registrar,v.pode_ver_medicamentos
      FROM vinculos_cuidado v
      JOIN pacientes p ON p.id=v.paciente_id AND p.status='Ativo'
      JOIN rotinas r ON r.paciente_id=p.id AND r.status='Ativa'
        AND r.data_inicio<=CURDATE() AND (r.data_fim IS NULL OR r.data_fim>=CURDATE())
      AND (r.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),r.dias_semana)>0)
      LEFT JOIN checkins c ON c.paciente_id=p.id AND c.rotina_id=r.id AND c.data_registro=CURDATE()
      WHERE v.usuario_id=? AND v.status='Ativo' ORDER BY p.nome,r.titulo`,[req.usuarioDomiciliar.id]);
    if(!rotinas.length)return res.json({rotinas:[],data:data_atual});
    const ids=rotinas.map(r=>r.rotina_id);
    const [itens]=await banco.query(`SELECT ri.id AS rotina_item_id,ri.rotina_id,e.nome,e.descricao,
      ri.series,ri.repeticoes,ri.observacoes
      FROM rotinas_itens ri JOIN exercicios e ON e.id=ri.exercicio_id
      WHERE ri.rotina_id IN (${ids.map(()=>'?').join(',')}) AND (ri.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),ri.dias_semana)>0) ORDER BY ri.id`,ids);
    const mapa=new Map();for(const rotina of rotinas)mapa.set(rotina.rotina_id,{...rotina,itens:[],medicamentos:[]});
    for(const item of itens)mapa.get(item.rotina_id)?.itens.push(item);
    const [remedios]=await banco.query(`SELECT rm.rotina_id, hm.id AS horario_id, hm.horario, mp.id AS medicamento_paciente_id,
      m.nome, m.apresentacao, mp.dose_informada,mp.via_administracao,mp.orientacao_prescrita,
      reg.situacao AS registro_situacao FROM rotinas_medicamentos rm
      JOIN medicamentos_pacientes mp ON mp.id=rm.medicamento_paciente_id AND mp.status='Ativo'
        AND mp.data_inicio<=CURDATE() AND (mp.data_fim IS NULL OR mp.data_fim>=CURDATE())
      JOIN medicamentos m ON m.id=mp.medicamento_id
      JOIN horarios_medicamentos hm ON hm.medicamento_paciente_id=mp.id AND hm.ativo=TRUE
      LEFT JOIN registros_medicamentos reg ON reg.horario_id=hm.id AND reg.data_programada=CURDATE()
      JOIN vinculos_cuidado v ON v.paciente_id=mp.paciente_id AND v.usuario_id=?
        AND v.status='Ativo' AND v.pode_ver_medicamentos=TRUE
      WHERE rm.rotina_id IN (${ids.map(()=>'?').join(',')})
      AND (hm.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),hm.dias_semana)>0)
      ORDER BY hm.horario`,[req.usuarioDomiciliar.id,...ids]);
    for(const med of remedios)mapa.get(med.rotina_id)?.medicamentos.push(med);
    res.json({rotinas:[...mapa.values()],data:data_atual});
  }catch(e){next(e);}
});

rotasCuidado.post('/checkins',exigirAcessoDomiciliar,async(req,res,next)=>{
  const rotinaId=idPositivo(req.body?.rotina_id),dor=req.body?.nivel_dor;
  const observacoes=req.body?.observacoes_paciente==null?'':req.body.observacoes_paciente;
  const marcacoes=req.body?.itens;
  if(!rotinaId||!inteiroEntre(dor,0,10)||typeof observacoes!=='string'||observacoes.length>255||!Array.isArray(marcacoes)||marcacoes.length>30)
    return requisicaoInvalida(res,'Informe rotina, nível de dor (0 a 10) e exercícios.');
  const marcados=new Map();
  for(const item of marcacoes){const id=idPositivo(item?.rotina_item_id);
    if(!id||typeof item?.concluido!=='boolean'||marcados.has(id))return requisicaoInvalida(res,'Lista de exercícios inválida.');
    marcados.set(id,item.concluido);
  }
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const [p]=await conn.execute(`SELECT r.paciente_id,p.status FROM rotinas r
      JOIN pacientes p ON p.id=r.paciente_id
      JOIN vinculos_cuidado v ON v.paciente_id=p.id AND v.usuario_id=? AND v.status='Ativo' AND v.pode_registrar=TRUE
      WHERE r.id=? AND r.status='Ativa' AND r.data_inicio<=CURDATE()
      AND (r.data_fim IS NULL OR r.data_fim>=CURDATE())
      AND (r.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),r.dias_semana)>0) FOR UPDATE`,[req.usuarioDomiciliar.id,rotinaId]);
    if(!p.length||p[0].status!=='Ativo'){
      await conn.rollback();return res.status(403).json({erro:'Rotina não disponível para seu acompanhamento.'});
    }
    const [itens]=await conn.execute("SELECT id FROM rotinas_itens WHERE rotina_id=? AND (dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),dias_semana)>0) ORDER BY id FOR UPDATE",[rotinaId]);
    if(!itens.length){await conn.rollback();return requisicaoInvalida(res,'Nenhum exercício programado nesta rotina hoje.');}
    if(itens.length!==marcados.size||itens.some(item=>!marcados.has(item.id))){
      await conn.rollback();return requisicaoInvalida(res,'Confirme todos os exercícios desta rotina.');
    }
    const [existente]=await conn.execute('SELECT id FROM checkins WHERE paciente_id=? AND rotina_id=? AND data_registro=CURDATE() LIMIT 1',[p[0].paciente_id,rotinaId]);
    if(existente.length){await conn.rollback();return res.status(409).json({erro:'Esta rotina já teve check-in hoje.'});}
    const [gravado]=await conn.execute(`INSERT INTO checkins
      (paciente_id,rotina_id,registrado_por_usuario_id,origem_registro,data_registro,nivel_dor,observacoes_paciente)
      VALUES(?,?,?,'Aplicativo',CURDATE(),?,?)`,
      [p[0].paciente_id,rotinaId,req.usuarioDomiciliar.id,dor,observacoes.trim()||null]);
    for(const item of itens){
      await conn.execute(`INSERT INTO checkins_itens(checkin_id,rotina_item_id,rotina_id,concluido)
        VALUES(?,?,?,?)`,[gravado.insertId,item.id,rotinaId,marcados.get(item.id)]);
    }
    await conn.commit();res.status(201).json({id:gravado.insertId,mensagem:'Check-in registrado. Seu fisioterapeuta poderá consultá-lo.'});
  }catch(e){if(conn)await conn.rollback();if(e.code==='ER_DUP_ENTRY')return res.status(409).json({erro:'Esta rotina já foi registrada hoje.'});next(e);}
  finally{conn?.release();}
});
rotasCuidado.post('/medicamentos/registrar',exigirAcessoDomiciliar,async(req,res,next)=>{
  const horarioId=idPositivo(req.body?.horario_id),situacao=req.body?.situacao;
  if(!horarioId||!['Administrado','Nao_Administrado','Adiado'].includes(situacao))return requisicaoInvalida(res,'Informe um horário e uma situação válida.');
  let conexao;
  try{
    conexao=await banco.getConnection();await conexao.beginTransaction();
    const [registros]=await conexao.execute(`SELECT hm.id AS horario_id,mp.id AS medicamento_paciente_id,mp.paciente_id
    FROM horarios_medicamentos hm JOIN medicamentos_pacientes mp ON mp.id=hm.medicamento_paciente_id
    JOIN vinculos_cuidado v ON v.paciente_id=mp.paciente_id AND v.usuario_id=? AND v.status='Ativo' AND v.pode_registrar=TRUE AND v.pode_ver_medicamentos=TRUE
    JOIN rotinas_medicamentos rm ON rm.medicamento_paciente_id=mp.id
    JOIN rotinas r ON r.id=rm.rotina_id AND r.status='Ativa' AND r.data_inicio<=CURDATE() AND (r.data_fim IS NULL OR r.data_fim>=CURDATE())
      AND (r.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),r.dias_semana)>0)
    WHERE hm.id=? AND hm.ativo=TRUE AND mp.status='Ativo' AND mp.data_inicio<=CURDATE()
    AND (mp.data_fim IS NULL OR mp.data_fim>=CURDATE())
    AND (hm.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(CURDATE())+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),hm.dias_semana)>0)
    LIMIT 1 FOR UPDATE`,[req.usuarioDomiciliar.id,horarioId]);
    const item=registros[0];if(!item){await conexao.rollback();return res.status(403).json({erro:'Horário não disponível para esta conta.'});}
    const [existentes]=await conexao.execute('SELECT id FROM registros_medicamentos WHERE horario_id=? AND data_programada=CURDATE() FOR UPDATE',[horarioId]);
    if(existentes.length){await conexao.rollback();return res.status(409).json({erro:'Este horário já foi registrado hoje.'});}
    await conexao.execute(`INSERT INTO registros_medicamentos(horario_id,medicamento_paciente_id,paciente_id,data_programada,horario_programado,situacao,data_hora_real,usuario_domiciliar_id,origem_registro)
      SELECT hm.id,mp.id,mp.paciente_id,CURDATE(),hm.horario,?,CASE WHEN ?='Administrado' THEN NOW() ELSE NULL END,?,'Aplicativo'
      FROM horarios_medicamentos hm JOIN medicamentos_pacientes mp ON mp.id=hm.medicamento_paciente_id WHERE hm.id=?`,[situacao,situacao,req.usuarioDomiciliar.id,horarioId]);
    await conexao.commit();res.status(201).json({mensagem:'Situação informada. O registro não substitui a prescrição.'});
  }catch(e){if(conexao)await conexao.rollback();if(e.code==='ER_DUP_ENTRY')return res.status(409).json({erro:'Horário já registrado hoje.'});next(e);}finally{conexao?.release();}
});
module.exports={rotasCuidado};
