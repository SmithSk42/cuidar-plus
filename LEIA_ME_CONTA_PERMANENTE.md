# Cuidar+ — Conta domiciliar permanente (sem alteração de banco)

Pacote baseado nos arquivos `backend(9).zip`, `frontend(9).zip` e `cuida_mais.sql` enviados.

## O que mudou

- `POST /api/cuidado/ativar`: aceita `{ "codigo_convite": "<hex 64>", "senha": "<minimo 10 caracteres>" }` (compatível com o campo antigo `convite`).
- Valida convite, uso e expiração; bloqueia registro duplicado; cria `usuarios_domiciliares`, `vinculos_cuidado` e marca `usado_em` na **mesma transação MySQL**.
- Senha armazenada com bcrypt (biblioteca `bcryptjs`, já utilizada e declarada no projeto), custo 12.
- `POST /api/cuidado/login`: retorna JWT, usuário e lista de vínculos ativos; funciona para múltiplos pacientes.
- `GET /api/cuidado/sessao`: valida `Authorization: Bearer <jwt>`, consulta a conta atual e retorna vínculos, para recuperar login após fechar o navegador.
- As demais rotas `/api/cuidado` continuam protegidas pelo middleware existente `exigirAcessoDomiciliar` (também exportado como `verificarToken`). Autorização ao paciente continua sendo verificada nas consultas SQL a cada operação.
- O frontend persiste o JWT na chave `cuidar_plus_token_domiciliar` do `localStorage` e remove o token no logout ou quando a API confirma expiração/invalidez.
- Novos componentes `Ativacao.jsx`, `LoginDomiciliar.jsx` e contexto de sessão.
- Links antigos `/cuidado?convite=...` e alternativos `/cuidado?codigo=...` funcionam; `/cuidado/ativar?codigo=...` também.
- Se o e-mail já existir, o cuidador faz login e usa o mesmo convite válido para aceitar o vínculo adicional.

## Instalação no Windows

1. **Faça backup** das pastas `backend` e `frontend`.
2. Copie as pastas `backend` e `frontend` deste ZIP para o projeto `C:\Users\savio\cuidar-plus`, substituindo apenas os arquivos do código.
3. **Preserve seus arquivos `.env`**. Eles não estão no pacote (somente `.env.example`). Não faça commit de `.env`.
4. **Não execute** `cuida_mais.sql`: o arquivo enviado começa com `DROP DATABASE`. A implementação **não exige migração SQL**.
5. Na pasta `backend`, execute `npm install` e `npm run dev`.
6. Na pasta `frontend`, execute `npm install` e `npm run dev -- --host 0.0.0.0`.
7. Se estiver testando a compilação para um túnel público, execute `npm run build` e depois `npm run preview -- --host 0.0.0.0 --port 5173`. A API deve continuar acessível via proxy `/api`.
8. Se o domínio do Cloudflare mudar, ajuste `allowedHosts` no `vite.config.js` conforme necessário; mantenha o backend e o túnel ligados.

**API:** como o servidor Express monta as rotas em `/api/cuidado`, os caminhos completos usam esse prefixo. Não acesse `/cuidado/login` diretamente no backend.

## Testes manuais

1. Um fisioterapeuta gera convite novo para um e-mail **não cadastrado**.
2. Abra `https://<tunnel>.trycloudflare.com/cuidado?convite=<codigo>` em aba anônima. Crie senha com 10 ou mais caracteres.
3. Confirme a entrada automática no portal; feche e abra o navegador: a conta deve continuar autenticada enquanto o JWT estiver válido.
4. Clique em "Sair": o token deve desaparecer e a tela de login deve aparecer.
5. Faça login com o **e-mail gravado no convite** e a **senha que acabou de cadastrar**. Não reutilize o hexadecimal.
6. Teste convite já utilizado: a tela deve exibir aviso e link "Já tenho uma conta".
7. Gere outro convite **válido para o mesmo e-mail**, com paciente diferente: entre na conta e clique em "Aceitar convite"; a lista de pacientes deve passar a incluir ambos.
8. No DevTools, confirme que `GET /api/cuidado/sessao` usa `Authorization: Bearer ...`. Evite imprimir tokens em logs.
9. Revogue um vínculo de teste no banco e confirme que ele não aparece mais nas consultas ao usuário.

## Validade e cuidados de segurança

- O JWT dura **12 horas**. A conta continua permanente após o vencimento; basta entrar novamente com e-mail e senha.
- O token no `localStorage` só persiste no **mesmo navegador e na mesma origem (domínio)**. Se o Quick Tunnel gerar outro subdomínio, ele não compartilhará o token anterior e será necessário fazer login novamente.
- Se alguém já ativou o convite, ele não deve ser usado para cadastro novamente.
- O `bcryptjs` implementa o algoritmo bcrypt; não foi introduzida uma nova dependência nativa para não quebrar o `package-lock.json` existente.
- O armazenamento em `localStorage` atende ao requisito de demonstração, mas requer reforço contra XSS e é mais exposto que cookies HttpOnly. Para produção com dados de saúde, prefira cookies `HttpOnly; Secure; SameSite`, sessão renovável, CSP, limite de tentativas compartilhado e procedimentos de recuperação de senha.
- Use somente **dados fictícios** ao compartilhar o ambiente por Cloudflare Tunnel; não é uma configuração de produção nem serviço de emergência.

## Conferência realizada neste pacote

- Novos testes de fluxo de autenticação e SQL em `backend/testes/conta-domiciliar-permanente.test.js`: cinco cenários simulados.
- Validação de sintaxe dos módulos JS/JSX, sem erros.
- **Não foi possível rodar o Vite/React build ou conectar ao MySQL real neste ambiente**, pois as dependências não estão disponíveis para instalação offline. Execute `npm install`, `npm run build`, e o teste de ponta a ponta no seu Windows.
