import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../servicos/api.js';
import {Link, useSearchParams} from 'react-router-dom';
import ConfirmacaoSaida from '../componentes/ConfirmacaoSaida.jsx';
import NovaRotinaModal from '../componentes/NovaRotinaModal.jsx';
import './acompanhamento-clinico.css';

const DIAS=['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];
const nomesDias = { Seg: 'Seg', Ter: 'Ter', Qua: 'Qua', Qui: 'Qui', Sex: 'Sex', Sab: 'Sáb', Dom: 'Dom' };
function Icone({ nome, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{nome}</span>;
}
function iniciais(nome = '') {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'CP';
}
function dataBrasileira(valor, comHora = false) {
  if (!valor) return 'Não informado';
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', comHora ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(data);
}
function diasLegiveis(valor) {
  if (!valor) return 'Todos os dias';
  return String(valor).split(',').map(dia => nomesDias[dia.trim()] || dia.trim()).join(', ');
}
function telefoneWhatsApp(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if (digitos.length >= 12 && digitos.length <= 13) return digitos;
  return null;
}

function CartaoVazio({ icone, titulo, descricao }) {
  return <div className="acli-vazio"><Icone nome={icone}/><strong>{titulo}</strong><span>{descricao}</span></div>;
}

export default function AcompanhamentoClinico({ sessao, aoSair }) {
  const token = sessao.token;
  const [parametros, definirParametros] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [pacientesProntos, setPacientesProntos] = useState(false);
  const [pacienteId, setPacienteId] = useState(() => {
    const id = Number(parametros.get('paciente_id'));
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  });
  const [dados, setDados] = useState(null);
  const [rotinaId, setRotinaId] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [processandoAlerta, setProcessandoAlerta] = useState(null);
  const [mostrarContato, setMostrarContato] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [prescricaoConferida, setPrescricaoConferida] = useState(false);
  const [isNovaRotinaModalOpen, setIsNovaRotinaModalOpen] = useState(false);

  const carregarPacientes = useCallback(async () => {
    const resposta = await apiRequest('/api/pacientes', { token });
    const encontrados = resposta.pacientes || [];
    setPacientes(encontrados);
    setPacientesProntos(true);
    setPacienteId(anterior => encontrados.some(p => Number(p.id) === Number(anterior))
      ? anterior : (encontrados[0]?.id ?? null));
  }, [token]);

  useEffect(() => {
    let ativo = true;
    carregarPacientes().catch(e => { if (ativo) { setErro(e.message); setCarregando(false); } });
    return () => { ativo = false; };
  }, [carregarPacientes]);

  const recarregar = useCallback(async (id, autorizado = () => true, rotinaPreferida = null) => {
    const resposta = await apiRequest(`/api/acompanhamento-clinico/${id}`, { token });
    if (autorizado()) {
      setDados(resposta);
      setRotinaId(anterior => resposta.rotinas.some(r => Number(r.id) === Number(rotinaPreferida || anterior))
        ? Number(rotinaPreferida || anterior) : (resposta.rotinas.find(r => r.status === 'Ativa')?.id || resposta.rotinas[0]?.id || null));
    }
  }, [token]);

  useEffect(() => {
    if (!pacientesProntos) return;
    if (!pacienteId) { setDados(null); setCarregando(false); return; }
    let ativo = true;
    setCarregando(true); setDados(null); setErro(''); setAviso('');
    recarregar(pacienteId, () => ativo)
      .catch(e => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [pacienteId, pacientesProntos, recarregar]);

  function selecionarPaciente(valor) {
    const id = Number(valor) || null;
    setPacienteId(id);
    setMostrarContato(false);
    setEditando(false);
    setFormulario(null);
    setPrescricaoConferida(false);
    const proximos = new URLSearchParams(parametros);
    if (id) proximos.set('paciente_id', String(id));
    else proximos.delete('paciente_id');
    definirParametros(proximos, {replace:true});
  }

  async function resolverAlerta(alerta) {
    if (!window.confirm('Marcar este alerta como resolvido no painel? Isso não confirma resolução clínica.')) return;
    setErro(''); setAviso(''); setProcessandoAlerta(alerta.id);
    try {
      await apiRequest(`/api/acompanhamento-clinico/${pacienteId}/alertas/${alerta.id}`, {
        method: 'PATCH', token, body: { status: 'Resolvido' }
      });
      await recarregar(pacienteId);
      setAviso('Alerta marcado como resolvido no painel.');
    } catch (e) { setErro(e.message); }
    finally { setProcessandoAlerta(null); }
  }

  function iniciarEdicao() {
    if (!rotina || rotina.status !== 'Ativa') return;
    setFormulario({
      titulo: rotina.titulo,
      itens: rotina.exercicios.map(e => ({
        item_id: Number(e.item_id), series: Number(e.series), repeticoes: Number(e.repeticoes),
        observacoes: e.observacoes || '', dias_semana: e.dias_semana ? String(e.dias_semana).split(',') : [...DIAS]
      })),
      medicamentos: rotina.medicamentos.map(m => ({
        prescricao_id: Number(m.id), dose_informada: m.dose_informada || '',
        via_administracao: m.via_administracao || '', frequencia_texto: m.frequencia_texto || '',
        orientacao_prescrita: m.orientacao_prescrita || '',
        horarios: m.horarios.map(h => ({id: Number(h.id), horario: String(h.horario).slice(0,5),
          dias_semana: h.dias_semana ? String(h.dias_semana).split(',') : [...DIAS]}))
      }))
    });
    setErro('');setAviso('');setPrescricaoConferida(false);setEditando(true);
  }
  function cancelarEdicao(){setEditando(false);setFormulario(null);setPrescricaoConferida(false);}
  function atualizarExercicio(id, campo, valor){setFormulario(p => ({...p,itens:p.itens.map(i => i.item_id===id?{...i,[campo]:valor}:i)}));}
  function atualizarMedicamento(id, campo, valor){setFormulario(p => ({...p,medicamentos:p.medicamentos.map(m => m.prescricao_id===id?{...m,[campo]:valor}:m)}));}
  function atualizarHorario(id, horarioId, campo, valor){setFormulario(p=>({...p,medicamentos:p.medicamentos.map(m=>m.prescricao_id===id?{...m,horarios:m.horarios.map(h=>h.id===horarioId?{...h,[campo]:valor}:h)}:m)}));}
  function alternarDia(valor, aoAtualizar, dia){
    const lista=valor.includes(dia)?valor.filter(d=>d!==dia):DIAS.filter(d=>valor.includes(d)||d===dia);
    if(lista.length)aoAtualizar(lista);
  }
  async function salvarEdicao(evento){
    evento.preventDefault();if(!formulario||!rotina)return;
    setSalvando(true);setErro('');setAviso('');
    try {
      const resposta=await apiRequest(`/api/rotinas/${rotina.id}`,{method:'PATCH',token,
        body:{...formulario,confirmou_prescricao:formulario.medicamentos.length?prescricaoConferida:false}});
      cancelarEdicao();
      await recarregar(pacienteId,()=>true,resposta.id);
      setAviso(resposta.mensagem||'Rotina atualizada.');
    } catch(e){setErro(e.message);} finally{setSalvando(false);}
  }
  const paciente = dados?.paciente;
  const rotina = useMemo(() => dados?.rotinas?.find(r => Number(r.id) === Number(rotinaId)) || null, [dados, rotinaId]);
  const confirmacoesPorDia = useMemo(() => new Map((dados?.registros_medicamentos || []).map(r => [r.data, r])), [dados]);
  const alertasPendentes = (dados?.alertas || []).filter(a => a.status === 'Pendente');
  const contatos = paciente?.telefone_familiar?.replace(/\D/g, '') || '';
  const whatsapp = telefoneWhatsApp(paciente?.telefone_familiar);
  const semInformacao = !carregando && !dados;

  return <div className="acli-app">
    <header className="acli-topo">
      <Link to="/dashboard" className="acli-logo" aria-label="Cuidar+ - Dashboard"><span className="acli-icone-logo"><Icone nome="cardiology"/></span>Cuidar<span>+</span></Link>
      <div className="acli-topo-direita"><span className="acli-descricao">Acompanhamento clínico domiciliar</span><span className="acli-avatar-prof">{iniciais(sessao.usuario?.nome)}</span><div className="acli-profissional"><b>{sessao.usuario?.nome}</b><small>Fisioterapeuta</small></div><ConfirmacaoSaida aoSair={aoSair} className="acli-sair">Sair</ConfirmacaoSaida></div>
    </header>

    <main className="acli-conteudo">
      <nav className="acli-links" aria-label="Navegação do profissional"><Link to="/dashboard">Dashboard</Link><Icone nome="chevron_right"/><strong>Acompanhamento individual</strong></nav>

      <section className="acli-seletor-card" aria-label="Seleção de paciente">
        <div><div className="acli-etiqueta">PAINEL DO FISIOTERAPEUTA</div><h1>Acompanhamento do paciente</h1><p>Consulte as rotinas, os registros domiciliares e as ocorrências de cada paciente.</p></div>
        <label className="acli-campo-selecao">Selecionar paciente
          <select aria-label="Selecionar paciente" value={pacienteId ?? ''} onChange={e => selecionarPaciente(e.target.value)} disabled={!pacientes.length}>
            {!pacientes.length && <option value="">Nenhum paciente cadastrado</option>}
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.status}</option>)}
          </select>
        </label>
      </section>

      {erro && <div className="acli-aviso-erro" role="alert">{erro}</div>}
      {aviso && <div className="acli-aviso-sucesso" role="status">{aviso}</div>}
      {carregando && <div className="acli-carregando" role="status">Carregando acompanhamento...</div>}
      {semInformacao && <CartaoVazio icone="person_search" titulo="Sem informações para exibir" descricao={pacientes.length ? 'Selecione um paciente ou tente recarregar a página.' : 'Cadastre seu primeiro paciente no painel de gerenciamento.'}/>}

      {paciente && <>
        <section className="acli-paciente-cabecalho">
          <div className="acli-paciente-identidade"><div className="acli-avatar-paciente">{iniciais(paciente.nome)}</div><div className="acli-paciente-detalhes">
            <div className="acli-nome-linha"><h2>{paciente.nome}</h2><span className={`acli-badge ${paciente.status === 'Ativo' ? 'verde' : 'neutro'}`}>{paciente.status}</span><small>Paciente #{paciente.id}</small></div>
            {paciente.nome_preferido && <p className="acli-preferido">Nome preferido: {paciente.nome_preferido}</p>}
            <p><Icone nome="stethoscope"/> <b>Patologia:</b> {paciente.patologia_principal}</p>
            {(paciente.objetivo_geral || dados.metas?.length > 0) && <p className="acli-meta"><Icone nome="target"/> <b>Meta:</b> {dados.metas.find(m => m.status === 'Em_Andamento')?.descricao || paciente.objetivo_geral || dados.metas[0]?.descricao}</p>}
          </div></div>
          <div className="acli-contato-area"><button type="button" className="acli-botao-claro" onClick={() => setMostrarContato(true)}><Icone nome="phone-call"/> Contato familiar</button></div>
        </section>

        <section className="acli-grade-principal">
          <div className="acli-coluna-principal">
            <section className="acli-bloco">
              <div className="acli-bloco-cabecalho"><div><h2><Icone nome="clipboard-list"/> Rotina prescrita</h2><p>Exercícios e medicamentos informados para acompanhamento domiciliar.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="acli-botao-secundario" onClick={()=>setIsNovaRotinaModalOpen(true)}><Icone nome="add_circle"/> Nova Rotina</button>{rotina?.status==='Ativa' && !editando && <button type="button" className="acli-botao-secundario" onClick={iniciarEdicao}><Icone nome="edit"/> Editar Rotina</button>}{editando&&<button type="button" className="acli-botao-secundario" disabled={salvando} onClick={cancelarEdicao}>Cancelar edição</button>}</div></div>
              {dados.rotinas.length ? <>
                <label className="acli-seletor-rotina">Rotina a visualizar
                  <select value={rotinaId ?? ''} disabled={editando} onChange={e => {setRotinaId(Number(e.target.value));cancelarEdicao();}}>
                    {dados.rotinas.map(r => <option value={r.id} key={r.id}>{r.titulo} — {r.status}</option>)}
                  </select>
                </label>
                {rotina && <>
                  <div className="acli-rotina-resumo"><div><h3>{rotina.titulo}</h3><span>Início: {dataBrasileira(rotina.data_inicio)}{rotina.data_fim ? ` · Fim: ${dataBrasileira(rotina.data_fim)}` : ' · Sem data final'}</span></div><span className={`acli-badge ${rotina.status === 'Ativa' ? 'verde' : 'neutro'}`}>{rotina.status}</span></div>
                  {editando&&<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Modo de edição: atualize apenas informações da rotina ativa. Caso já existam check-ins, o sistema preservará o histórico criando uma nova versão.</div>}
                  <form onSubmit={salvarEdicao}>
                  {editando&&<label className="mt-4 block text-sm font-semibold">Título da rotina<input required maxLength={100} className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={formulario?.titulo||''} onChange={e=>setFormulario(p=>({...p,titulo:e.target.value}))}/></label>}
                  <div className="acli-divisao"><div className="acli-secao-titulo"><h3><Icone nome="medication"/> Medicamentos e horários</h3><span>{rotina.medicamentos.length} prescrição(ões)</span></div>
                    {rotina.medicamentos.length ? rotina.medicamentos.map(m => <article className="acli-item" key={m.id}><div className="acli-item-topo"><div><strong>{m.nome}</strong>{m.apresentacao && <span>{m.apresentacao}</span>}</div><span className={`acli-badge ${m.status === 'Ativo' ? 'verde' : 'neutro'}`}>{m.status}</span></div><p><b>Dose informada:</b> {m.dose_informada} · <b>Via:</b> {m.via_administracao}</p><p><b>Frequência:</b> {m.frequencia_texto}</p><p className="acli-orientacao"><b>Orientação registrada:</b> {m.orientacao_prescrita}</p><p className="acli-origem-prescricao">Prescritor registrado: {m.prescritor_nome}{m.referencia_prescricao ? ` · Referência: ${m.referencia_prescricao}` : ''}</p><div className="acli-horarios">{m.horarios.length ? m.horarios.map(h => <span key={h.id}><Icone nome="schedule"/>{h.horario} · {diasLegiveis(h.dias_semana)}</span>) : <span>Sem horário ativo</span>}</div>
                    {editando&&<div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">{[
                      ['dose_informada','Dose (conforme prescrição)',100],
                      ['via_administracao','Via de administração',80],
                      ['frequencia_texto','Frequência prescrita',120],
                      ['orientacao_prescrita','Orientação da prescrição',500]
                    ].map(([campo,rotulo,max])=><label className="text-xs font-semibold" key={campo}>{rotulo}<input className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" required maxLength={max} value={formulario?.medicamentos.find(x=>x.prescricao_id===Number(m.id))?.[campo]||''} onChange={e=>atualizarMedicamento(Number(m.id),campo,e.target.value)}/></label>)}
                    <div className="sm:col-span-2"><span className="text-xs font-semibold">Horários existentes</span>{formulario?.medicamentos.find(x=>x.prescricao_id===Number(m.id))?.horarios.map(h=><div key={h.id} className="mt-2 rounded-lg bg-white p-2"><input type="time" aria-label="Horário programado" className="rounded-lg border border-slate-300 p-2" required value={h.horario} onChange={e=>atualizarHorario(Number(m.id),h.id,'horario',e.target.value)}/><div className="mt-2 flex flex-wrap gap-2">{DIAS.map(d=><label key={d} className="text-xs"><input type="checkbox" checked={h.dias_semana.includes(d)} onChange={()=>alternarDia(h.dias_semana,dias=>atualizarHorario(Number(m.id),h.id,'dias_semana',dias),d)}/> {d} </label>)}</div></div>)}</div>
                    </div>}
                    </article>) : <CartaoVazio icone="medication" titulo="Nenhum medicamento nesta rotina" descricao="Os medicamentos aparecerão aqui quando forem vinculados à rotina."/>}
                  </div>
                  <div className="acli-divisao"><div className="acli-secao-titulo"><h3><Icone nome="fitness_center"/> Exercícios terapêuticos</h3><span>{rotina.exercicios.length} exercício(s)</span></div>
                    {rotina.exercicios.length ? rotina.exercicios.map((e, i) => <article className="acli-item accli-exercicio" key={e.item_id}><div className="acli-exercicio-nome"><span className="acli-contador-ex">{i + 1}</span><strong>{e.nome}</strong></div><p>{e.series} série(s) de {e.repeticoes} repetição(ões) · <b>{diasLegiveis(e.dias_semana)}</b></p>{e.descricao && <p>{e.descricao}</p>}{e.observacoes && <p className="acli-orientacao"><b>Observação:</b> {e.observacoes}</p>}
                    {editando&&<div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
                      {[
                        ['series','Séries',50],['repeticoes','Repetições',1000]
                      ].map(([campo,rotulo,max])=><label className="text-xs font-semibold" key={campo}>{rotulo}<input type="number" required min="1" max={max} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={formulario?.itens.find(x=>x.item_id===Number(e.item_id))?.[campo]??''} onChange={ev=>atualizarExercicio(Number(e.item_id),campo,Number(ev.target.value))}/></label>)}
                      <label className="text-xs font-semibold sm:col-span-3">Observações<input maxLength={150} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={formulario?.itens.find(x=>x.item_id===Number(e.item_id))?.observacoes||''} onChange={ev=>atualizarExercicio(Number(e.item_id),'observacoes',ev.target.value)}/></label>
                      <fieldset className="sm:col-span-3"><legend className="text-xs font-semibold">Dias de realização</legend><div className="mt-2 flex flex-wrap gap-2">{DIAS.map(d=><label key={d} className="text-xs"><input type="checkbox" checked={formulario?.itens.find(x=>x.item_id===Number(e.item_id))?.dias_semana.includes(d)||false} onChange={()=>{const i=formulario.itens.find(x=>x.item_id===Number(e.item_id));alternarDia(i.dias_semana,dias=>atualizarExercicio(Number(e.item_id),'dias_semana',dias),d);}}/> {d} </label>)}</div></fieldset>
                    </div>}
                    </article>) : <CartaoVazio icone="fitness_center" titulo="Sem exercícios nesta rotina" descricao="Uma rotina pode conter apenas medicamentos; isso não é um erro."/>}
                  </div>
                  {editando&&<div className="mt-5 border-t border-slate-200 pt-4">
                    {formulario?.medicamentos.length>0&&<label className="mb-3 flex gap-2 text-xs text-slate-700"><input type="checkbox" required checked={prescricaoConferida} onChange={e=>setPrescricaoConferida(e.target.checked)}/> Confirmo que as alterações reproduzem prescrição existente de profissional habilitado.</label>}
                    <button type="submit" disabled={salvando} className="rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{salvando?'Salvando...':'Salvar alterações da rotina'}</button>
                  </div>}
                  </form>
                </>}
              </> : <CartaoVazio icone="event_note" titulo="Nenhuma rotina cadastrada" descricao="Crie uma rotina no painel para iniciar o acompanhamento."/>}
              <div className="acli-nota">As informações de medicamentos reproduzem orientações registradas de uma prescrição existente. O Cuidar+ não prescreve ou altera tratamentos.</div>
            </section>
          </div>

          <aside className="acli-coluna-lateral">
            <section className="acli-bloco accli-alertas"><div className="acli-bloco-cabecalho"><div><h2><Icone nome="notifications_active"/> Alertas do paciente</h2><p>Ocorrências que exigem análise profissional.</p></div>{alertasPendentes.length > 0 && <span className="acli-badge laranja">{alertasPendentes.length} pendente(s)</span>}</div>
              {alertasPendentes.length ? alertasPendentes.map(a => <article key={a.id} className={`acli-alerta ${a.nivel_urgencia === 'Urgente' ? 'urgente' : ''}`}><div className="acli-alerta-topo"><span className="acli-badge laranja">{a.nivel_urgencia}</span><time>{dataBrasileira(a.criado_em, true)}</time></div><p>{a.descricao}</p><button type="button" disabled={processandoAlerta === a.id} onClick={() => resolverAlerta(a)}><Icone nome="check_circle"/>{processandoAlerta === a.id ? 'Salvando...' : 'Marcar como resolvido'}</button></article>) : <CartaoVazio icone="verified" titulo="Nenhum alerta pendente" descricao="Os alertas são gerados a partir dos eventos registrados. Este painel não é um serviço de emergência."/>}
              {(dados.alertas.length > alertasPendentes.length) && <details className="acli-historico-alertas"><summary>Ver alertas concluídos ({dados.alertas.length - alertasPendentes.length})</summary>{dados.alertas.filter(a => a.status !== 'Pendente').map(a => <p key={a.id}><b>{a.status}:</b> {a.descricao} <small>{dataBrasileira(a.resolvido_em || a.criado_em)}</small></p>)}</details>}
            </section>
            <section className="acli-bloco"><div className="acli-bloco-cabecalho"><div><h2><Icone nome="calendar_month"/> Linha do tempo</h2><p>Histórico de check-ins e confirmações registradas.</p></div></div>
              {dados.checkins.length ? <div className="acli-timeline">{dados.checkins.map(c => {const medicamento = confirmacoesPorDia.get(c.data_registro);return <article key={c.id} className="acli-timeline-item"><div className="acli-timeline-data"><b>{dataBrasileira(c.data_registro)}</b><span className={`acli-badge ${Number(c.nivel_dor) >= 7 ? 'laranja' : 'verde'}`}>Dor informada: {c.nivel_dor}/10</span></div><small>{c.rotina_titulo} · {c.origem_registro}</small><div className="acli-metrica-linha"><div><Icone nome="check_circle"/><span>Exercícios</span><b>{c.itens_concluidos} de {c.itens_registrados} registrados</b></div>{medicamento && <div><Icone nome="medication"/><span>Medicamentos</span><b>{medicamento.administrados} administração(ões) confirmada(s) em {medicamento.confirmacoes} registro(s)</b></div>}</div>{c.observacoes_paciente && <p className="acli-relato"><b>Relato:</b> {c.observacoes_paciente}</p>}<span className="acli-autor">Registrado por: {c.registrado_por || 'Não informado'}</span></article>;})}</div> : <CartaoVazio icone="calendar_today" titulo="Nenhum check-in registrado" descricao="O histórico será preenchido pelos registros reais do paciente ou cuidador."/>}
              {dados.registros_medicamentos.length > 0 && <details className="acli-historico-alertas"><summary>Confirmações de medicamentos por dia</summary>{dados.registros_medicamentos.map(m => <p key={m.data}><b>{dataBrasileira(m.data)}:</b> {m.administrados} administrado(s), {m.nao_administrados} não administrado(s), {m.adiados} adiado(s). <small>{m.confirmacoes} registro(s), não necessariamente todas as doses previstas.</small></p>)}</details>}
            </section>
          </aside>
        </section>
      </>}
    </main>

    {mostrarContato && paciente && <div className="acli-modal-fundo" role="presentation" onMouseDown={e => { if (e.currentTarget === e.target) setMostrarContato(false); }}><section className="acli-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-contato"><div className="acli-modal-topo"><h2 id="titulo-contato">Contato familiar</h2><button type="button" onClick={() => setMostrarContato(false)} aria-label="Fechar"><Icone nome="close"/></button></div><p>Paciente: <b>{paciente.nome}</b></p><div className="acli-contato-dados"><span>Familiar informado</span><b>{paciente.nome_familiar || 'Não cadastrado'}</b><span>Telefone</span><b>{paciente.telefone_familiar || 'Não cadastrado'}</b></div>{contatos.length >= 10 && <a href={`tel:${contatos}`} className="acli-botao-verde"><Icone nome="phone"/> Ligar</a>}{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="acli-botao-claro"><Icone nome="chat"/> Abrir WhatsApp</a>}<p className="acli-modal-nota">O contato abre o aplicativo do seu dispositivo. Nenhum dado clínico é enviado automaticamente.</p></section></div>}
    <NovaRotinaModal aberto={isNovaRotinaModalOpen} token={token} pacienteInicial={pacienteId}
      aoFechar={()=>setIsNovaRotinaModalOpen(false)}
      onSalvo={async(id,novoId)=>{
        if(Number(id)===Number(pacienteId)){
          try{await recarregar(id,()=>true,novoId);setAviso('Nova rotina salva com sucesso.');}
          catch(e){setErro(e.message);}
        }
      }}/>
  </div>;
}
