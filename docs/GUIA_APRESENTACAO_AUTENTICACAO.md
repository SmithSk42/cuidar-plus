# Guia completo de apresentação — autenticação e check-in

**Projeto:** Cuidar+
**Duração sugerida:** 8 a 12 minutos, incluindo a demonstração
**Objetivo:** explicar como os portais de paciente e fisioterapeuta se
autenticam, como o check-in chega ao MySQL e quais são os limites atuais.

Este material foi preparado como roteiro de estudo: além de indicar o que abrir
no editor, sugere o que falar, como demonstrar o fluxo e como responder a
perguntas. Ajuste as falas para que reflitam aquilo que você compreendeu e
realmente implementou.

## 1. Resumo da solução

A aplicação tem portais React servidos pelo navegador e uma API REST em
Node.js/Express. Pacientes e fisioterapeutas podem criar contas e entrar.
Senhas são armazenadas como hashes bcrypt; o login emite um JWT assinado, com
identificador e perfil. No fluxo do paciente, o token autoriza o envio de
check-ins e a consulta do histórico. A API salva e consulta esses dados no
MySQL.

> **Importante para apresentar corretamente:** a tela atual é uma aplicação
> React web/PWA responsiva, não uma implementação nativa Android/iOS. Ela
> integra com a API pelo navegador. A mesma API pode ser consumida por um app
> móvel nativo, mas essa integração nativa não deve ser apresentada como já
> concluída.

## 2. Antes da apresentação

### Prepare o ambiente

1. Inicie o MySQL e confirme que o banco `cuidar_plus` e suas tabelas estão
   disponíveis.
2. Inicie a API em um terminal:

   ```powershell
   cd backend
   npm run dev
   ```

3. Em outro terminal, inicie o frontend:

   ```powershell
   cd frontend
   npm run dev
   ```

4. Abra `http://localhost:5173/paciente` para o portal do paciente e
   `http://localhost:5173/fisioterapeuta` para o portal do fisioterapeuta.
5. Se precisar conferir a API, abra `http://localhost:3001/api/health` ou use
   a porta configurada no seu `backend/.env`. A resposta esperada quando a API
   consegue consultar o banco é semelhante a `{"status":"ok","database":"mysql"}`.
6. Crie com antecedência contas de demonstração, se não quiser gastar tempo
   digitando durante a apresentação. Use endereços fictícios e não use dados
   clínicos reais.

### Confira estes pontos

- O `frontend/.env` deve apontar para o endereço/porta corretos da API em
  `VITE_API_URL`. Reinicie o Vite depois de alterar essa variável.
- A origem do frontend deve estar permitida em `CORS_ORIGINS` no backend.
- Tenha os dois portais abertos ou deixe os endereços anotados.
- Deixe o VS Code aberto na raiz e use `Ctrl+P` para localizar arquivos.
- Se for mostrar o banco, abra o MySQL Workbench e deixe preparada a consulta
  SQL da seção **Conferência no MySQL**.
- Não mostre o conteúdo de `.env`, senhas, tokens, credenciais ou dados pessoais
  reais na tela, gravação ou projetor.

## 3. Roteiro completo com falas e referências

### Parte A — Apresentação do problema (cerca de 1 minuto)

**Abra:** [README.md](../README.md), seção “Autenticação e check-in do paciente”,
e depois [app.js](../backend/src/app.js).

**Fale:**

> “O Cuidar+ precisa permitir que cada perfil entre no sistema e que o paciente
> registre como foi sua rotina. O fluxo que estou apresentando conecta a tela à
> API e a API ao MySQL. O foco desta entrega é cadastro e login dos dois perfis
> e registro e consulta do check-in do próprio paciente.”

> “Organizei o backend para separar inicialização, configuração, banco, rotas,
> autenticação e regras de cadastro. Assim, cada parte tem uma responsabilidade
> mais clara e fica mais fácil manter e testar o fluxo.”

**Mostre no código:** em `app.js`, localize `express.json`, `/api/health` e os
`app.use` que montam as rotas de autenticação e check-in. Explique que este
arquivo prepara o Express, não contém todas as regras de negócio.

### Parte B — Como o frontend escolhe o portal (cerca de 45 segundos)

**Abra:** [main.jsx](../frontend/src/main.jsx) e depois
[PortalAutenticacao.jsx](../frontend/src/PortalAutenticacao.jsx).

**Fale:**

> “O frontend escolhe o perfil do portal pelo caminho da URL. A rota
> `/paciente` abre a experiência do paciente; o acesso do fisioterapeuta abre a
> experiência profissional. O componente de autenticação é compartilhado,
> mas muda os campos e as telas conforme o perfil.”

