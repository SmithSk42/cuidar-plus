import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import PortalAutenticacao from './PortalAutenticacao.jsx';
import PortalCuidador from './paginas/PortalCuidador.jsx';
import Dashboard from './paginas/Dashboard.jsx';
import './index.css';

function Aplicacao(){return <BrowserRouter><Routes>
  <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
  <Route path="/login" element={<PortalAutenticacao/>}/>
  <Route path="/dashboard" element={<PortalAutenticacao/>}/>
  <Route path="/acompanhamento" element={<PortalAutenticacao/>}/>
  <Route path="/acompanhamento-clinico" element={<PortalAutenticacao/>}/>
  <Route path="/visualizacao-dashboard" element={<Dashboard visualizacao/>}/>
  <Route path="/cuidado" element={<PortalCuidador/>}/>
  <Route path="/paciente" element={<PortalCuidador/>}/>
  <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
</Routes></BrowserRouter>;}

createRoot(document.getElementById('root')).render(<React.StrictMode><Aplicacao/></React.StrictMode>);
if('serviceWorker' in navigator && import.meta.env.PROD){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/servico-worker.js').catch(()=>{}));
}
