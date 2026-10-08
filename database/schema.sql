-- Responsável por esta implementação: Filipe Alves Sousa Julio.
-- Esquema para MySQL 8.0.16+ (CHECK constraints ativos) / InnoDB.
CREATE DATABASE IF NOT EXISTS cuidar_plus
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cuidar_plus;

CREATE TABLE IF NOT EXISTS fisioterapeutas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    crefito VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fisioterapeutas_crefito (crefito),
    UNIQUE KEY uq_fisioterapeutas_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pacientes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    fisioterapeuta_id INT UNSIGNED NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NULL,
    telefone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    senha_hash VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pacientes_email (email),
    CONSTRAINT fk_pacientes_fisioterapeutas
        FOREIGN KEY (fisioterapeuta_id) REFERENCES fisioterapeutas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkins (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    paciente_id INT UNSIGNED NOT NULL,
    data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_atividades BOOLEAN NOT NULL,
    nivel_dor TINYINT UNSIGNED NOT NULL,
    observacoes TEXT NULL,
    PRIMARY KEY (id),
    KEY ix_checkins_paciente_data (paciente_id, data_registro),
    CONSTRAINT fk_checkins_pacientes
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
    CONSTRAINT chk_checkins_nivel_dor CHECK (nivel_dor BETWEEN 0 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
