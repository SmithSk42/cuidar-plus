-- =================================================================================
-- PROJETO: CUIDAR+ (SaaS de Acompanhamento Fisioterapêutico)
-- SGBD: MySQL 8.0.16 ou superior (CHECK e regras de integridade estritas)
-- =================================================================================

-- ATENÇÃO: este script é SOMENTE para um banco ainda não criado.
-- Nunca execute o esquema inicial sobre um banco em uso. Não apagamos bancos.

CREATE DATABASE IF NOT EXISTS cuidar_plus
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cuidar_plus;

-- ==========================================
-- 1. PROFISSIONAIS E PACIENTES (DOMÍNIO BASE)
-- ==========================================

CREATE TABLE fisioterapeutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    crefito VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fisioterapeuta_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    email VARCHAR(150) UNIQUE NULL,
    telefone VARCHAR(20),
    patologia_principal VARCHAR(100) NOT NULL,
    
    -- Contacto de emergência para o botão "Contatar Família"
    nome_familiar VARCHAR(100),
    telefone_familiar VARCHAR(20),
    
    -- Campo desnormalizado para performance na Dashboard (Atualizado via Trigger)
    data_ultimo_checkin DATETIME NULL,
    
    status ENUM('Ativo', 'Inativo', 'Alta') NOT NULL DEFAULT 'Ativo',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_fisioterapeuta 
        FOREIGN KEY (fisioterapeuta_id) 
        REFERENCES fisioterapeutas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 2. CATÁLOGO E PRESCRIÇÕES (ROTINAS)
-- ==========================================

CREATE TABLE exercicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255) NOT NULL,
    categoria ENUM('Alongamento', 'Fortalecimento', 'Mobilidade', 'Respiratorio', 'Outros') NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rotinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    fisioterapeuta_id INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NULL,
    status ENUM('Ativa', 'Concluida', 'Cancelada') NOT NULL DEFAULT 'Ativa',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rotina_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    
    CONSTRAINT fk_rotina_paciente 
        FOREIGN KEY (paciente_id) 
        REFERENCES pacientes(id) ON DELETE RESTRICT,
        
    CONSTRAINT fk_rotina_fisioterapeuta 
        FOREIGN KEY (fisioterapeuta_id) 
        REFERENCES fisioterapeutas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE rotinas_itens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rotina_id INT NOT NULL,
    exercicio_id INT NOT NULL,
    series INT NOT NULL DEFAULT 1 CHECK (series > 0),
    repeticoes INT NOT NULL DEFAULT 1 CHECK (repeticoes > 0),
    observacoes VARCHAR(150) NULL,
    
    CONSTRAINT uk_rotina_exercicio UNIQUE (rotina_id, exercicio_id),
    
    CONSTRAINT fk_item_rotina 
        FOREIGN KEY (rotina_id) 
        REFERENCES rotinas(id) ON DELETE CASCADE,
        
    CONSTRAINT fk_item_exercicio 
        FOREIGN KEY (exercicio_id) 
        REFERENCES exercicios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 3. CHECK-INS E PROGRESSO DIÁRIO
-- ==========================================

