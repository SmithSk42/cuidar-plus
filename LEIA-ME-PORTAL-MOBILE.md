# Cuidar+ | Portal mobile integrado (Stitch → React)

## O que foi feito

- As seis telas de `Telas.zip` foram usadas como referência para a nova interface de `/cuidado`: Início, Medicamentos, Exercícios, Check-in diário, Relatar um problema e Histórico.
- Login por convite e sessão domiciliar foram preservados.
- Seleção de pacientes **vinculados à conta** quando o cuidador acompanha mais de um paciente.
- Medicamentos: confirmação independente para **cada horário**, como antes, mais correção no Histórico com motivo obrigatório.
- Exercícios: marcar **Realizado**, **Parcialmente** ou **Não realizado**; as respostas são gravadas ao enviar o **check-in diário**. Um check-in por rotina por dia, podendo ser corrigido com auditoria.
- Ocorrências: relato a qualquer momento, sem depender de check-in. A equipe vê as ocorrências no Acompanhamento Clínico e pode alterar o andamento administrativo.
- Histórico: exibe check-ins, medicamentos e ocorrências reais, e marca registros corrigidos.
- Auditoria: guarda os dados anteriores e posteriores de cada correção em tabelas próprias. Não apaga registros.

## Atualização do banco existente — OBRIGATÓRIA

**Faça backup primeiro**. No MySQL Workbench abra e execute **uma única vez**:

`database/migracao_portal_mobile.sql`

A migração adiciona **2 tabelas de correções** e **2 colunas** (resultado do exercício e intensidade de dor), além de ampliar os tipos aceitos nas ocorrências.

**Não execute `database/cuidar_plus_completo.sql` sobre seu banco atual**: esse arquivo contém `DROP DATABASE` e apagaria todos os dados. O SQL completo foi atualizado somente para instalações novas de desenvolvimento.

O backend verificará a presença da nova estrutura antes de subir. Se executar a migração novamente, o MySQL pode acusar coluna/tabela já existente; não reexecute às cegas.

## Substituição dos arquivos

1. Descompacte o pacote menor na raiz do projeto `cuidar-plus`, **preservando a estrutura de pastas**.
2. Salve seus `.env` e quaisquer mudanças locais antes de substituir.
3. Execute a migração no banco já existente.
4. Inicie o backend com `cd backend; npm install; npm run dev`.
5. Inicie o frontend com `cd frontend; npm install; npm run dev`.
6. Abra `http://localhost:5173/cuidado` e entre com sua conta do cuidador.
7. Teste um relato, confirme um horário de medicamento, envie um check-in com uma marcação parcial e confira o histórico/correção. Depois confira o relato em `/acompanhamento-clinico` com login de fisioterapeuta.

## Rotas novas

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/cuidado/pacientes` | Seleção de pacientes autorizados |
| GET | `/api/cuidado/historico?paciente_id=1` | Histórico real do paciente |
| POST | `/api/cuidado/ocorrencias` | Relatar ocorrência |
| PATCH | `/api/cuidado/checkins/:id` | Corrigir check-in com auditoria |
| PATCH | `/api/cuidado/medicamentos/registros/:id` | Corrigir registro de medicamento com auditoria |
| PATCH | `/api/acompanhamento-clinico/:pacienteId/ocorrencias/:ocorrenciaId` | Atualizar andamento no painel profissional |

## Regras importantes

- A API valida identidade e vínculo do paciente, inclusive ao corrigir registros. Somente quem criou o check-in ou registro de medicamento pode corrigir sua própria resposta pelo portal.
- Status `Encerrado` da ocorrência significa encerramento **administrativo**, não cura clínica.
- Relatos e alertas **não enviam notificações push, e-mail ou WhatsApp**. A equipe os verá ao consultar o painel; **não há monitoramento 24h ou atendimento emergencial**.
- O PWA exige HTTPS quando instalado fora de `localhost`. O backend utiliza tokens de sessão em `sessionStorage` como no projeto anterior; para dados reais sensíveis, é necessário revisão adicional de autenticação, privacidade, segurança e conformidade.
- Os testes automatizados do backend e a análise de sintaxe JSX não substituem testes integrados em MySQL real e celular.
