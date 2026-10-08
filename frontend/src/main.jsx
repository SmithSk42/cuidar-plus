// Responsável por esta implementação: Filipe Alves Sousa Julio.
import React from "react";
import { createRoot } from "react-dom/client";
import TelaLoginPaciente from "./telalogin.jsx";

const isPatientPortal = /^\/paciente(?:\/|$)/.test(window.location.pathname);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TelaLoginPaciente perfilEsperado={isPatientPortal ? 'paciente' : 'fisioterapeuta'} />
  </React.StrictMode>
);
