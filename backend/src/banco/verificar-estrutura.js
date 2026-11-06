/** Verifica estrutura SQL ANTES de iniciar a API. Não expõe segredos. */
const tabelasObrigatorias = [
  "fisioterapeutas",
  "pacientes",
  "exercicios",
  "rotinas",
  "rotinas_itens",
  "usuarios_domiciliares",
  "vinculos_cuidado",
  "convites_cuidado",
  "checkins",
  "checkins_itens",
  "alertas",
  "agendamentos",
  "metas_funcionais",
  "evolucoes_metas",
  "anotacoes_restritas",
  "medicamentos",
  "medicamentos_pacientes",
  "horarios_medicamentos",
  "rotinas_medicamentos",
  "registros_medicamentos",
  "ocorrencias",
  "notificacoes",
  "tentativas_entrega",
  "auditoria_acessos",
  "relatos_domiciliares",
  "autorizacoes_acesso",
  "correcoes_checkins",
  "correcoes_medicamentos"
];
const colunasObrigatorias = {
  fisioterapeutas: ['id','nome','email','senha_hash','ativo'],
  pacientes: ['id','fisioterapeuta_id','nome','data_nascimento','patologia_principal','status'],
  rotinas: ['id','paciente_id','fisioterapeuta_id','titulo','data_inicio','data_fim','status','dias_semana'],
  rotinas_itens: ['id','rotina_id','exercicio_id','series','repeticoes','dias_semana'],
  exercicios: ['id','nome','descricao','categoria'],
  medicamentos: ['id','nome','apresentacao'],
  medicamentos_pacientes: ['id','paciente_id','medicamento_id','registrado_por_fisioterapeuta_id','prescritor_nome','referencia_prescricao','orientacao_prescrita','dose_informada','via_administracao','frequencia_texto','data_inicio','data_fim','status'],
  rotinas_medicamentos: ['rotina_id','medicamento_paciente_id','paciente_id'],
  horarios_medicamentos: ['id','medicamento_paciente_id','horario','dias_semana','ativo'],
  registros_medicamentos: ['id','horario_id','data_programada','situacao','usuario_domiciliar_id'],
  usuarios_domiciliares: ['id','email','senha_hash','ativo'],
  vinculos_cuidado: ['usuario_id','paciente_id','status','pode_registrar','pode_ver_medicamentos'],
  convites_cuidado: ['id','token_hash','usado_em','expira_em'],
  checkins: ['id','paciente_id','rotina_id','data_registro','nivel_dor','registrado_por_usuario_id'],
  checkins_itens: ['checkin_id','rotina_item_id','resultado'],
  ocorrencias: ['id','paciente_id','usuario_domiciliar_id','tipo','intensidade_dor','status'],
  correcoes_checkins: ['id','checkin_id','usuario_domiciliar_id','motivo','dados_anteriores','dados_novos','criado_em'],
  correcoes_medicamentos: ['id','registro_medicamento_id','usuario_domiciliar_id','motivo','situacao_anterior','situacao_nova','criado_em'],
  checkins_itens: ['checkin_id','rotina_item_id','rotina_id','concluido'],
  alertas: ['id','paciente_id','fisioterapeuta_id','nivel_urgencia','status'],
  agendamentos: ['id','paciente_id','fisioterapeuta_id','data_hora_inicio'],
};

async function verificarEstrutura(banco) {
  const [linhas] = await banco.query(`SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()`);
  const esquema = new Map();
  for (const linha of linhas) {
    if (!esquema.has(linha.TABLE_NAME)) esquema.set(linha.TABLE_NAME,new Set());
    esquema.get(linha.TABLE_NAME).add(linha.COLUMN_NAME);
  }
  const ausentes = tabelasObrigatorias.filter(nome=>!esquema.has(nome));
  const colunasAusentes = [];
  for(const [tabela,colunas] of Object.entries(colunasObrigatorias)) {
    if(!esquema.has(tabela)) continue;
    for(const coluna of colunas) if(!esquema.get(tabela).has(coluna))
      colunasAusentes.push(`${tabela}.${coluna}`);
  }
  if (ausentes.length || colunasAusentes.length) {
    throw new Error(`Banco incompatível com a API. Tabelas ausentes: ${ausentes.join(', ')||'nenhuma'}. `+
      `Colunas ausentes: ${colunasAusentes.join(', ')||'nenhuma'}. `+
      `Se o banco ja existe, execute a migracao apropriada em database/migracao_portal_mobile.sql com backup.`);
  }
  const [v] = await banco.query(`SELECT TABLE_NAME FROM information_schema.VIEWS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('vw_dashboard_pacientes','vw_resumo_medicamentos')`);
  if(v.length !== 2) throw new Error('Views do Cuidar+ ausentes. Execute o SQL completo de desenvolvimento.');
  return {tabelas:tabelasObrigatorias.length,views:2};
}

module.exports={verificarEstrutura,tabelasObrigatorias,colunasObrigatorias};
