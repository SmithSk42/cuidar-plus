# Cuidar+ — Revisão consolidada (06/11/2026)

## O que encontrei e corrigi

- **Erro 500 por tabela ausente:** o banco usado no computador não estava sincronizado com o backend. O SQL único agora contém a tabela `rotinas_medicamentos` e sua ligação ao MESMO paciente da rotina e da prescrição.
- **Erro 500 ao salvar rotina completa:** rotas e SQL alinhados para adicionar o `paciente_id` ao vínculo de medicamentos, dentro da mesma transação dos exercícios e horários.
- **Diagnóstico antecipado:** `npm run verificar:banco` checa 26 tabelas, colunas críticas e 2 views. A API faz a verificação antes de iniciar, evitando erros 500 por estrutura faltante.
- **Dashboard:** respeita os dias da semana programados para a rotina e os exercícios. Ainda não é relatório clínico validado; dados sem registro não significam tarefa não realizada.
- **Permissões domiciliares:** leitura de medicamentos depende da permissão; registros dependem de `pode_registrar`. Bloqueio no backend e indicação no frontend.
- **Frontend no celular:** no desenvolvimento chama `/api` no mesmo endereço do Vite (proxy para backend), evitando o erro de usar `localhost:3000` do celular.
- **Respostas de API:** sem cache de dados clínicos e com tratamento de sessão expirada no portal domiciliar.
- **Organização:** removidos os antigos `database/cuida_mais.sql`, migrações antigas, frontend `services/` duplicado e componentes antigos não utilizados. Resta um SQL consolidado e um `servicos/api.js`.
- **Segredos:** `backend/.env` **não está** neste pacote. Preserve seu arquivo local; não envie senhas nem JWT ao Git.

## Instalação — em ordem

1. **Faça backup do projeto atual e do MySQL.** Nunca execute o SQL de DROP em dados reais.
2. Extraia o ZIP em uma pasta limpa. Não misture `src` novo com cópias antigas, pois isso foi uma das causas dos erros anteriores.
3. Abra `database/cuidar_plus_completo.sql` no MySQL Workbench e execute **o arquivo inteiro UMA VEZ**. Ele começa com `DROP DATABASE IF EXISTS cuidar_plus`, recria as 26 tabelas e 2 views, insere dados fictícios. NÃO execute migrações antigas depois.
4. Recoloque o seu `backend/.env` privado (a partir do seu backup). Confira `PORTA`, `ORIGEM_FRONTEND`, `BANCO_*` e um `SEGREDO_JWT` aleatório forte. Não copie o `.env` para o frontend.
5. No PowerShell:

   ```powershell
   cd C:\Users\savio\cuidar-plus\backend
   npm install
   npm run verificar:banco
   npm test
   npm run dev
   ```

6. Em **outro terminal**:

   ```powershell
   cd C:\Users\savio\cuidar-plus\frontend
   npm install
   npm run build
   npm run dev
   ```

7. Abra `http://localhost:5173/`. Para o portal do cuidador, `http://localhost:5173/cuidado`.
8. O SQL apaga contas anteriores. Para criar seu fisioterapeuta, defina no `backend/.env` as variáveis `EMAIL_FISIOTERAPEUTA_INICIAL`, `NOME_FISIOTERAPEUTA_INICIAL`, `CREFITO_FISIOTERAPEUTA_INICIAL`, `SENHA_FISIOTERAPEUTA_INICIAL` (12+ caracteres); rode `npm run criar:fisioterapeuta` antes de entrar e remova a variável de senha. Para uma conta já existente, `npm run redefinir:senha-fisioterapeuta`.
9. Faça o teste real: login profissional → cadastro de paciente → cadastro de exercício ou medicamento fictício → salvar rotina → gerar convite → ativar cuidador → registrar exercício/medicamento → conferir painel. Convites anteriores ao DROP deixam de existir.

## Pelo celular na mesma rede Wi-Fi

- Em `frontend/.env`, **não use** `VITE_API_URL=http://localhost:3000`. Remova essa variável ou deixe vazia; o proxy do Vite encaminha `/api`.
- Inicie o frontend com `npm run dev` e acesse `http://IP_LOCAL_DO_COMPUTADOR:5173/cuidado` pelo celular. Para descobrir o IP, use `ipconfig` no PowerShell. Firewall do Windows pode precisar autorizar a conexão.
- Acesso público e PWA instalável por HTTPS exigem hospedagem segura. Não use o servidor Vite de desenvolvimento com dados reais de pacientes.

## Estado dos testes

- **Verificado neste pacote:** sintaxe dos arquivos JS do backend, análise sintática de JSX com parser TypeScript, 11 testes automáticos locais (incluindo contratos de banco).
- **Não foi possível verificar aqui:** execução real do banco MySQL, `npm run build` (dependências do Vite indisponíveis neste ambiente) ou testes ponta a ponta no seu Windows. Esses devem ser executados após a instalação local.

## Escopo

A infraestrutura de SQL suporta os módulos futuros (ocorrências, metas, alertas, privacidade, relatórios). As **rotas e interfaces desses módulos ainda não foram implementadas completamente**; esta revisão se concentra em estabilizar o fluxo disponível: profissional → paciente → rotina → cuidador → check-in. Medicamentos são apenas acompanhamento de prescrições pré-existentes, sem cálculo de dose.
