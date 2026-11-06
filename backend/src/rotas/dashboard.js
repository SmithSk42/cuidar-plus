const express=require('express');
const banco=require('../banco/conexao');
const {exigirAutenticacao}=require('../intermediarios/autenticacao');
const rotasDashboard=express.Router();rotasDashboard.use(exigirAutenticacao);
rotasDashboard.get('/',async(req,res,next)=>{
  const periodo=['hoje','7dias','mes'].includes(req.query.periodo)?req.query.periodo:'hoje';
  const dataInicial=periodo==='hoje'?'CURDATE()':periodo==='7dias'?'DATE_SUB(CURDATE(),INTERVAL 6 DAY)':"DATE_FORMAT(CURDATE(),'%Y-%m-01')";
  const id=req.usuario.id;
  try{
    const [[ativos]]=await banco.execute("SELECT COUNT(*) AS total FROM pacientes WHERE fisioterapeuta_id=? AND status='Ativo'",[id]);
    const [[novos]]=await banco.execute("SELECT COUNT(*) AS total FROM pacientes WHERE fisioterapeuta_id=? AND criado_em>=DATE_FORMAT(CURDATE(),'%Y-%m-01')",[id]);
    const [[urgentes]]=await banco.execute(`SELECT COUNT(*) AS total FROM alertas a JOIN pacientes p ON p.id=a.paciente_id
      WHERE p.fisioterapeuta_id=? AND a.nivel_urgencia='Urgente' AND a.status='Pendente'`,[id]);
    const [alertas]=await banco.execute(`SELECT a.id,a.descricao,a.criado_em,p.id AS paciente_id,
      p.nome,p.patologia_principal,p.telefone_familiar FROM alertas a JOIN pacientes p ON p.id=a.paciente_id
      WHERE p.fisioterapeuta_id=? AND a.nivel_urgencia='Urgente' AND a.status='Pendente'
      ORDER BY a.criado_em DESC LIMIT 6`,[id]);
    // Dias previstos respeitam a agenda da rotina e de cada exercício.
    // Um dia SEM check-in conta como 'sem confirmação', nunca como executado.
    const [registros]=await banco.execute(`WITH RECURSIVE dias AS (
      SELECT DATE(${dataInicial}) AS dia
      UNION ALL SELECT DATE_ADD(dia,INTERVAL 1 DAY) FROM dias WHERE dia<CURDATE()
    ), esperado AS (
      SELECT p.id AS paciente_id,d.dia,r.id AS rotina_id,ri.id AS item_id
      FROM dias d JOIN pacientes p ON p.fisioterapeuta_id=? AND p.status='Ativo'
      JOIN rotinas r ON r.paciente_id=p.id AND r.status='Ativa'
        AND r.data_inicio<=d.dia AND (r.data_fim IS NULL OR r.data_fim>=d.dia)
        AND (r.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(d.dia)+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),r.dias_semana)>0)
      JOIN rotinas_itens ri ON ri.rotina_id=r.id
        AND (ri.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(d.dia)+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),ri.dias_semana)>0)
    ), contabilizado AS (
      SELECT e.paciente_id,COUNT(*) AS total_previstos,
        COALESCE(SUM(CASE WHEN ci.concluido=TRUE THEN 1 ELSE 0 END),0) AS total_concluidos
      FROM esperado e
      LEFT JOIN checkins c ON c.paciente_id=e.paciente_id AND c.rotina_id=e.rotina_id AND c.data_registro=e.dia
      LEFT JOIN checkins_itens ci ON ci.checkin_id=c.id AND ci.rotina_item_id=e.item_id
      GROUP BY e.paciente_id
    )
    SELECT p.id AS paciente_id,p.nome,p.patologia_principal,p.data_ultimo_checkin,
      CASE WHEN t.total_previstos IS NULL OR t.total_previstos=0 THEN NULL
        ELSE ROUND(100*t.total_concluidos/t.total_previstos,1) END AS percentual_adesao,
      COALESCE(t.total_previstos,0) AS total_previstos,COALESCE(t.total_concluidos,0) AS total_concluidos
      FROM pacientes p LEFT JOIN contabilizado t ON t.paciente_id=p.id
      WHERE p.fisioterapeuta_id=? AND p.status='Ativo' ORDER BY p.criado_em DESC`,[id,id]);
    const totais=registros.reduce((a,r)=>({previstos:a.previstos+r.total_previstos,concluidos:a.concluidos+r.total_concluidos}),{previstos:0,concluidos:0});
    const [[checkins]]=await banco.execute(`WITH RECURSIVE dias AS (
      SELECT DATE(${dataInicial}) AS dia
      UNION ALL SELECT DATE_ADD(dia,INTERVAL 1 DAY) FROM dias WHERE dia<CURDATE()
    ), previstos AS (
      SELECT p.id AS paciente_id,r.id AS rotina_id,d.dia
      FROM dias d JOIN pacientes p ON p.fisioterapeuta_id=? AND p.status='Ativo'
      JOIN rotinas r ON r.paciente_id=p.id AND r.status='Ativa'
        AND r.data_inicio<=d.dia AND (r.data_fim IS NULL OR r.data_fim>=d.dia)
        AND (r.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(d.dia)+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),r.dias_semana)>0)
      WHERE EXISTS(SELECT 1 FROM rotinas_itens ri WHERE ri.rotina_id=r.id
        AND (ri.dias_semana IS NULL OR FIND_IN_SET(ELT(WEEKDAY(d.dia)+1,'Seg','Ter','Qua','Qui','Sex','Sab','Dom'),ri.dias_semana)>0))
    ) SELECT COUNT(*) AS esperados,COALESCE(SUM(c.id IS NOT NULL),0) AS realizados
    FROM previstos e LEFT JOIN checkins c ON c.paciente_id=e.paciente_id AND c.rotina_id=e.rotina_id AND c.data_registro=e.dia`,[id]);
    res.json({pacientesAtivos:ativos.total,variacaoPacientes:novos.total,
      checkinsRealizados:checkins.realizados,checkinsEsperados:checkins.esperados,
      alertasUrgentes:urgentes.total,mediaAdesao:totais.previstos?Math.round(1000*totais.concluidos/totais.previstos)/10:null,
      alertas,pacientes:registros,totalPacientes:ativos.total,nomeProfissional:req.usuario.nome});
  }catch(e){next(e);}
});
module.exports={rotasDashboard};
