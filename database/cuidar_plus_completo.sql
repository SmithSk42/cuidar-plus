-- ============================================================================
-- CUIDAR+ | ESQUEMA CONSOLIDADO PARA DESENVOLVIMENTO
-- MySQL 8.0.16+ | 05/11/2026
-- CUIDADO: DROP DATABASE APAGA TODAS AS CONTAS, DADOS E CONVITES ANTERIORES.
-- NUNCA EXECUTAR SOBRE DADOS REAIS / PRODUCAO.
-- Teste de ponta a ponta exige atualizar backend para novos modulos.
-- Tabelas antigas preservadas nos nomes/campos usados pela API primeiro-fluxo.
-- Sem prescricao automatica, diagnostico ou monitoramento emergencial 24/7.
-- ============================================================================

-- =================================================================================
-- PROJETO: CUIDAR+ (SaaS de Acompanhamento Fisioterapêutico)
-- SGBD: MySQL 8.0.16 ou superior (CHECK e regras de integridade estritas)
-- =================================================================================

-- ATENCAO: EXECUTAR APENAS EM AMBIENTE DE DESENVOLVIMENTO.
-- DROP DATABASE APAGA TODOS OS DADOS E USUARIOS ANTERIORES.
DROP DATABASE IF EXISTS cuidar_plus;

