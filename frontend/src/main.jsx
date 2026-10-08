import React from "react";
import { createRoot } from "react-dom/client";
import PortalAutenticacao from "./PortalAutenticacao.jsx";

const isPatientPortal = /^\/paciente(?:\/|$)/.test(window.location.pathname);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PortalAutenticacao perfilEsperado={isPatientPortal ? 'paciente' : 'fisioterapeuta'} />
  </React.StrictMode>
);
