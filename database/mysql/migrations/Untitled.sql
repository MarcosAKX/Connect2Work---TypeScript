-- Seleciona o banco do projeto.
USE connect2work;

-- Confirma o banco selecionado.
SELECT DATABASE();

-- Verifica se a tabela de sessões já existe.
SHOW TABLES LIKE 'sessoes';


-- Armazena as sessões de acesso dos usuários.
CREATE TABLE sessoes (
  -- Identificador único da sessão, gerado pelo backend.
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

  -- Usuário ao qual esta sessão pertence.
  usuario_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

  -- Hash SHA-256 do token. O token original não fica no banco.
  token_hash BINARY(32) NOT NULL,

  -- Datas em UTC, preenchidas pelo backend.
  criado_em DATETIME(6) NOT NULL,
  ultima_atividade_em DATETIME(6) NOT NULL,

  -- Limite absoluto: 4 horas após a criação.
  expira_em DATETIME(6) NOT NULL,

  -- Preenchido quando a sessão é encerrada ou revogada.
  revogado_em DATETIME(6) NULL,

  PRIMARY KEY (id),

  -- Impede duplicação e permite localizar a sessão pelo hash.
  UNIQUE KEY uq_sessoes_token_hash (token_hash),

  -- Facilita consultar as sessões de um usuário.
  KEY idx_sessoes_usuario (usuario_id),

  -- Facilita localizar sessões expiradas para limpeza futura.
  KEY idx_sessoes_expiracao (expira_em),

  -- Uma sessão só pode pertencer a um usuário existente.
  CONSTRAINT fk_sessoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,

  -- A expiração deve acontecer depois da criação.
  CONSTRAINT chk_sessoes_expiracao
    CHECK (expira_em > criado_em),

  -- A atividade não pode ser anterior à criação.
  CONSTRAINT chk_sessoes_atividade
    CHECK (ultima_atividade_em >= criado_em),

  -- A revogação não pode ser anterior à criação.
  CONSTRAINT chk_sessoes_revogacao
    CHECK (revogado_em IS NULL OR revogado_em >= criado_em)

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;


  -- Mostra a estrutura efetivamente criada.
SHOW CREATE TABLE sessoes;