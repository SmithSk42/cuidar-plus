import { useEffect, useRef, useState } from 'react';

/** Ativacao com codigo gerado pelo profissional; nome e e-mail vem do convite. */
export default function Ativacao({ codigo, aoAlterarCodigo, senha, aoAlterarSenha, aoEnviar,
  carregando, erro, aoIrParaLogin }) {
  const senhaRef = useRef(null);
  const [exibirSenha, definirExibirSenha] = useState(false);
  const mostrarAcessoExistente = ['CONVITE_UTILIZADO', 'CONTA_EXISTENTE'].includes(erro?.codigo);

  useEffect(() => {
    if (/^[0-9a-fA-F]{64}$/.test(codigo)) senhaRef.current?.focus();
  }, [codigo]); // No deep link, pula direto para a senha.

  return <form className="pc-form" onSubmit={aoEnviar}>
    <label htmlFor="domiciliar-codigo">Código do convite
      <input id="domiciliar-codigo" required autoComplete="off" spellCheck={false}
        inputMode="text" value={codigo} onChange={e => aoAlterarCodigo(e.target.value.trim())}
        placeholder="Cole o código recebido" maxLength={64} />
    </label>
    <label htmlFor="domiciliar-senha-nova">Crie uma senha (mínimo de 10 caracteres)</label>
    <div className="pc-campo-senha">
      <input id="domiciliar-senha-nova" ref={senhaRef} required minLength={10} maxLength={128}
        type={exibirSenha ? 'text' : 'password'} autoComplete="new-password"
        value={senha} onChange={e => aoAlterarSenha(e.target.value)} />
      <button className="pc-olhinho" type="button" aria-label={exibirSenha ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={exibirSenha} onClick={() => definirExibirSenha(valor => !valor)}>
        <span className="material-symbols-outlined" aria-hidden="true">{exibirSenha ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
    {erro && <div className={mostrarAcessoExistente ? 'pc-aviso-convite' : 'pc-erro'} role="alert">
      <span>{erro.message}</span>
      {mostrarAcessoExistente && <button className="pc-botao-secundario" type="button" onClick={aoIrParaLogin}>
        Já tenho uma conta — entrar agora
      </button>}
    </div>}
    <button className="pc-botao-principal" disabled={carregando} type="submit">
      {carregando ? 'Ativando...' : 'Criar meu acesso'}
    </button>
    <button type="button" className="pc-link" onClick={aoIrParaLogin}>Já tenho uma conta</button>
  </form>;
}
