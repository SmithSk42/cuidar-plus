-- Script de Criação do Banco de Dados PostgreSQL (MVP - Etapas 1 e 2)

CREATE TABLE Fisioterapeutas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    crefito VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Pacientes (
    id SERIAL PRIMARY KEY,
    fisioterapeuta_id INT REFERENCES Fisioterapeutas(id),
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE,
    telefone VARCHAR(20)
);

CREATE TABLE Checkins (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES Pacientes(id),
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_atividades BOOLEAN NOT NULL,
    nivel_dor INT CHECK (nivel_dor >= 0 AND nivel_dor <= 10),
    observacoes TEXT
);