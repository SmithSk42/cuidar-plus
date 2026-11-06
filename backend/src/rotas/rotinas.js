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
  // Reúne os medicamentos e horários associados a cada rotina do profissional.
  // A filtragem por paciente e fisioterapeuta é obrigatória para proteger os dados clínicos.
  const [programacoes]=await banco.execute(`
    SELECT rm.rotina_id,
           mp.id AS medicamento_paciente_id,
           m.nome,
           m.apresentacao,
           mp.dose_informada,
           mp.via_administracao,
           mp.frequencia_texto,
           mp.orientacao_prescrita,
           mp.status AS status_medicamento,
           hm.horario,
           hm.dias_semana
      FROM rotinas_medicamentos rm
      JOIN rotinas r ON r.id=rm.rotina_id
      JOIN medicamentos_pacientes mp
        ON mp.id=rm.medicamento_paciente_id AND mp.paciente_id=r.paciente_id
      JOIN medicamentos m ON m.id=mp.medicamento_id
      LEFT JOIN horarios_medicamentos hm
        ON hm.medicamento_paciente_id=mp.id AND hm.ativo=TRUE
     WHERE r.paciente_id=? AND r.fisioterapeuta_id=?
     ORDER BY rm.rotina_id DESC,m.nome,hm.horario`,[paciente,req.usuario.id]);
  const rotinasPorId=new Map(rotinas.map(r=>[Number(r.id),{...r,medicamentos:[]}]));
  const medicamentosPorPrescricao=new Map();
  for(const item of programacoes){
    const rotina=rotinasPorId.get(Number(item.rotina_id));
    if(!rotina)continue;
    const chave=`${item.rotina_id}:${item.medicamento_paciente_id}`;
    let medicamento=medicamentosPorPrescricao.get(chave);
    if(!medicamento){
      medicamento={
        medicamento_paciente_id:item.medicamento_paciente_id,
        nome:item.nome,
        apresentacao:item.apresentacao,
        dose_informada:item.dose_informada,
        via_administracao:item.via_administracao,
        frequencia_texto:item.frequencia_texto,
        orientacao_prescrita:item.orientacao_prescrita,
        status:item.status_medicamento,
        horarios:[]
      };
      rotina.medicamentos.push(medicamento);
      medicamentosPorPrescricao.set(chave,medicamento);
    }
    if(item.horario!==null){
      medicamento.horarios.push({
        horario:String(item.horario).slice(0,5),
        dias_semana:item.dias_semana
      });
    }
  }
  res.json({rotinas:[...rotinasPorId.values()]});}catch(e){next(e);}
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
      await conexao.execute('INSERT INTO rotinas_medicamentos(rotina_id,medicamento_paciente_id,paciente_id) VALUES(?,?,?)',[r.insertId,pr.insertId,paciente]);
      for(const horario of m.horarios)await conexao.execute('INSERT INTO horarios_medicamentos(medicamento_paciente_id,horario,dias_semana) VALUES(?,?,?)',[pr.insertId,`${horario}:00`,normalizarDias(m.dias_semana)]);
    }
    await conexao.commit();res.status(201).json({id:r.insertId,mensagem:'Rotina salva com exercícios e medicamentos.'});
  }catch(e){if(conexao)await conexao.rollback();next(e);}finally{conexao?.release();}
});


