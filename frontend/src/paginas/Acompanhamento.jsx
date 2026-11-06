import {useCallback,useEffect,useState} from 'react';
import {apiRequest} from '../servicos/api.js';
import './acompanhamento.css';
const agora=new Date();
const hoje=new Date(agora.getTime()-agora.getTimezoneOffset()*60000).toISOString().slice(0,10);
const novo={nome:'',data_nascimento:'',patologia_principal:'',email:'',telefone:'',nome_familiar:'',telefone_familiar:''};
const vazioRotina={titulo:'',data_inicio:hoje,data_fim:'',itens:[]};
function Icone({nome}){return <span className="material-symbols-outlined" aria-hidden="true">{nome}</span>;}
export default function Acompanhamento({sessao,aoSair}){
  const token=sessao.token;
  const [pacientes,setPacientes]=useState([]),[exercicios,setExercicios]=useState([]);
  const [escolhido,setEscolhido]=useState(null),[historico,setHistorico]=useState([]),[rotinas,setRotinas]=useState([]);
  const [novoPaciente,setNovoPaciente]=useState({...novo}),[novaRotina,setNovaRotina]=useState({...vazioRotina});
  const [novoExercicio,setNovoExercicio]=useState({nome:'',descricao:'',categoria:'Alongamento'});
  const [convite,setConvite]=useState({nome:'',email:'',papel:'Cuidador',autorizado_por:'',confirmou_autorizacao:false});
  const [link,setLink]=useState(''),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState(''),[carregando,setCarregando]=useState(false);
  const [aba,setAba]=useState(()=>new URLSearchParams(window.location.search).get('acao')?.includes('Rotina')?'rotina':'paciente');
  const enviar=async (caminho,opcoes={})=>apiRequest(caminho,{...opcoes,token});
  const atualizar=useCallback(async()=>{
    const [p,e]=await Promise.all([apiRequest('/api/pacientes',{token}),apiRequest('/api/rotinas/exercicios',{token})]);
    setPacientes(p.pacientes||[]);setExercicios(e.exercicios||[]);
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
    const itens=novaRotina.itens.map(i=>({exercicio_id:i.exercicio_id,series:Number(i.series),repeticoes:Number(i.repeticoes),observacoes:i.observacoes||''}));
    await enviar('/api/rotinas',{method:'POST',body:{paciente_id:escolhido,titulo:novaRotina.titulo,data_inicio:novaRotina.data_inicio,data_fim:novaRotina.data_fim||null,itens}});
    setNovaRotina({...vazioRotina});const r=await enviar(`/api/rotinas?paciente_id=${escolhido}`);setRotinas(r.rotinas);setMensagem('Rotina criada. Gere um convite para a pessoa que ajudará no acompanhamento.');setAba('convite');
  });}
  async function cadastrarExercicio(e){e.preventDefault();await executar(async()=>{
    await enviar('/api/rotinas/exercicios',{method:'POST',body:novoExercicio});
    const resposta=await enviar('/api/rotinas/exercicios');setExercicios(resposta.exercicios);setNovoExercicio({nome:'',descricao:'',categoria:'Alongamento'});setMensagem('Exercício disponível no catálogo.');
  });}
  async function criarConvite(e){e.preventDefault();await executar(async()=>{
    if(!escolhido)throw new Error('Selecione um paciente.');
    const r=await enviar(`/api/pacientes/${escolhido}/convites`,{method:'POST',body:convite});
    setLink(r.link);setMensagem('Convite criado. O link expira em 48 horas e só deve ser compartilhado com a pessoa autorizada.');
  });}
  const paciente=pacientes.find(p=>p.id===escolhido);
  const atualizarCampo=(set,valor,chave)=>set(a=>({...a,[chave]:valor}));
  function alterarExercicio(id,selecionado){setNovaRotina(p=>({...p,itens:selecionado?[...p.itens,{exercicio_id:id,series:1,repeticoes:10,observacoes:''}]:p.itens.filter(i=>i.exercicio_id!==id)}));}
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
      </div><h3>Exercícios do catálogo</h3>{exercicios.length===0&&<p>Nenhum exercício cadastrado no catálogo. Cadastre exercícios no banco antes de prescrever.</p>}
      <div className="ac-cadastro-exercicio"><h3>Adicionar exercício ao catálogo</h3><div className="ac-campos"><label>Nome<input required maxLength={100} value={novoExercicio.nome} onChange={e=>atualizarCampo(setNovoExercicio,e.target.value,'nome')}/></label><label>Categoria<select value={novoExercicio.categoria} onChange={e=>atualizarCampo(setNovoExercicio,e.target.value,'categoria')}>{['Alongamento','Fortalecimento','Mobilidade','Respiratorio','Outros'].map(c=><option key={c} value={c}>{c==='Respiratorio'?'Respiratório':c}</option>)}</select></label><label>Descrição<input required maxLength={255} value={novoExercicio.descricao} onChange={e=>atualizarCampo(setNovoExercicio,e.target.value,'descricao')}/></label><button className="ac-botao-sec-form" type="button" onClick={cadastrarExercicio} disabled={carregando}>Adicionar ao catálogo</button></div></div>
      {exercicios.map(ex=>{const item=novaRotina.itens.find(i=>i.exercicio_id===ex.id);return <div className="ac-exercicio" key={ex.id}>
        <label className="ac-check"><input type="checkbox" checked={!!item} onChange={e=>alterarExercicio(ex.id,e.target.checked)}/><span><b>{ex.nome}</b><small>{ex.descricao}</small></span></label>
        {item&&<div className="ac-exercicio-campos">{[['series','Séries'],['repeticoes','Repetições']].map(([c,rot])=><label key={c}>{rot}<input type="number" min={1} max={c==='series'?50:1000} value={item[c]} required onChange={e=>setNovaRotina(p=>({...p,itens:p.itens.map(i=>i.exercicio_id===ex.id?{...i,[c]:Number(e.target.value)}:i)}))}/></label>)}<label>Observação<input maxLength={150} value={item.observacoes} onChange={e=>setNovaRotina(p=>({...p,itens:p.itens.map(i=>i.exercicio_id===ex.id?{...i,observacoes:e.target.value}:i)}))}/></label></div>}
      </div>;})}<button type="submit" disabled={carregando||novaRotina.itens.length===0||!escolhido} className="ac-botao">Salvar rotina</button></form>}
      {aba==='convite'&&<form className="ac-form" onSubmit={criarConvite}><h2>Convidar paciente ou cuidador</h2><p>O acesso é individual. Confirme antes que o paciente ou responsável legal autorizou o compartilhamento das atividades.</p><div className="ac-campos">
        <label>Nome do convidado<input required maxLength={100} value={convite.nome} onChange={e=>atualizarCampo(setConvite,e.target.value,'nome')}/></label>
        <label>E-mail do convidado<input required type="email" value={convite.email} onChange={e=>atualizarCampo(setConvite,e.target.value,'email')}/></label>
        <label>Quem vai acessar?<select value={convite.papel} onChange={e=>atualizarCampo(setConvite,e.target.value,'papel')}><option>Cuidador</option><option>Paciente</option></select></label>
        <label>Quem autorizou o acesso?<input required maxLength={100} placeholder="Nome do paciente ou responsável" value={convite.autorizado_por} onChange={e=>atualizarCampo(setConvite,e.target.value,'autorizado_por')}/></label>
      </div><label className="ac-check"><input type="checkbox" checked={convite.confirmou_autorizacao} onChange={e=>atualizarCampo(setConvite,e.target.checked,'confirmou_autorizacao')}/><span>Confirmo que o acesso foi autorizado pelo paciente ou responsável legal.</span></label><button type="submit" disabled={carregando||!escolhido} className="ac-botao">Gerar convite válido por 48 horas</button>
        {link&&<div className="ac-convite-link"><b>Link único (não publique):</b><input readOnly value={link} aria-label="Link de convite"/><button type="button" onClick={()=>navigator.clipboard.writeText(link).then(()=>setMensagem('Link copiado. Compartilhe por canal privado.')).catch(()=>setMensagem('Selecione e copie o link acima.'))}>Copiar link</button></div>}
      </form>}
    </section></div></div>
  </main>;
}
