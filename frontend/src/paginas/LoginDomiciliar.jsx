import { useState } from 'react';

export default function LoginDomiciliar({ email, aoAlterarEmail, senha, aoAlterarSenha, aoEnviar,
  carregando, erro, aoIrParaAtivacao }) {
  const [exibirSenha, definirExibirSenha] = useState(false);
  return <form className="pc-form" onSubmit={aoEnviar}>
    <label htmlFor="domiciliar-email">E-mail
      <input id="domiciliar-email" type="email" autoComplete="username" required
        value={email} onChange={e => aoAlterarEmail(e.target.value)} placeholder="voce@email.com" />
    </label>
    <label htmlFor="domiciliar-senha">Senha</label>
    <div className="pc-campo-senha">
      <input id="domiciliar-senha" type={exibirSenha ? 'text' : 'password'}
        autoComplete="current-password" required value={senha}
        onChange={e => aoAlterarSenha(e.target.value)} />
      <button className="pc-olhinho" type="button" aria-label={exibirSenha ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={exibirSenha} onClick={() => definirExibirSenha(valor => !valor)}>
        <span className="material-symbols-outlined" aria-hidden="true">{exibirSenha ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
    {erro && <div className="pc-erro" role="alert">{erro.message}</div>}
    <button className="pc-botao-principal" disabled={carregando} type="submit">
      {carregando ? 'Entrando...' : 'Entrar na minha conta'}
    </button>
    <button type="button" className="pc-link" onClick={aoIrParaAtivacao}>Recebi um convite</button>
  </form>;
}
