import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Modal from './Modal.jsx';

/** O logout somente ocorre após a confirmação explícita. */
export default function ConfirmacaoSaida({aoSair, children, className = '', tituloBotao = 'Sair'}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  function confirmar() {
    setShowLogoutModal(false);
    aoSair?.();
    navigate('/login', {replace: true});
  }
  return <>
    <button type="button" className={className} title={tituloBotao} aria-label={tituloBotao} onClick={()=>setShowLogoutModal(true)}>{children || 'Sair'}</button>
    <Modal aberto={showLogoutModal} aoFechar={()=>setShowLogoutModal(false)} titulo="Confirmar saída" largura="max-w-md">
      <p className="mb-6 text-sm text-slate-700">Tem certeza que deseja sair do sistema?</p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100" onClick={()=>setShowLogoutModal(false)}>Cancelar</button>
        <button type="button" className="rounded-xl bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900" onClick={confirmar}>Sim, sair</button>
      </div>
    </Modal>
  </>;
}
