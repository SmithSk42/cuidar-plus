# 🏥 Cuidar+ (Cuida Mais)

Projeto de extensão desenvolvido pelos alunos do Bacharelado em Sistemas de Informação (BSI) do Instituto Federal da Bahia (IFBA) para a disciplina de ACEX II.

O **Cuidar+** é uma solução digital criada para aproximar a rede de apoio (familiares e cuidadores) do fisioterapeuta responsável, centralizando informações, organizando rotinas de reabilitação e facilitando o acompanhamento da evolução funcional do paciente fora do ambiente clínico.

## 🛠️ Stack Tecnológica e Arquitetura
* **Front-end (Fisioterapeuta):** React.js (Web Dashboard)
* **Front-end (Paciente):** React (PWA - Progressive Web App focado em acessibilidade para idosos)
* **Back-end:** Node.js (API REST)
* **Banco de Dados:** MySQL 8.0.16+
* **Mensageria:** Integração com API do WhatsApp

## 📂 Estrutura do Repositório (Monorepo)
* `/frontend`: Contém o código fonte da aplicação Web (React) e PWA.
* `/backend`: Contém a API REST (Node.js) e as configurações de banco de dados.
* `/database`: Contém o esquema MySQL e migrações.

## Autenticação e check-in do paciente

O portal do paciente está disponível em `/paciente`. Ele cria contas de paciente,
faz login pela API e registra check-ins no MySQL. O acesso do fisioterapeuta está
em `/fisioterapeuta` (também na página inicial); lá é possível cadastrar conta
com nome, CREFITO, e-mail e senha. Ambos usam `POST /api/login`, que valida a
senha com bcrypt e retorna JWT; cada portal aceita apenas seu próprio perfil.
O painel de fisioterapia após o login ainda exibe dados demonstrativos e suas
funções de cadastro/listagem/tarefas ainda não persistem no MySQL.

O código está organizado em módulos de configuração, banco, middleware,
serviços e rotas dentro de `backend/src/`. O guia de apresentação com roteiro,
mapa dos arquivos e falas sugeridas está em
[`docs/GUIA_APRESENTACAO_AUTENTICACAO.md`](./docs/GUIA_APRESENTACAO_AUTENTICACAO.md).

### Configuração local

1. Instale e inicie o MySQL Server 8.0.16+ e crie as tabelas executando
   `database/schema.sql` no MySQL Workbench ou no cliente MySQL a partir da raiz:

   No PowerShell deste computador, na raiz do repositório:

   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --user=root --password --execute="source database/schema.sql"
   ```

   O cliente solicitará a senha administrativa localmente; não coloque essa
   senha no comando nem no repositório. Se `mysql` estiver no `PATH`, também
   pode usar `mysql --user=root --password --execute="source database/schema.sql"`.

   O script cria o banco `cuidar_plus` e as tabelas necessárias. Para um MySQL
   que já tenha a tabela `pacientes`, mas ainda não tenha as colunas `email` e
   `senha_hash`, aplique `database/migrations/001_patient_auth.mysql.sql` uma
   única vez, em vez de reaplicar o esquema completo.
2. Crie um usuário exclusivo para a API no MySQL (troque a senha de exemplo):

   ```sql
   CREATE USER 'cuidar_app'@'localhost' IDENTIFIED BY 'defina-uma-senha-forte';
   GRANT SELECT, INSERT ON cuidar_plus.* TO 'cuidar_app'@'localhost';
   ```

   Para desenvolvimento com API e banco em máquinas diferentes, configure o
   host autorizado do usuário e as regras de rede do MySQL para permitir apenas
   a máquina da API.
3. Edite `backend/.env` (ou copie `backend/.env.example` caso ainda não exista)
   e configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.
   `JWT_SECRET` precisa ser um segredo aleatório com no mínimo 32 bytes. Não
   envie o arquivo `.env` ao Git.
4. Instale as dependências e inicie a API:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

5. Para criar uma conta de fisioterapeuta pela tela, acesse
   `http://localhost:5173/fisioterapeuta`, selecione **Cadastrar-se** e informe
   nome, CREFITO, e-mail e senha. O cadastro grava a senha como hash bcrypt.
   Como alternativa administrativa/local, ainda está disponível o comando
   `npm run create:fisioterapeuta`, que usa o mesmo serviço de cadastro da API:

   ```sh
   cd backend
   npm run create:fisioterapeuta
   ```

   O comando solicita os mesmos dados no terminal e mascara a senha.
6. Em outro terminal, copie `frontend/.env.example` para `frontend/.env`, ajuste
   `VITE_API_URL` se necessário e reinicie o Vite para carregar essa variável:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Se a API estiver na porta 3001, por exemplo, defina
   `VITE_API_URL=http://127.0.0.1:3001` em `frontend/.env`.

### Testar os dois logins

* **Paciente:** acesse `http://localhost:5173/paciente`, crie a conta, confirme o
  cadastro e entre usando exatamente o mesmo e-mail e senha. Após o login,
  registre um check-in e confira o registro na lista da tela e na tabela
  `checkins` do MySQL.
* **Fisioterapeuta:** acesse `http://localhost:5173/fisioterapeuta`, selecione
  **Cadastrar-se**, informe os dados solicitados e entre com o e-mail e senha
  cadastrados. O portal confirmará o perfil autenticado e abrirá o painel.
* Para as credenciais conferidas diretamente pela API, `POST /api/login` espera
  JSON no formato `{"email":"...","senha":"..."}`. Contas antigas de
  fisioterapeutas só conseguem entrar se `senha_hash` contiver um hash bcrypt
  compatível; senha em texto puro não é aceita.

Para testar em um celular físico, use o endereço IP da máquina na rede local em
`VITE_API_URL` (e inclua a origem do front-end em `CORS_ORIGINS`); `localhost` no
celular aponta para o próprio celular. Emuladores podem exigir o endereço de
host específico da plataforma.

### Endpoints implementados

* `POST /api/pacientes/registro` — cria paciente e armazena a senha com bcrypt.
* `POST /api/fisioterapeutas/registro` — cria fisioterapeuta com CREFITO, verifica
  e-mail/CREFITO duplicados e armazena a senha com bcrypt.
* `POST /api/login` — autentica fisioterapeuta ou paciente e retorna JWT Bearer
  com validade de uma hora.
* `POST /api/checkin` — requer JWT de paciente; associa o registro ao paciente
  do token, valida atividades, dor (0–10) e observações.
* `GET /api/checkins/meus` — lista até 30 check-ins do paciente autenticado.
* `GET /api/health` — verifica se a API consegue consultar o MySQL.

### Próximas ações recomendadas

O cadastro de paciente e o cadastro de fisioterapeuta são abertos; o CREFITO
informado não é verificado junto ao conselho profissional. Antes de usar dados
clínicos reais, restrinja o cadastro de fisioterapeutas a convite/aprovação e
verifique o registro profissional, além de implementar convite/validação de
pacientes, vínculo controlado com o profissional responsável, recuperação segura
de senha, limitação de tentativas de login e HTTPS. No app
mobile nativo, armazene o token no armazenamento seguro do sistema (Keychain /
Keystore); a interface web/PWA atual mantém a sessão em `sessionStorage`.

## 👥 Equipe de Desenvolvimento (Grupo A)
* **Gestor do Processo:** Osmir Santos Meira
* **Desenvolvedores:**
  * Lucas Oliveira
  * Sávio Neri
  * Sérgio Emílio
  * Filipe Alves
  * Luis Felipe da Silva

---
*Projeto em desenvolvimento - Etapas 2 e 3*
