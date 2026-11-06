# Cuidar+ — Prescrição de rotinas domiciliares

## O que mudou

- A tela de Nova rotina separa **Medicamentos prescritos** e **Exercícios**. O catálogo é consultado por pesquisa. Um novo item é cadastrado em um **modal** e selecionado imediatamente.
- Cada exercício tem suas séries, repetições, observações e dias da semana.
- Os medicamentos têm catálogo próprio; a associação ao paciente exige referência da prescrição existente, nome do prescritor, dose textual, via de administração, frequência textual, horários *explicitamente informados* e dias da semana. O software **não prescreve doses, não calcula horários terapêuticos e não indica tratamento**.
- `POST /api/rotinas` grava rotina, exercícios, medicamentos e horários em uma **transação**; se ocorrer erro, desfaz tudo.
- O portal domiciliar mostra os exercícios correspondentes ao dia e permite marcar horários de medicamentos como administrado, não administrado ou adiado. O registro de cada horário é separado, associado ao cuidador autenticado.
- A guarda de autenticação em `convites.js` foi aplicada somente à criação de convites, deixando a ativação sob a validação de convite realizada na rota de cuidado.

## ATENÇÃO: SQL recria o banco

O arquivo `database/cuidar_plus_completo.sql` inicia com `DROP DATABASE IF EXISTS cuidar_plus`. **Apaga todos os dados e acessos existentes.** Use-o somente no MySQL de desenvolvimento, após backup se necessário. Não execute também as migrações antigas.

1. No MySQL Workbench, execute **todo** o arquivo `database/cuidar_plus_completo.sql`.
2. Em `backend/.env`, configure MySQL, `ORIGEM_FRONTEND=http://localhost:5173` e `SEGREDO_JWT` de pelo menos 32 caracteres aleatórios.
3. Na pasta backend: `npm install` e `npm run dev`.
4. Na pasta frontend: `npm install` e `npm run dev`.
5. Acesse o painel (`/acompanhamento`), selecione um paciente, abra **Nova rotina** e use as seções e os botões **+ Novo**.
6. Para testar pelo celular, gere um convite novo para um endereço de e-mail diferente do profissional, ative o acesso e abra `/cuidado`.

## Compatibilidade

Esta entrega é um **projeto completo substitutivo**, não um arquivo isolado para misturar com versões anteriores. Se o seu código atual tem modificações próprias, faça backup e compare antes de substituir. As novas rotas exigem a estrutura SQL deste pacote.

## Validação realizada

- Verificação de sintaxe dos arquivos JavaScript do backend: aprovada.
- Verificação sintática JSX com parser TypeScript: aprovada.
- 5 testes existentes do backend: aprovados.
- **Não foram realizados testes reais no MySQL, nem build completo do Vite**: dependência não disponível no cache offline. Valide a execução local antes de utilizar. Dados reais de saúde exigem avaliação e controles de privacidade adicionais.

## Limites atuais

- A interface ainda não registra alterações posteriores numa prescrição já gravada; é necessário definir fluxo de correção e histórico em outra etapa.
- Confirmação de medicamentos registrada na hora, sem indicação de dose recomendada.
- Regras de eventos com horários múltiplos, fuso horário e dias sem internet devem ser validadas com a fisioterapeuta antes do uso real.
