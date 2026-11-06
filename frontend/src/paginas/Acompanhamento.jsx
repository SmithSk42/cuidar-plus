import {useCallback,useEffect,useState} from 'react';
import {apiRequest} from '../servicos/api.js';
import './acompanhamento.css';
const agora=new Date();
const hoje=new Date(agora.getTime()-agora.getTimezoneOffset()*60000).toISOString().slice(0,10);
const novo={nome:'',data_nascimento:'',patologia_principal:'',email:'',telefone:'',nome_familiar:'',telefone_familiar:''};
const DIAS=['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];
const vazioRotina={titulo:'',data_inicio:hoje,data_fim:'',itens:[],medicamentos:[]};
function Icone({nome}){return <span className="material-symbols-outlined" aria-hidden="true">{nome}</span>;}
export default function Acompanhamento({sessao,aoSair}){
  const token=sessao.token;
  const [pacientes,setPacientes]=useState([]),[exercicios,setExercicios]=useState([]),[medicamentosCatalogo,setMedicamentosCatalogo]=useState([]);
  const [escolhido,setEscolhido]=useState(null),[historico,setHistorico]=useState([]),[rotinas,setRotinas]=useState([]);
  const [novoPaciente,setNovoPaciente]=useState({...novo}),[novaRotina,setNovaRotina]=useState({...vazioRotina});
  const [novoExercicio,setNovoExercicio]=useState({nome:'',descricao:'',categoria:'Alongamento'});
  const [novoMedicamento,setNovoMedicamento]=useState({nome:'',apresentacao:''});
  const [modal,setModal]=useState(''),[busca,setBusca]=useState(''),[buscaMed,setBuscaMed]=useState(''),[secao,setSecao]=useState('medicamentos');
  const [convite,setConvite]=useState({nome:'',email:'',papel:'Cuidador',autorizado_por:'',confirmou_autorizacao:false});
  const [link,setLink]=useState(''),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState(''),[carregando,setCarregando]=useState(false);
  const [aba,setAba]=useState(()=>new URLSearchParams(window.location.search).get('acao')?.includes('Rotina')?'rotina':'paciente');
  const enviar=async (caminho,opcoes={})=>apiRequest(caminho,{...opcoes,token});
  const atualizar=useCallback(async()=>{
    const [p,e,m]=await Promise.all([apiRequest('/api/pacientes',{token}),apiRequest('/api/rotinas/exercicios',{token}),apiRequest('/api/rotinas/medicamentos',{token})]);
    setPacientes(p.pacientes||[]);setExercicios(e.exercicios||[]);setMedicamentosCatalogo(m.medicamentos||[]);
    setEscolhido(anterior=>anterior&&p.pacientes.some(x=>x.id===anterior)?anterior:(p.pacientes[0]?.id||null));
  },[token]);
  useEffect(()=>{atualizar().catch(e=>setErro(e.message));},[atualizar]);
  useEffect(()=>{
    if(!escolhido){setHistorico([]);setRotinas([]);return;}
    let ativo=true;
    Promise.all([apiRequest(`/api/pacientes/${escolhido}/acompanhamento`,{token}),apiRequest(`/api/rotinas?paciente_id=${escolhido}`,{token})])
      .then(([a,b])=>{if(ativo){setHistorico(a.checkins||[]);setRotinas(b.rotinas||[]);}})
      .catch(e=>{if(ativo)setErro(e.message);});return()=>{ativo=false;};
  },[escolhido,token]);
  async function executar(acao){setErro('');setMensagem('');setCarregando(true);try{await acao();}catch(e){setErro(e.message);}finally{setCarregando(false);}}
  async function cadastrarPaciente(e){e.preventDefault();await executar(async()=>{
    const r=await enviar('/api/pacientes',{method:'POST',body:Object.fromEntries(Object.entries(novoPaciente).map(([k,v])=>[k,v||null]))});
    setNovoPaciente({...novo});await atualizar();setEscolhido(r.id);setMensagem('Paciente cadastrado! Agora crie uma rotina.');setAba('rotina');
  });}
  async function cadastrarRotina(e){e.preventDefault();await executar(async()=>{
    if(!escolhido)throw new Error('Escolha um paciente.');
    const itens=novaRotina.itens.map(i=>({exercicio_id:i.exercicio_id,series:Number(i.series),repeticoes:Number(i.repeticoes),observacoes:i.observacoes||'',dias_semana:i.dias_semana}));
    await enviar('/api/rotinas',{method:'POST',body:{paciente_id:escolhido,titulo:novaRotina.titulo,data_inicio:novaRotina.data_inicio,data_fim:novaRotina.data_fim||null,itens,medicamentos:novaRotina.medicamentos}});
    setNovaRotina({...vazioRotina});const r=await enviar(`/api/rotinas?paciente_id=${escolhido}`);setRotinas(r.rotinas);setMensagem('Rotina criada. Gere um convite para a pessoa que ajudará no acompanhamento.');setAba('convite');
  });}
  async function cadastrarExercicio(e){e.preventDefault();await executar(async()=>{
    await enviar('/api/rotinas/exercicios',{method:'POST',body:novoExercicio});
    const resposta=await enviar('/api/rotinas/exercicios');setExercicios(resposta.exercicios);setNovoExercicio({nome:'',descricao:'',categoria:'Alongamento'});
    setNovaRotina(p=>({...p,itens:[...p.itens,{exercicio_id:Number(resposta.exercicios.find(x=>x.nome.toLowerCase()===novoExercicio.nome.trim().toLowerCase())?.id),series:1,repeticoes:10,observacoes:'',dias_semana:[...DIAS]}].filter(i=>i.exercicio_id)}));
    setModal('');setSecao('exercicios');setMensagem('Exercício criado e selecionado na rotina.');
  });}
  async function cadastrarMedicamento(){await executar(async()=>{const r=await enviar('/api/rotinas/medicamentos',{method:'POST',body:novoMedicamento});const atualizados=await enviar('/api/rotinas/medicamentos');setMedicamentosCatalogo(atualizados.medicamentos);adicionarMedicamento(r.id);setNovoMedicamento({nome:'',apresentacao:''});setModal('');setMensagem('Medicamento cadastrado e selecionado. Informe os dados da prescrição existente.');});}
  async function criarConvite(e){e.preventDefault();await executar(async()=>{
    if(!escolhido)throw new Error('Selecione um paciente.');
    const r=await enviar(`/api/pacientes/${escolhido}/convites`,{method:'POST',body:convite});
    setLink(r.link);setMensagem('Convite criado. O link expira em 48 horas e só deve ser compartilhado com a pessoa autorizada.');
  });}
  const paciente=pacientes.find(p=>p.id===escolhido);
  const atualizarCampo=(set,valor,chave)=>set(a=>({...a,[chave]:valor}));
  function alterarExercicio(id,selecionado){setNovaRotina(p=>({...p,itens:selecionado?[...p.itens,{exercicio_id:id,series:1,repeticoes:10,observacoes:'',dias_semana:[...DIAS]}]:p.itens.filter(i=>i.exercicio_id!==id)}));}
  function adicionarMedicamento(id){setNovaRotina(p=>p.medicamentos.some(m=>m.medicamento_id===id)?p:{...p,medicamentos:[...p.medicamentos,{medicamento_id:id,prescritor_nome:'',referencia_prescricao:'',orientacao_prescrita:'',dose_informada:'',via_administracao:'',frequencia_texto:'',horarios:['08:00'],dias_semana:[...DIAS]}]});}
  function alterarItem(tipo,id,campo,valor){const chave=tipo==='exercicio'?'itens':'medicamentos',identificador=tipo==='exercicio'?'exercicio_id':'medicamento_id';setNovaRotina(p=>({...p,[chave]:p[chave].map(i=>i[identificador]===id?{...i,[campo]:valor}:i)}));}
  function alternarDia(tipo,id,dia,dias){const novos=dias.includes(dia)?dias.filter(d=>d!==dia):DIAS.filter(d=>dias.includes(d)||d===dia);if(novos.length)alterarItem(tipo,id,'dias_semana',novos);}
  function DiasSemana({tipo,id,dias}){return <fieldset className="ac-dias"><legend>Dias da semana</legend>{DIAS.map((d,k)=><label key={d}><input type="checkbox" checked={dias.includes(d)} onChange={()=>alternarDia(tipo,id,d,dias)}/><span>{['S','T','Q','Q','S','S','D'][k]}</span><small>{d}</small></label>)}</fieldset>;}
  return <main className="ac-app">
    <header className="ac-topo"><div className="ac-marca"><Icone nome="cardiology"/><b>Cuidar<span>+</span></b><small>Acompanhamento domiciliar</small></div><nav><a href="/">Dashboard</a><button type="button" onClick={aoSair}>Sair</button></nav></header>
    <div className="ac-miolo"><div className="ac-intro"><div><p className="ac-sobretitulo">PAINEL DO FISIOTERAPEUTA</p><h1>Acompanhamento dos pacientes</h1><p>Cadastre um paciente, prepare uma rotina e convide a pessoa autorizada a registrar o cuidado em casa.</p></div><a href="/" className="ac-botao-sec">Voltar à dashboard</a></div>
    {erro&&<div role="alert" className="ac-erro">{erro}</div>}{mensagem&&<div role="status" className="ac-sucesso">{mensagem}</div>}
    <div className="ac-layout"><section className="ac-cartao ac-pacientes"><h2>Seus pacientes <span>{pacientes.length}</span></h2>
      <label>Selecionar paciente<select value={escolhido||''} onChange={e=>{setEscolhido(Number(e.target.value)||null);setLink('');}}><option value="">Selecione...</option>{pacientes.map(p=><option value={p.id} key={p.id}>{p.nome} — {p.status}</option>)}</select></label>
      {paciente?<><p><b>{paciente.nome}</b></p><p>{paciente.patologia_principal}</p><p className="ac-miudo">Status: {paciente.status}</p></>:<p className="ac-miudo">Nenhum paciente ainda. Cadastre o primeiro.</p>}
      <h3>Rotinas</h3>{rotinas.length?rotinas.map(r=><div className="ac-linha" key={r.id}><b>{r.titulo}</b><small>{r.status} · {r.total_exercicios} exercícios</small></div>):<p className="ac-miudo">Nenhuma rotina criada.</p>}
      <h3>Check-ins recentes</h3>{historico.length?historico.map(c=><div className="ac-linha" key={c.id}><b>{c.data_registro} · dor {c.nivel_dor}/10</b><small>{c.itens_concluidos}/{c.total_itens} exercícios · {c.registrado_por||'Registro anterior'} · {c.origem_registro}</small>{c.observacoes_paciente&&<small>{c.observacoes_paciente}</small>}</div>):<p className="ac-miudo">Nenhum check-in registrado.</p>}
    </section><section className="ac-cartao ac-editor">
      <div className="ac-abas" role="group" aria-label="Escolha a operação">
        {[['paciente','Novo paciente'],['rotina','Nova rotina'],['convite','Convite de acesso']].map(([id,label])=><button key={id} className={aba===id?'ativo':''} onClick={()=>{setAba(id);setErro('');}} type="button">{label}</button>)}
      </div>
      {aba==='paciente'&&<form onSubmit={cadastrarPaciente} className="ac-form"><h2>Cadastrar paciente</h2><div className="ac-campos">
        {[['nome','Nome completo','text'],['data_nascimento','Nascimento','date'],['patologia_principal','Patologia principal','text'],['email','E-mail (opcional)','email'],['telefone','Telefone (opcional)','tel'],['nome_familiar','Nome familiar (opcional)','text'],['telefone_familiar','Telefone familiar (opcional)','tel']].map(([chave,label,tipo])=><label key={chave}>{label}<input type={tipo} value={novoPaciente[chave]} required={['nome','data_nascimento','patologia_principal'].includes(chave)} onChange={e=>atualizarCampo(setNovoPaciente,e.target.value,chave)}/></label>)}
      </div><button type="submit" disabled={carregando} className="ac-botao">Salvar paciente</button></form>}
      {aba==='rotina'&&<form className="ac-form" onSubmit={cadastrarRotina}><h2>Prescrever rotina domiciliar</h2><p>Paciente escolhido: <b>{paciente?.nome||'Selecione na coluna ao lado'}</b></p><div className="ac-campos">
        <label>Título<input required maxLength={100} value={novaRotina.titulo} onChange={e=>atualizarCampo(setNovaRotina,e.target.value,'titulo')}/></label>
        <label>Data inicial<input required type="date" value={novaRotina.data_inicio} onChange={e=>atualizarCampo(setNovaRotina,e.target.value,'data_inicio')}/></label>
        <label>Data final (opcional)<input type="date" min={novaRotina.data_inicio} value={novaRotina.data_fim} onChange={e=>atualizarCampo(setNovaRotina,e.target.value,'data_fim')}/></label>
      </div><div className="ac-secoes"><button type="button" className={secao==='medicamentos'?'ativo':''} onClick={()=>setSecao('medicamentos')}>Medicamentos prescritos ({novaRotina.medicamentos.length})</button><button type="button" className={secao==='exercicios'?'ativo':''} onClick={()=>setSecao('exercicios')}>Atividades e exercícios ({novaRotina.itens.length})</button></div>
      {secao==='exercicios'&&<section className="ac-catalogo"><h3>Exercícios da rotina</h3><div className="ac-busca"><label>Buscar no catálogo<input placeholder="Busque pelo nome" value={busca} onChange={e=>setBusca(e.target.value)}/></label><button type="button" className="ac-botao-sec-form" onClick={()=>setModal('exercicio')}>+ Novo exercício</button></div>
      {exercicios.filter(ex=>ex.nome.toLowerCase().includes(busca.toLowerCase())).map(ex=>{const item=novaRotina.itens.find(i=>i.exercicio_id===ex.id);return <div className="ac-exercicio" key={ex.id}><label className="ac-check"><input type="checkbox" checked={!!item} onChange={e=>alterarExercicio(ex.id,e.target.checked)}/><span><b>{ex.nome}</b><small>{ex.descricao}</small></span></label>{item&&<><div className="ac-exercicio-campos">{[['series','Séries'],['repeticoes','Repetições']].map(([c,rot])=><label key={c}>{rot}<input type="number" min="1" max={c==='series'?50:1000} required value={item[c]} onChange={e=>alterarItem('exercicio',ex.id,c,Number(e.target.value))}/></label>)}<label>Observações<input maxLength={150} value={item.observacoes} onChange={e=>alterarItem('exercicio',ex.id,'observacoes',e.target.value)}/></label></div><DiasSemana tipo="exercicio" id={ex.id} dias={item.dias_semana}/></>}</div>})}</section>}
      {secao==='medicamentos'&&<section className="ac-catalogo"><h3>Medicamentos prescritos</h3><p>Registre somente orientações constantes em prescrição existente de profissional habilitado. O sistema não sugere doses.</p><div className="ac-busca"><label>Buscar medicamento<input value={buscaMed} placeholder="Nome do medicamento" onChange={e=>setBuscaMed(e.target.value)}/></label><button type="button" className="ac-botao-sec-form" onClick={()=>setModal('medicamento')}>+ Novo medicamento</button></div>
      {medicamentosCatalogo.filter(m=>m.nome.toLowerCase().includes(buscaMed.toLowerCase())).map(m=>{const selecionado=novaRotina.medicamentos.find(i=>i.medicamento_id===m.id);return <div className="ac-exercicio" key={m.id}><label className="ac-check"><input type="checkbox" checked={!!selecionado} onChange={e=>e.target.checked?adicionarMedicamento(m.id):setNovaRotina(p=>({...p,medicamentos:p.medicamentos.filter(i=>i.medicamento_id!==m.id)}))}/><span><b>{m.nome}</b><small>{m.apresentacao}</small></span></label>{selecionado&&<><div className="ac-campos ac-prescricao">{[['prescritor_nome','Nome do prescritor'],['referencia_prescricao','Identificação/referência da prescrição'],['dose_informada','Dose conforme prescrição'],['via_administracao','Via de administração'],['frequencia_texto','Frequência prescrita'],['orientacao_prescrita','Orientação da prescrição']].map(([campo,label])=><label key={campo}>{label}<input required maxLength={campo==='orientacao_prescrita'?500:campo==='referencia_prescricao'?200:campo==='prescritor_nome'?150:120} value={selecionado[campo]} onChange={e=>alterarItem('medicamento',m.id,campo,e.target.value)}/></label>)}</div><div className="ac-horarios"><b>Horários conforme prescrição</b>{selecionado.horarios.map((horario,indice)=><div className="ac-horario" key={`${m.id}-${indice}`}><input aria-label={`Horário ${indice+1}`} required type="time" value={horario} onChange={e=>alterarItem('medicamento',m.id,'horarios',selecionado.horarios.map((v,i)=>i===indice?e.target.value:v))}/><button type="button" disabled={selecionado.horarios.length===1} onClick={()=>alterarItem('medicamento',m.id,'horarios',selecionado.horarios.filter((_,i)=>i!==indice))}>Remover</button></div>)}<button type="button" className="ac-botao-sec-form" disabled={selecionado.horarios.length>=12} onClick={()=>alterarItem('medicamento',m.id,'horarios',[...selecionado.horarios,'12:00'])}>+ Adicionar horário</button></div><DiasSemana tipo="medicamento" id={m.id} dias={selecionado.dias_semana}/></>}</div>})}</section>}
      <button type="submit" disabled={carregando||(!novaRotina.itens.length&&!novaRotina.medicamentos.length)||!escolhido} className="ac-botao">Salvar rotina completa</button></form>}
      {aba==='convite'&&<form className="ac-form" onSubmit={criarConvite}><h2>Convidar paciente ou cuidador</h2><p>O acesso é individual. Confirme antes que o paciente ou responsável legal autorizou o compartilhamento das atividades.</p><div className="ac-campos">
        <label>Nome do convidado<input required maxLength={100} value={convite.nome} onChange={e=>atualizarCampo(setConvite,e.target.value,'nome')}/></label>
        <label>E-mail do convidado<input required type="email" value={convite.email} onChange={e=>atualizarCampo(setConvite,e.target.value,'email')}/></label>
        <label>Quem vai acessar?<select value={convite.papel} onChange={e=>atualizarCampo(setConvite,e.target.value,'papel')}><option>Cuidador</option><option>Paciente</option></select></label>
        <label>Quem autorizou o acesso?<input required maxLength={100} placeholder="Nome do paciente ou responsável" value={convite.autorizado_por} onChange={e=>atualizarCampo(setConvite,e.target.value,'autorizado_por')}/></label>
      </div><label className="ac-check"><input type="checkbox" checked={convite.confirmou_autorizacao} onChange={e=>atualizarCampo(setConvite,e.target.checked,'confirmou_autorizacao')}/><span>Confirmo que o acesso foi autorizado pelo paciente ou responsável legal.</span></label><button type="submit" disabled={carregando||!escolhido} className="ac-botao">Gerar convite válido por 48 horas</button>
        {link&&<div className="ac-convite-link"><b>Link único (não publique):</b><input readOnly value={link} aria-label="Link de convite"/><button type="button" onClick={()=>navigator.clipboard.writeText(link).then(()=>setMensagem('Link copiado. Compartilhe por canal privado.')).catch(()=>setMensagem('Selecione e copie o link acima.'))}>Copiar link</button></div>}
      </form>}
    </section></div></div>
    {modal&&<div className="ac-modal-fundo" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="ac-modal" role="dialog" aria-modal="true" aria-label={modal==='exercicio'?'Novo exercício':'Novo medicamento'}><header><h2>{modal==='exercicio'?'Adicionar exercício ao catálogo':'Adicionar medicamento ao catálogo'}</h2><button type="button" onClick={()=>setModal('')} aria-label="Fechar">×</button></header><p>O novo item será salvo no catálogo e selecionado automaticamente.</p>{modal==='exercicio'?<div className="ac-form ac-campos"><label>Nome<input maxLength={100} required value={novoExercicio.nome} onChange={e=>atualizarCampo(setNovoExercicio,e.target.value,'nome')}/></label><label>Categoria<select value={novoExercicio.categoria} onChange={e=>atualizarCampo(setNovoExercicio,e.target.value,'categoria')}>{['Alongamento','Fortalecimento','Mobilidade','Respiratorio','Outros'].map(v=><option key={v} value={v}>{v}</option>)}</select></label><label>Descrição<input maxLength={255} value={novoExercicio.descricao} onChange={e=>atualizarCampo(setNovoExercicio,e.target.value,'descricao')}/></label></div>:<div className="ac-form ac-campos"><label>Nome<input maxLength={150} value={novoMedicamento.nome} onChange={e=>atualizarCampo(setNovoMedicamento,e.target.value,'nome')}/></label><label>Apresentação (opcional)<input maxLength={120} value={novoMedicamento.apresentacao} onChange={e=>atualizarCampo(setNovoMedicamento,e.target.value,'apresentacao')}/></label></div>}<div className="ac-modal-acoes"><button type="button" className="ac-botao-sec" onClick={()=>setModal('')}>Cancelar</button><button type="button" className="ac-botao" disabled={carregando||!(modal==='exercicio'?novoExercicio.nome.trim()&&novoExercicio.descricao.trim():novoMedicamento.nome.trim())} onClick={modal==='exercicio'?cadastrarExercicio:cadastrarMedicamento}>Salvar no catálogo</button></div></div></div>}
  </main>;
}
