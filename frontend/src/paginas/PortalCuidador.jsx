import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {apiRequest} from '../servicos/api.js';
import './portal-cuidador.css';

const CHAVE='cuidar-sessao-domiciliar';
const SIT=['Realizado','Parcial','Nao_Realizado'];
const rotuloSituacao={Realizado:'Realizado',Parcial:'Parcialmente',Nao_Realizado:'Não realizado',Administrado:'Administrado',Nao_Administrado:'Não administrado',Adiado:'Adiado'};
const tiposOcorrencia=[{id:'Dor',icone:'ecg_heart',texto:'Dor ou desconforto'},{id:'Queda',icone:'personal_injury',texto:'Queda'},{id:'Exercicio',icone:'exercise',texto:'Dificuldade com exercício'},{id:'Medicamento',icone:'medication',texto:'Problema com medicamento'},{id:'Outro',icone:'more_horiz',texto:'Outro problema'}];
const lerSessao=()=>{try{const s=JSON.parse(sessionStorage.getItem(CHAVE));return s?.token&&s.usuario?.perfil==='domiciliar'?s:null;}catch{return null;}};
const obterConvite=()=>new URLSearchParams(window.location.search).get('convite')||'';
function Icone({nome,className=''}){return <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{nome}</span>;}
function dataCurta(valor){if(!valor)return '—';const d=/^\d{4}-\d{2}-\d{2}$/.test(String(valor))?new Date(`${valor}T12:00:00`):new Date(valor);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(d);}
function hora(valor){return valor?String(valor).slice(0,5):'—';}
function CampoDor({valor,aoAlterar}){return <fieldset className="pc-escala-dor"><legend>Nível de dor (0 a 10)</legend><div className="pc-escala-botoes">{Array.from({length:11},(_,n)=><button key={n} type="button" className={valor===n?'ativo':''} onClick={()=>aoAlterar(n)} aria-pressed={valor===n}>{n}</button>)}</div><div className="pc-extremos"><span>Sem dor</span><span>Dor muito intensa</span></div></fieldset>;}
function OpcoesExercicio({valor,aoAlterar,disabled}){return <div className="pc-tres-opcoes" role="group" aria-label="Resultado do exercício">{SIT.map(v=><button type="button" key={v} disabled={disabled} aria-pressed={valor===v} className={valor===v?'selecionado':''} onClick={()=>aoAlterar(v)}><Icone nome={v==='Realizado'?'check_circle':v==='Parcial'?'remove_circle':'cancel'}/>{rotuloSituacao[v]}</button>)}</div>;}
function ModalMobile({titulo,filhos,fechar}){return <div className="pc-modal-fundo" onMouseDown={e=>{if(e.target===e.currentTarget)fechar();}}><section className="pc-modal" role="dialog" aria-modal="true" aria-label={titulo}><header><h2>{titulo}</h2><button type="button" className="pc-icone-botao" onClick={fechar} aria-label="Fechar"><Icone nome="close"/></button></header>{filhos}</section></div>;}
function EstadoVazio({icone,titulo,descricao}){return <div className="pc-vazio"><Icone nome={icone}/><h3>{titulo}</h3><p>{descricao}</p></div>;}

