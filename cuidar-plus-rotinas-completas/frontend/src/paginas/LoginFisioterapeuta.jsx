import { useState } from 'react';
import './login-fisioterapeuta.css';

function Icone({ nome, className = '' }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{nome}</span>;
}

/** Entrada profissional. A autenticação é executada pelo PortalAutenticacao. */
export default function LoginFisioterapeuta({ email, definirEmail, senha, definirSenha, aoEntrar, carregando, erro, mensagem }) {
  const [mostrarSenha, definirMostrarSenha] = useState(false);
  const [lembrar, definirLembrar] = useState(false);

  return (
    <main className="cp-login">
      <section className="cp-login-apresentacao" aria-label="Apresentação do Cuidar+">
        <div className="cp-login-fundo" aria-hidden="true" />
        <div className="cp-login-topo">
          <div className="cp-login-marca">
            <div className="cp-login-marca-icone"><Icone nome="favorite" /></div>
            <div><strong>Cuidar+</strong><small>Fisioterapia &amp; Reabilitação Digital</small></div>
          </div>
          <span className="cp-login-identificacao"><Icone nome="shield" /> Portal profissional</span>
        </div>
        <div className="cp-login-conteudo-marca">
          <span className="cp-login-selo"><Icone nome="vital_signs" /> Plataforma Integrada de Cuidados Clínicos</span>
          <h1>Transformando a reabilitação física com cuidado contínuo e tecnologia humanizada.</h1>
          <p>Acompanhe a evolução de seus pacientes, registre exercícios e organize os atendimentos em um único ambiente.</p>
          <div className="cp-login-recursos">
            <div><span className="cp-login-recurso-icone"><Icone nome="monitoring" /></span><span><strong>Acompanhamento clínico</strong><small>Check-ins e evolução dos pacientes</small></span></div>
            <div><span className="cp-login-recurso-icone"><Icone nome="verified_user" /></span><span><strong>Acesso individual</strong><small>Informações vinculadas ao profissional</small></span></div>
          </div>
        </div>
        <div className="cp-login-rodape-marca"><Icone nome="health_and_safety" /> Cuidar+ · Acompanhamento fisioterapêutico</div>
      </section>

      <section className="cp-login-painel" aria-label="Entrar na plataforma">
        <div className="cp-login-marca-mobile"><Icone nome="favorite" /><strong>Cuidar+</strong><span>Acesso Clínico</span></div>
        <div className="cp-login-formulario-conteudo">
          <span className="cp-login-etiqueta"><Icone nome="lock" /> Portal do Especialista</span>
          <h2>Bem-vindo de volta</h2>
          <p className="cp-login-introducao">Acesse sua conta profissional para gerenciar seus pacientes e protocolos de reabilitação.</p>
          {erro && <div className="cp-login-aviso cp-login-erro" role="alert">{erro}</div>}
          {mensagem && <div className="cp-login-aviso cp-login-sucesso" role="status">{mensagem}</div>}
          <form className="cp-login-form" onSubmit={aoEntrar}>
            <label htmlFor="cp-email">E-mail Profissional</label>
            <div className="cp-login-campo"><Icone nome="mail" /><input id="cp-email" type="email" placeholder="ex: fisioterapeuta@clinica.com.br" autoComplete="username" maxLength={150} value={email} onChange={e=>definirEmail(e.target.value)} required /></div>
            <label htmlFor="cp-senha">Senha de Acesso</label>
            <div className="cp-login-campo"><Icone nome="lock" /><input id="cp-senha" type={mostrarSenha ? 'text' : 'password'} placeholder="Insira sua senha cadastrada" autoComplete="current-password" value={senha} onChange={e=>definirSenha(e.target.value)} required /><button type="button" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha} onClick={()=>definirMostrarSenha(!mostrarSenha)} className="cp-login-mostrar"><Icone nome={mostrarSenha ? 'visibility_off':'visibility'} /></button></div>
            <div className="cp-login-opcoes"><label className="cp-login-lembrar"><input type="checkbox" checked={lembrar} onChange={e=>definirLembrar(e.target.checked)} /><span>Lembrar meu acesso</span></label><span className="cp-login-indisponivel" title="A recuperação de senha será implementada com o backend">Recuperação de senha em breve</span></div>
            <button className="cp-login-entrar" type="submit" disabled={carregando}><span>{carregando ? 'Entrando…':'Entrar na Plataforma'}</span><Icone nome="arrow_forward" /></button>
          </form>
          <div className="cp-login-ajuda"><Icone nome="info" /><span>O acesso é destinado a fisioterapeutas cadastrados. Solicite acesso à equipe responsável pelo Cuidar+.</span></div>
          <div className="cp-login-acesso-paciente"><span>Você é paciente ou cuidador?</span> <a href="/cuidado">Acessar acompanhamento domiciliar <Icone nome="arrow_forward" /></a></div>
        </div>
        <footer className="cp-login-rodape">© {new Date().getFullYear()} Cuidar+ · Seus dados devem ser tratados com privacidade.</footer>
      </section>
    </main>
  );
}
