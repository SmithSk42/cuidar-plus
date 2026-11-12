import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import PortalAutenticacao from './PortalAutenticacao.jsx';
import PortalCuidador from './paginas/PortalCuidador.jsx';
import Dashboard from './paginas/Dashboard.jsx';
import { ProvedorSessaoDomiciliar } from './contextos/SessaoDomiciliar.jsx';
import './index.css';

function Aplicacao(){return <BrowserRouter><Routes>
  <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
  <Route path="/login" element={<PortalAutenticacao/>}/>
  <Route path="/dashboard" element={<PortalAutenticacao/>}/>
  <Route path="/acompanhamento" element={<PortalAutenticacao/>}/>
  <Route path="/acompanhamento-clinico" element={<PortalAutenticacao/>}/>
  <Route path="/visualizacao-dashboard" element={<Dashboard visualizacao/>}/>
  <Route path="/cuidado" element={<ProvedorSessaoDomiciliar><PortalCuidador/></ProvedorSessaoDomiciliar>}/>
  <Route path="/cuidado/ativar" element={<ProvedorSessaoDomiciliar><PortalCuidador/></ProvedorSessaoDomiciliar>}/>
  <Route path="/paciente" element={<ProvedorSessaoDomiciliar><PortalCuidador/></ProvedorSessaoDomiciliar>}/>
  <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
</Routes></BrowserRouter>;}

createRoot(document.getElementById('root')).render(<React.StrictMode><Aplicacao/></React.StrictMode>);
if('serviceWorker' in navigator && import.meta.env.PROD){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/servico-worker.js').catch(()=>{}));
}
