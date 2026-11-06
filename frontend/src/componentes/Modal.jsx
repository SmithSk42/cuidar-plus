import {useEffect, useId, useRef} from 'react';
import {createPortal} from 'react-dom';

/** Modal acessível reutilizável. Não exibe conteúdo após fechamento. */
export default function Modal({aberto, aoFechar, titulo, children, largura = 'max-w-2xl', bloqueado = false}) {
  const identificador = useId();
  const referencia = useRef(null);
  const focoAnterior = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    focoAnterior.current = document.activeElement;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => referencia.current?.focus());
    function aoTeclado(evento) {
      if (evento.key === 'Escape' && !bloqueado) { evento.preventDefault(); aoFechar(); }
      if (evento.key !== 'Tab' || !referencia.current) return;
      const focaveis = [...referencia.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focaveis.length) {evento.preventDefault(); return;}
      const primeiro = focaveis[0], ultimo = focaveis.at(-1);
      if (evento.shiftKey && document.activeElement === primeiro) {evento.preventDefault(); ultimo.focus();}
      else if (!evento.shiftKey && document.activeElement === ultimo) {evento.preventDefault(); primeiro.focus();}
    }
    window.addEventListener('keydown', aoTeclado);
    return () => {cancelAnimationFrame(frame); window.removeEventListener('keydown', aoTeclado); document.body.style.overflow=anterior; focoAnterior.current?.focus?.();};
  }, [aberto, bloqueado, aoFechar]);
  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={evento => {if (evento.target === evento.currentTarget && !bloqueado) aoFechar();}}>
      <section ref={referencia} role="dialog" aria-modal="true" aria-labelledby={identificador} tabIndex={-1}
        className={`flex max-h-[92vh] w-full ${largura} flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl outline-none`}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 id={identificador} className="text-lg font-bold">{titulo}</h2>
          <button type="button" disabled={bloqueado} onClick={aoFechar} aria-label="Fechar modal" className="rounded-lg px-3 py-1.5 text-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700">×</button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </section>
    </div>, document.body);
}
