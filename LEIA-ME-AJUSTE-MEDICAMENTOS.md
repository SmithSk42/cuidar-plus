# Correção — medicamentos nas rotinas do paciente

Este ajuste **não modifica o banco**. A tabela `rotinas_medicamentos` já existe no SQL consolidado.

## Arquivos modificados

- `backend/src/rotas/rotinas.js` — `GET /api/rotinas?paciente_id=...` devolve, além dos contadores, uma lista de medicamentos por rotina com nome, apresentação, dose informada, via, horário e dias.
- `frontend/src/paginas/Acompanhamento.jsx` — exibe o contador de medicamentos e seus detalhes mesmo quando não há exercícios na rotina.
- `frontend/src/paginas/acompanhamento.css` — apresentação dos medicamentos na lista lateral.
- `backend/testes/compatibilidade.test.js` — teste de regressão do contrato.

## Atualização

Substitua esses arquivos nos respectivos caminhos do seu projeto (ou use o ZIP completo). Não altere seu `.env` nem execute `DROP DATABASE`.

1. No backend: `npm test` e `npm run dev`.
2. No frontend: `npm run dev`.
3. Reabra `/acompanhamento`, selecione João Paulo e veja `Rotina para João Paulo`.

O painel agora deve mostrar `0 exercício(s) · 1 medicamento(s)` (se a rotina realmente tiver um medicamento vinculado) e o nome/dose/horário do medicamento cadastrado.

Se aparecer `0 medicamento(s)`, o vínculo não está salvo. Verifique no MySQL:

```sql
SELECT r.id, r.titulo, m.nome, mp.dose_informada
FROM rotinas r
LEFT JOIN rotinas_medicamentos rm ON rm.rotina_id = r.id
LEFT JOIN medicamentos_pacientes mp ON mp.id = rm.medicamento_paciente_id
LEFT JOIN medicamentos m ON m.id = mp.medicamento_id
WHERE r.titulo = 'Rotina para João Paulo';
```

Não faça esse `SELECT` no frontend; é somente um teste opcional no Workbench.
