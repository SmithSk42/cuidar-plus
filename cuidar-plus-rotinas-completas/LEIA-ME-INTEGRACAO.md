# Cuidar+ — Backend e integração do login

## Preparação

1. MySQL 8.0.16+: execute `database/cuida_mais.sql` **somente em um banco novo**. Atenção: contém `DROP DATABASE` e apaga todos os dados.
2. No banco existente, execute apenas `database/migracoes/001_perfil_profissional.sql`. Se já adicionou `perfil`, a migração não o duplica.
3. Entre em `backend`, copie `.env.example` para `.env` e configure `BANCO_*` e `SEGREDO_JWT` com ao menos 32 caracteres aleatórios (PowerShell: `-join ((1..48) | ForEach-Object { 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[(Get-Random -Maximum 62)] })`). Configure `SENHA_ADMIN_INICIAL` com uma senha de pelo menos 12 caracteres.
4. Em `backend` rode `npm install`, `npm run criar:administrador`, depois `npm run dev`.
5. Em outro terminal, em `frontend`, rode `npm install`, `npm run dev`.
6. Entre em `http://localhost:5173` com `EMAIL_ADMIN` e `SENHA_ADMIN_INICIAL`. Após criar o administrador, **remova `SENHA_ADMIN_INICIAL` do .env**; a senha já está salva em hash no banco.

## Rotas funcionais nesta versão

- `GET /api/saude` verifica acesso ao banco.
- `POST /api/login` recebe `{ "email": "...", "senha": "..." }` e retorna token e dados do profissional ou administrador.
- `GET /api/eu` exige `Authorization: Bearer TOKEN`.
- `GET /api/dashboard?periodo=hoje|7dias|mes` exige token e retorna indicadores, pacientes e alertas. Administrador vê todo o banco; fisioterapeuta vê somente pacientes vinculados a si.

## Limites desta entrega

O backend cobre autenticação profissional e dashboard real. Telas/rotas de pacientes, exercícios, rotinas, agenda e check-ins ainda não têm CRUD conectado. O portal de paciente do projeto antigo não possui um fluxo compatível com o SQL atual e permanece pendente. Não exiba dados pessoais ou de saúde na rota pública de visualização da dashboard.

O script de criação de administrador aceita apenas conta cujo e-mail configurado e CREFITO reservado `ADMIN-SISTEMA` correspondam; execute-o em ambiente de desenvolvimento e proteja o acesso ao banco.
