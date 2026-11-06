# Cuidar+ — primeira etapa do acompanhamento domiciliar

Versão de desenvolvimento, construída a partir do ZIP mais recente enviado no chat e do Documento de Visão.
**Não usar com dados clínicos reais antes de uma avaliação de segurança e privacidade.**

## O que está funcional no código

- Login do **fisioterapeuta**, sem perfil separado de administrador e sem exigir a coluna `perfil`.
- Tela de **acompanhamento**: cadastrar pacientes, cadastrar exercícios no catálogo, criar rotina com itens, visualizar check-ins e criar convite individual.
- **Portal móvel** para cuidador ou paciente autorizado: ativar convite, criar senha, entrar, visualizar tarefas, confirmar exercícios e registrar dor e observações.
- API única com Node.js/Express e MySQL. Check-ins e itens são gravados na mesma transação.
- Dashboard existente adaptada para consultar adesão no período com exercícios programados, contando ausências de registro como **sem confirmação** (e nunca como execução).
- Manifesto PWA, ícones e página de orientação quando a aplicação estiver offline. Não há gravação offline neste MVP.

## 1. Antes de tudo: backup

Faça backup de `cuidar_plus` no Workbench antes de alterar o esquema. Não há `DROP DATABASE` na migração.

O `database/cuida_mais.sql` serve **somente para criar um banco vazio**. NÃO reexecute o esquema inicial em um banco existente.

Em banco **já existente**, execute nesta ordem:

1. `database/migracoes/002_verificacoes_antes.sql` — as primeiras cinco consultas de inconsistências precisam retornar **zero linhas**. Se houver inconsistências, corrija-as antes de prosseguir.
2. `database/migracoes/002_acompanhamento_domiciliar.sql` — execute **uma única vez**, com todo o script selecionado.

ATENÇÃO: MySQL faz `COMMIT` implícito nos comandos DDL (`ALTER TABLE`); se uma migração falhar na metade, não reexecute cegamente. Verifique onde parou e restaure o backup ou ajuste o trecho pendente.

A migração preserva dados, cria contas domiciliares e convites, permite um check-in **por rotina e por dia** e fortalece as chaves estrangeiras. Ela assume MySQL 8.0.16+.

Se estiver criando um banco realmente **vazio**, execute `database/cuida_mais.sql`, depois apenas a migração 002. A migração 001 de perfis NÃO é necessária para esta versão.

## 2. Backend

No PowerShell:

```powershell
cd C:\Users\savio\cuidar-plus\backend
npm install
Copy-Item .env.example .env
```

Preencha `backend/.env` com as credenciais reais do MySQL. Gere um novo `SEGREDO_JWT` localmente:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Não cole `.env` no chat nem distribua no ZIP.**

Se ainda não há fisioterapeuta, adicione temporariamente ao `.env`:

```env
SENHA_FISIOTERAPEUTA_INICIAL=uma-senha-forte-com-12-ou-mais-caracteres
```

Execute `npm run criar:fisioterapeuta`, remova a variável de senha inicial e depois `npm run dev`.
Se já existe uma conta de fisioterapeuta, simplesmente use a senha dela.

Verifique `http://localhost:3000/api/saude`.

## 3. Frontend

Em outro terminal:

```powershell
cd C:\Users\savio\cuidar-plus\frontend
npm install
npm run dev
```

- `http://localhost:5173/`: login / dashboard profissional.
- `http://localhost:5173/acompanhamento`: cadastro de paciente, rotina e convite.
- `http://localhost:5173/cuidado`: portal móvel para o paciente/cuidador.

**Teste ponta a ponta:** entre como profissional, cadastre paciente, adicione um exercício, crie rotina com início hoje, gere convite, abra o link em outra janela, ative-o, registre os exercícios e atualize a página de acompanhamento.

## 4. Testar no telefone (mesmo Wi-Fi)

1. Descubra o IPv4 local do computador (`ipconfig`).
2. Troque `ORIGEM_FRONTEND` do backend para `http://IP_DO_COMPUTADOR:5173`. Use a mesma origem nos convites.
3. Crie `frontend/.env` com `VITE_API_URL=http://IP_DO_COMPUTADOR:3000`.
4. Inicie o frontend com `npm run dev -- --host 0.0.0.0` e o backend com `npm run dev`.
5. Ajuste o firewall do Windows para permitir acesso apenas da sua rede privada, se necessário.
6. No celular, abra `http://IP_DO_COMPUTADOR:5173/cuidado` ou o link do convite.

**Atenção:** em HTTP pela rede local, não envie dados reais de saúde e não use credenciais pessoais. Para uso real, hospede com HTTPS. A instalação PWA e service workers normalmente exigem HTTPS ou `localhost`.

## 5. Rotas principais

| Método | Endpoint | Autenticação |
|---|---|---|
| POST | `/api/login` | pública (fisioterapeuta) |
| GET | `/api/eu` | fisioterapeuta |
| GET | `/api/dashboard?periodo=hoje` | fisioterapeuta |
| GET/POST | `/api/pacientes` | fisioterapeuta |
| GET | `/api/pacientes/:id/acompanhamento` | fisioterapeuta dono |
| GET/POST | `/api/rotinas/exercicios` | profissional (catálogo compartilhado) |
| GET/POST | `/api/rotinas` | profissional dono |
| POST | `/api/pacientes/:pacienteId/convites` | fisioterapeuta dono |
| POST | `/api/cuidado/ativar` | convite único, expirável |
| POST | `/api/cuidado/login` | pública (usuário domiciliar) |
| POST | `/api/cuidado/aceitar-convite` | usuário domiciliar + convite |
| GET | `/api/cuidado/meu-dia` | usuário domiciliar vinculado |
| POST | `/api/cuidado/checkins` | usuário domiciliar vinculado |

## 6. Limitações e próximas etapas

- **Ainda não** foram implementados medicamentos, ocorrências de saúde, notificações push, WhatsApp automático, relatório PDF, metas nem agenda.
- Não há sincronização de registros sem internet, recuperação de senha ou fluxo de revogação de acesso pela interface.
- Os convites exigem que o profissional tenha verificado a autorização do paciente/responsável. O checkbox **não substitui documentação formal de consentimento/autorização**.
- O token de convite é válido por 48 horas, de uso único; compartilhe somente pelo canal privado autorizado.
- Antes de produção: autenticação mais robusta (sessão em cookie HttpOnly e proteção contra CSRF, ou equivalente), TLS, logs de auditoria, redefinição de senha, revogação, limitação distribuída de tentativas, backup, LGPD e testes de integração em MySQL real.
- Para a adesão, a primeira versão considera a rotina **ativa todos os dias** entre início e fim; um calendário de frequência e histórico de edições exigirão extensão posterior.
- Não existe monitoramento de emergência em tempo real; o portal não substitui atendimento profissional.

## 7. Validação desta entrega

Rodado localmente: `node --check` em todos os scripts do backend e testes unitários de validação; verificada a sintaxe JSX usando o parser TypeScript. A instalação de pacotes via rede e o teste contra um MySQL real **não puderam ser concluídos no ambiente de criação**, então a interface e os fluxos precisam ser verificados no Windows após `npm install`.
