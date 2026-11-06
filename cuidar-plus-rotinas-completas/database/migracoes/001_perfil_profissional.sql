-- Executar no banco cuidar_plus após importar database/cuida_mais.sql.
-- Idempotente para MySQL 8: só adiciona perfil se ainda não existir.
USE cuidar_plus;
SET @possui_perfil = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fisioterapeutas' AND COLUMN_NAME = 'perfil');
SET @instrucao = IF(@possui_perfil = 0, "ALTER TABLE fisioterapeutas ADD COLUMN perfil ENUM('Administrador','Fisioterapeuta') NOT NULL DEFAULT 'Fisioterapeuta'", 'SELECT 1');
PREPARE migracao FROM @instrucao;
EXECUTE migracao;
DEALLOCATE PREPARE migracao;
