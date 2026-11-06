import {Link, NavLink} from 'react-router-dom';
import ConfirmacaoSaida from './ConfirmacaoSaida.jsx';

const icones = {dashboard:'grid_view',acompanhamento:'monitor_heart',alertas:'notifications_active',relatorios:'analytics',agenda:'calendar_today',configuracoes:'settings'};
const navegacao = [
  {id:'dashboard',nome:'Dashboard',to:'/dashboard'},
  {id:'acompanhamento',nome:'Acompanhamento',to:'/acompanhamento-clinico'},
  {id:'alertas',nome:'Alertas'},
  {id:'relatorios',nome:'Relatórios'},
  {id:'agenda',nome:'Agenda'},
  {id:'configuracoes',nome:'Configurações'}
];
const Icone = ({nome}) => <span className="material-symbols-outlined" aria-hidden="true">{nome}</span>;
function iniciais(nome='') {return nome.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase()||'CP';}

export default function MenuLateral({aberto=false, aoFechar, usuario, aoSair, alertasUrgentes=0, visualizacao=false}) {
  const nome=usuario?.nome||'Fisioterapeuta';
  return <>
    <aside className={`cd-lateral ${aberto?'cd-lateral-aberta':''}`}>
      <div>
        <Link to="/dashboard" onClick={aoFechar} className="cd-logo no-underline" aria-label="Cuidar+ — voltar à dashboard">
          <span className="cd-logo-icone"><Icone nome="cardiology"/></span><b>Cuidar<span>+</span></b>
        </Link>
        <nav aria-label="Menu principal">
          {navegacao.map(item => item.to ?
            <NavLink key={item.id} to={item.to} onClick={aoFechar} className={({isActive})=>`cd-nav-item ${isActive?'ativo':''}`}>
              <Icone nome={icones[item.id]}/><span>{item.nome}</span>
            </NavLink>
          : <span key={item.id} title="Funcionalidade em desenvolvimento" aria-disabled="true" className="cd-nav-item opacity-50 cursor-not-allowed">
              <Icone nome={icones[item.id]}/><span>{item.nome}</span>{item.id==='alertas'&&alertasUrgentes>0?<em>{alertasUrgentes}</em>:null}
            </span>)}
        </nav>
      </div>
      <div className="cd-usuario">
        <div className="cd-avatar">{iniciais(nome)}</div>
        <div><b>{nome}</b><small>{visualizacao?'Pré-visualização':'Fisioterapeuta'}</small></div>
        {aoSair && <ConfirmacaoSaida aoSair={aoSair} className="cd-sair" tituloBotao="Sair do sistema"><Icone nome="logout"/></ConfirmacaoSaida>}
      </div>
    </aside>
    {aberto&&<button type="button" className="cd-sombra-mobile" aria-label="Fechar menu" onClick={aoFechar}/>}
  </>;
}
