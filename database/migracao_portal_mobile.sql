-- Cuidar+ / portal mobile: executar UMA VEZ no banco ja existente.
-- Faca backup antes. Nao rode o SQL completo: ele pode apagar o banco.
USE cuidar_plus;

ALTER TABLE checkins_itens
  ADD COLUMN resultado ENUM('Realizado','Parcial','Nao_Realizado') NULL AFTER concluido;

ALTER TABLE ocorrencias
  MODIFY COLUMN tipo ENUM('Queda','Febre','Dor','Sintoma_Atipico','Outro','Exercicio','Medicamento') NOT NULL,
  ADD COLUMN intensidade_dor TINYINT UNSIGNED NULL AFTER descricao,
  ADD CONSTRAINT chk_ocorrencia_intensidade CHECK (intensidade_dor IS NULL OR intensidade_dor BETWEEN 0 AND 10);

-- Historico imutavel de correcoes efetuadas no portal domiciliar.
CREATE TABLE correcoes_checkins (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 checkin_id BIGINT NOT NULL,
 usuario_domiciliar_id INT NOT NULL,
 motivo VARCHAR(250) NOT NULL,
 dados_anteriores JSON NOT NULL,
 dados_novos JSON NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(checkin_id) REFERENCES checkins(id) ON DELETE RESTRICT,
 FOREIGN KEY(usuario_domiciliar_id) REFERENCES usuarios_domiciliares(id) ON DELETE RESTRICT,
 INDEX idx_correcao_checkin(checkin_id,criado_em)
) ENGINE=InnoDB;

CREATE TABLE correcoes_medicamentos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 registro_medicamento_id BIGINT NOT NULL,
 usuario_domiciliar_id INT NOT NULL,
 motivo VARCHAR(250) NOT NULL,
 situacao_anterior ENUM('Administrado','Nao_Administrado','Adiado') NOT NULL,
 situacao_nova ENUM('Administrado','Nao_Administrado','Adiado') NOT NULL,
 horario_real_anterior DATETIME NULL,
 horario_real_novo DATETIME NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(registro_medicamento_id) REFERENCES registros_medicamentos(id) ON DELETE RESTRICT,
 FOREIGN KEY(usuario_domiciliar_id) REFERENCES usuarios_domiciliares(id) ON DELETE RESTRICT,
 INDEX idx_correcao_medicamento(registro_medicamento_id,criado_em)
) ENGINE=InnoDB;

