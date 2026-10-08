# Guia de apresentação — autenticação e check-in

**Projeto:** Cuidar+  
**Responsável pelas alterações descritas neste guia:** Filipe Alves Sousa Julio  
**Objetivo da demonstração:** apresentar cadastro e login de pacientes e
fisioterapeutas, registrar um check-in e explicar o percurso entre interface,
API e MySQL.

## O que está implementado

- Cadastro de pacientes e fisioterapeutas no MySQL.
- Senhas armazenadas com hash bcrypt; não são gravadas em texto puro.
- Login comum que emite JWT assinado com o ID e o perfil da conta.
- Portais distintos para cada perfil e checagem do perfil durante o login.
- Cadastro de fisioterapeuta com validação de e-mail e CREFITO duplicados.
- Check-in autenticado: associa o registro ao ID do paciente no JWT, valida
  atividades, nível de dor de 0 a 10 e observações.
- Histórico dos últimos 30 check-ins do paciente.
- Testes automatizados dos caminhos principais.

## Organização do código

```text
frontend/src/
  main.jsx                         Seleciona o portal a partir da URL
  PortalAutenticacao.jsx            Telas, sessão e fluxos de cada perfil
  services/api.js                  Comunicação HTTP com a API
  paciente.css                     Estilos dos portais e do check-in

backend/
  server.js                        Carrega configuração e inicia o servidor
  src/
    app.js                          Middlewares e montagem das rotas
    config.js                       Validação do segredo JWT e do banco
    db.js                           Pool compartilhado MySQL
    middleware/authenticate.js      Validação de JWT Bearer
    routes/auth.js                  Endpoints de cadastro e login
    routes/checkins.js              Endpoints de gravação e histórico
    services/accounts.js            Regras de cadastro e persistência de contas
  scripts/create-fisioterapeuta.js  Cadastro administrativo pelo terminal
  test/server.test.js               Testes de API com banco simulado

database/
  schema.sql                        Estrutura inicial do MySQL
  migrations/                       Alterações incrementais no esquema
```

Essa separação deixa a inicialização, as regras de negócio, o acesso aos dados
e o HTTP em lugares diferentes: rotas tratam requisições, serviços concentram o
cadastro, o middleware protege endpoints e o módulo de banco mantém o pool.

## Mapa das partes para mostrar no editor

Use `Ctrl+P` no VS Code para abrir cada caminho. Os nomes dos arquivos e
componentes abaixo são referências estáveis mesmo que os números de linha mudem.

| Parte | Arquivo | O que apontar |
|---|---|---|
| Seleção do portal | `frontend/src/main.jsx` | `/paciente` abre o portal do paciente; as demais rotas abrem o do fisioterapeuta. |
| Envio de requisições | `frontend/src/services/api.js` | `apiRequest` envia JSON, inclui `Authorization: Bearer` quando existe token e apresenta erros de rede/API. |
| Cadastro/login por perfil | `frontend/src/PortalAutenticacao.jsx` | `entrar` confere o perfil retornado; `cadastrar` escolhe a rota de paciente ou fisioterapeuta; `registrarCheckin` envia o formulário. |
| Conexão MySQL | `backend/src/db.js` | Pool de conexões alimentado pelas variáveis `DB_*` do `.env`. |
| Inicialização | `backend/server.js` | Valida configuração, confirma conexão e inicia Express. |
| Rotas de autenticação | `backend/src/routes/auth.js` | Registra as rotas de cadastro e `POST /login`. |
| Regras de cadastro | `backend/src/services/accounts.js` | Normaliza e valida dados, verifica duplicatas, usa transação e gera hash bcrypt antes do `INSERT`. |
| Proteção de rota | `backend/src/middleware/authenticate.js` | Verifica assinatura/expiração do token e extrai ID e perfil. |
| Persistência do check-in | `backend/src/routes/checkins.js` | `POST /api/checkin` insere usando `req.usuario.id`; `GET /api/checkins/meus` retorna o histórico próprio. |
| Estrutura de tabelas | `database/schema.sql` | Relacionamento entre pacientes e check-ins, índices únicos e validação do nível de dor. |
| Testes | `backend/test/server.test.js` | Cenários de cadastro, hash de senha, login, duplicatas, autorização e histórico. |

Os arquivos de implementação relevantes incluem comentário de autoria de
**Filipe Alves Sousa Julio**.

