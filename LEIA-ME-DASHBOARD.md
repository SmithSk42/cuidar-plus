# Cuidar+ — Dashboard do Stitch

Esta entrega substitui o painel antigo do fisioterapeuta pela nova Dashboard em React/CSS, mantém as demais telas antigas intactas e cria a API inicial de indicadores.

## Visualização sem backend

No terminal: `cd frontend`, `npm install`, `npm run dev`. Abra `http://localhost:5173/visualizacao-dashboard`.

**Esta rota é somente para revisar o design; não apresenta dados fictícios.**

## Backend

No terminal: `cd backend`, `npm install`; copie `.env.example` para `.env`, configure MySQL e o segredo JWT; execute `npm run dev`.

A rota `GET /api/dashboard?periodo=hoje|7dias|mes` exige token JWT de fisioterapeuta. As demais rotas, inclusive login, ainda não foram reconstruídas. Os botões de outros módulos apenas avisam que o módulo será implementado.

## Observações

- A meta de check-ins é estimada pela quantidade de pacientes com rotina ativa vezes os dias do período. É necessário definir a frequência de prescrições para cálculo clínico real.
- A adesão exibida segue a view atual do banco, que conta itens em check-ins existentes. A fórmula deverá ser aperfeiçoada junto com a remodelagem do banco.
- Dados clínicos são sensíveis; autenticação, autorização e proteção das rotas restantes devem ser concluídas antes de uso real.
- Não use o arquivo `.env` original; ele foi excluído desta entrega de propósito.
