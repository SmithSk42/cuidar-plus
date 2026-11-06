# Cuidar+ — projeto estabilizado (desenvolvimento)

React/Vite + Node.js/Express + MySQL. Painel do fisioterapeuta e portal simplificado do cuidador.

**Leia [LEIA-ME-CORRECOES.md](./LEIA-ME-CORRECOES.md) antes de executar.**

- SQL único: `database/cuidar_plus_completo.sql` (**DROP DATABASE**, apenas desenvolvimento).
- Backend: `backend/server.js`, valida a estrutura do banco na inicialização.
- Frontend: `frontend/src`, utiliza `/api` via proxy Vite.
- Os segredos de `backend/.env` não acompanham o ZIP.
