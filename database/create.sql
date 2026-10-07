-- 1. Limpa tabelas caso existam
DROP TABLE IF EXISTS diario_de_cuidados CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS profissionais CASCADE;

-- Habilita a extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Criação das Tabelas
CREATE TABLE profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    crefito VARCHAR(20) UNIQUE NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID REFERENCES profissionais(id) ON DELETE SET NULL,
    nome_paciente VARCHAR(100) NOT NULL,
    data_nascimento_paciente DATE,
    diagnostico_condicao TEXT,
    nome_familiar VARCHAR(100) NOT NULL,
    grau_parentesco VARCHAR(50),
    telefone_familiar VARCHAR(20) NOT NULL,
    email_familiar VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diario_de_cuidados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
    data_programada DATE NOT NULL,
    titulo_tarefa VARCHAR(150) NOT NULL,
    instrucoes_fisioterapeuta TEXT NOT NULL,
    link_video_referencia VARCHAR(255),
    realizado BOOLEAN DEFAULT FALSE,
    data_realizacao TIMESTAMP,
    estado_paciente VARCHAR(50),
    observacoes_familiar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);