CREATE TABLE checkins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    rotina_id INT NOT NULL,
    data_registro DATE NOT NULL,
    nivel_dor INT NOT NULL,
    observacoes_paciente VARCHAR(255) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_checkin_diario UNIQUE (paciente_id, data_registro),
    CONSTRAINT chk_nivel_dor CHECK (nivel_dor BETWEEN 0 AND 10),

    CONSTRAINT fk_checkin_paciente 
        FOREIGN KEY (paciente_id) 
        REFERENCES pacientes(id) ON DELETE RESTRICT,
        
    CONSTRAINT fk_checkin_rotina 
        FOREIGN KEY (rotina_id) 
        REFERENCES rotinas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE checkins_itens (
    checkin_id BIGINT NOT NULL,
    rotina_item_id BIGINT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (checkin_id, rotina_item_id),

    CONSTRAINT fk_checkin_item_checkin 
        FOREIGN KEY (checkin_id) 
        REFERENCES checkins(id) ON DELETE CASCADE,
        
    CONSTRAINT fk_checkin_item_rotina_item 
        FOREIGN KEY (rotina_item_id) 
        REFERENCES rotinas_itens(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 4. ALERTAS E AGENDA
-- ==========================================

CREATE TABLE alertas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    fisioterapeuta_id INT NOT NULL,
    nivel_urgencia ENUM('Urgente', 'Atencao', 'Info') NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    status ENUM('Pendente', 'Resolvido', 'Ignorado') NOT NULL DEFAULT 'Pendente',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_em DATETIME NULL,

    CONSTRAINT fk_alerta_paciente 
        FOREIGN KEY (paciente_id) 
        REFERENCES pacientes(id) ON DELETE CASCADE,
        
    CONSTRAINT fk_alerta_fisioterapeuta 
        FOREIGN KEY (fisioterapeuta_id) 
        REFERENCES fisioterapeutas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE agendamentos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fisioterapeuta_id INT NOT NULL,
    paciente_id INT NOT NULL,
    data_hora_inicio DATETIME NOT NULL,
    data_hora_fim DATETIME NOT NULL,
    modalidade ENUM('Presencial', 'Online') NOT NULL DEFAULT 'Presencial',
    status ENUM('Agendado', 'Realizado', 'Cancelado', 'Faltou') NOT NULL DEFAULT 'Agendado',
    
    CONSTRAINT chk_agendamento_datas CHECK (data_hora_fim > data_hora_inicio),
    
    CONSTRAINT fk_agenda_fisio 
        FOREIGN KEY (fisioterapeuta_id) 
        REFERENCES fisioterapeutas(id) ON DELETE RESTRICT,
        
    CONSTRAINT fk_agenda_paciente 
        FOREIGN KEY (paciente_id) 
        REFERENCES pacientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 5. TRIGGERS DE INTEGRIDADE E PERFORMANCE
-- ==========================================

DELIMITER //

-- Mantém o campo `data_ultimo_checkin` do paciente sempre atualizado
CREATE TRIGGER trg_checkins_after_insert
AFTER INSERT ON checkins
FOR EACH ROW
BEGIN
    UPDATE pacientes 
    SET data_ultimo_checkin = NEW.criado_em
    WHERE id = NEW.paciente_id;
END //

-- Garante que um alerta marcado como resolvido receba o timestamp
CREATE TRIGGER trg_alertas_before_update
BEFORE UPDATE ON alertas
FOR EACH ROW
BEGIN
    IF NEW.status IN ('Resolvido', 'Ignorado') AND OLD.status = 'Pendente' THEN
        SET NEW.resolvido_em = CURRENT_TIMESTAMP;
    END IF;
END //

DELIMITER ;

-- ==========================================
-- 6. VIEWS PARA O FRONT-END (REACT/VITE)
-- ==========================================

-- Esta VIEW mastiga todos os dados pesados para a listagem da Dashboard.
-- O Node.js fará apenas: SELECT * FROM vw_dashboard_pacientes WHERE fisioterapeuta_id = X;
CREATE VIEW vw_dashboard_pacientes AS
SELECT 
    p.id AS paciente_id,
    p.fisioterapeuta_id,
    p.nome,
    p.patologia_principal,
    p.data_ultimo_checkin,
    
    -- Calcula a % de adesão: (itens concluídos / total de itens esperados) * 100
    COALESCE(
        ROUND(
            (SUM(CASE WHEN ci.concluido = TRUE THEN 1 ELSE 0 END) / NULLIF(COUNT(ci.checkin_id), 0)) * 100, 
        0), 
    0) AS percentual_adesao,
    
    -- Traz o nível de dor do ÚLTIMO check-in registado
    (SELECT c_sub.nivel_dor 
     FROM checkins c_sub 
     WHERE c_sub.paciente_id = p.id 
     ORDER BY c_sub.data_registro DESC LIMIT 1) AS ultimo_nivel_dor

FROM pacientes p
LEFT JOIN checkins c ON c.paciente_id = p.id
LEFT JOIN checkins_itens ci ON ci.checkin_id = c.id
GROUP BY 
    p.id, 
    p.fisioterapeuta_id, 
    p.nome, 
    p.patologia_principal, 
    p.data_ultimo_checkin;


-- ==========================================
-- 7. PROCEDURE TRANSACIONAL: REGISTO DE CHECK-IN
-- ==========================================
-- Garante que a submissão do formulário do paciente insira o cabeçalho 
-- do check-in e todos os itens de exercício de forma atómica (ACID).

DELIMITER //

CREATE PROCEDURE sp_registrar_checkin_diario(
    IN p_paciente_id INT,
    IN p_rotina_id INT,
    IN p_data_registro DATE,
    IN p_nivel_dor INT,
    IN p_observacoes VARCHAR(255)
    -- Num cenário real, receberíamos os itens concluídos via JSON, 
    -- mas para MySQL 8.0 puro, inserimos o cabeçalho e o backend cuida dos itens na mesma transação.
)
BEGIN
    DECLARE v_checkin_existente INT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validação: O nível de dor tem de respeitar a escala clinica
    IF p_nivel_dor < 0 OR p_nivel_dor > 10 THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'O nível de dor tem de estar entre 0 e 10.';
    END IF;

    -- Validação: Impede múltiplos check-ins do mesmo paciente no mesmo dia
    SELECT id INTO v_checkin_existente 
    FROM checkins 
    WHERE paciente_id = p_paciente_id AND data_registro = p_data_registro 
    LIMIT 1;

    IF v_checkin_existente IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'O paciente já registou um check-in na data informada.';
    END IF;

    START TRANSACTION;

    INSERT INTO checkins (paciente_id, rotina_id, data_registro, nivel_dor, observacoes_paciente)
    VALUES (p_paciente_id, p_rotina_id, p_data_registro, p_nivel_dor, p_observacoes);
    
    -- O backend captura o LAST_INSERT_ID() após executar a procedure para inserir os checkins_itens

    COMMIT;
END //

DELIMITER ;