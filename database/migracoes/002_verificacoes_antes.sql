-- Execute ANTES de 002_acompanhamento_domiciliar.sql.
-- Todas as consultas de inconsistência devem retornar ZERO linhas.
USE cuidar_plus;

-- Check-ins cuja rotina pertence a outro paciente.
SELECT c.id AS checkin_id,c.paciente_id,r.paciente_id AS paciente_da_rotina
FROM checkins c JOIN rotinas r ON r.id=c.rotina_id
WHERE c.paciente_id<>r.paciente_id;

-- Exercícios marcados em check-ins de OUTRA rotina.
SELECT ci.checkin_id,ci.rotina_item_id,c.rotina_id AS rotina_checkin,ri.rotina_id AS rotina_item
FROM checkins_itens ci
JOIN checkins c ON c.id=ci.checkin_id
JOIN rotinas_itens ri ON ri.id=ci.rotina_item_id
WHERE c.rotina_id<>ri.rotina_id;

-- Rotinas atribuídas a fisioterapeuta diferente do responsável pelo paciente.
SELECT r.id AS rotina_id,r.fisioterapeuta_id,p.fisioterapeuta_id AS responsavel
FROM rotinas r JOIN pacientes p ON p.id=r.paciente_id
WHERE r.fisioterapeuta_id<>p.fisioterapeuta_id;

-- Alertas vinculados a outro fisioterapeuta.
SELECT a.id AS alerta_id,a.fisioterapeuta_id,p.fisioterapeuta_id AS responsavel
FROM alertas a JOIN pacientes p ON p.id=a.paciente_id
WHERE a.fisioterapeuta_id<>p.fisioterapeuta_id;

-- Agendamentos vinculados a outro fisioterapeuta.
SELECT a.id AS agendamento_id,a.fisioterapeuta_id,p.fisioterapeuta_id AS responsavel
FROM agendamentos a JOIN pacientes p ON p.id=a.paciente_id
WHERE a.fisioterapeuta_id<>p.fisioterapeuta_id;

-- Execute para inspecionar as restrições atuais.
SHOW CREATE TABLE checkins;
SHOW CREATE TABLE checkins_itens;
