# Cuidar+ — Refatoração de navegação, modais e edição de rotinas

## O que mudou

- O projeto agora usa `BrowserRouter`, `Routes`, `Link` e `NavLink` (`react-router-dom`).
- A barra lateral foi extraída para `frontend/src/componentes/MenuLateral.jsx`. O link **Acompanhamento** abre `/acompanhamento-clinico` sem `alert()`.
- A logo no painel, na página clínica e na área de gerenciamento retorna a `/dashboard`.
- O logout utiliza `ConfirmacaoSaida.jsx`, com a pergunta exata solicitada e saída apenas após confirmação.
- A Dashboard e a página clínica abrem o `NovaRotinaModal.jsx`, sem redirecionar a tela. Na página clínica, o paciente atual já vem selecionado.
- A página clínica ganhou edição inline de título, séries, repetições, observações, dias programados, informações de medicamento já prescrito e horários existentes. Não há opção Excluir.
- `PATCH /api/rotinas/:rotinaId` autentica o fisioterapeuta, confere o vínculo do paciente e salva a edição em transação.
- Se a rotina possui check-ins ou confirmações de medicamentos, **uma nova versão** é criada e a antiga é preservada como concluída. Isso evita modificar retroativamente o protocolo registrado.
- Como os novos modais usam classes Tailwind, foram adicionadas as dependências Tailwind v4 e o plugin para Vite. O CSS legado da dashboard foi preservado e não foi importado o Preflight do Tailwind.

## Instalação

1. Faça backup da pasta atual. Aplique o ZIP de atualização **sobre a raiz `cuidar-plus/`**, preservando os caminhos dos arquivos. O ZIP de projeto completo também pode ser extraído em pasta nova.
2. **Preserve seu `backend/.env`**. O pacote não contém segredos.
3. **Não execute DROP DATABASE, migrações ou um SQL novo:** não há alteração na estrutura do MySQL nesta entrega.
4. No terminal da pasta `frontend`, execute:

   ```powershell
   npm install
   npm run build
   npm run dev
   ```

   `npm install` é obrigatório: a versão anterior ainda não tinha `react-router-dom`, `tailwindcss` e `@tailwindcss/vite`. O lockfile antigo será atualizado pelo npm. **Não use `npm ci` antes de atualizar o lockfile**.
5. No terminal da pasta `backend`, execute:

   ```powershell
   npm install
   npm run verificar:banco
   npm test
   npm run dev
   ```

## Como conferir

1. Entre como fisioterapeuta. Na sidebar, clique em **Acompanhamento**; a rota deve mudar para `/acompanhamento-clinico` sem abrir alertas.
2. Clique na logo **Cuidar+**; deve voltar para `/dashboard` sem recarregar a página.
3. Clique em **Sair**; o modal deve aparecer e Cancelar deve manter a sessão.
4. Na Dashboard, abra **Nova Rotina** e salve com um paciente, uma atividade e datas válidas. O modal não deve navegar para outra página.
5. Na tela clínica, escolha um paciente com rotina ativa, clique em **Editar Rotina**, altere série, repetição ou um dado registrado conforme a prescrição, e salve.
6. Verifique se o botão atualiza dados da API e apresenta a mensagem correspondente.

## Observações importantes

- A atualização **não** permite acrescentar ou remover exercícios ou medicamentos na edição de uma rotina existente. Para adicionar/remover itens, crie uma rotina nova; isso evita alterações destrutivas do histórico.
- Um horário cadastrado pode ser alterado, mas acrescentar/remover horários durante a edição também exige uma rotina nova.
- Dados de medicamentos devem reproduzir uma prescrição válida de profissional habilitado. O software não sugere doses.
- Botões para Agenda, Alertas, Relatórios e Configurações continuam visualmente desabilitados na barra lateral; suas páginas ainda não foram implementadas.
- O pacote passou por verificação de sintaxe do frontend e do backend e por **20 testes automatizados**. O build do Vite **não foi executado com sucesso neste ambiente**, pois a instalação das dependências e o acesso ao registro npm estavam indisponíveis; valide `npm run build` no seu computador.
- Não foram realizados testes ponta a ponta em servidor MySQL real. Ao testar a API PATCH, use dados fictícios.
