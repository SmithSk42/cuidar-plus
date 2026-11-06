import {useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {apiRequest} from './servicos/api.js';
import LoginFisioterapeuta from './paginas/LoginFisioterapeuta.jsx';
import Dashboard from './paginas/Dashboard.jsx';
import Acompanhamento from './paginas/Acompanhamento.jsx';
import AcompanhamentoClinico from './paginas/AcompanhamentoClinico.jsx';
const CHAVE='cuidar-fisioterapeuta-session';
function lerSessao(){try{const s=JSON.parse(sessionStorage.getItem(CHAVE));return s?.token&&s.usuario?.perfil==='fisioterapeuta'?s:null;}catch{return null;}}
export default function PortalAutenticacao(){
  const [sessao,definirSessao]=useState(lerSessao);
  const localizacao=useLocation();const navigate=useNavigate();
  const [email,definirEmail]=useState('');const [senha,definirSenha]=useState('');
  const [erro,definirErro]=useState('');const [carregando,definirCarregando]=useState(false);
  async function entrar(evento){
    evento.preventDefault();definirErro('');definirCarregando(true);
    try{
      const dados=await apiRequest('/api/login',{method:'POST',body:{email,senha}});
      if(dados.usuario?.perfil!=='fisioterapeuta')throw new Error('Acesso profissional não autorizado.');
      const s={token:dados.token,usuario:dados.usuario};
      sessionStorage.setItem(CHAVE,JSON.stringify(s));definirSessao(s);definirSenha('');navigate('/dashboard',{replace:true});
    }catch(e){definirErro(e.message);}finally{definirCarregando(false);}
  }
  function sair(){sessionStorage.removeItem(CHAVE);definirSessao(null);definirErro('');}
  if(sessao){return localizacao.pathname==='/acompanhamento'
    ? <Acompanhamento sessao={sessao} aoSair={sair}/>
    : localizacao.pathname==='/acompanhamento-clinico'
      ? <AcompanhamentoClinico sessao={sessao} aoSair={sair}/>
      : <Dashboard sessao={sessao} aoSair={sair}/>;}
  return <LoginFisioterapeuta email={email} definirEmail={definirEmail} senha={senha} definirSenha={definirSenha}
    aoEntrar={entrar} carregando={carregando} erro={erro} mensagem=""/>;
}
