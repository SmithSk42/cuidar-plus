import React from 'react';
import {createRoot} from 'react-dom/client';
import Dashboard from './paginas/Dashboard.jsx';
import PortalAutenticacao from './PortalAutenticacao.jsx';
import PortalCuidador from './paginas/PortalCuidador.jsx';
import './index.css';
const caminho=window.location.pathname;
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {caminho==='/visualizacao-dashboard' ? <Dashboard visualizacao/> :
      (caminho.startsWith('/cuidado')||caminho.startsWith('/paciente')) ? <PortalCuidador/> : <PortalAutenticacao/>}
  </React.StrictMode>
);
if('serviceWorker' in navigator && import.meta.env.PROD){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/servico-worker.js').catch(()=>{}));
}
