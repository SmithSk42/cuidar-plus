import {useEffect,useState} from 'react';
import {apiRequest} from '../servicos/api.js';
import './portal-cuidador.css';
const CHAVE='cuidar-sessao-domiciliar';
function lerSessao(){try{const s=JSON.parse(sessionStorage.getItem(CHAVE));return s?.token&&s.usuario?.perfil==='domiciliar'?s:null;}catch{return null;}}
const obterConvite=()=>new URLSearchParams(window.location.search).get('convite')||'';
function Icone({nome}){return <span className="material-symbols-outlined" aria-hidden="true">{nome}</span>;}
function Marcacao({nome,valor,alterar,desabilitado=false}){return <fieldset className="pc-marcacao"><legend>{nome}</legend><div className="pc-opcoes"><label className={valor===true?'selecionado':''}><input type="radio" disabled={desabilitado} checked={valor===true} onChange={()=>alterar(true)}/> <Icone nome="check_circle"/> Fiz</label><label className={valor===false?'selecionado':''}><input type="radio" disabled={desabilitado} checked={valor===false} onChange={()=>alterar(false)}/> <Icone nome="cancel"/> Não fiz</label></div></fieldset>;}
export default function PortalCuidador(){
  const [sessao,setSessao]=useState(lerSessao);const [convite,setConvite]=useState(obterConvite);
  const [email,setEmail]=useState(''),[senha,setSenha]=useState('');
  const [tela,setTela]=useState(obterConvite()?'ativar':'entrar');
  const [dados,setDados]=useState([]),[carregando,setCarregando]=useState(false),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState('');
  const [edicoes,setEdicoes]=useState({}),[nivelDor,setNivelDor]=useState(0),[observacoes,setObservacoes]=useState('');
  useEffect(()=>{if(convite)window.history.replaceState({},document.title,'/cuidado');},[convite]);
  async function carregar(token){const resposta=await apiRequest('/api/cuidado/meu-dia',{token});setDados(resposta.rotinas||[]);}
  useEffect(()=>{
    if(!sessao?.token)return;
    carregar(sessao.token).catch(e=>{
      if(e.status===401){sessionStorage.removeItem(CHAVE);setSessao(null);setDados([]);setErro('Sua sessão expirou. Entre novamente.');}
      else setErro(e.message);
    });
  },[sessao?.token]);
  async function executar(tarefa){setErro('');setMensagem('');setCarregando(true);try{await tarefa();}catch(e){setErro(e.message);}finally{setCarregando(false);}}
  function guardarSessao(d){const s={token:d.token,usuario:d.usuario};sessionStorage.setItem(CHAVE,JSON.stringify(s));setSessao(s);setSenha('');}
  async function entrar(e){e.preventDefault();await executar(async()=>guardarSessao(await apiRequest('/api/cuidado/login',{method:'POST',body:{email,senha}})));}
  async function ativar(e){e.preventDefault();await executar(async()=>{const r=await apiRequest('/api/cuidado/ativar',{method:'POST',body:{convite,senha}});setConvite('');guardarSessao(r);});}
  async function aceitar(e){e.preventDefault();await executar(async()=>{await apiRequest('/api/cuidado/aceitar-convite',{method:'POST',token:sessao.token,body:{convite}});setConvite('');await carregar(sessao.token);setMensagem('Paciente vinculado.');});}
  function sair(){sessionStorage.removeItem(CHAVE);setSessao(null);setDados([]);setEmail('');setSenha('');setEdicoes({});setMensagem('');setTela('entrar');}
  async function enviarCheckin(rotina){const mapa=edicoes[rotina.rotina_id]||{};await executar(async()=>{
    if(rotina.itens.some(item=>typeof mapa[item.rotina_item_id]!=='boolean'))throw new Error('Marque todos os exercícios como feitos ou não feitos.');
    await apiRequest('/api/cuidado/checkins',{method:'POST',token:sessao.token,body:{rotina_id:rotina.rotina_id,nivel_dor:Number(nivelDor),observacoes_paciente:observacoes,itens:rotina.itens.map(item=>({rotina_item_id:item.rotina_item_id,concluido:mapa[item.rotina_item_id]}))}});
    await carregar(sessao.token);setMensagem('Registro enviado com sucesso. Obrigado por compartilhar como foi seu dia!');setEdicoes({});setObservacoes('');setNivelDor(0);
  });}
  async function registrarMedicamento(horarioId,situacao){await executar(async()=>{await apiRequest('/api/cuidado/medicamentos/registrar',{method:'POST',token:sessao.token,body:{horario_id:horarioId,situacao}});await carregar(sessao.token);setMensagem('Situação do medicamento registrada.');});}
  return <main className="pc-app"><header className="pc-cabecalho"><a className="pc-logo" href="/cuidado"><Icone nome="favorite"/><b>Cuidar<span>+</span></b></a>{sessao&&<button type="button" className="pc-sair" onClick={sair}>Sair</button>}</header><div className="pc-conteudo">
    {!sessao?<section className="pc-cartao pc-acesso"><span className="pc-etiqueta">Acompanhamento domiciliar</span><h1>{tela==='ativar'?'Ative seu acesso':'Olá! Bem-vindo ao Cuidar+'}</h1><p>Este espaço é para pacientes e pessoas autorizadas a ajudar no cuidado.</p>
      {erro&&<p role="alert" className="pc-erro">{erro}</p>}{mensagem&&<p role="status" className="pc-mensagem">{mensagem}</p>}
      {tela==='ativar'?<form onSubmit={ativar} className="pc-form"><label>Código do convite<input required value={convite} onChange={e=>setConvite(e.target.value.trim())} autoComplete="off" placeholder="Cole o código recebido"/></label><label>Crie uma senha (mínimo 10 caracteres)<input required type="password" minLength={10} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)}/></label><button disabled={carregando} className="pc-primario">Criar meu acesso</button><button type="button" className="pc-link" onClick={()=>{setTela('entrar');setErro('');}}>Já tenho uma conta</button></form>
      :<form onSubmit={entrar} className="pc-form"><label>Seu e-mail<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Sua senha<input required type="password" autoComplete="current-password" value={senha} onChange={e=>setSenha(e.target.value)}/></label><button disabled={carregando} className="pc-primario">Entrar</button><button type="button" className="pc-link" onClick={()=>{setTela('ativar');setErro('');}}>Recebi um convite</button></form>}
      <p className="pc-legenda">Para acessar pela primeira vez, solicite um convite individual ao fisioterapeuta.</p>
      <a href="/" className="pc-link">Sou fisioterapeuta</a>
    </section>:<><section className="pc-saudacao"><span className="pc-etiqueta">SEU CUIDADO TODOS OS DIAS</span><h1>Olá, {sessao.usuario.nome.split(' ')[0]}!</h1><p>Registre como foi seu dia. Você pode pedir ajuda a um cuidador.</p></section>
      {erro&&<p role="alert" className="pc-erro">{erro}</p>}{mensagem&&<p role="status" className="pc-mensagem">{mensagem}</p>}
      <details className="pc-vinculo"><summary>Já tem outro convite?</summary><form onSubmit={aceitar} className="pc-form"><label>Código recebido<input required value={convite} onChange={e=>setConvite(e.target.value.trim())}/></label><button className="pc-primario" disabled={carregando}>Vincular outro paciente</button></form></details>
      {dados.length===0&&<section className="pc-cartao"><Icone nome="task_alt"/><h2>Sem tarefas para hoje</h2><p>Nenhuma rotina ativa foi encontrada. Seu fisioterapeuta pode precisar cadastrar ou iniciar uma rotina.</p><button className="pc-secundario" onClick={()=>executar(()=>carregar(sessao.token))}>Atualizar tarefas</button></section>}
      {dados.map(rotina=>{const marcacoes=edicoes[rotina.rotina_id]||{};const completo=rotina.itens.every(i=>typeof marcacoes[i.rotina_item_id]==='boolean');const podeRegistrar=Boolean(rotina.pode_registrar);return <section className="pc-cartao" key={rotina.rotina_id}><span className="pc-etiqueta">{rotina.paciente}</span><h2>{rotina.titulo}</h2>{!podeRegistrar&&<p>Seu acesso permite consultar as atividades, mas não enviar registros.</p>}
        {rotina.medicamentos?.length>0&&<div className="pc-medicamentos"><h3>Medicamentos prescritos</h3><p>Registre apenas o que aconteceu. Não altere o tratamento por conta própria.</p>{rotina.medicamentos.map(m=><div key={m.horario_id} className="pc-medicamento"><b>{m.nome} · {String(m.horario).slice(0,5)}</b><small>{m.dose_informada} · {m.via_administracao}</small>{m.registro_situacao?<span>Registrado: {m.registro_situacao.replaceAll('_',' ')}</span>:<div className="pc-med-acoes"><button disabled={carregando||!podeRegistrar} onClick={()=>registrarMedicamento(m.horario_id,'Administrado')}>Foi administrado</button><button disabled={carregando||!podeRegistrar} onClick={()=>registrarMedicamento(m.horario_id,'Nao_Administrado')}>Não administrado</button><button disabled={carregando||!podeRegistrar} onClick={()=>registrarMedicamento(m.horario_id,'Adiado')}>Adiado</button></div>}</div>)}</div>}
        {rotina.itens.length===0?<p>Sem exercícios programados nesta rotina para hoje.</p>:rotina.checkin_id?<div className="pc-concluido"><Icone nome="check_circle"/><div><b>Check-in já enviado hoje</b><p>Nível de dor informado: {rotina.nivel_dor}/10. Você poderá registrar novamente amanhã.</p></div></div>:<><p>Marque cada atividade para que o fisioterapeuta saiba o que aconteceu em casa.</p>
          {rotina.itens.map(item=><Marcacao desabilitado={!podeRegistrar} key={item.rotina_item_id} nome={`${item.nome} · ${item.series} séries × ${item.repeticoes} repetições`} valor={marcacoes[item.rotina_item_id]} alterar={v=>{if(!podeRegistrar)return;setEdicoes(p=>({...p,[rotina.rotina_id]:{...p[rotina.rotina_id],[item.rotina_item_id]:v}}));}}/>)}
          <div className="pc-dor"><label htmlFor={`dor-${rotina.rotina_id}`}>Qual seu nível de dor agora?</label><div className="pc-escala"><span>Sem dor</span><b>{nivelDor}/10</b><span>Dor máxima</span></div><input id={`dor-${rotina.rotina_id}`} type="range" min="0" max="10" step="1" value={nivelDor} onChange={e=>setNivelDor(Number(e.target.value))}/></div>
          <label className="pc-observacao">Quer contar algo? (opcional)<textarea maxLength={255} rows={3} value={observacoes} placeholder="Ex.: tive dificuldade para levantar o braço" onChange={e=>setObservacoes(e.target.value)}/></label>
          <button className="pc-primario" disabled={carregando||!completo||!podeRegistrar} onClick={()=>enviarCheckin(rotina)}>Enviar meu registro</button><small>Este aplicativo não é um serviço de emergência. Em situação urgente, procure atendimento imediato pelos canais locais.</small>
        </>}
      </section>;})}
    </>}
    </div><footer className="pc-rodape">Cuidar+ · Registre o cuidado com simplicidade e privacidade</footer></main>;
}