// Edição da rotina ativa. Não exclui atividades e preserva evidências clínicas.
// Se já houver registros, uma nova versão é criada e a antiga fica concluída.
rotasRotinas.patch('/:rotinaId', async (req,res,next)=>{
  const rotinaId=idPositivo(req.params.rotinaId);
  const titulo=texto(req.body?.titulo,100);
  const itens=req.body?.itens, medicamentos=req.body?.medicamentos;
  if(!rotinaId||!titulo||!Array.isArray(itens)||!Array.isArray(medicamentos)||
     itens.length>30||medicamentos.length>20||(!itens.length&&!medicamentos.length))
    return requisicaoInvalida(res,'Rotina, título ou atividades inválidos.');
  if(medicamentos.length&&req.body?.confirmou_prescricao!==true)
    return requisicaoInvalida(res,'Confirme que os dados dos medicamentos reproduzem uma prescrição válida.');
  const idsEx=new Set(),idsMed=new Set();
  for(const item of itens){
    const id=idPositivo(item?.item_id);
    if(!id||idsEx.has(id)||!inteiroEntre(item.series,1,50)||!inteiroEntre(item.repeticoes,1,1000)||
       !validarDias(item.dias_semana)||(item.observacoes&&!texto(item.observacoes,150)))
      return requisicaoInvalida(res,'Confira os exercícios, séries, repetições e dias.');
    idsEx.add(id);
  }
  for(const med of medicamentos){
    const id=idPositivo(med?.prescricao_id);
    if(!id||idsMed.has(id)||!texto(m.dose_informada,100)||!texto(m.via_administracao,80)||
       !texto(m.frequencia_texto,120)||!texto(m.orientacao_prescrita,500)||
       !Array.isArray(med.horarios)||!med.horarios.length||med.horarios.length>12){
      return requisicaoInvalida(res,'Confira os dados da prescrição e seus horários.');
    }
    const idsHoras=new Set(),horas=new Set();
    for(const horario of med.horarios){
      const horarioId=idPositivo(horario?.id);
      if(!horarioId||idsHoras.has(horarioId)||!horarioValido(horario.horario)||
         horas.has(horario.horario)||!validarDias(horario.dias_semana))
        return requisicaoInvalida(res,'Horários duplicados ou inválidos.');
      idsHoras.add(horarioId);horas.add(horario.horario);
    }
    idsMed.add(id);
  }
  let conexao;
  try{
    conexao=await banco.getConnection();await conexao.beginTransaction();
    const [rs]=await conexao.execute(`SELECT id,paciente_id,fisioterapeuta_id,titulo,
      DATE_FORMAT(data_inicio,'%Y-%m-%d') AS data_inicio,
      DATE_FORMAT(data_fim,'%Y-%m-%d') AS data_fim,status
      FROM rotinas WHERE id=? AND fisioterapeuta_id=? AND status='Ativa' FOR UPDATE`,[rotinaId,req.usuario.id]);
    const atual=rs[0];
    if(!atual){await conexao.rollback();return res.status(404).json({erro:'Rotina ativa não encontrada para este profissional.'});}
    const [originaisEx]=await conexao.execute('SELECT id,exercicio_id FROM rotinas_itens WHERE rotina_id=? ORDER BY id FOR UPDATE',[rotinaId]);
    const [originaisMed]=await conexao.execute(`SELECT mp.id,mp.medicamento_id,mp.prescritor_nome,
      mp.referencia_prescricao FROM rotinas_medicamentos rm
      JOIN medicamentos_pacientes mp ON mp.id=rm.medicamento_paciente_id AND mp.paciente_id=rm.paciente_id
      WHERE rm.rotina_id=? AND rm.paciente_id=? ORDER BY mp.id FOR UPDATE`,[rotinaId,atual.paciente_id]);
    const todasHoras=[];
    for(const original of originaisMed){
      const [horarios]=await conexao.execute('SELECT id,medicamento_paciente_id FROM horarios_medicamentos WHERE medicamento_paciente_id=? AND ativo=TRUE ORDER BY id FOR UPDATE',[original.id]);
      todasHoras.push(...horarios);
    }
    if(originaisEx.length!==itens.length||originaisMed.length!==medicamentos.length||
      originaisEx.some(x=>!idsEx.has(Number(x.id)))||originaisMed.some(x=>!idsMed.has(Number(x.id)))){
      await conexao.rollback();return requisicaoInvalida(res,'A edição permite atualizar itens existentes, não adicionar ou remover itens.');
    }
    const horasOriginais=new Map();
    for(const h of todasHoras){
      const chave=String(h.medicamento_paciente_id),colecao=horasOriginais.get(chave)||new Set();
      colecao.add(Number(h.id));horasOriginais.set(chave,colecao);
    }
    for(const med of medicamentos){
      const esperados=horasOriginais.get(String(med.prescricao_id))||new Set();
      if(esperados.size!==med.horarios.length||med.horarios.some(h=>!esperados.has(Number(h.id)))){
        await conexao.rollback();return requisicaoInvalida(res,'Atualize os horários existentes; cadastros ou remoções de horários exigem uma nova rotina.');
      }
    }
    const [historico]=await conexao.execute(`SELECT
      (SELECT COUNT(*) FROM checkins WHERE rotina_id=?) AS checkins,
      (SELECT COUNT(*) FROM registros_medicamentos reg
       JOIN rotinas_medicamentos rm ON rm.medicamento_paciente_id=reg.medicamento_paciente_id
       WHERE rm.rotina_id=?) AS medicamentos`,[rotinaId,rotinaId]);
    const criarVersao=Number(historico[0].checkins)>0||Number(historico[0].medicamentos)>0;
    let destinoId=rotinaId;
    let novaDataInicio=atual.data_inicio;
    if(criarVersao){
      const [[{hoje}]]=await conexao.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoje");
      novaDataInicio=atual.data_inicio>hoje?atual.data_inicio:hoje;
      if(atual.data_fim && atual.data_fim<novaDataInicio){
        await conexao.rollback();return res.status(409).json({erro:'A rotina já terminou. Crie outra rotina com novo período.'});
      }
      const [inserida]=await conexao.execute(`INSERT INTO rotinas
        (paciente_id,fisioterapeuta_id,titulo,data_inicio,data_fim)
        VALUES(?,?,?,?,?)`,[atual.paciente_id,req.usuario.id,titulo,novaDataInicio,atual.data_fim]);
      destinoId=inserida.insertId;
    }else{
      await conexao.execute('UPDATE rotinas SET titulo=? WHERE id=?',[titulo,rotinaId]);
    }
    const mapaEx=new Map(originaisEx.map(x=>[Number(x.id),x]));
    for(const item of itens){
      const original=mapaEx.get(Number(item.item_id));
      if(criarVersao){
        await conexao.execute(`INSERT INTO rotinas_itens
          (rotina_id,exercicio_id,series,repeticoes,observacoes,dias_semana)
          VALUES(?,?,?,?,?,?)`,[destinoId,original.exercicio_id,item.series,item.repeticoes,item.observacoes?.trim()||null,normalizarDias(item.dias_semana)]);
      }else{
        await conexao.execute(`UPDATE rotinas_itens SET series=?,repeticoes=?,observacoes=?,dias_semana=?
          WHERE id=? AND rotina_id=?`,[item.series,item.repeticoes,item.observacoes?.trim()||null,normalizarDias(item.dias_semana),item.item_id,rotinaId]);
      }
    }
    const mapaMed=new Map(originaisMed.map(x=>[Number(x.id),x]));
    for(const med of medicamentos){
      const original=mapaMed.get(Number(med.prescricao_id));
      let prescricaoDestino=original.id;
      if(criarVersao){
        const [novo]=await conexao.execute(`INSERT INTO medicamentos_pacientes
          (paciente_id,medicamento_id,registrado_por_fisioterapeuta_id,prescritor_nome,
           referencia_prescricao,orientacao_prescrita,dose_informada,via_administracao,
           frequencia_texto,data_inicio,data_fim)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[
            atual.paciente_id,original.medicamento_id,req.usuario.id,original.prescritor_nome,
            original.referencia_prescricao,med.orientacao_prescrita.trim(),med.dose_informada.trim(),
            med.via_administracao.trim(),med.frequencia_texto.trim(),novaDataInicio,atual.data_fim
          ]);
        prescricaoDestino=novo.insertId;
        await conexao.execute(`INSERT INTO rotinas_medicamentos (rotina_id,medicamento_paciente_id,paciente_id)
          VALUES(?,?,?)`,[destinoId,prescricaoDestino,atual.paciente_id]);
      }else{
        await conexao.execute(`UPDATE medicamentos_pacientes
          SET orientacao_prescrita=?,dose_informada=?,via_administracao=?,frequencia_texto=?
          WHERE id=? AND paciente_id=?`,[med.orientacao_prescrita.trim(),med.dose_informada.trim(),
            med.via_administracao.trim(),med.frequencia_texto.trim(),original.id,atual.paciente_id]);
      }
      // Desloca horários para valores temporários na mesma transação.
      // Permite trocar 08:00 e 20:00 sem violar UNIQUE antes do UPDATE definitivo.
      if(!criarVersao){
        for(let indice=0;indice<med.horarios.length;indice++){
          const h=med.horarios[indice];
          await conexao.execute(`UPDATE horarios_medicamentos SET horario=?
            WHERE id=? AND medicamento_paciente_id=? AND ativo=TRUE`,
            [`25:${String(indice).padStart(2,'0')}:00`,h.id,original.id]);
        }
      }
      for(const h of med.horarios){
        if(criarVersao){
          await conexao.execute(`INSERT INTO horarios_medicamentos
            (medicamento_paciente_id,horario,dias_semana) VALUES(?,?,?)`,
            [prescricaoDestino,h.horario+':00',normalizarDias(h.dias_semana)]);
        }else{
          await conexao.execute(`UPDATE horarios_medicamentos SET horario=?,dias_semana=?
            WHERE id=? AND medicamento_paciente_id=? AND ativo=TRUE`,
            [h.horario+':00',normalizarDias(h.dias_semana),h.id,original.id]);
        }
      }
    }
    if(criarVersao)await conexao.execute("UPDATE rotinas SET status='Concluida' WHERE id=?",[rotinaId]);
    await conexao.commit();
    return res.json({id:destinoId,versionada:criarVersao,mensagem:criarVersao?
      'Rotina atualizada em nova versão. O histórico anterior foi preservado.':'Rotina atualizada.'});
  }catch(e){if(conexao){try{await conexao.rollback();}catch{}}
    if(e.code==='ER_DUP_ENTRY')return res.status(409).json({erro:'Horários duplicados ou alterações conflitantes na rotina.'});
    return next(e);}
  finally{conexao?.release();}
});

module.exports={rotasRotinas};
