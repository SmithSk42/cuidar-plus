// Responsável por esta implementação: Filipe Alves Sousa Julio.
import { useEffect, useState } from 'react';
import PainelFisio from './PainelFisio.jsx';
import './paciente.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SESSION_KEYS = {
  paciente: 'cuidar-paciente-session',
  fisioterapeuta: 'cuidar-fisioterapeuta-session',
};

async function apiRequest(path, options = {}) {
  const { token, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      body: fetchOptions.body === undefined ? undefined : JSON.stringify(fetchOptions.body),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira se o backend está iniciado.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('A API respondeu em um formato inesperado.');
  }
  if (!response.ok) {
    throw new Error(data.erro || 'Não foi possível concluir a solicitação.');
  }
  return data;
}

function readSession(perfilEsperado) {
  const sessionKey = SESSION_KEYS[perfilEsperado];
  const saved = sessionStorage.getItem(sessionKey);
  if (!saved) return null;
  try {
    const session = JSON.parse(saved);
    if (session.usuario?.perfil === perfilEsperado && session.token) return session;
  } catch {
    // Remove abaixo uma sessão inválida ou gravada em formato desconhecido.
  }
  sessionStorage.removeItem(sessionKey);
  return null;
}

function Field({ id, label, type = 'text', value, onChange, autoComplete, required = true }) {
  return (
    <label className="patient-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  );
}

export default function TelaLoginPaciente({ perfilEsperado = 'paciente' }) {
  const isPatient = perfilEsperado === 'paciente';
  const sessionKey = SESSION_KEYS[perfilEsperado];
  const [session, setSession] = useState(() => readSession(perfilEsperado));
  const [view, setView] = useState('login');
  const [nome, setNome] = useState('');
  const [crefito, setCrefito] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [realizouAtividades, setRealizouAtividades] = useState('');
  const [nivelDor, setNivelDor] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [checkins, setCheckins] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!session) return;
    let ativo = true;
    if (!isPatient) return undefined;
    apiRequest('/api/checkins/meus', { token: session.token })
      .then((data) => {
        if (ativo) setCheckins(data.checkins);
      })
      .catch((error) => {
        if (!ativo) return;
        if (error.message === 'Token inválido ou expirado.') {
          sessionStorage.removeItem(sessionKey);
          setSession(null);
          setErro('Sua sessão expirou. Entre novamente.');
        } else {
          setErro(error.message);
        }
      });
    return () => {
      ativo = false;
    };
  }, [isPatient, session, sessionKey]);

  async function entrar(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setCarregando(true);
    try {
      const result = await apiRequest('/api/login', {
        method: 'POST',
        body: { email, senha },
      });
      if (result.usuario.perfil !== perfilEsperado) {
        const perfilConta = result.usuario.perfil === 'paciente' ? 'paciente' : 'fisioterapeuta';
        throw new Error(`Esta conta é de ${perfilConta}. Entre pela tela correspondente.`);
      }
      const novaSessao = { token: result.token, usuario: result.usuario };
      sessionStorage.setItem(sessionKey, JSON.stringify(novaSessao));
      setSession(novaSessao);
      setSenha('');
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function cadastrar(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.');
      return;
    }
    setCarregando(true);
    try {
      const cadastroPath = isPatient ? '/api/pacientes/registro' : '/api/fisioterapeutas/registro';
      await apiRequest(cadastroPath, {
        method: 'POST',
        body: { nome, ...(isPatient ? {} : { crefito }), email, senha },
      });
      setView('login');
      setNome('');
      setCrefito('');
      setSenha('');
      setConfirmacao('');
      setMensagem('Conta criada. Entre com seu e-mail e senha.');
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function registrarCheckin(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setCarregando(true);
    try {
      const data = await apiRequest('/api/checkin', {
        method: 'POST',
        token: session.token,
        body: {
          status_atividades: realizouAtividades === 'sim',
          nivel_dor: Number(nivelDor),
          observacoes: observacoes.trim() || null,
        },
      });
      setCheckins((anteriores) => [data.checkin, ...anteriores].slice(0, 30));
      setRealizouAtividades('');
      setNivelDor('0');
      setObservacoes('');
      setMensagem('Check-in salvo com sucesso.');
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  function sair() {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    setCheckins([]);
    setView('login');
    setEmail('');
    setSenha('');
    setErro('');
    setMensagem('Você saiu da sua conta.');
  }

  return (
    <main className="patient-app">
      <section className={`patient-card${isPatient ? '' : ' physio-card'}`}>
        <header className="patient-header">
          <p className="patient-brand">Cuidar<span>+</span></p>
          <p className="patient-subtitle">
            {isPatient ? 'Seu cuidado, todos os dias' : 'Área do fisioterapeuta'}
          </p>
        </header>

        {erro && <p className="patient-message error" role="alert">{erro}</p>}
        {mensagem && <p className="patient-message success" role="status">{mensagem}</p>}

        {!session && view === 'login' && (
          <form className="patient-form" onSubmit={entrar}>
            <h1>{isPatient ? 'Entrar como paciente' : 'Entrar como fisioterapeuta'}</h1>
            <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field id="senha" label="Senha" type="password" value={senha} onChange={setSenha} autoComplete="current-password" />
            <button className="patient-primary" type="submit" disabled={carregando}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
            {isPatient ? (
              <>
                <p className="patient-switch">
                  Ainda não tem conta?{' '}
                  <button type="button" onClick={() => { setView('register'); setErro(''); setMensagem(''); }}>
                    Criar conta
                  </button>
                </p>
                <p className="patient-switch">
                  <a href="/fisioterapeuta">Acesso do fisioterapeuta</a>
                </p>
              </>
            ) : (
              <>
                <p className="patient-switch">
                  Ainda não tem conta?{' '}
                  <button type="button" onClick={() => { setView('register'); setErro(''); setMensagem(''); }}>
                    Cadastrar-se
                  </button>
                </p>
                <p className="patient-switch">
                  <a href="/paciente">Acesso do paciente</a>
                </p>
              </>
            )}
          </form>
        )}

        {!session && view === 'register' && (
          <form className="patient-form" onSubmit={cadastrar}>
            <h1>{isPatient ? 'Criar conta de paciente' : 'Cadastro de fisioterapeuta'}</h1>
            <Field id="nome" label="Nome completo" value={nome} onChange={setNome} autoComplete="name" />
            {!isPatient && (
              <Field id="crefito" label="CREFITO" value={crefito} onChange={setCrefito} autoComplete="off" />
            )}
            <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field id="senha" label="Senha (mínimo 8 caracteres)" type="password" value={senha} onChange={setSenha} autoComplete="new-password" />
            <Field id="confirmacao" label="Confirmar senha" type="password" value={confirmacao} onChange={setConfirmacao} autoComplete="new-password" />
            <button className="patient-primary" type="submit" disabled={carregando}>
              {carregando ? 'Criando conta…' : 'Cadastrar'}
            </button>
            <p className="patient-switch">
              Já tem conta?{' '}
              <button type="button" onClick={() => { setView('login'); setErro(''); setMensagem(''); }}>
                Voltar para o login
              </button>
            </p>
          </form>
        )}

        {session && isPatient && (
          <div className="patient-home">
            <div className="patient-welcome">
              <div>
                <h1>Olá, {session.usuario.nome}</h1>
                <p>Registre como foi sua rotina de hoje.</p>
              </div>
              <button className="patient-logout" type="button" onClick={sair}>Sair</button>
            </div>

            <form className="patient-form" onSubmit={registrarCheckin}>
              <fieldset className="patient-activities">
                <legend>Conseguiu realizar as atividades?</legend>
                <label>
                  <input
                    type="radio"
                    name="atividades"
                    value="sim"
                    checked={realizouAtividades === 'sim'}
                    onChange={(event) => setRealizouAtividades(event.target.value)}
                    required
                  />
                  Sim
                </label>
                <label>
                  <input
                    type="radio"
                    name="atividades"
                    value="nao"
                    checked={realizouAtividades === 'nao'}
                    onChange={(event) => setRealizouAtividades(event.target.value)}
                  />
                  Ainda não
                </label>
              </fieldset>

              <label className="patient-field" htmlFor="nivel-dor">
                <span>Nível de dor: <strong>{nivelDor}/10</strong></span>
                <input
                  id="nivel-dor"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={nivelDor}
                  onChange={(event) => setNivelDor(event.target.value)}
                />
                <span className="patient-hint">0 = sem dor · 10 = dor intensa</span>
              </label>
              <label className="patient-field" htmlFor="observacoes">
                <span>Observações (opcional)</span>
                <textarea
                  id="observacoes"
                  rows="3"
                  maxLength="2000"
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                />
              </label>
              <button className="patient-primary" type="submit" disabled={carregando}>
                {carregando ? 'Salvando…' : 'Salvar check-in'}
              </button>
            </form>

            <section className="patient-history" aria-labelledby="checkin-history">
              <h2 id="checkin-history">Seus últimos check-ins</h2>
              {checkins.length === 0 ? (
                <p className="patient-hint">Seus registros aparecerão aqui.</p>
              ) : (
                <ul>
                  {checkins.map((checkin) => (
                    <li key={checkin.id}>
                      <time dateTime={checkin.data_registro}>
                        {new Date(checkin.data_registro).toLocaleString('pt-BR')}
                      </time>
                      <span>Atividades: {checkin.status_atividades ? 'realizadas' : 'não realizadas'}</span>
                      <span>Dor: {checkin.nivel_dor}/10</span>
                      {checkin.observacoes && <p>{checkin.observacoes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {session && !isPatient && (
          <section className="physio-home">
            <div className="physio-home-header">
              <div>
                <h1>Olá, {session.usuario.nome}</h1>
                <p>Sessão autenticada como fisioterapeuta.</p>
              </div>
              <button className="patient-logout" type="button" onClick={sair}>Sair</button>
            </div>
            <p className="physio-demo-notice">
              O painel abaixo ainda usa dados demonstrativos; cadastro de pacientes,
              listas e tarefas não estão conectados ao MySQL.
            </p>
            <PainelFisio />
          </section>
        )}
      </section>
    </main>
  );
}
