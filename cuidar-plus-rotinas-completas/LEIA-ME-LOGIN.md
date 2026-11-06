# Cuidar+ — Login do fisioterapeuta

- Nova tela React em `frontend/src/paginas/LoginFisioterapeuta.jsx`, com estilos isolados.
- Entrada principal: `http://localhost:5173/` ou `/fisioterapeuta`.
- Dashboard visual: `/visualizacao-dashboard`.
- Área antiga do paciente: `/paciente`, ainda depende de rotas do backend.
- Importações de API foram padronizadas para `frontend/src/servicos/api.js`, corrigindo o problema anterior do `services/api.js`.
- A aparência segue o Stitch enviado. Declarações não comprovadas (ISO 27001, HIPAA, 15 mil pacientes, 94,6% e certificado digital) foram excluídas.
- A opção visual **Lembrar meu acesso** não persiste credenciais: é apenas UI até definirmos uma política segura de sessão.
- O formulário chama `POST /api/login` com email/senha pelo PortalAutenticacao existente. **A rota ainda não existe no backend**; logins reais continuarão falhando com 404 até implementarmos autenticação. Não há acesso fictício.

## Executar
```
cd frontend
npm install
npm run dev
```
