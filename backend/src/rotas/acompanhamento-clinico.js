const express = require('express');
const banco = require('../banco/conexao');
const { exigirAutenticacao } = require('../intermediarios/autenticacao');
const { idPositivo, requisicaoInvalida } = require('../utilitarios/validacao');

const rotasAcompanhamentoClinico = express.Router();
rotasAcompanhamentoClinico.use(exigirAutenticacao);

// Dados exclusivamente do paciente vinculado ao fisioterapeuta autenticado.
// A consulta nao expõe anotacoes_restritas nem dados de outros profissionais.
rotasAcompanhamentoClinico.get('/:pacienteId', async (req, res, next) => {
  const pacienteId = idPositivo(req.params.pacienteId);
  if (!pacienteId) return requisicaoInvalida(res, 'Paciente inválido.');

  try {
    const [pacientes] = await banco.execute(`
      SELECT p.id, p.nome, p.nome_preferido, p.data_nascimento,
             p.patologia_principal, p.status, p.objetivo_geral,
             p.nome_familiar, p.telefone_familiar, p.data_ultimo_checkin,
             f.nome AS profissional_nome, f.crefito AS profissional_crefito
      FROM pacientes p
      JOIN fisioterapeutas f ON f.id = p.fisioterapeuta_id
      WHERE p.id = ? AND p.fisioterapeuta_id = ? LIMIT 1
    `, [pacienteId, req.usuario.id]);

    if (!pacientes.length) return res.status(404).json({ erro: 'Paciente não encontrado.' });

    const [rotinas] = await banco.execute(`
      SELECT r.id, r.titulo, r.status,
             DATE_FORMAT(r.data_inicio, '%Y-%m-%d') AS data_inicio,
             DATE_FORMAT(r.data_fim, '%Y-%m-%d') AS data_fim
      FROM rotinas r
      WHERE r.paciente_id = ? AND r.fisioterapeuta_id = ?
      ORDER BY (r.status = 'Ativa') DESC, r.data_inicio DESC, r.id DESC
      LIMIT 40
    `, [pacienteId, req.usuario.id]);

    const [exercicios] = await banco.execute(`
      SELECT r.id AS rotina_id, ri.id AS item_id, e.nome, e.descricao,
             ri.series, ri.repeticoes, ri.observacoes, ri.dias_semana
      FROM rotinas r
      JOIN rotinas_itens ri ON ri.rotina_id = r.id
      JOIN exercicios e ON e.id = ri.exercicio_id
      WHERE r.paciente_id = ? AND r.fisioterapeuta_id = ?
      ORDER BY r.id DESC, ri.id
    `, [pacienteId, req.usuario.id]);

    const [medicamentos] = await banco.execute(`
      SELECT r.id AS rotina_id, mp.id AS prescricao_id, m.nome, m.apresentacao,
             mp.dose_informada, mp.via_administracao, mp.frequencia_texto,
             mp.orientacao_prescrita, mp.prescritor_nome, mp.referencia_prescricao,
             mp.status, hm.id AS horario_id, hm.horario, hm.dias_semana
      FROM rotinas r
      JOIN rotinas_medicamentos rm ON rm.rotina_id = r.id AND rm.paciente_id = r.paciente_id
      JOIN medicamentos_pacientes mp ON mp.id = rm.medicamento_paciente_id AND mp.paciente_id = r.paciente_id
      JOIN medicamentos m ON m.id = mp.medicamento_id
      LEFT JOIN horarios_medicamentos hm ON hm.medicamento_paciente_id = mp.id AND hm.ativo = TRUE
      WHERE r.paciente_id = ? AND r.fisioterapeuta_id = ?
      ORDER BY r.id DESC, m.nome, hm.horario
    `, [pacienteId, req.usuario.id]);

    const [checkins] = await banco.execute(`
      SELECT c.id, c.rotina_id, r.titulo AS rotina_titulo,
             DATE_FORMAT(c.data_registro, '%Y-%m-%d') AS data_registro,
             c.nivel_dor, c.observacoes_paciente, c.origem_registro, c.criado_em,
             u.nome AS registrado_por,
             COUNT(ci.rotina_item_id) AS itens_registrados,
             COALESCE(SUM(ci.concluido = TRUE), 0) AS itens_concluidos
      FROM checkins c
      JOIN rotinas r ON r.id = c.rotina_id AND r.paciente_id = c.paciente_id
      LEFT JOIN usuarios_domiciliares u ON u.id = c.registrado_por_usuario_id
      LEFT JOIN checkins_itens ci ON ci.checkin_id = c.id
      WHERE c.paciente_id = ? AND r.fisioterapeuta_id = ?
      GROUP BY c.id, r.titulo, u.nome
      ORDER BY c.data_registro DESC, c.id DESC LIMIT 40
    `, [pacienteId, req.usuario.id]);

    const [registrosMedicamentos] = await banco.execute(`
      SELECT DATE_FORMAT(rm.data_programada, '%Y-%m-%d') AS data,
             COUNT(*) AS confirmacoes,
             SUM(rm.situacao = 'Administrado') AS administrados,
             SUM(rm.situacao = 'Nao_Administrado') AS nao_administrados,
             SUM(rm.situacao = 'Adiado') AS adiados
      FROM registros_medicamentos rm
      JOIN pacientes p ON p.id = rm.paciente_id
      WHERE p.id = ? AND p.fisioterapeuta_id = ?
      GROUP BY rm.data_programada
      ORDER BY rm.data_programada DESC LIMIT 40
    `, [pacienteId, req.usuario.id]);

    const [alertas] = await banco.execute(`
      SELECT a.id, a.descricao, a.nivel_urgencia, a.status,
             a.criado_em, a.resolvido_em
      FROM alertas a
      WHERE a.paciente_id = ? AND a.fisioterapeuta_id = ?
      ORDER BY (a.status = 'Pendente') DESC, a.criado_em DESC LIMIT 30
    `, [pacienteId, req.usuario.id]);

    const [ocorrencias] = await banco.execute(`
      SELECT o.id,o.tipo,o.descricao,o.intensidade_dor,o.status,o.ocorrido_em,
             u.nome AS registrado_por
      FROM ocorrencias o
      JOIN pacientes p ON p.id=o.paciente_id
      LEFT JOIN usuarios_domiciliares u ON u.id=o.usuario_domiciliar_id
      WHERE o.paciente_id=? AND p.fisioterapeuta_id=?
      ORDER BY o.ocorrido_em DESC,o.id DESC LIMIT 60
    `,[pacienteId,req.usuario.id]);

    const [correcoesCheckins] = await banco.execute(`
      SELECT cc.id,cc.checkin_id,cc.motivo,cc.criado_em,u.nome AS responsavel,
        JSON_EXTRACT(cc.dados_anteriores,'$.nivel_dor') AS dor_anterior,
        JSON_EXTRACT(cc.dados_novos,'$.nivel_dor') AS dor_atual
      FROM correcoes_checkins cc
      JOIN checkins c ON c.id=cc.checkin_id
      JOIN pacientes p ON p.id=c.paciente_id
      JOIN usuarios_domiciliares u ON u.id=cc.usuario_domiciliar_id
      WHERE c.paciente_id=? AND p.fisioterapeuta_id=?
      ORDER BY cc.criado_em DESC,cc.id DESC LIMIT 70
    `,[pacienteId,req.usuario.id]);

    const [correcoesMedicamentos] = await banco.execute(`
      SELECT cm.id,cm.motivo,cm.situacao_anterior,cm.situacao_nova,cm.criado_em,
        m.nome AS medicamento,u.nome AS responsavel
      FROM correcoes_medicamentos cm
      JOIN registros_medicamentos rm ON rm.id=cm.registro_medicamento_id
      JOIN pacientes p ON p.id=rm.paciente_id
      JOIN medicamentos_pacientes mp ON mp.id=rm.medicamento_paciente_id
      JOIN medicamentos m ON m.id=mp.medicamento_id
      JOIN usuarios_domiciliares u ON u.id=cm.usuario_domiciliar_id
      WHERE rm.paciente_id=? AND p.fisioterapeuta_id=?
      ORDER BY cm.criado_em DESC,cm.id DESC LIMIT 70
    `,[pacienteId,req.usuario.id]);

    const [metas] = await banco.execute(`
      SELECT descricao, prazo, status, DATE_FORMAT(data_prevista, '%Y-%m-%d') AS data_prevista
      FROM metas_funcionais
      WHERE paciente_id = ? AND fisioterapeuta_id = ?
      ORDER BY (status = 'Em_Andamento') DESC, criado_em DESC LIMIT 5
    `, [pacienteId, req.usuario.id]);

    const mapa = new Map(rotinas.map(rotina => [Number(rotina.id), { ...rotina, exercicios: [], medicamentos: [] }]));
    for (const item of exercicios) mapa.get(Number(item.rotina_id))?.exercicios.push(item);
    const prescricaoPorChave = new Map();
    for (const linha of medicamentos) {
      const rotina = mapa.get(Number(linha.rotina_id));
      if (!rotina) continue;
      const chave = `${linha.rotina_id}:${linha.prescricao_id}`;
      let prescricao = prescricaoPorChave.get(chave);
      if (!prescricao) {
        prescricao = {
          id: linha.prescricao_id, nome: linha.nome, apresentacao: linha.apresentacao,
          dose_informada: linha.dose_informada, via_administracao: linha.via_administracao,
          frequencia_texto: linha.frequencia_texto, orientacao_prescrita: linha.orientacao_prescrita,
          prescritor_nome: linha.prescritor_nome, referencia_prescricao: linha.referencia_prescricao,
          status: linha.status, horarios: []
        };
        rotina.medicamentos.push(prescricao);
        prescricaoPorChave.set(chave, prescricao);
      }
      if (linha.horario_id !== null) prescricao.horarios.push({
        id: linha.horario_id,
        horario: String(linha.horario).slice(0, 5),
        dias_semana: linha.dias_semana
      });
    }

    return res.json({
      paciente: pacientes[0],
      rotinas: [...mapa.values()],
      checkins,
      registros_medicamentos: registrosMedicamentos,
      alertas,
      ocorrencias,
      correcoes_checkins: correcoesCheckins,
      correcoes_medicamentos: correcoesMedicamentos,
      metas
    });
  } catch (erro) {
    return next(erro);
  }
});