**Mostre no código:** em `main.jsx`, localize `isPatientPortal` e a propriedade
`perfilEsperado`. Em `PortalAutenticacao.jsx`, procure `SESSION_KEYS`,
`isPatient`, `entrar` e `cadastrar`. Aponte também o campo CREFITO que aparece
somente no cadastro de fisioterapeuta.

**Demonstre na tela:** mostre rapidamente os dois endereços e compare os
formulários. Não é necessário criar duas contas ao vivo se já tiver contas de
demonstração preparadas.

### Parte C — Cadastro de pacientes e fisioterapeutas (cerca de 1 minuto)

**Abra:** [auth.js](../backend/src/routes/auth.js) e
[accounts.js](../backend/src/services/accounts.js).

**Fale:**

> “Os formulários enviam o cadastro para endpoints diferentes, mas as regras
> compartilhadas ficam centralizadas no serviço de contas. O serviço valida e
> normaliza os dados, verifica duplicidade de e-mail e, para fisioterapeuta,
> também de CREFITO. Depois gera o hash da senha e grava a conta no MySQL.”

**Mostre no código:**

1. Em `auth.js`, localize `registerAccount`, `router.post('/pacientes/registro')`
   e `router.post('/fisioterapeutas/registro')`.
2. Em `accounts.js`, localize `validateAccount`, `createAccount`,
   `bcrypt.hash`, `beginTransaction`, `commit` e as consultas `INSERT INTO`.
3. Explique que o frontend confirma que as duas senhas coincidem, mas a API é
   responsável por validar também os dados recebidos, porque uma requisição
   pode ser enviada sem passar pelo formulário.

**Demonstre na tela:** se for cadastrar ao vivo, use um e-mail fictício novo.
Cadastro repetido deve ser rejeitado; não mostre a senha digitada.

### Parte D — Login, hash e JWT (cerca de 1 minuto)

**Abra:** [auth.js](../backend/src/routes/auth.js) e
[config.js](../backend/src/config.js).

**Fale:**

> “No login, a API procura a conta pelo e-mail e compara a senha digitada com o
> hash bcrypt armazenado. A senha original não é recuperada nem precisa ficar
> guardada no banco. Quando as credenciais são válidas, a API emite um JWT
> assinado, com o ID e o perfil, e validade de uma hora.”

> “A configuração exige um segredo JWT com tamanho mínimo. O token é uma
> credencial: quem o possui pode fazer requisições autorizadas enquanto ele
> estiver válido, então não devo compartilhá-lo nem colocá-lo em logs.”

**Mostre no código:** em `auth.js`, procure `router.post('/login')`,
`bcrypt.compare`, `jwt.sign` e `expiresIn`. Em `config.js`, procure
`getJwtSecret`. Não copie, imprima ou projete nenhum valor real de segredo.

**Explique a distinção:**

- **Autenticação:** verifica quem está entrando, usando e-mail e senha.
- **Autorização:** decide o que essa conta pode fazer, usando o perfil e as
  regras das rotas.
- **JWT:** é a credencial assinada usada nas próximas requisições; não é a
  senha e não criptografa, por si só, os dados que contém.

### Parte E — Proteção das requisições (cerca de 1 minuto)

**Abra:** [authenticate.js](../backend/src/middleware/authenticate.js) e
[api.js](../frontend/src/services/api.js).

**Fale:**

> “Depois do login, o frontend guarda os dados da sessão na sessão atual do
> navegador. Quando envia uma requisição que precisa de autenticação, o helper
> HTTP inclui o token no cabeçalho Bearer. O middleware da API verifica a
> assinatura, a validade e o perfil do token antes de deixar a rota continuar.”

**Mostre no código:** em `api.js`, procure `apiRequest` e o cabeçalho
`Authorization`. Em `authenticate.js`, procure `autenticar`, `jwt.verify` e
`req.usuario`. Explique que as rotas recebem o usuário validado em
`req.usuario`; o middleware não substitui as regras específicas de cada rota.

### Parte F — Gravação e histórico do check-in (cerca de 2 minutos)

**Abra:** [PortalAutenticacao.jsx](../frontend/src/PortalAutenticacao.jsx),
[checkins.js](../backend/src/routes/checkins.js) e
[schema.sql](../database/schema.sql).

**Fale:**

> “O paciente informa se realizou as atividades, o nível de dor entre zero e
> dez e, opcionalmente, uma observação. O frontend envia os dados à API junto
> do token. A API valida os campos e exige o perfil paciente.”

> “Um ponto importante é que a API não confia em um `paciente_id` fornecido
> pelo navegador. Ela associa o check-in ao ID do usuário autenticado que veio
> do JWT. Isso impede que o cliente escolha registrar o check-in para outro
> paciente apenas alterando o corpo da requisição.”

