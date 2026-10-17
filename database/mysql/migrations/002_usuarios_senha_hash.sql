-- Etapa 2: preparar usuarios para credenciais do backend.
-- Executar UMA VEZ no Workbench, usando a conta administrativa.
-- A conta c2w_api permanece sem permissao ALTER.
USE connect2work;

-- Guarda o hash codificado completo, incluindo algoritmo, parametros e salt.
-- ASCII bin preserva maiusculas/minusculas; nao guardar a senha original.
-- NULL preserva contas existentes. O login deve rejeitar contas sem hash.
ALTER TABLE usuarios
  ADD COLUMN senha_hash VARCHAR(255)
    CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL
    COMMENT 'Hash codificado da senha; NULL indica credencial ainda nao configurada'
    AFTER email;

-- Confere somente a estrutura, sem exibir hashes ou dados pessoais.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'connect2work'
  AND TABLE_NAME = 'usuarios'
  AND COLUMN_NAME = 'senha_hash';