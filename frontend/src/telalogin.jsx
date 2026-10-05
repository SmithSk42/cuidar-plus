import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  UserCheck,
  Activity,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

/* ---------- Validações ---------- */

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isCpf = (value) => {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10]);
};

// Aceita formatos como "12345-F", "CREFITO-3/123456-F" ou apenas o número
const isCrefito = (v) => /^(crefito[-\s]?\d{1,2}\/)?\d{3,7}(-?[a-z]{1,2})?$/i.test(v.trim());

const ROLES = {
  patient: {
    label: 'Paciente / Cuidador',
    fieldLabel: 'E-mail ou CPF do responsável',
    placeholder: 'seu.email@exemplo.com ou 000.000.000-00',
    error: 'Informe um e-mail válido ou um CPF válido.',
    validate: (v) => isEmail(v) || isCpf(v)
  },
  physio: {
    label: 'Fisioterapeuta',
    fieldLabel: 'E-mail profissional ou Crefito',
    placeholder: 'nome@clinica.com.br',
    error: 'Informe um e-mail válido ou um número de Crefito válido.',
    validate: (v) => isEmail(v) || isCrefito(v)
  }
};

const BENEFITS = [
  'Acompanhamento em tempo real pós-alta',
  'Gamificação e metas diárias motivadoras',
  'Comunicação direta entre fisioterapeuta e família',
  'Alertas SOS de urgência integrados'
];

export default function CuidarPlusLogin() {
  const [selectedRole, setSelectedRole] = useState('patient'); // 'patient' | 'physio'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const timeoutRef = useRef(null);
  const role = ROLES[selectedRole];
  const isPatient = selectedRole === 'patient';

  // Evita atualizar estado depois que o componente foi desmontado
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleRoleChange = (newRole) => {
    if (newRole === selectedRole || isLoading) return;
    setSelectedRole(newRole);
    setIdentifier('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setSuccess('');

    const value = identifier.trim();

    if (!role.validate(value)) {
      setError(role.error);
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    // Simulação de autenticação (substituir pela chamada real à API)
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setSuccess(
        `Login realizado com sucesso como ${role.label}!${
          rememberMe ? ' Este dispositivo será lembrado.' : ''
        }`
      );
    }, 1200);
  };

  const focusRing = isPatient ? 'focus:ring-sky-500' : 'focus:ring-teal-500';

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Cabeçalho */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Heart className="w-6 h-6 fill-white/20 stroke-[2.5]" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-800">
            Cuidar<span className="text-teal-500">+</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3.5 py-2 rounded-full border border-slate-200 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          <span>Ambiente seguro e em conformidade com a LGPD</span>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-center">
        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[620px]">
          {/* Lado esquerdo: banner */}
          <div className="lg:col-span-5 bg-gradient-to-br from-sky-600 via-sky-500 to-teal-500 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white mb-6 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-orange-300" aria-hidden="true" />
                Acompanhamento domiciliar pós-clínica
              </span>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
                Conectando saúde, cuidado e movimento.
              </h1>
              <p className="mt-4 text-sky-100 text-sm leading-relaxed">
                Acompanhe exercícios de reabilitação, rotinas de medicação e evolução clínica em um só lugar.
              </p>
            </div>

            <ul className="relative z-10 my-8 space-y-3.5">
              {BENEFITS.map((text) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-xs lg:text-sm font-medium text-sky-50">{text}</span>
                </li>
              ))}
            </ul>

            <figure className="relative z-10 pt-6 border-t border-white/15 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center font-bold text-white text-sm shadow-inner shrink-0"
                aria-hidden="true"
              >
                MS
              </div>
              <div>
                <figcaption className="text-xs font-semibold text-white">Dona Maria Silva</figcaption>
                <blockquote className="text-[11px] text-sky-100">
                  “Sinto-me acompanhada todos os dias no meu processo de reabilitação.”
                </blockquote>
              </div>
            </figure>
          </div>

          {/* Lado direito: formulário */}
          <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bem-vindo(a) de volta!</h2>
                <p className="text-xs lg:text-sm text-slate-500 mt-1">
                  Selecione o seu tipo de acesso para continuar no Cuidar+.
                </p>
              </div>

              {/* Seletor de perfil */}
              <div
                role="group"
                aria-label="Tipo de acesso"
                className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100/80 rounded-2xl mb-6"
              >
                <button
                  type="button"
                  aria-pressed={isPatient}
                  disabled={isLoading}
                  onClick={() => handleRoleChange('patient')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed ${
                    isPatient
                      ? 'bg-white text-sky-700 shadow-md shadow-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                  <span>{ROLES.patient.label}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={!isPatient}
                  disabled={isLoading}
                  onClick={() => handleRoleChange('physio')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed ${
                    !isPatient
                      ? 'bg-white text-teal-700 shadow-md shadow-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Activity className="w-4 h-4" aria-hidden="true" />
                  <span>{ROLES.physio.label}</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Mensagens de erro / sucesso */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div
                    role="status"
                    className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{success}</span>
                  </div>
                )}

                {/* E-mail / CPF / Crefito */}
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    {role.fieldLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      required
                      disabled={isLoading}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={role.placeholder}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${focusRing} focus:bg-white transition-all disabled:opacity-60`}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Senha
                    </label>
                    <a
                      href="#recovery"
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                    >
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${focusRing} focus:bg-white transition-all disabled:opacity-60`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center text-slate-400 hover:text-slate-600 rounded-r-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Lembrar dispositivo */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      disabled={isLoading}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">Lembrar deste dispositivo</span>
                  </label>
                </div>

                {/* Enviar */}
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed ${
                    isPatient
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sky-500/25'
                      : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/25'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Entrando…</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar na plataforma</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              {/* Divisor */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-medium">Novo na plataforma?</span>
                </div>
              </div>

              {/* Primeiro acesso */}
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Ativar primeiro acesso / Criar conta
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400 flex flex-col md:flex-row justify-between items-center gap-2">
        <p>© 2026 Cuidar+ Saúde Domiciliar. Todos os direitos reservados.</p>
        <div className="flex gap-4">
          <a href="#terms" className="hover:text-slate-600 transition-colors">Termos de uso</a>
          <a href="#privacy" className="hover:text-slate-600 transition-colors">Política de privacidade</a>
          <a href="#help" className="hover:text-slate-600 transition-colors">Suporte técnico</a>
        </div>
      </footer>
    </div>
  );
}