> “Depois de gravar, a tela atualiza a lista e também busca o histórico do
> próprio paciente. A API limita o histórico aos 30 registros mais recentes.”

**Mostre no código:**

1. Em `PortalAutenticacao.jsx`, procure `registrarCheckin`. Aponte a chamada
   para `/api/checkin`, o envio do token e os campos do formulário.
2. Em `checkins.js`, procure `router.post`, `req.usuario.perfil`,
   `req.usuario.id`, `INSERT INTO checkins` e a validação de `nivel_dor`.
3. Ainda em `checkins.js`, procure `router.get('/meus')` e a consulta com
   `ORDER BY` e `LIMIT 30`.
4. Em `schema.sql`, mostre a tabela `checkins`, a chave estrangeira
   `paciente_id` e a restrição `chk_checkins_nivel_dor`.

**Demonstre na tela:** entre como paciente, envie um check-in e mostre a
confirmação e o registro que aparece no histórico.

### Parte G — Persistência no MySQL e testes (cerca de 1 minuto)

**Abra:** [db.js](../backend/src/db.js), [server.js](../backend/server.js) e
[server.test.js](../backend/test/server.test.js).

**Fale:**

> “A conexão é centralizada num pool MySQL, reutilizado pelas rotas e pelos
> serviços. A inicialização valida as configurações e testa o acesso ao banco.
> Os testes automatizados cobrem os principais fluxos da API. Eles simulam a
> camada do banco para que cadastro, login, autorização e check-in possam ser
> testados de forma repetível.”

> “Além dos testes automatizados, validei separadamente a integração com o
> MySQL local. É importante distinguir as duas coisas: os testes da suíte não
> são todos executados contra um servidor MySQL real.”

**Demonstre:** mostre o terminal com:

```powershell
cd backend
npm test
```

O resultado esperado é a suíte terminar sem testes falhos. Não prometa um
número fixo de testes: ele pode mudar conforme a suíte evolui.

## 4. Conferência no MySQL

Depois de enviar um check-in usando uma conta de demonstração, pode-se
confirmar a gravação pelo Workbench:

```sql
SELECT id, paciente_id, data_registro, status_atividades, nivel_dor, observacoes
FROM checkins
ORDER BY id DESC
LIMIT 10;
```

Explique que `paciente_id` referencia `pacientes.id` e que a data é preenchida
pelo banco. Para uma apresentação gravada ou pública, use somente dados
fictícios. Evite expor e-mails, observações ou outros dados de pacientes reais.

## 5. Mapa rápido de arquivos

Use `Ctrl+P` no VS Code, abra o caminho e depois procure o identificador
indicado. Assim você não depende de números de linha que podem mudar.

| Tema | Arquivo | Procure / mostre |
|---|---|---|
| Escolha do portal | `frontend/src/main.jsx` | `isPatientPortal`, `perfilEsperado` |
| Interface e estado da sessão | `frontend/src/PortalAutenticacao.jsx` | `SESSION_KEYS`, `entrar`, `cadastrar`, `sair` |
| Envio HTTP e token | `frontend/src/services/api.js` | `apiRequest`, `Authorization` |
| Configuração segura | `backend/src/config.js` | `getJwtSecret`, `validateDatabaseConfig` |
| Pool MySQL | `backend/src/db.js` | `createPool`, `connectionLimit` |
| Inicialização da API | `backend/server.js` | `start`, `validateDatabaseConfig`, `app.listen` |
| Montagem das rotas | `backend/src/app.js` | `/api/health`, `app.use` |
| Cadastro e login | `backend/src/routes/auth.js` | `registerAccount`, `router.post('/login')`, `bcrypt.compare`, `jwt.sign` |
| Regras de conta | `backend/src/services/accounts.js` | `validateAccount`, `createAccount`, `bcrypt.hash`, transação |
| Proteção das rotas | `backend/src/middleware/authenticate.js` | `autenticar`, `jwt.verify`, `req.usuario` |
| Gravação e histórico | `backend/src/routes/checkins.js` | `router.post`, `router.get('/meus')`, `req.usuario.id` |
| Estrutura do banco | `database/schema.sql` | tabelas, chaves estrangeiras, índice e `CHECK` |
| Testes HTTP | `backend/test/server.test.js` | cadastro, hash, JWT, autorização e check-in |
| Criação administrativa | `backend/scripts/create-fisioterapeuta.js` | entrada mascarada e uso do serviço compartilhado |

## 6. Perguntas que podem surgir

### “Por que não salvar a senha diretamente?”

> “Se a tabela fosse exposta, senhas em texto puro poderiam ser usadas
> imediatamente. O bcrypt armazena um hash e o login compara a senha informada
> com esse hash. A aplicação não precisa recuperar a senha original.”