CREATE DATABASE cuidar_plus
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
    perfil ENUM('Fisioterapeuta') NOT NULL DEFAULT 'Fisioterapeuta',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fisioterapeuta_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    nome_preferido VARCHAR(100) NULL,
    medico_acompanhante VARCHAR(150) NULL,
    objetivo_geral VARCHAR(500) NULL,
    email VARCHAR(150) UNIQUE NULL,
    telefone VARCHAR(20),
    patologia_principal VARCHAR(100) NOT NULL,
    
    -- Contacto de emergência para o botão "Contatar Família"
    nome_familiar VARCHAR(100),
    telefone_familiar VARCHAR(20),
    
    -- Campo desnormalizado para performance na Dashboard (Atualizado via Trigger)
    data_ultimo_checkin DATETIME NULL,
    
    status ENUM('Ativo', 'Inativo', 'Alta') NOT NULL DEFAULT 'Ativo',
    observacoes_cadastro VARCHAR(500) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_paciente_profissional UNIQUE (fisioterapeuta_id, id),
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
    dias_semana SET('Seg','Ter','Qua','Qui','Sex','Sab','Dom') NULL COMMENT 'NULL = todos os dias; na API atual, rotinas sao diarias',
    CONSTRAINT uk_rotina_id_paciente UNIQUE (id, paciente_id),
    CONSTRAINT chk_rotina_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    
    CONSTRAINT fk_rotina_paciente 
        FOREIGN KEY (paciente_id) 
        REFERENCES pacientes(id) ON DELETE RESTRICT,
        
    CONSTRAINT fk_rotina_fisioterapeuta 
        FOREIGN KEY (fisioterapeuta_id) 
        REFERENCES fisioterapeutas(id) ON DELETE RESTRICT,

    CONSTRAINT fk_rotina_profissional_paciente
        FOREIGN KEY (fisioterapeuta_id, paciente_id)
        REFERENCES pacientes(fisioterapeuta_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE rotinas_itens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rotina_id INT NOT NULL,
    exercicio_id INT NOT NULL,
    series INT NOT NULL DEFAULT 1 CHECK (series > 0),
    repeticoes INT NOT NULL DEFAULT 1 CHECK (repeticoes > 0),
    observacoes VARCHAR(150) NULL,
    dias_semana SET('Seg','Ter','Qua','Qui','Sex','Sab','Dom') NULL COMMENT 'NULL = todos os dias',
    
    CONSTRAINT uk_rotina_exercicio UNIQUE (rotina_id, exercicio_id),
    CONSTRAINT uk_item_id_rotina UNIQUE (id, rotina_id),
    
    CONSTRAINT fk_item_rotina 
        FOREIGN KEY (rotina_id) 
        REFERENCES rotinas(id) ON DELETE CASCADE,
        
    CONSTRAINT fk_item_exercicio 
        FOREIGN KEY (exercicio_id) 
        REFERENCES exercicios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 3. ACESSO DOMICILIAR, CONVITES E CHECK-INS
-- ==========================================
CREATE TABLE usuarios_domiciliares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE vinculos_cuidado (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    paciente_id INT NOT NULL,
    papel ENUM('Paciente','Cuidador') NOT NULL,
    status ENUM('Ativo','Revogado') NOT NULL DEFAULT 'Ativo',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revogado_em DATETIME NULL,
    pode_registrar BOOLEAN NOT NULL DEFAULT TRUE,
    pode_ver_medicamentos BOOLEAN NOT NULL DEFAULT TRUE,
    pode_ver_evolucao BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_vinculo_usuario_paciente UNIQUE (usuario_id, paciente_id),
    CONSTRAINT fk_vinculo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios_domiciliares(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vinculo_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
    INDEX idx_vinculo_paciente (paciente_id, status)
) ENGINE=InnoDB;

CREATE TABLE convites_cuidado (
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
    CONSTRAINT fk_convite_profissional_paciente FOREIGN KEY (fisioterapeuta_id,paciente_id)
      REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
    INDEX idx_convite_paciente (paciente_id, criado_em)
) ENGINE=InnoDB;

CREATE TABLE checkins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    rotina_id INT NOT NULL,
    registrado_por_usuario_id INT NULL,
    origem_registro ENUM('Aplicativo','Profissional','Telefone','Papel','WhatsApp') NOT NULL DEFAULT 'Aplicativo',
    data_registro DATE NOT NULL,
    nivel_dor INT NOT NULL,
    observacoes_paciente VARCHAR(255) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    relatado_em DATETIME NULL,
    chave_requisicao CHAR(36) NULL,
    CONSTRAINT uk_checkin_chave UNIQUE (registrado_por_usuario_id, chave_requisicao),
    -- Cada rotina admite somente um check-in por dia para o mesmo paciente.
    CONSTRAINT uk_checkin_rotina_dia UNIQUE (paciente_id, rotina_id, data_registro),
    CONSTRAINT uk_checkin_id_rotina UNIQUE (id, rotina_id),
    CONSTRAINT chk_nivel_dor CHECK (nivel_dor BETWEEN 0 AND 10),
    CONSTRAINT fk_checkin_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_rotina FOREIGN KEY (rotina_id) REFERENCES rotinas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_rotina_do_paciente FOREIGN KEY (rotina_id, paciente_id)
      REFERENCES rotinas(id, paciente_id) ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_usuario FOREIGN KEY (registrado_por_usuario_id)
      REFERENCES usuarios_domiciliares(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE checkins_itens (
    checkin_id BIGINT NOT NULL,
    rotina_item_id BIGINT NOT NULL,
    rotina_id INT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_nao_realizacao VARCHAR(150) NULL,
    PRIMARY KEY (checkin_id, rotina_item_id),
    CONSTRAINT fk_checkin_item_checkin FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_item_rotina_item FOREIGN KEY (rotina_item_id) REFERENCES rotinas_itens(id) ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_item_mesma_rotina FOREIGN KEY (checkin_id, rotina_id)
      REFERENCES checkins(id, rotina_id) ON DELETE CASCADE,
    CONSTRAINT fk_exercicio_item_mesma_rotina FOREIGN KEY (rotina_item_id, rotina_id)
      REFERENCES rotinas_itens(id, rotina_id) ON DELETE RESTRICT
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
    visto_em DATETIME NULL,
    comentario_resolucao VARCHAR(500) NULL,
    CONSTRAINT fk_alerta_paciente 
        FOREIGN KEY (paciente_id) 
        REFERENCES pacientes(id) ON DELETE CASCADE,
        
    CONSTRAINT fk_alerta_fisioterapeuta 
        FOREIGN KEY (fisioterapeuta_id) 
        REFERENCES fisioterapeutas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_alerta_profissional_paciente
        FOREIGN KEY (fisioterapeuta_id,paciente_id)
        REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT
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
        REFERENCES pacientes(id) ON DELETE CASCADE,
    CONSTRAINT fk_agenda_profissional_paciente
        FOREIGN KEY (fisioterapeuta_id,paciente_id)
        REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB;



-- ============================================================================
-- 5. MODULOS DO ESCOPO ORIGINAL QUE FALTAVAM NA IMPLEMENTACAO
-- ============================================================================

-- Objetivos clinicos funcionais: NAO substituem prontuario oficial.
CREATE TABLE metas_funcionais (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 fisioterapeuta_id INT NOT NULL,
 descricao VARCHAR(500) NOT NULL,
 prazo ENUM('Curto','Medio','Longo') NOT NULL,
 data_inicio DATE NOT NULL,
 data_prevista DATE NULL,
 status ENUM('Em_Andamento','Alcancada','Cancelada') NOT NULL DEFAULT 'Em_Andamento',
 observacoes VARCHAR(500) NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CHECK(data_prevista IS NULL OR data_prevista>=data_inicio),
 FOREIGN KEY (fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
 INDEX idx_metas_paciente (paciente_id,status)
) ENGINE=InnoDB;

CREATE TABLE evolucoes_metas (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 meta_id BIGINT NOT NULL,
 fisioterapeuta_id INT NOT NULL,
 data_avaliacao DATE NOT NULL,
 descricao VARCHAR(1000) NOT NULL,
 nivel_progresso TINYINT UNSIGNED NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (nivel_progresso IS NULL OR nivel_progresso<=100),
 FOREIGN KEY (meta_id) REFERENCES metas_funcionais(id) ON DELETE RESTRICT,
 FOREIGN KEY (fisioterapeuta_id) REFERENCES fisioterapeutas(id) ON DELETE RESTRICT,
 INDEX idx_evolucoes_meta (meta_id,data_avaliacao)
) ENGINE=InnoDB;

-- Informacoes clinicas de uso restrito; API deve checar profissional autorizado.
-- Nao sao enviadas ao portal domiciliar nem a mensagens WhatsApp.
CREATE TABLE anotacoes_restritas (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 fisioterapeuta_id INT NOT NULL,
 categoria ENUM('Clinica','Psicologica','Intima','Outras') NOT NULL,
 conteudo TEXT NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 INDEX idx_anotacoes_paciente (paciente_id,criado_em)
) ENGINE=InnoDB;

-- Dados de medicamentos apenas para acompanhamento de prescricoes existentes.
-- NAO representa prescricao emitida pelo Cuidar+.
CREATE TABLE medicamentos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(150) NOT NULL,
 apresentacao VARCHAR(120) NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_medicamento_nome_apresentacao (nome,apresentacao)
) ENGINE=InnoDB;

CREATE TABLE medicamentos_pacientes (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 medicamento_id INT NOT NULL,
 registrado_por_fisioterapeuta_id INT NOT NULL,
 prescritor_nome VARCHAR(150) NOT NULL,
 referencia_prescricao VARCHAR(200) NULL,
 orientacao_prescrita VARCHAR(500) NOT NULL,
 dose_informada VARCHAR(100) NOT NULL,
 via_administracao VARCHAR(80) NOT NULL,
 frequencia_texto VARCHAR(120) NOT NULL,
 data_inicio DATE NOT NULL,
 data_fim DATE NULL,
 status ENUM('Ativo','Encerrado','Suspenso') NOT NULL DEFAULT 'Ativo',
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_medicamento_paciente_id (id,paciente_id),
 CHECK(data_fim IS NULL OR data_fim>=data_inicio),
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
 FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE RESTRICT,
 FOREIGN KEY (registrado_por_fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 INDEX idx_prescricoes_paciente (paciente_id,status)
) ENGINE=InnoDB;

CREATE TABLE horarios_medicamentos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 medicamento_paciente_id BIGINT NOT NULL,
 horario TIME NOT NULL,
 dias_semana SET('Seg','Ter','Qua','Qui','Sex','Sab','Dom') NULL COMMENT 'NULL = diariamente',
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE KEY uk_horario_por_prescricao (medicamento_paciente_id,horario),
 UNIQUE KEY uk_horario_id_prescricao (id,medicamento_paciente_id),
 FOREIGN KEY (medicamento_paciente_id) REFERENCES medicamentos_pacientes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Vincula medicamentos ja prescritos a rotinas de acompanhamento, sem prescrever tratamentos.
CREATE TABLE rotinas_medicamentos (
 rotina_id INT NOT NULL,
 medicamento_paciente_id BIGINT NOT NULL,
 PRIMARY KEY(rotina_id, medicamento_paciente_id),
 FOREIGN KEY(rotina_id) REFERENCES rotinas(id) ON DELETE RESTRICT,
 FOREIGN KEY(medicamento_paciente_id) REFERENCES medicamentos_pacientes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Um status por horario/data. Sem resposta e diferente de nao administrado.
CREATE TABLE registros_medicamentos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 horario_id BIGINT NOT NULL,
 medicamento_paciente_id BIGINT NOT NULL,
 paciente_id INT NOT NULL,
 data_programada DATE NOT NULL,
 horario_programado TIME NOT NULL,
 situacao ENUM('Administrado','Nao_Administrado','Adiado') NOT NULL,
 data_hora_real DATETIME NULL,
 usuario_domiciliar_id INT NULL,
 fisioterapeuta_id INT NULL,
 origem_registro ENUM('Aplicativo','Profissional','Telefone','Papel','WhatsApp') NOT NULL DEFAULT 'Aplicativo',
 observacoes VARCHAR(500) NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_registro_horario_data (horario_id,data_programada),
 CHECK ((situacao <> 'Administrado') OR data_hora_real IS NOT NULL),
 FOREIGN KEY (horario_id,medicamento_paciente_id) REFERENCES horarios_medicamentos(id,medicamento_paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (medicamento_paciente_id,paciente_id) REFERENCES medicamentos_pacientes(id,paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (usuario_domiciliar_id,paciente_id) REFERENCES vinculos_cuidado(usuario_id,paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 INDEX idx_registros_medicamento_paciente (paciente_id,data_programada)
) ENGINE=InnoDB;

-- Intercorrencias reportadas em casa; classificacao e encaminhamento humano.
CREATE TABLE ocorrencias (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 usuario_domiciliar_id INT NULL,
 fisioterapeuta_id INT NULL,
 tipo ENUM('Queda','Febre','Dor','Sintoma_Atipico','Outro') NOT NULL,
 descricao VARCHAR(1000) NOT NULL,
 ocorrido_em DATETIME NOT NULL,
 origem_registro ENUM('Aplicativo','Profissional','Telefone','Papel','WhatsApp') NOT NULL DEFAULT 'Aplicativo',
 status ENUM('Novo','Em_Analise','Encerrado') NOT NULL DEFAULT 'Novo',
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(usuario_domiciliar_id IS NOT NULL OR fisioterapeuta_id IS NOT NULL),
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
 FOREIGN KEY (usuario_domiciliar_id,paciente_id) REFERENCES vinculos_cuidado(usuario_id,paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 INDEX idx_ocorrencias_paciente (paciente_id,ocorrido_em),
 INDEX idx_ocorrencias_status (status,criado_em)
) ENGINE=InnoDB;

-- Ligacao opcional do alerta ao relato; nao apaga historico.
ALTER TABLE alertas
 ADD COLUMN ocorrencia_id BIGINT NULL,
 ADD CONSTRAINT fk_alerta_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE RESTRICT;

-- Caixa interna. Envio externo (WhatsApp/push) depende de servico separado.
CREATE TABLE notificacoes (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 fisioterapeuta_id INT NULL,
 usuario_domiciliar_id INT NULL,
 alerta_id BIGINT NULL,
 titulo VARCHAR(150) NOT NULL,
 mensagem VARCHAR(500) NOT NULL,
 categoria ENUM('Lembrete','Alerta','Informacao') NOT NULL DEFAULT 'Informacao',
 lida_em DATETIME NULL,
 criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ((fisioterapeuta_id IS NOT NULL) <> (usuario_domiciliar_id IS NOT NULL)),
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
 FOREIGN KEY (fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 FOREIGN KEY (usuario_domiciliar_id,paciente_id) REFERENCES vinculos_cuidado(usuario_id,paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (alerta_id) REFERENCES alertas(id) ON DELETE RESTRICT,
 INDEX idx_notificacao_profissional (fisioterapeuta_id,lida_em,criada_em),
 INDEX idx_notificacao_domiciliar (usuario_domiciliar_id,lida_em,criada_em)
) ENGINE=InnoDB;

CREATE TABLE tentativas_entrega (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 notificacao_id BIGINT NOT NULL,
 canal ENUM('PWA','WhatsApp','Email') NOT NULL,
 situacao ENUM('Pendente','Enviada','Falhou','Confirmada') NOT NULL DEFAULT 'Pendente',
 referencia_externa VARCHAR(200) NULL,
 detalhe_erro VARCHAR(500) NULL,
 tentada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (notificacao_id) REFERENCES notificacoes(id) ON DELETE RESTRICT,
 INDEX idx_entrega_notificacao (notificacao_id,tentada_em)
) ENGINE=InnoDB;

-- Historico administrativo (sem armazenar tokens, senhas ou texto clinico nos logs).
CREATE TABLE auditoria_acessos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 tipo_ator ENUM('Fisioterapeuta','Domiciliar','Sistema') NOT NULL,
 ator_id INT NULL,
 paciente_id INT NULL,
 acao VARCHAR(80) NOT NULL,
 recurso VARCHAR(80) NOT NULL,
 recurso_id VARCHAR(64) NULL,
 ocorrido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
 INDEX idx_auditoria_paciente (paciente_id,ocorrido_em),
 INDEX idx_auditoria_ator (tipo_ator,ator_id,ocorrido_em)
) ENGINE=InnoDB;

-- Relato domiciliar de suporte: pode ser registrado por texto, audio (URL privada)
-- ou via atendimento telefonico. O armazenamento do audio precisa de autorizacao.
CREATE TABLE relatos_domiciliares (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 usuario_domiciliar_id INT NULL,
 fisioterapeuta_id INT NULL,
 formato ENUM('Texto','Audio','Transcricao') NOT NULL DEFAULT 'Texto',
 texto TEXT NULL,
 caminho_audio VARCHAR(500) NULL,
 origem ENUM('Aplicativo','Telefone','Papel','WhatsApp','Profissional') NOT NULL DEFAULT 'Aplicativo',
 relato_em DATETIME NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (texto IS NOT NULL OR caminho_audio IS NOT NULL),
 CHECK (usuario_domiciliar_id IS NOT NULL OR fisioterapeuta_id IS NOT NULL),
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
 FOREIGN KEY (usuario_domiciliar_id,paciente_id) REFERENCES vinculos_cuidado(usuario_id,paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 INDEX idx_relatos_paciente (paciente_id,relato_em)
) ENGINE=InnoDB;

-- Registro do consentimento/autorizacao do responsavel pelo paciente.
CREATE TABLE autorizacoes_acesso (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 paciente_id INT NOT NULL,
 usuario_domiciliar_id INT NOT NULL,
 registrado_por_fisioterapeuta_id INT NOT NULL,
 concedente_nome VARCHAR(150) NOT NULL,
 fundamento VARCHAR(500) NOT NULL,
 concedida_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revogada_em DATETIME NULL,
 FOREIGN KEY (usuario_domiciliar_id,paciente_id) REFERENCES vinculos_cuidado(usuario_id,paciente_id) ON DELETE RESTRICT,
 FOREIGN KEY (registrado_por_fisioterapeuta_id,paciente_id) REFERENCES pacientes(fisioterapeuta_id,id) ON DELETE RESTRICT,
 INDEX idx_autorizacoes_paciente (paciente_id,concedida_em)
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
    SET data_ultimo_checkin = GREATEST(COALESCE(data_ultimo_checkin, NEW.criado_em), NEW.criado_em)
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
SELECT p.id AS paciente_id, p.fisioterapeuta_id, p.nome, p.patologia_principal,
  p.data_ultimo_checkin,
  CASE WHEN totais.total_itens = 0 THEN NULL
       ELSE ROUND(100 * totais.concluidos / totais.total_itens, 1) END AS percentual_adesao,
  (SELECT c_sub.nivel_dor FROM checkins c_sub
    WHERE c_sub.paciente_id = p.id ORDER BY c_sub.data_registro DESC, c_sub.id DESC LIMIT 1) AS ultimo_nivel_dor
FROM pacientes p
LEFT JOIN (
  SELECT c.paciente_id, COUNT(ci.rotina_item_id) AS total_itens,
    SUM(CASE WHEN ci.concluido=TRUE THEN 1 ELSE 0 END) AS concluidos
  FROM checkins c JOIN checkins_itens ci ON ci.checkin_id=c.id
  GROUP BY c.paciente_id
) totais ON totais.paciente_id=p.id;


-- A API registra checkins e checkins_itens na MESMA transacao (backend/src/rotas/cuidado.js).
-- A antiga procedure foi removida: ela confirmava apenas o cabecalho e nao garantia atomicidade dos itens.




-- Indicadores de confirmacoes de medicamentos. Ausencia de registro nao e negativa.
CREATE VIEW vw_resumo_medicamentos AS
SELECT mp.paciente_id, COUNT(rm.id) AS registros_informados,
 COALESCE(SUM(rm.situacao='Administrado'),0) AS administrados,
 COALESCE(SUM(rm.situacao='Nao_Administrado'),0) AS nao_administrados
FROM medicamentos_pacientes mp
LEFT JOIN registros_medicamentos rm ON rm.medicamento_paciente_id=mp.id
GROUP BY mp.paciente_id;

-- Cada item confirmado deve estar na mesma rotina do checkin; duas FKs compostas garantem.
-- Percentuais da view antiga consideram somente itens de check-ins enviados;
-- para adesao completa, gerar agenda prevista no backend, inclusive dias sem resposta.

-- ==========================================
-- DADOS FICTICIOS DE TESTE
-- ==========================================
START TRANSACTION;

-- 1. Fisioterapeutas. A coluna perfil (quando existir) usa seu DEFAULT.
INSERT INTO fisioterapeutas (nome, crefito, email, senha_hash, ativo)
SELECT 'Ana Costa', 'TESTE-FISIO-101', 'ana.teste@cuidarplus.com',
       '$2b$12$O5vu7Q5G9Zui8JN5BpRMsOmNeh6dATuKrox4xTkvk82C6R6sC8Rcq', TRUE
WHERE NOT EXISTS (SELECT 1 FROM fisioterapeutas WHERE email = 'ana.teste@cuidarplus.com');
INSERT INTO fisioterapeutas (nome, crefito, email, senha_hash, ativo)
SELECT 'Bruno Almeida', 'TESTE-FISIO-102', 'bruno.teste@cuidarplus.com',
       '$2b$12$6uBIHm2cLdSaF1TX4Ba8NOkEoPFMrbjk3LKVTrVb4mHG/ZLm3QVCq', TRUE
WHERE NOT EXISTS (SELECT 1 FROM fisioterapeutas WHERE email = 'bruno.teste@cuidarplus.com');
SET @fisio_ana = (SELECT id FROM fisioterapeutas WHERE email = 'ana.teste@cuidarplus.com');
SET @fisio_bruno = (SELECT id FROM fisioterapeutas WHERE email = 'bruno.teste@cuidarplus.com');

-- 2. Pacientes (com contatos ficticios).
INSERT INTO pacientes (fisioterapeuta_id, nome, data_nascimento, email, telefone, patologia_principal, nome_familiar, telefone_familiar, status)
SELECT @fisio_ana, 'Maria Helena Silva', '1987-04-13', 'maria.teste@example.com', '77990000001', 'Reabilitacao de joelho', 'Paulo Silva', '77990000011', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email='maria.teste@example.com');
INSERT INTO pacientes (fisioterapeuta_id, nome, data_nascimento, email, telefone, patologia_principal, nome_familiar, telefone_familiar, status)
SELECT @fisio_ana, 'Carlos Eduardo Braga', '1979-08-20', 'carlos.teste@example.com', '77990000002', 'Lombalgia', 'Renata Braga', '77990000012', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email='carlos.teste@example.com');
INSERT INTO pacientes (fisioterapeuta_id, nome, data_nascimento, email, telefone, patologia_principal, nome_familiar, telefone_familiar, status)
SELECT @fisio_ana, 'Juliana Vasconcelos', '1992-11-05', 'juliana.teste@example.com', '77990000003', 'Cervicalgia', 'Lucas Vasconcelos', '77990000013', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email='juliana.teste@example.com');
INSERT INTO pacientes (fisioterapeuta_id, nome, data_nascimento, email, telefone, patologia_principal, nome_familiar, telefone_familiar, status)
SELECT @fisio_bruno, 'Roberto Albuquerque', '1966-03-10', 'roberto.teste@example.com', '77990000004', 'Mobilidade de tornozelo', 'Clara Albuquerque', '77990000014', 'Ativo'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email='roberto.teste@example.com');
SET @maria = (SELECT id FROM pacientes WHERE email='maria.teste@example.com');
SET @carlos = (SELECT id FROM pacientes WHERE email='carlos.teste@example.com');
SET @juliana = (SELECT id FROM pacientes WHERE email='juliana.teste@example.com');
SET @roberto = (SELECT id FROM pacientes WHERE email='roberto.teste@example.com');

-- 3. Catalogo de exercicios.
INSERT INTO exercicios (nome, descricao, categoria)
SELECT 'TESTE - Alongamento cervical', 'Movimentos leves e controlados, conforme orientacao profissional.', 'Alongamento'
WHERE NOT EXISTS (SELECT 1 FROM exercicios WHERE nome='TESTE - Alongamento cervical');
INSERT INTO exercicios (nome, descricao, categoria)
SELECT 'TESTE - Ponte de quadril', 'Elevacao controlada do quadril, conforme prescricao.', 'Fortalecimento'
WHERE NOT EXISTS (SELECT 1 FROM exercicios WHERE nome='TESTE - Ponte de quadril');
INSERT INTO exercicios (nome, descricao, categoria)
SELECT 'TESTE - Mobilidade de tornozelo', 'Movimentos controlados de flexao e extensao.', 'Mobilidade'
WHERE NOT EXISTS (SELECT 1 FROM exercicios WHERE nome='TESTE - Mobilidade de tornozelo');
INSERT INTO exercicios (nome, descricao, categoria)
SELECT 'TESTE - Respiracao diafragmatica', 'Exercicio respiratorio orientado por fisioterapeuta.', 'Respiratorio'
WHERE NOT EXISTS (SELECT 1 FROM exercicios WHERE nome='TESTE - Respiracao diafragmatica');
INSERT INTO exercicios (nome, descricao, categoria)
SELECT 'TESTE - Extensao de joelho', 'Extensao suave do joelho conforme plano individual.', 'Fortalecimento'
WHERE NOT EXISTS (SELECT 1 FROM exercicios WHERE nome='TESTE - Extensao de joelho');
SET @ex_joelho = (SELECT id FROM exercicios WHERE nome='TESTE - Extensao de joelho');
SET @ex_ponte = (SELECT id FROM exercicios WHERE nome='TESTE - Ponte de quadril');
SET @ex_cervical = (SELECT id FROM exercicios WHERE nome='TESTE - Alongamento cervical');
SET @ex_respiracao = (SELECT id FROM exercicios WHERE nome='TESTE - Respiracao diafragmatica');
SET @ex_tornozelo = (SELECT id FROM exercicios WHERE nome='TESTE - Mobilidade de tornozelo');

-- 4. Rotinas: vinculadas aos mesmos fisioterapeutas dos pacientes.
INSERT INTO rotinas (paciente_id, fisioterapeuta_id, titulo, data_inicio, data_fim, status)
SELECT @maria, @fisio_ana, 'TESTE - Reabilitacao do joelho', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'Ativa'
WHERE NOT EXISTS (SELECT 1 FROM rotinas WHERE paciente_id=@maria AND titulo='TESTE - Reabilitacao do joelho');
INSERT INTO rotinas (paciente_id, fisioterapeuta_id, titulo, data_inicio, data_fim, status)
SELECT @carlos, @fisio_ana, 'TESTE - Mobilidade lombar', DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'Ativa'
WHERE NOT EXISTS (SELECT 1 FROM rotinas WHERE paciente_id=@carlos AND titulo='TESTE - Mobilidade lombar');
INSERT INTO rotinas (paciente_id, fisioterapeuta_id, titulo, data_inicio, data_fim, status)
SELECT @juliana, @fisio_ana, 'TESTE - Alongamentos cervicais', DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Ativa'
WHERE NOT EXISTS (SELECT 1 FROM rotinas WHERE paciente_id=@juliana AND titulo='TESTE - Alongamentos cervicais');
INSERT INTO rotinas (paciente_id, fisioterapeuta_id, titulo, data_inicio, data_fim, status)
SELECT @roberto, @fisio_bruno, 'TESTE - Tornozelo', DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 21 DAY), 'Ativa'
WHERE NOT EXISTS (SELECT 1 FROM rotinas WHERE paciente_id=@roberto AND titulo='TESTE - Tornozelo');
SET @rot_maria = (SELECT id FROM rotinas WHERE paciente_id=@maria AND titulo='TESTE - Reabilitacao do joelho' LIMIT 1);
SET @rot_carlos = (SELECT id FROM rotinas WHERE paciente_id=@carlos AND titulo='TESTE - Mobilidade lombar' LIMIT 1);
SET @rot_juliana = (SELECT id FROM rotinas WHERE paciente_id=@juliana AND titulo='TESTE - Alongamentos cervicais' LIMIT 1);
SET @rot_roberto = (SELECT id FROM rotinas WHERE paciente_id=@roberto AND titulo='TESTE - Tornozelo' LIMIT 1);

-- 5. Itens de rotina; INSERT IGNORE respeita a UNIQUE (rotina_id, exercicio_id).
INSERT IGNORE INTO rotinas_itens (rotina_id, exercicio_id, series, repeticoes, observacoes) VALUES
(@rot_maria, @ex_joelho, 3, 12, 'Sem forcar amplitudes'),
(@rot_maria, @ex_ponte, 3, 10, 'Movimento lento'),
(@rot_carlos, @ex_ponte, 2, 10, 'Conforme tolerancia'),
(@rot_carlos, @ex_respiracao, 2, 8, NULL),
(@rot_juliana, @ex_cervical, 2, 8, 'Interromper caso haja desconforto'),
(@rot_juliana, @ex_respiracao, 2, 10, NULL),
(@rot_roberto, @ex_tornozelo, 3, 12, NULL);

-- 6. Check-ins: um por PACIENTE, ROTINA E DIA.
INSERT INTO checkins (paciente_id, rotina_id, data_registro, nivel_dor, observacoes_paciente)
SELECT @maria, @rot_maria, CURDATE(), 2, 'Realizei os exercicios sem dificuldades.'
WHERE NOT EXISTS (SELECT 1 FROM checkins WHERE paciente_id=@maria AND data_registro=CURDATE());
INSERT INTO checkins (paciente_id, rotina_id, data_registro, nivel_dor, observacoes_paciente)
SELECT @maria, @rot_maria, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 3, 'Melhora gradual.'
WHERE NOT EXISTS (SELECT 1 FROM checkins WHERE paciente_id=@maria AND data_registro=DATE_SUB(CURDATE(), INTERVAL 1 DAY));
INSERT INTO checkins (paciente_id, rotina_id, data_registro, nivel_dor, observacoes_paciente)
SELECT @carlos, @rot_carlos, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 6, 'Desconforto ao realizar movimentos.'
WHERE NOT EXISTS (SELECT 1 FROM checkins WHERE paciente_id=@carlos AND data_registro=DATE_SUB(CURDATE(), INTERVAL 4 DAY));
INSERT INTO checkins (paciente_id, rotina_id, data_registro, nivel_dor, observacoes_paciente)
SELECT @juliana, @rot_juliana, CURDATE(), 9, 'Dor intensa hoje. Solicito avaliacao.'
WHERE NOT EXISTS (SELECT 1 FROM checkins WHERE paciente_id=@juliana AND data_registro=CURDATE());
INSERT INTO checkins (paciente_id, rotina_id, data_registro, nivel_dor, observacoes_paciente)
SELECT @roberto, @rot_roberto, CURDATE(), 1, 'Exercicios concluidos.'
WHERE NOT EXISTS (SELECT 1 FROM checkins WHERE paciente_id=@roberto AND data_registro=CURDATE());

SET @chk_maria_hoje = (SELECT id FROM checkins WHERE paciente_id=@maria AND data_registro=CURDATE());
SET @chk_maria_ontem = (SELECT id FROM checkins WHERE paciente_id=@maria AND data_registro=DATE_SUB(CURDATE(), INTERVAL 1 DAY));
SET @chk_carlos = (SELECT id FROM checkins WHERE paciente_id=@carlos AND data_registro=DATE_SUB(CURDATE(), INTERVAL 4 DAY));
SET @chk_juliana = (SELECT id FROM checkins WHERE paciente_id=@juliana AND data_registro=CURDATE());
SET @chk_roberto = (SELECT id FROM checkins WHERE paciente_id=@roberto AND data_registro=CURDATE());

-- 7. Exercicios concluidos em cada check-in; sem vincular itens de outra rotina.
INSERT IGNORE INTO checkins_itens (checkin_id, rotina_item_id, rotina_id, concluido)
SELECT @chk_maria_hoje, id, @rot_maria, TRUE FROM rotinas_itens WHERE rotina_id=@rot_maria;
INSERT IGNORE INTO checkins_itens (checkin_id, rotina_item_id, rotina_id, concluido)
SELECT @chk_maria_ontem, id, @rot_maria, (exercicio_id=@ex_joelho) FROM rotinas_itens WHERE rotina_id=@rot_maria;
INSERT IGNORE INTO checkins_itens (checkin_id, rotina_item_id, rotina_id, concluido)
SELECT @chk_carlos, id, @rot_carlos, (exercicio_id=@ex_respiracao) FROM rotinas_itens WHERE rotina_id=@rot_carlos;
INSERT IGNORE INTO checkins_itens (checkin_id, rotina_item_id, rotina_id, concluido)
SELECT @chk_juliana, id, @rot_juliana, FALSE FROM rotinas_itens WHERE rotina_id=@rot_juliana;
INSERT IGNORE INTO checkins_itens (checkin_id, rotina_item_id, rotina_id, concluido)
SELECT @chk_roberto, id, @rot_roberto, TRUE FROM rotinas_itens WHERE rotina_id=@rot_roberto;

-- 8. Alertas, duplicacao evitada por marcador de teste na descricao.
INSERT INTO alertas (paciente_id, fisioterapeuta_id, nivel_urgencia, descricao, status)
SELECT @juliana, @fisio_ana, 'Urgente', '[TESTE] Dor elevada no check-in (9/10). Avaliar paciente.', 'Pendente'
WHERE NOT EXISTS (SELECT 1 FROM alertas WHERE paciente_id=@juliana AND descricao='[TESTE] Dor elevada no check-in (9/10). Avaliar paciente.');
INSERT INTO alertas (paciente_id, fisioterapeuta_id, nivel_urgencia, descricao, status)
SELECT @carlos, @fisio_ana, 'Atencao', '[TESTE] Ausencia de check-ins recentes. Verificar adesao.', 'Pendente'
WHERE NOT EXISTS (SELECT 1 FROM alertas WHERE paciente_id=@carlos AND descricao='[TESTE] Ausencia de check-ins recentes. Verificar adesao.');
INSERT INTO alertas (paciente_id, fisioterapeuta_id, nivel_urgencia, descricao, status)
SELECT @roberto, @fisio_bruno, 'Info', '[TESTE] Acompanhamento de mobilidade agendado.', 'Pendente'
WHERE NOT EXISTS (SELECT 1 FROM alertas WHERE paciente_id=@roberto AND descricao='[TESTE] Acompanhamento de mobilidade agendado.');

-- 9. Agendamentos de hoje e amanha (horarios ilustrativos).
INSERT INTO agendamentos (fisioterapeuta_id, paciente_id, data_hora_inicio, data_hora_fim, modalidade, status)
SELECT @fisio_ana, @maria, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:45:00'), 'Presencial', 'Agendado'
WHERE NOT EXISTS (SELECT 1 FROM agendamentos WHERE paciente_id=@maria AND data_hora_inicio=TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00'));
INSERT INTO agendamentos (fisioterapeuta_id, paciente_id, data_hora_inicio, data_hora_fim, modalidade, status)
SELECT @fisio_ana, @juliana, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:30:00'), 'Online', 'Agendado'
WHERE NOT EXISTS (SELECT 1 FROM agendamentos WHERE paciente_id=@juliana AND data_hora_inicio=TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'));
INSERT INTO agendamentos (fisioterapeuta_id, paciente_id, data_hora_inicio, data_hora_fim, modalidade, status)
SELECT @fisio_bruno, @roberto, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:45:00'), 'Presencial', 'Agendado'
WHERE NOT EXISTS (SELECT 1 FROM agendamentos WHERE paciente_id=@roberto AND data_hora_inicio=TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00:00'));


-- DADOS FICTICIOS DOS NOVOS MODULOS: sem prescricoes reais.
INSERT INTO metas_funcionais (paciente_id,fisioterapeuta_id,descricao,prazo,data_inicio,data_prevista)
VALUES (@maria,@fisio_ana,'[TESTE] Realizar movimentos funcionais com menor desconforto','Curto',CURDATE(),DATE_ADD(CURDATE(),INTERVAL 30 DAY)),
(@carlos,@fisio_ana,'[TESTE] Aumentar independencia nas atividades diarias','Medio',CURDATE(),DATE_ADD(CURDATE(),INTERVAL 90 DAY));
SET @meta_maria=(SELECT id FROM metas_funcionais WHERE paciente_id=@maria LIMIT 1);
INSERT INTO evolucoes_metas (meta_id,fisioterapeuta_id,data_avaliacao,descricao,nivel_progresso)
VALUES (@meta_maria,@fisio_ana,CURDATE(),'[TESTE] Meta definida; reavaliacao pendente',10);

INSERT INTO medicamentos (nome,apresentacao) VALUES
('[TESTE] Medicamento A','Exemplo didatico'),('[TESTE] Medicamento B','Exemplo didatico');
SET @med_a=(SELECT id FROM medicamentos WHERE nome='[TESTE] Medicamento A');
INSERT INTO medicamentos_pacientes
(paciente_id,medicamento_id,registrado_por_fisioterapeuta_id,prescritor_nome,orientacao_prescrita,dose_informada,via_administracao,frequencia_texto,data_inicio,data_fim)
VALUES (@maria,@med_a,@fisio_ana,'Profissional prescritor ficticio','[TESTE] Orientacao ficticia; nao utilizar para administracao real','[TESTE] Sem dose real','[TESTE] Nao aplicavel','[TESTE] Horarios ilustrativos',CURDATE(),DATE_ADD(CURDATE(),INTERVAL 20 DAY));
SET @mp_a=(SELECT id FROM medicamentos_pacientes WHERE paciente_id=@maria AND medicamento_id=@med_a);
INSERT INTO horarios_medicamentos (medicamento_paciente_id,horario)
VALUES (@mp_a,'09:00:00'),(@mp_a,'20:00:00');
INSERT INTO rotinas_medicamentos (rotina_id,medicamento_paciente_id) SELECT id,@mp_a FROM rotinas WHERE paciente_id=@maria ORDER BY id LIMIT 1;
SET @horario_manha=(SELECT id FROM horarios_medicamentos WHERE medicamento_paciente_id=@mp_a AND horario='09:00:00');
-- Dado de teste apenas de confirmacao ilustrativa; nao representa recomendacao medica.
INSERT INTO registros_medicamentos
(horario_id,medicamento_paciente_id,paciente_id,data_programada,horario_programado,situacao,data_hora_real,origem_registro,observacoes,fisioterapeuta_id)
VALUES (@horario_manha,@mp_a,@maria,CURDATE(),'09:00:00','Administrado',NOW(),'Profissional','[TESTE] Registro informado por telefone',@fisio_ana);

INSERT INTO ocorrencias (paciente_id,fisioterapeuta_id,tipo,descricao,ocorrido_em,origem_registro)
VALUES (@juliana,@fisio_ana,'Dor','[TESTE] Relato de desconforto para analise profissional',NOW(),'Profissional');
SET @ocorrencia_juliana=(SELECT id FROM ocorrencias WHERE paciente_id=@juliana ORDER BY id DESC LIMIT 1);
UPDATE alertas SET ocorrencia_id=@ocorrencia_juliana
WHERE paciente_id=@juliana AND descricao='[TESTE] Dor elevada no check-in (9/10). Avaliar paciente.';
INSERT INTO notificacoes (paciente_id,fisioterapeuta_id,alerta_id,titulo,mensagem,categoria)
SELECT @juliana,@fisio_ana,id,'[TESTE] Novo relato','Existe uma ocorrencia para avaliacao profissional','Alerta'
FROM alertas WHERE paciente_id=@juliana ORDER BY id DESC LIMIT 1;

COMMIT;

-- Conferencia apos a importacao:
SELECT 'fisioterapeutas' AS tabela, COUNT(*) AS total FROM fisioterapeutas
UNION ALL SELECT 'pacientes', COUNT(*) FROM pacientes
UNION ALL SELECT 'exercicios', COUNT(*) FROM exercicios
UNION ALL SELECT 'rotinas', COUNT(*) FROM rotinas
UNION ALL SELECT 'rotinas_itens', COUNT(*) FROM rotinas_itens
UNION ALL SELECT 'checkins', COUNT(*) FROM checkins
UNION ALL SELECT 'checkins_itens', COUNT(*) FROM checkins_itens
UNION ALL SELECT 'alertas', COUNT(*) FROM alertas
UNION ALL SELECT 'agendamentos', COUNT(*) FROM agendamentos;
SELECT * FROM vw_dashboard_pacientes WHERE fisioterapeuta_id = @fisio_ana;

-- Verificacao basica do novo fluxo:
SELECT COUNT(*) AS usuarios_domiciliares FROM usuarios_domiciliares;
SELECT COUNT(*) AS convites_cuidado FROM convites_cuidado;
SELECT COUNT(*) AS vinculos_cuidado FROM vinculos_cuidado;
SELECT COUNT(*) AS checkins_itens FROM checkins_itens;
-- OBS: tabelas de acesso domiciliar estarao vazias ate gerar convites no sistema.

-- QUADRO COMPLEMENTAR DOS NOVOS MODULOS
SELECT 'medicamentos' AS tabela,COUNT(*) AS total FROM medicamentos
UNION ALL SELECT 'medicamentos_pacientes',COUNT(*) FROM medicamentos_pacientes
UNION ALL SELECT 'horarios_medicamentos',COUNT(*) FROM horarios_medicamentos
UNION ALL SELECT 'rotinas_medicamentos',COUNT(*) FROM rotinas_medicamentos
UNION ALL SELECT 'registros_medicamentos',COUNT(*) FROM registros_medicamentos
UNION ALL SELECT 'metas_funcionais',COUNT(*) FROM metas_funcionais
UNION ALL SELECT 'ocorrencias',COUNT(*) FROM ocorrencias
UNION ALL SELECT 'notificacoes',COUNT(*) FROM notificacoes;
