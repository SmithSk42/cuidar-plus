-- CUIDAR+ | MIGRAÇÃO 002 | MYSQL 8.0.16+
-- EXECUTE UMA ÚNICA VEZ, APÓS BACKUP. NÃO EXECUTA DROP DATABASE OU REMOVE DADOS.
-- Pré-requisito: esquema original database/cuida_mais.sql já aplicado.
-- Antes de executar, consulte 002_verificacoes_antes.sql e corrija inconsistências.
USE cuidar_plus;

CREATE TABLE IF NOT EXISTS usuarios_domiciliares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vinculos_cuidado (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  paciente_id INT NOT NULL,
  papel ENUM('Paciente','Cuidador') NOT NULL,
  status ENUM('Ativo','Revogado') NOT NULL DEFAULT 'Ativo',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_vinculo_usuario_paciente UNIQUE (usuario_id,paciente_id),
  CONSTRAINT fk_vinculo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios_domiciliares(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vinculo_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
  INDEX idx_vinculo_paciente (paciente_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS convites_cuidado (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  fisioterapeuta_id INT NOT NULL,
  nome_convidado VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  papel ENUM('Paciente','Cuidador') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  autorizado_por VARCHAR(100) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  CONSTRAINT fk_convite_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_convite_profissional FOREIGN KEY (fisioterapeuta_id) REFERENCES fisioterapeutas(id) ON DELETE RESTRICT,
  INDEX idx_convite_paciente (paciente_id, criado_em)
) ENGINE=InnoDB;

-- O histórico já registrado é preservado. Um paciente pode registrar um check-in
-- POR ROTINA E POR DIA (antes o banco permitia só um check-in TOTAL por dia).
ALTER TABLE checkins DROP INDEX uk_checkin_diario;
ALTER TABLE checkins
  ADD CONSTRAINT uk_checkin_rotina_dia UNIQUE (paciente_id,rotina_id,data_registro),
  ADD COLUMN registrado_por_usuario_id INT NULL AFTER rotina_id,
  ADD COLUMN origem_registro ENUM('Aplicativo','Profissional','Telefone','Papel','WhatsApp')
    NOT NULL DEFAULT 'Aplicativo' AFTER registrado_por_usuario_id,
  ADD CONSTRAINT fk_checkin_usuario FOREIGN KEY (registrado_por_usuario_id)
    REFERENCES usuarios_domiciliares(id) ON DELETE RESTRICT;

-- Evita relacionar paciente a outro fisioterapeuta em qualquer operação existente.
ALTER TABLE pacientes ADD CONSTRAINT uk_paciente_profissional UNIQUE (fisioterapeuta_id,id);
ALTER TABLE rotinas ADD CONSTRAINT fk_rotina_profissional_paciente
  FOREIGN KEY (fisioterapeuta_id,paciente_id)
  REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT;
ALTER TABLE alertas ADD CONSTRAINT fk_alerta_profissional_paciente
  FOREIGN KEY (fisioterapeuta_id,paciente_id)
  REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT;
ALTER TABLE agendamentos ADD CONSTRAINT fk_agenda_profissional_paciente
  FOREIGN KEY (fisioterapeuta_id,paciente_id)
  REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT;

-- Fortalece a correspondência paciente <-> rotina <-> check-in.
ALTER TABLE rotinas ADD CONSTRAINT uk_rotina_id_paciente UNIQUE (id,paciente_id);
ALTER TABLE checkins ADD CONSTRAINT fk_checkin_rotina_do_paciente
  FOREIGN KEY (rotina_id,paciente_id) REFERENCES rotinas(id,paciente_id) ON DELETE RESTRICT;

-- Garante que cada exercício confirmado realmente pertence à rotina do check-in.
ALTER TABLE rotinas_itens ADD CONSTRAINT uk_item_id_rotina UNIQUE (id,rotina_id);
ALTER TABLE checkins ADD CONSTRAINT uk_checkin_id_rotina UNIQUE (id,rotina_id);
ALTER TABLE checkins_itens ADD COLUMN rotina_id INT NULL;
UPDATE checkins_itens ci JOIN checkins c ON c.id=ci.checkin_id
SET ci.rotina_id=c.rotina_id;
ALTER TABLE checkins_itens MODIFY rotina_id INT NOT NULL;
ALTER TABLE checkins_itens
  ADD CONSTRAINT fk_checkin_item_mesma_rotina
    FOREIGN KEY (checkin_id,rotina_id) REFERENCES checkins(id,rotina_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_exercicio_item_mesma_rotina
    FOREIGN KEY (rotina_item_id,rotina_id) REFERENCES rotinas_itens(id,rotina_id) ON DELETE RESTRICT;