export default function PortalCuidador(){
  const [sessao,setSessao]=useState(lerSessao);
  const [convite,setConvite]=useState(obterConvite);
  const [email,setEmail]=useState(''),[senha,setSenha]=useState('');
  const [telaAcesso,setTelaAcesso]=useState(obterConvite()?'ativar':'entrar');
  const [tela,setTela]=useState('inicio');
  const [pacientes,setPacientes]=useState([]),[pacienteId,setPacienteId]=useState(null),[rotinas,setRotinas]=useState([]);
  const [historico,setHistorico]=useState(null),[carregandoHistorico,setCarregandoHistorico]=useState(false);
  const [rotinaId,setRotinaId]=useState(null);
  const [marcacoes,setMarcacoes]=useState({});
  const [dor,setDor]=useState(null),[observacoes,setObservacoes]=useState('');
  const [tipoOcorrencia,setTipoOcorrencia]=useState('Dor'),[descricaoOcorrencia,setDescricaoOcorrencia]=useState(''),[dorOcorrencia,setDorOcorrencia]=useState(null);
  const [medModal,setMedModal]=useState(null),[correcao,setCorrecao]=useState(null);
  const [motivoCorrecao,setMotivoCorrecao]=useState(''),[formCorrecao,setFormCorrecao]=useState(null);
  const [carregando,setCarregando]=useState(false),[iniciando,setIniciando]=useState(Boolean(sessao)),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState('');

  useEffect(()=>{if(convite)window.history.replaceState({},document.title,'/cuidado');},[convite]);
  const carregar=useCallback(async(token)=>{
    const [lista,dia]=await Promise.all([
      apiRequest('/api/cuidado/pacientes',{token}),apiRequest('/api/cuidado/meu-dia',{token})
    ]);
    setPacientes(lista.pacientes||[]);setRotinas(dia.rotinas||[]);
    setPacienteId(anterior=>(lista.pacientes||[]).some(p=>Number(p.id)===Number(anterior))?anterior:(lista.pacientes?.[0]?.id??null));
  },[]);
  const carregarHistorico=useCallback(async(token,id)=>{
    if(!id)return setHistorico(null);
    setCarregandoHistorico(true);
    try{const h=await apiRequest(`/api/cuidado/historico?paciente_id=${encodeURIComponent(id)}`,{token});setHistorico(h);}
    finally{setCarregandoHistorico(false);}
  },[]);
  useEffect(()=>{
    if(!sessao?.token){setIniciando(false);return;}
    let ativo=true;
    (async()=>{try{await carregar(sessao.token);}catch(e){if(ativo){if(e.status===401){sessionStorage.removeItem(CHAVE);setSessao(null);}setErro(e.message);}}finally{if(ativo)setIniciando(false);}})();
    return()=>{ativo=false;};
  },[sessao?.token,carregar]);
  useEffect(()=>{setHistorico(null);setRotinaId(null);setMarcacoes({});setDor(null);setObservacoes('');},[pacienteId]);
  useEffect(()=>{
    if(!sessao?.token||!pacienteId||tela!=='historico')return;
    carregarHistorico(sessao.token,pacienteId).catch(e=>setErro(e.message));
  },[sessao?.token,pacienteId,tela,carregarHistorico]);

  const paciente=pacientes.find(p=>Number(p.id)===Number(pacienteId));
  const suasRotinas=useMemo(()=>rotinas.filter(r=>Number(r.paciente_id)===Number(pacienteId)),[rotinas,pacienteId]);
  const rotina=suasRotinas.find(r=>Number(r.rotina_id)===Number(rotinaId))||suasRotinas[0];
  const meds=useMemo(()=>{const mapa=new Map();for(const r of suasRotinas)for(const m of r.medicamentos||[])mapa.set(m.horario_id,m);return [...mapa.values()].sort((a,b)=>hora(a.horario).localeCompare(hora(b.horario)));},[suasRotinas]);
  const podeRegistrar=Boolean(paciente?.pode_registrar);
  const totalAtividades=meds.length+suasRotinas.reduce((n,r)=>n+(r.itens?.length||0),0);
  const atividadesFeitas=meds.filter(m=>Boolean(m.registro_situacao)).length+
    suasRotinas.reduce((n,r)=>n+(r.checkin_id?r.itens?.length||0:0),0);
  const progresso=totalAtividades?Math.min(100,Math.round(100*atividadesFeitas/totalAtividades)):0;
  const checkinConcluido=Boolean(rotina?.checkin_id);
  const itensDaRotina=rotina?.itens||[];
  const marcacaoRotina=marcacoes[rotina?.rotina_id]||{};

  async function executar(tarefa,apos){setErro('');setMensagem('');setCarregando(true);try{await tarefa();if(apos)setMensagem(apos);}catch(e){
    if(e.status===401){sessionStorage.removeItem(CHAVE);setSessao(null);setTela('inicio');}
    setErro(e.message);
  }finally{setCarregando(false);}}
  function guardarSessao(d){const s={token:d.token,usuario:d.usuario};sessionStorage.setItem(CHAVE,JSON.stringify(s));setSessao(s);setSenha('');setIniciando(true);setTela('inicio');}
  function sair(){sessionStorage.removeItem(CHAVE);setSessao(null);setPacientes([]);setPacienteId(null);setRotinas([]);setHistorico(null);setEmail('');setSenha('');setTelaAcesso('entrar');setTela('inicio');setMensagem('');setErro('');}
  async function entrar(e){e.preventDefault();await executar(async()=>guardarSessao(await apiRequest('/api/cuidado/login',{method:'POST',body:{email,senha}})));}
  async function ativar(e){e.preventDefault();await executar(async()=>{const r=await apiRequest('/api/cuidado/ativar',{method:'POST',body:{convite,senha}});setConvite('');guardarSessao(r);});}
  async function aceitar(e){e.preventDefault();await executar(async()=>{await apiRequest('/api/cuidado/aceitar-convite',{method:'POST',token:sessao.token,body:{convite}});setConvite('');await carregar(sessao.token);},'Paciente vinculado com sucesso.');}
  function abrirTela(proxima){setErro('');setMensagem('');setTela(proxima);window.scrollTo(0,0);}
  async function atualizar(){await carregar(sessao.token);}
  async function registrarMedicamento(){
    if(!medModal)return;
    const atual=medModal;
    await executar(async()=>{
      await apiRequest('/api/cuidado/medicamentos/registrar',{method:'POST',token:sessao.token,body:{horario_id:atual.medicamento.horario_id,situacao:atual.situacao}});
      setMedModal(null);await atualizar();
    },'Medicamento registrado com sucesso.');
  }
  async function enviarCheckin(){
    if(!rotina||checkinConcluido)return;
    await executar(async()=>{
      if(dor===null)throw new Error('Selecione o nível de dor.');
      if(itensDaRotina.some(i=>!marcacaoRotina[i.rotina_item_id]))throw new Error('Marque todos os exercícios antes de enviar o check-in.');
      await apiRequest('/api/cuidado/checkins',{method:'POST',token:sessao.token,body:{
        rotina_id:rotina.rotina_id,nivel_dor:dor,observacoes_paciente:observacoes,
        itens:itensDaRotina.map(i=>({rotina_item_id:i.rotina_item_id,situacao:marcacaoRotina[i.rotina_item_id]}))
      }});
      await atualizar();setDor(null);setObservacoes('');setMarcacoes({});abrirTela('inicio');
    },'Check-in enviado com sucesso.');
  }
  async function relatarOcorrencia(e){e.preventDefault();await executar(async()=>{
    await apiRequest('/api/cuidado/ocorrencias',{method:'POST',token:sessao.token,body:{
      paciente_id:pacienteId,tipo:tipoOcorrencia,descricao:descricaoOcorrencia,
      intensidade_dor:tipoOcorrencia==='Dor'?dorOcorrencia:null
    }});
    setDescricaoOcorrencia('');setDorOcorrencia(null);setTipoOcorrencia('Dor');abrirTela('inicio');
  },'Relato registrado. A equipe poderá consultá-lo no painel. Em situações graves procure atendimento imediato.');}
  function abrirCorrecao(tipo,registro){
    setMotivoCorrecao('');setCorrecao({tipo,registro});
    setFormCorrecao(tipo==='checkin'?{nivel_dor:registro.nivel_dor,observacoes_paciente:registro.observacoes_paciente||'',itens:registro.itens.map(i=>({...i}))}:{situacao:registro.situacao,hora_administracao:registro.hora_real||hora(registro.horario_programado)});
  }
  async function salvarCorrecao(e){e.preventDefault();if(!correcao)return;
    await executar(async()=>{
      const {tipo,registro}=correcao;
      if(tipo==='checkin')await apiRequest(`/api/cuidado/checkins/${registro.id}`,{method:'PATCH',token:sessao.token,body:{...formCorrecao,motivo_correcao:motivoCorrecao}});
      else await apiRequest(`/api/cuidado/medicamentos/registros/${registro.id}`,{method:'PATCH',token:sessao.token,body:{...formCorrecao,motivo_correcao:motivoCorrecao}});
      setCorrecao(null);setFormCorrecao(null);
      await Promise.all([carregarHistorico(sessao.token,pacienteId),atualizar()]);
    },'Registro corrigido. A informação anterior foi preservada.');
  }

  const historicoItens=useMemo(()=>{
    if(!historico)return[];
    return [
      ...(historico.checkins||[]).map(r=>({tipo:'checkin',registro:r,timestamp:`${r.data}T23:00:00`,titulo:`Check-in · ${r.rotina}`,descricao:`Dor ${r.nivel_dor}/10 · ${r.itens?.length||0} atividades`})),
      ...(historico.medicamentos||[]).map(r=>({tipo:'medicamento',registro:r,timestamp:`${r.data}T${hora(r.horario_programado)}:00`,titulo:r.nome,descricao:`${rotuloSituacao[r.situacao]||r.situacao} · ${hora(r.horario_programado)}`})),
      ...(historico.ocorrencias||[]).map(r=>({tipo:'ocorrencia',registro:r,timestamp:String(r.ocorrido_em||r.criado_em),titulo:`Relato · ${tiposOcorrencia.find(t=>t.id===r.tipo)?.texto||r.tipo}`,descricao:r.descricao}))
    ].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  },[historico]);
  const hoje=useMemo(()=>new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date()),[]);

  if(!sessao)return <div className="pc-app pc-login"><header className="pc-topo"><Link to="/cuidado" className="pc-marca"><span className="pc-marca-icone"><Icone nome="volunteer_activism"/></span><strong>Cuidar<span>+</span></strong></Link></header><main className="pc-miolo"><section className="pc-card pc-login-card"><span className="pc-eyebrow">PORTAL DE CUIDADOS</span><h1>{telaAcesso==='ativar'?'Ative seu acesso':'Que bom ter você aqui!'}</h1><p>Entre para acompanhar as atividades e registrar os cuidados do dia.</p>{erro&&<div className="pc-erro" role="alert">{erro}</div>}
    {telaAcesso==='ativar'?<form className="pc-form" onSubmit={ativar}><label>Código do convite<input required value={convite} onChange={e=>setConvite(e.target.value.trim())} placeholder="Código recebido" autoComplete="off"/></label><label>Crie sua senha (mínimo 10 caracteres)<input required minLength={10} maxLength={128} type="password" autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)}/></label><button className="pc-botao-principal" disabled={carregando}>Criar meu acesso</button><button type="button" className="pc-link" onClick={()=>setTelaAcesso('entrar')}>Já tenho uma conta</button></form>
    :<form className="pc-form" onSubmit={entrar}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Senha<input type="password" autoComplete="current-password" required value={senha} onChange={e=>setSenha(e.target.value)}/></label><button className="pc-botao-principal" disabled={carregando}>Entrar</button><button type="button" className="pc-link" onClick={()=>setTelaAcesso('ativar')}>Recebi um convite</button></form>}
    <p className="pc-nota">O acesso é individual e autorizado pela equipe de fisioterapia.</p><Link to="/dashboard" className="pc-link">Sou fisioterapeuta</Link></section></main></div>;

  return <div className="pc-app"><header className="pc-topo"><button type="button" onClick={()=>abrirTela('inicio')} className="pc-marca" aria-label="Voltar ao início"><span className="pc-marca-icone"><Icone nome="volunteer_activism"/></span><strong>Cuidar<span>+</span></strong></button><div className="pc-topo-acoes"><button type="button" className="pc-relato-atalho" onClick={()=>abrirTela('ocorrencia')}><Icone nome="report"/> Relatar</button><button className="pc-icone-botao" aria-label="Sair do portal" type="button" onClick={sair}><Icone nome="logout"/></button></div></header>
    <main className="pc-miolo">
      {iniciando&&<div className="pc-estado" role="status">Carregando informações…</div>}
      {erro&&<div className="pc-erro" role="alert"><Icone nome="error"/>{erro}</div>}
      {mensagem&&<div className="pc-sucesso" role="status"><Icone nome="check_circle"/>{mensagem}</div>}
      {!iniciando&&<>
        {pacientes.length>1&&<label className="pc-seletor">Paciente acompanhado<select value={pacienteId??''} onChange={e=>{setPacienteId(Number(e.target.value));abrirTela('inicio');}}>{pacientes.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>}
        {!paciente?<section className="pc-card"><EstadoVazio icone="person_off" titulo="Nenhum paciente vinculado" descricao="Peça um convite à equipe para acompanhar um paciente."/><details className="pc-aceitar-convite"><summary>Tenho outro convite</summary><form onSubmit={aceitar} className="pc-form"><label>Código do convite<input value={convite} required onChange={e=>setConvite(e.target.value.trim())}/></label><button disabled={carregando} className="pc-botao-principal">Vincular paciente</button></form></details></section>:
        <>
          {tela==='inicio'&&<div className="pc-pagina">
            <section className="pc-saudacao pc-card"><span className="pc-eyebrow">{hoje}</span><h1>Olá, {sessao.usuario.nome.split(' ')[0]}! <span>👋</span></h1><p>Acompanhando: <strong>{paciente.nome}</strong></p><span className="pc-saudacao-texto">Confira os cuidados programados para hoje.</span></section>
            <section className="pc-card pc-progresso"><div className="pc-progresso-cab"><span><Icone nome="monitoring"/> Registros de hoje</span><strong>{atividadesFeitas} de {totalAtividades}</strong></div><div className="pc-progresso-trilha" role="progressbar" aria-valuenow={atividadesFeitas} aria-valuemin={0} aria-valuemax={totalAtividades||1} aria-label="Atividades concluídas"><div style={{width:`${progresso}%`}}/></div><small>Contabiliza respostas registradas, não apenas atividades realizadas.</small></section>
            <div className="pc-acoes-principais"><button className="pc-acao-card" type="button" onClick={()=>abrirTela('medicamentos')}><span className="pc-acao-icone azul"><Icone nome="medication"/></span><span><strong>Medicamentos</strong><small>Veja os horários e confirme a administração.</small>{meds.length>0&&<em>{meds.filter(m=>!m.registro_situacao).length} pendente(s)</em>}</span><Icone nome="chevron_right"/></button>
            <button className="pc-acao-card" type="button" onClick={()=>abrirTela('exercicios')}><span className="pc-acao-icone celeste"><Icone nome="fitness_center"/></span><span><strong>Exercícios</strong><small>Veja as orientações e marque o que foi realizado.</small></span><Icone nome="chevron_right"/></button>
            <button className="pc-acao-card" type="button" onClick={()=>abrirTela('checkin')}><span className="pc-acao-icone verde"><Icone nome="fact_check"/></span><span><strong>Check-in do dia</strong><small>Conte como o paciente está hoje.</small><em>{suasRotinas.length&&!suasRotinas.every(r=>r.checkin_id)?'Pendente':'Concluído ou sem exercícios'}</em></span><Icone nome="chevron_right"/></button></div>
            <button className="pc-botao-alerta" type="button" onClick={()=>abrirTela('ocorrencia')}><Icone nome="error_outline"/> Relatar um problema</button>
            <button className="pc-link pc-historico-link" type="button" onClick={()=>abrirTela('historico')}><Icone nome="history"/> Ver registros anteriores <Icone nome="arrow_forward"/></button>
            {suasRotinas.length===0&&<section className="pc-card"><p>Não há exercícios ou medicamentos programados para hoje. Você ainda pode relatar uma ocorrência.</p><button className="pc-botao-secundario" onClick={()=>executar(atualizar)}>Atualizar</button></section>}
            <details className="pc-aceitar-convite"><summary>Vincular outro paciente por convite</summary><form onSubmit={aceitar} className="pc-form"><label>Código recebido<input value={convite} required onChange={e=>setConvite(e.target.value.trim())}/></label><button disabled={carregando} className="pc-botao-principal">Aceitar convite</button></form></details>
          </div>}
          {tela!=='inicio'&&<div className="pc-pagina"><button className="pc-voltar" type="button" onClick={()=>abrirTela('inicio')}><Icone nome="arrow_back"/> Voltar ao início</button>
          {tela==='medicamentos'&&<><div className="pc-titulo-tela"><span className="pc-icone-titulo"><Icone nome="medication"/></span><h1>Medicamentos de hoje</h1><p>Confira a dose e o horário prescritos. Registre apenas o que realmente aconteceu.</p></div>
            {meds.length===0?<EstadoVazio icone="medication_liquid" titulo="Nenhum medicamento hoje" descricao="Não há horários disponíveis nas rotinas de hoje ou você não tem acesso aos medicamentos."/>:meds.map(m=><section key={m.horario_id} className="pc-card pc-cartao-registro"><div className="pc-linha"><span className="pc-horario"><Icone nome="schedule"/> {hora(m.horario)}</span><span className={`pc-status ${m.registro_situacao?'ok':''}`}>{m.registro_situacao?rotuloSituacao[m.registro_situacao]:'Pendente'}</span></div><h2>{m.nome}</h2><p><strong>Dose:</strong> {m.dose_informada} · {m.via_administracao}</p>{m.orientacao_prescrita&&<p className="pc-orientacao"><Icone nome="info"/>{m.orientacao_prescrita}</p>}{!m.registro_situacao?<div className="pc-botoes-medicamento"><button className="pc-botao-principal" disabled={carregando||!podeRegistrar} type="button" onClick={()=>setMedModal({medicamento:m,situacao:'Administrado'})}><Icone nome="check"/> Confirmar administração</button><button type="button" className="pc-botao-secundario" disabled={carregando||!podeRegistrar} onClick={()=>setMedModal({medicamento:m,situacao:'Nao_Administrado'})}>Não administrado</button><button type="button" className="pc-link" disabled={carregando||!podeRegistrar} onClick={()=>setMedModal({medicamento:m,situacao:'Adiado'})}>Adiado</button></div>:<button type="button" className="pc-link" disabled={!podeRegistrar||Number(m.registrado_por)!==Number(sessao.usuario.id)} onClick={async()=>{abrirTela('historico');}}>Corrigir no histórico</button>}</section>)}
            <p className="pc-lembrete"><Icone nome="shield"/> Nunca altere a prescrição por conta própria.</p></>}
          {tela==='exercicios'&&<><div className="pc-titulo-tela"><span className="pc-icone-titulo"><Icone nome="fitness_center"/></span><h1>Exercícios de hoje</h1><p>Leia as orientações e marque como cada exercício foi realizado.</p></div>
            {suasRotinas.length>1&&<label className="pc-seletor">Rotina<select value={rotina?.rotina_id||''} onChange={e=>setRotinaId(Number(e.target.value))}>{suasRotinas.map(r=><option key={r.rotina_id} value={r.rotina_id}>{r.titulo}</option>)}</select></label>}
            {itensDaRotina.length===0?<EstadoVazio icone="self_improvement" titulo="Sem exercícios hoje" descricao="Nenhum exercício foi programado para hoje."/>:itensDaRotina.map((i,numero)=><section key={i.rotina_item_id} className="pc-card pc-exercicio"><div className="pc-numero">Exercício {numero+1} de {itensDaRotina.length}</div><h2>{i.nome}</h2>{i.descricao&&<p>{i.descricao}</p>}<div className="pc-instrucao"><Icone nome="repeat"/><span>{i.series} série(s) × {i.repeticoes} repetição(ões)</span></div>{i.observacoes&&<p className="pc-orientacao"><Icone nome="info"/>{i.observacoes}</p>}{!checkinConcluido?<><strong className="pc-pergunta">Como foi esse exercício?</strong><OpcoesExercicio disabled={!podeRegistrar} valor={marcacaoRotina[i.rotina_item_id]} aoAlterar={v=>setMarcacoes(p=>({...p,[rotina.rotina_id]:{...p[rotina.rotina_id],[i.rotina_item_id]:v}}))}/></>:<div className="pc-status ok">Check-in de hoje já enviado</div>}</section>)}
            {!checkinConcluido&&itensDaRotina.length>0&&<><p className="pc-lembrete">As marcações serão salvas ao enviar o check-in.</p><button type="button" className="pc-botao-principal" onClick={()=>abrirTela('checkin')}>Continuar para o check-in <Icone nome="arrow_forward"/></button></>}</>}
          {tela==='checkin'&&<><div className="pc-titulo-tela"><span className="pc-icone-titulo"><Icone nome="fact_check"/></span><h1>Como o paciente está hoje?</h1><p>Preencha o check-in diário para informar a equipe.</p></div>
            {suasRotinas.length>1&&<label className="pc-seletor">Rotina<select value={rotina?.rotina_id||''} onChange={e=>setRotinaId(Number(e.target.value))}>{suasRotinas.map(r=><option key={r.rotina_id} value={r.rotina_id}>{r.titulo}</option>)}</select></label>}
            {checkinConcluido?<section className="pc-card pc-checkin-feito"><Icone nome="check_circle"/><h2>Check-in de hoje concluído!</h2><p>O registro desta rotina já foi enviado. Você poderá corrigir informações no histórico, se necessário.</p><button className="pc-botao-secundario" type="button" onClick={()=>abrirTela('historico')}>Ver e corrigir registro</button></section>:itensDaRotina.length===0?<EstadoVazio icone="task_alt" titulo="Sem check-in de exercícios" descricao="Não há exercícios programados para hoje nesta rotina."/>:<section className="pc-card pc-form-checkin"><div className="pc-info-checkin"><strong>Exercícios marcados: {itensDaRotina.filter(i=>marcacaoRotina[i.rotina_item_id]).length} de {itensDaRotina.length}</strong><button type="button" className="pc-link" onClick={()=>abrirTela('exercicios')}>Marcar exercícios</button></div><CampoDor valor={dor} aoAlterar={setDor}/><label>Quer contar algo sobre o dia? (opcional)<textarea rows={4} maxLength={255} value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Escreva como o paciente está se sentindo..."/></label><button type="button" className="pc-botao-principal" disabled={carregando||!podeRegistrar||dor===null||itensDaRotina.some(i=>!marcacaoRotina[i.rotina_item_id])} onClick={enviarCheckin}><Icone nome="send"/> Enviar check-in</button><p className="pc-lembrete">Um check-in por rotina e por dia. Se precisar, você poderá corrigir o registro.</p></section>}</>}
          {tela==='ocorrencia'&&<><div className="pc-titulo-tela"><span className="pc-icone-titulo alerta"><Icone nome="report"/></span><h1>Relatar um problema</h1><p>Conte o que aconteceu com {paciente.nome}. Você pode registrar um relato a qualquer momento.</p></div><div className="pc-aviso-seguranca"><Icone nome="emergency"/><span>Em situações graves, procure atendimento de emergência. Este aplicativo não substitui atendimento imediato.</span></div><form className="pc-card pc-form" onSubmit={relatarOcorrencia}><fieldset className="pc-tipos"><legend>O que aconteceu?</legend>{tiposOcorrencia.map(t=><label key={t.id} className={tipoOcorrencia===t.id?'selecionado':''}><input type="radio" name="tipo" value={t.id} checked={tipoOcorrencia===t.id} onChange={()=>{setTipoOcorrencia(t.id);setDorOcorrencia(null);}}/><Icone nome={t.icone}/><span>{t.texto}</span></label>)}</fieldset>{tipoOcorrencia==='Dor'&&<CampoDor valor={dorOcorrencia} aoAlterar={setDorOcorrencia}/>}<label>Descreva o que aconteceu<textarea rows={5} required minLength={8} maxLength={1000} value={descricaoOcorrencia} onChange={e=>setDescricaoOcorrencia(e.target.value)} placeholder="Escreva aqui o que aconteceu..."/></label><p className="pc-lembrete">A data, o horário e o responsável serão registrados automaticamente.</p><button disabled={carregando||!podeRegistrar||descricaoOcorrencia.trim().length<8} className="pc-botao-principal"><Icone nome="send"/> Enviar relato</button></form></>}
          {tela==='historico'&&<><div className="pc-titulo-tela"><span className="pc-icone-titulo"><Icone nome="history"/></span><h1>Registros anteriores</h1><p>Consulte o que já foi enviado. Os registros feitos por você podem ser corrigidos com histórico.</p></div>{carregandoHistorico?<div className="pc-estado">Carregando histórico…</div>:historicoItens.length===0?<EstadoVazio icone="event_note" titulo="Sem registros anteriores" descricao="Seus check-ins, medicamentos e relatos aparecerão aqui."/>:historicoItens.map((item,indice)=><section key={`${item.tipo}-${item.registro.id}-${indice}`} className="pc-card pc-historico-item"><div className="pc-linha"><span className="pc-badge-data">{dataCurta(item.registro.data||item.registro.ocorrido_em)}</span><span className="pc-status">{item.tipo==='ocorrencia'?(item.registro.status==='Novo'?'Recebido':item.registro.status==='Em_Analise'?'Em análise':'Encerrado'):item.registro.correcoes>0?'Corrigido':'Registrado'}</span></div><div className="pc-historico-titulo"><Icone nome={item.tipo==='checkin'?'fact_check':item.tipo==='medicamento'?'medication':'report'}/><h2>{item.titulo}</h2></div><p>{item.descricao}</p>{item.tipo==='checkin'&&<><p className="pc-observacao-antiga">{item.registro.observacoes_paciente||'Sem observações.'}</p><ul className="pc-mini-lista">{item.registro.itens?.map(i=><li key={i.rotina_item_id}>{i.nome}: <strong>{rotuloSituacao[i.situacao]}</strong></li>)}</ul></>}{item.tipo==='medicamento'&&<small>Dose informada: {item.registro.dose_informada}</small>}{item.tipo!=='ocorrencia'&&Number(item.registro.autor_id)===Number(sessao.usuario.id)&&podeRegistrar&&<button className="pc-link" onClick={()=>abrirCorrecao(item.tipo,item.registro)}>Corrigir informação <Icone nome="edit"/></button>}</section>)}</>}
          </div>}
        </>}
      </>}
    </main>
    <nav className="pc-nav" aria-label="Navegação mobile">{[{id:'inicio',icone:'home',texto:'Início'},{id:'medicamentos',icone:'medication',texto:'Remédios'},{id:'exercicios',icone:'fitness_center',texto:'Exercícios'},{id:'historico',icone:'history',texto:'Histórico'}].map(item=><button type="button" key={item.id} aria-current={tela===item.id?'page':undefined} className={tela===item.id?'selecionado':''} onClick={()=>abrirTela(item.id)}><Icone nome={item.icone}/><span>{item.texto}</span></button>)}</nav>
    {medModal&&<ModalMobile titulo="Confirmar medicamento" fechar={()=>setMedModal(null)} filhos={<div className="pc-modal-corpo"><div className="pc-modal-icone"><Icone nome="medication"/></div><p>Deseja registrar <strong>{rotuloSituacao[medModal.situacao]?.toLowerCase()}</strong> para este horário?</p><div className="pc-resumo-med"><strong>{medModal.medicamento.nome}</strong><span>{medModal.medicamento.dose_informada} · {hora(medModal.medicamento.horario)}</span></div><p className="pc-lembrete">Confirme apenas o que realmente aconteceu.</p><button className="pc-botao-principal" type="button" disabled={carregando} onClick={registrarMedicamento}>Confirmar registro</button><button className="pc-botao-secundario" type="button" onClick={()=>setMedModal(null)}>Cancelar</button></div>}/>}
    {correcao&&formCorrecao&&<ModalMobile titulo={correcao.tipo==='checkin'?'Corrigir check-in':'Corrigir medicamento'} fechar={()=>setCorrecao(null)} filhos={<form className="pc-form pc-form-correcao" onSubmit={salvarCorrecao}><p>O registro anterior ficará preservado com data, horário e motivo da correção.</p>{correcao.tipo==='checkin'?<><CampoDor valor={formCorrecao.nivel_dor} aoAlterar={v=>setFormCorrecao(p=>({...p,nivel_dor:v}))}/>{formCorrecao.itens.map(i=><div className="pc-corrigir-exercicio" key={i.rotina_item_id}><strong>{i.nome}</strong><OpcoesExercicio valor={i.situacao} aoAlterar={v=>setFormCorrecao(p=>({...p,itens:p.itens.map(j=>j.rotina_item_id===i.rotina_item_id?{...j,situacao:v}:j)}))}/></div>)}<label>Observações<textarea maxLength={255} rows={2} value={formCorrecao.observacoes_paciente} onChange={e=>setFormCorrecao(p=>({...p,observacoes_paciente:e.target.value}))}/></label></>:<><label>Situação<select value={formCorrecao.situacao} onChange={e=>setFormCorrecao(p=>({...p,situacao:e.target.value}))}>{['Administrado','Nao_Administrado','Adiado'].map(v=><option key={v} value={v}>{rotuloSituacao[v]}</option>)}</select></label>{formCorrecao.situacao==='Administrado'&&<label>Horário em que foi administrado (no dia programado)<input required type="time" value={formCorrecao.hora_administracao} onChange={e=>setFormCorrecao(p=>({...p,hora_administracao:e.target.value}))}/></label>}</>}<label>Por que está corrigindo? (obrigatório)<textarea required minLength={8} maxLength={250} rows={3} value={motivoCorrecao} onChange={e=>setMotivoCorrecao(e.target.value)} placeholder="Ex.: marquei a opção errada por engano"/></label><button className="pc-botao-principal" disabled={carregando||motivoCorrecao.trim().length<8}>Salvar correção</button><button className="pc-botao-secundario" type="button" onClick={()=>setCorrecao(null)}>Cancelar</button></form>}/>}
  </div>;
}
