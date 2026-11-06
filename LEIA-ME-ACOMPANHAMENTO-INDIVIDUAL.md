# Cuidar+ — nova tela de acompanhamento individual

Esta entrega acrescenta uma **tela nova** ao painel do fisioterapeuta, preservando o cadastro de pacientes, a prescrição de rotinas e o portal do cuidador.

## Onde abrir

- `http://localhost:5173/acompanhamento-clinico`
- `http://localhost:5173/acompanhamento-clinico?paciente_id=4` (exemplo; substitua pelo ID real)

O seletor no topo lista **somente pacientes vinculados à conta profissional autenticada**. A troca de paciente carrega de novo as informações, sem reutilizar dados do paciente anterior.

A tela apresenta: identificação e patologia, objetivo geral ou meta funcional (quando cadastrados), contato familiar, rotinas, medicamentos e horários, exercícios programados, alertas pendentes e linha do tempo de check-ins. Os registros de medicamentos exibidos são **confirmações efetivamente registradas**, não uma estimativa de que todas as doses foram administradas.

## Integração

- Novo endpoint autenticado: `GET /api/acompanhamento-clinico/:pacienteId`
- Novo endpoint autenticado para confirmar revisão de alerta: `PATCH /api/acompanhamento-clinico/:pacienteId/alertas/:alertaId` com `{ "status": "Resolvido" }`.
- O botão **Ver acompanhamento completo** está na tela `/acompanhamento`, após selecionar um paciente.
- Clicar em uma linha da lista de pacientes da dashboard também abre a nova tela.
- O botão **Nova rotina** devolve o fisioterapeuta ao formulário de prescrição, com o mesmo paciente já selecionado.

**Importante:** o protótipo HTML recebido simulava edições sem salvar. Para não comprometer históricos clínicos, esta entrega usa visualização real e o fluxo existente de **nova rotina**, em vez de fingir que alterações de prescrições foram gravadas. Não foram incluídas prescrições ou regras médicas automáticas.

## Instalação

1. Faça uma cópia de segurança da pasta atual.
2. Aplique o ZIP de atualização rápida no diretório raiz `cuidar-plus/`, mantendo a estrutura das pastas `backend/` e `frontend/`. Ou utilize o ZIP completo em uma pasta nova.
3. Preserve seu arquivo `backend/.env` (não está no ZIP).
4. Na pasta `backend`, execute `npm install`, `npm test` e `npm run dev`.
5. Na pasta `frontend`, execute `npm install`, `npm run build` e `npm run dev`.
6. Entre como fisioterapeuta e abra `/acompanhamento-clinico`.

## Banco

**Nenhum DROP, INSERT ou ALTER TABLE é necessário.** A implementação lê as tabelas do SQL consolidado que você já executou. Não precisa recriar seu banco.

## Testes e limitações

A sintaxe do backend foi verificada. Testes automatizados em Node passaram, incluindo verificações da nova rota e de suas dependências SQL. A compilação Vite e a conexão com um banco MySQL real **não puderam ser executadas neste ambiente**; teste-as localmente.

O painel não substitui um prontuário clínico, não prescreve medicamentos e não é um sistema de emergência 24 horas.
