-- Execute uma única vez em um banco MySQL que já tenha a tabela pacientes.
ALTER TABLE pacientes
    ADD COLUMN email VARCHAR(100) NULL,
    ADD COLUMN senha_hash VARCHAR(255) NULL,
    ADD UNIQUE KEY uq_pacientes_email (email);
