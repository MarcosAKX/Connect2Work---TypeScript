-- Aplicar uma vez com a conta administrativa; não recria tabelas existentes.
-- Datas fornecidas em UTC pelo backend. Só o hash do token fica no banco.
USE connect2work;
CREATE TABLE sessoes (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  usuario_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash BINARY(32) NOT NULL,
  criado_em DATETIME(6) NOT NULL,
  ultima_atividade_em DATETIME(6) NOT NULL,
  expira_em DATETIME(6) NOT NULL,
  revogado_em DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessoes_token_hash (token_hash),
  KEY idx_sessoes_usuario (usuario_id),
  KEY idx_sessoes_expiracao (expira_em),
  CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_sessoes_expiracao CHECK (expira_em > criado_em),
  CONSTRAINT chk_sessoes_atividade CHECK (ultima_atividade_em >= criado_em),
  CONSTRAINT chk_sessoes_revogacao CHECK (revogado_em IS NULL OR revogado_em >= criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- Conferência; não reaplicar CREATE no banco em que já foi executado.
SHOW CREATE TABLE sessoes;
