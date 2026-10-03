import React, { useState } from 'react';

// Usuário de demonstração (o cadastro fica só em memória: some ao recarregar a página)
const DEMO_USERS = [{ name: 'Usuário Demo', email: 'demo@cuidar.com', password: '123456' }];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500';
const primaryBtn =
  'w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors';
const linkBtn = 'text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline';

function Field({ id, label, type = 'text', value, onChange, autoComplete, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={inputClass}
        />
        {children}
      </div>
    </div>
  );
}

export default function CuidarPlusLoginFuncional() {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'recovery' | 'home'
  const [users, setUsers] = useState(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const go = (nextView) => {
    setView(nextView);
    setName('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setError('');
    setInfo('');
    // mantém o e-mail digitado ao alternar entre telas
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const found = users.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );
    if (!found) {
      setError('E-mail ou senha incorretos.');
      return;
    }
    setCurrentUser(found);
    setView('home');
    setPassword('');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (name.trim().length < 2) return setError('Informe seu nome.');
    if (!isEmail(cleanEmail)) return setError('Informe um e-mail válido.');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    if (users.some((u) => u.email === cleanEmail)) {
      return setError('Já existe uma conta com este e-mail.');
    }

    setUsers([...users, { name: name.trim(), email: cleanEmail, password }]);
    setView('login');
    setName('');
    setPassword('');
    setConfirm('');
    setInfo('Conta criada! Entre com seu e-mail e senha.');
  };

  const handleRecovery = (e) => {
    e.preventDefault();
    setError('');

    if (!isEmail(email.trim())) return setError('Informe um e-mail válido.');
    // Mesma resposta exista ou não a conta, para não revelar quem está cadastrado
    setInfo('Se este e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmail('');
    setView('login');
    setInfo('Você saiu da sua conta.');
  };

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
    >
      {showPassword ? 'Ocultar' : 'Mostrar'}
    </button>
  );

  const messages = (
    <>
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          {info}
        </p>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-800 text-center">
          Cuidar<span className="text-teal-500">+</span>
        </h1>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="username" />
            <Field
              id="password"
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            >
              {eyeButton}
            </Field>

            <div className="text-right">
              <button type="button" onClick={() => go('recovery')} className={linkBtn}>
                Esqueceu a senha?
              </button>
            </div>

            {messages}

            <button type="submit" className={primaryBtn}>Entrar</button>

            <p className="text-sm text-center text-slate-600">
              Não tem conta?{' '}
              <button type="button" onClick={() => go('register')} className={linkBtn}>
                Criar conta
              </button>
            </p>

            <p className="text-xs text-center text-slate-400">
              Para testar: demo@cuidar.com / 123456
            </p>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-800 text-center">Criar conta</h2>
            <Field id="name" label="Nome" value={name} onChange={setName} autoComplete="name" />
            <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field
              id="password"
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            >
              {eyeButton}
            </Field>
            <Field
              id="confirm"
              label="Confirmar senha"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />

            {messages}

            <button type="submit" className={primaryBtn}>Criar conta</button>

            <p className="text-sm text-center">
              <button type="button" onClick={() => go('login')} className={linkBtn}>
                Voltar para o login
              </button>
            </p>
          </form>
        )}

        {view === 'recovery' && (
          <form onSubmit={handleRecovery} className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-800 text-center">Recuperar senha</h2>
            <p className="text-sm text-slate-600 text-center">
              Informe seu e-mail para receber as instruções.
            </p>
            <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />

            {messages}

            <button type="submit" className={primaryBtn}>Enviar instruções</button>

            <p className="text-sm text-center">
              <button type="button" onClick={() => go('login')} className={linkBtn}>
                Voltar para o login
              </button>
            </p>
          </form>
        )}

        {view === 'home' && currentUser && (
          <div className="space-y-5 text-center">
            <p className="text-slate-700">
              Olá, <strong>{currentUser.name}</strong>! Você está conectado(a).
            </p>
            <button type="button" onClick={handleLogout} className={primaryBtn}>
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