## Roteiro de demonstração (4–6 minutos)

### 1. Contexto — 30 segundos

> “A versão inicial tinha respostas simuladas para login e check-in. Organizei a
> implementação para que a interface converse com uma API Express, que valida
> as credenciais e persiste os dados no MySQL.”

Abra `backend/src/app.js` e mostre que a API monta rotas de autenticação e
check-in; depois abra `backend/src/db.js` para localizar a conexão MySQL.

### 2. Cadastro e login de fisioterapeuta — 1 minuto

Abra `http://localhost:5173/fisioterapeuta`, selecione **Cadastrar-se** e
preencha nome, CREFITO, e-mail e senha. Depois entre com as mesmas credenciais.

> “O endpoint de cadastro valida os campos e evita e-mail ou CREFITO repetidos.
> A senha passa por bcrypt antes de ser gravada. No login, o sistema confere o
> hash e retorna um JWT com o perfil fisioterapeuta.”

Mostre `backend/src/services/accounts.js` e `backend/src/routes/auth.js`.

### 3. Cadastro, login e check-in de paciente — 1–2 minutos

Abra `http://localhost:5173/paciente`, crie uma conta, entre, escolha se fez as
atividades, ajuste a dor, escreva uma observação opcional e salve.

> “O token identifica a conta. A API usa o ID do token para definir o paciente
> do check-in, em vez de confiar em um ID enviado pelo navegador. Isso impede
> que o usuário escolha registrar dados para outro paciente.”

Mostre `frontend/src/PortalAutenticacao.jsx` e
`backend/src/routes/checkins.js`. Aponte o histórico que aparece na própria
tela.

### 4. Banco e testes — 1 minuto

No MySQL Workbench, rode:

```sql
SELECT id, paciente_id, data_registro, status_atividades, nivel_dor, observacoes
FROM checkins
ORDER BY id DESC
LIMIT 10;
```

Explique que `paciente_id` referencia `pacientes.id`. Para mostrar a validação
automatizada, no terminal:

```powershell
cd backend
npm test
```

> “Os testes cobrem autenticação, autorização, validação dos dados e
> persistência simulada; também confirmei manualmente o fluxo de integração
> contra o MySQL local.”

## Exemplos de fala sobre escolhas técnicas

- **Hash em vez de senha em texto:** “O banco guarda o hash bcrypt. No login,
  comparamos a senha digitada ao hash, sem recuperar a senha original.”
- **JWT:** “Depois de validar a senha, a API assina um token temporário que
  identifica o usuário e seu perfil nas próximas requisições.”
- **Autorização:** “Estar autenticado não basta: o endpoint do check-in também
  exige o perfil paciente.”
- **Validação:** “O servidor valida os campos mesmo que o navegador já tenha
  validações; a validação do cliente não substitui a do servidor.”
- **Organização:** “Separei rotas, serviço de cadastro, middleware, banco e
  inicialização para reduzir responsabilidades por arquivo e facilitar teste
  e manutenção.”

## Limites que devem ser apresentados com transparência

- O cadastro de fisioterapeutas está aberto no portal e o CREFITO informado não
  é verificado junto ao conselho. Para uso real, deve-se exigir convite,
  aprovação ou verificação profissional.
- O painel interno do fisioterapeuta ainda usa dados de demonstração; cadastro
  de pacientes, listagem, tarefas e visualização de check-ins pelo fisioterapeuta
  ainda não são fluxos integrados ao banco.
- O CORS está configurado para desenvolvimento local e precisa ser ajustado para
  o domínio publicado.
- Antes de produção, configurar HTTPS, usuário MySQL de privilégio mínimo,
  política de tentativas de login, recuperação de senha e proteção apropriada
  do token. O projeto web mantém a sessão em `sessionStorage`.

## Resumo curto

> “Implementei autenticação com bcrypt e JWT para pacientes e fisioterapeutas,
> separei os acessos por perfil e conectei o check-in do paciente ao MySQL. A API
> valida os dados e associa cada registro ao usuário autenticado. Organizei o
> backend em módulos de configuração, banco, rotas, middleware e serviço, e
> adicionei testes para os fluxos principais. As funções internas do painel do
> fisioterapeuta ainda são demonstrativas e estão identificadas como próximo
> passo.”