// O status "Resolvido" significa que o alerta foi tratado no painel,
// nao que houve resolucao clinica da condicao relatada.
rotasAcompanhamentoClinico.patch('/:pacienteId/alertas/:alertaId', async (req, res, next) => {
  const pacienteId = idPositivo(req.params.pacienteId);
  const alertaId = idPositivo(req.params.alertaId);
  if (!pacienteId || !alertaId || req.body?.status !== 'Resolvido')
    return requisicaoInvalida(res, 'Informe um alerta válido e o status Resolvido.');

  try {
    const [resultado] = await banco.execute(`
      UPDATE alertas
      SET status = 'Resolvido'
      WHERE id = ? AND paciente_id = ? AND fisioterapeuta_id = ? AND status = 'Pendente'
    `, [alertaId, pacienteId, req.usuario.id]);
    if (!resultado.affectedRows) return res.status(404).json({ erro: 'Alerta pendente não encontrado.' });
    return res.json({ mensagem: 'Alerta marcado como resolvido no painel.' });
  } catch (erro) {
    return next(erro);
  }
});

// Encaminhamento administrativo do relato, nao diagnóstico nem atendimento emergencial.
rotasAcompanhamentoClinico.patch('/:pacienteId/ocorrencias/:ocorrenciaId',async(req,res,next)=>{
  const pacienteId=idPositivo(req.params.pacienteId),ocorrenciaId=idPositivo(req.params.ocorrenciaId);
  const status=req.body?.status;
  if(!pacienteId||!ocorrenciaId||!['Em_Analise','Encerrado'].includes(status))
    return requisicaoInvalida(res,'Informe ocorrência e status válidos.');
  let conn;
  try{
    conn=await banco.getConnection();await conn.beginTransaction();
    const [rows]=await conn.execute(`SELECT o.id,o.status FROM ocorrencias o
      JOIN pacientes p ON p.id=o.paciente_id AND p.fisioterapeuta_id=?
      WHERE o.id=? AND o.paciente_id=? FOR UPDATE`,[req.usuario.id,ocorrenciaId,pacienteId]);
    const ocorrencia=rows[0];
    if(!ocorrencia){await conn.rollback();return res.status(404).json({erro:'Ocorrência não encontrada.'});}
    if(ocorrencia.status==='Encerrado'||(ocorrencia.status==='Em_Analise'&&status==='Em_Analise')){
      await conn.rollback();return res.status(409).json({erro:'Ocorrência já possui este andamento ou foi encerrada.'});
    }
    await conn.execute('UPDATE ocorrencias SET status=? WHERE id=?',[status,ocorrenciaId]);
    if(status==='Encerrado'){
      await conn.execute(`UPDATE alertas SET status='Resolvido',
        comentario_resolucao='Relato encerrado administrativamente no painel. Não implica resolução clínica.'
        WHERE ocorrencia_id=? AND status='Pendente'`,[ocorrenciaId]);
    }
    await conn.execute(`INSERT INTO auditoria_acessos(tipo_ator,ator_id,paciente_id,acao,recurso,recurso_id)
      VALUES('Fisioterapeuta',?,? ,?,'ocorrencias',?)`,[req.usuario.id,pacienteId,`Alterou ocorrência para ${status}`,String(ocorrenciaId)]);
    await conn.commit();res.json({mensagem:'Andamento da ocorrência atualizado. Não representa resolução clínica.'});
  }catch(e){if(conn)await conn.rollback();next(e);}finally{conn?.release();}
});

module.exports = { rotasAcompanhamentoClinico };