### “O que acontece quando o token expira?”

> “A verificação do JWT deixa a requisição protegida sem autorização. O frontend
> remove a sessão quando identifica token inválido ou expirado e solicita que o
> usuário entre novamente.”

### “Como o sistema sabe se a conta é de paciente ou fisioterapeuta?”

> “O perfil acompanha a conta na resposta de login e é incluído no token. A
> tela também confere o perfil esperado para impedir que uma conta de paciente
> entre pelo portal de fisioterapeuta, ou vice-versa. A API ainda aplica suas
> próprias regras de perfil nas rotas protegidas.”

### “O paciente consegue enviar o ID de outra pessoa?”

> “A rota de check-in não usa um ID de paciente vindo do formulário. Usa o ID
> extraído do JWT verificado pelo middleware, e só aceita o perfil paciente.”

### “Os dados são realmente gravados?”

> “Sim. O endpoint de check-in executa um `INSERT` na tabela `checkins` usando
> o pool MySQL. Posso mostrar o histórico da tela ou consultar a tabela com
> uma conta de demonstração.”

### “O aplicativo é nativo para celular?”

> “O fluxo demonstrado é uma interface React web responsiva/PWA que acessa a
> API. Não estou apresentando um cliente nativo Android ou iOS como parte desta
> implementação. A API foi separada do frontend e pode ser consumida por esses
> clientes numa etapa futura.”

### “O CREFITO foi validado?”

> “O sistema exige e evita repetir o número informado, mas ainda não consulta
> nem verifica o registro junto ao conselho. Para uso real, o cadastro precisa
> passar por convite/aprovação e validação profissional.”

### “O fisioterapeuta já acompanha os check-ins dos seus pacientes?”

> “Ainda não. O fluxo persistido entregue aqui é o do paciente: registro e
> histórico próprios. As funções internas do painel do fisioterapeuta ainda
> exibem dados demonstrativos e não foram integradas a essas tabelas.”

## 7. Limites e próximos passos

Apresente estes limites com transparência; não os descreva como funcionalidades
prontas:

- O cadastro de fisioterapeutas é aberto e o CREFITO não é verificado junto ao
  conselho.
- O vínculo entre pacientes e fisioterapeutas ainda não é um fluxo de cadastro
  e autorização completo.
- O painel interno do fisioterapeuta ainda utiliza dados demonstrativos; não
  oferece gestão persistida de pacientes, tarefas ou check-ins.
- A interface que está sendo demonstrada é web/PWA. Não há aqui uma
  implementação de app nativo Android/iOS.
- O frontend web mantém o token em `sessionStorage`. Antes de um cliente móvel,
  deve-se usar o armazenamento seguro do sistema (Keychain/Keystore); também
  devem ser avaliados HTTPS, expiração/renovação e proteção de sessão.
- Antes de produção, restringir cadastro e acesso, configurar CORS para os
  domínios corretos, aplicar privilégio mínimo ao usuário MySQL, proteger
  tentativas de login e implementar recuperação segura de senha.
- Os testes automatizados simulam a camada de banco. É recomendável adicionar
  testes de integração reproduzíveis usando um MySQL de teste.

**Fale:**

> “A implementação atende ao escopo demonstrado de autenticação dos dois
> perfis e check-in próprio de paciente. Para produção e acompanhamento clínico
> completo, ainda seriam necessárias as medidas de segurança, validação
> profissional e integração do painel listadas aqui.”

## 8. Fechamento de 30 segundos

> “Implementei o cadastro e login de pacientes e fisioterapeutas com senhas
> protegidas por bcrypt e autenticação JWT. Separei a interface, as rotas, o
> serviço de cadastro, o middleware e o acesso MySQL. O paciente consegue
> registrar e consultar seus próprios check-ins, e a API associa cada registro
> à identidade autenticada, sem confiar num ID enviado pelo navegador. A
> interface demonstrada é web/PWA; a gestão do fisioterapeuta e a validação
> oficial do CREFITO são próximos passos.”

## 9. Checklist para o dia

- [ ] MySQL, backend e frontend iniciados.
- [ ] `GET /api/health` responde com sucesso.
- [ ] Portais `/paciente` e `/fisioterapeuta` acessíveis.
- [ ] Conta(s) de demonstração e senha disponíveis sem exibi-las ao público.
- [ ] Nenhum `.env`, token, segredo ou dado clínico real visível.
- [ ] VS Code posicionado nos arquivos do mapa rápido.
- [ ] Workbench preparado com a consulta da seção **Conferência no MySQL**.
- [ ] Terminal preparado para executar `npm test`.
- [ ] Limitações e próximos passos explicados no fechamento.
