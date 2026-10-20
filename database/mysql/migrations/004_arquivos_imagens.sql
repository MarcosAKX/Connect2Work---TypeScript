-- Connect2Work: controle durável dos arquivos enviados ao Cloudinary.
-- Execute uma única vez no Workbench com a conexão administrativa (Local/root).
-- Não use a conexão c2w_api: ela permanece sem permissão de CREATE/ALTER.
-- Não altera nem apaga unidades, salas, imagens_salas ou arquivos existentes.
-- Os arquivos das fotos NÃO ficam nesta tabela: somente chaves e metadados.

USE connect2work;

CREATE TABLE arquivos_imagens (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  proprietario_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operacao_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  chave_temporaria VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  chave_publica VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  estado VARCHAR(15) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'preparando',
  versao_cloudinary VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  formato VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'webp',
  tamanho_bytes INT UNSIGNED NOT NULL,
  largura SMALLINT UNSIGNED NOT NULL,
  altura SMALLINT UNSIGNED NOT NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expira_em DATETIME(6) NOT NULL,
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lease_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  lease_ate DATETIME(6) DEFAULT NULL,
  tentativas SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  proxima_tentativa_em DATETIME(6) DEFAULT NULL,
  erro_codigo VARCHAR(50) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arquivos_imagens_operacao (operacao_id),
  UNIQUE KEY uq_arquivos_imagens_temporaria (chave_temporaria),
  UNIQUE KEY uq_arquivos_imagens_publica (chave_publica),
  KEY idx_arquivos_imagens_limpeza (estado,proxima_tentativa_em,expira_em),
  KEY idx_arquivos_imagens_proprietario (proprietario_id,criado_em),
  CONSTRAINT fk_arquivos_imagens_proprietario FOREIGN KEY (proprietario_id)
    REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_arquivos_imagens_estado CHECK
    (estado IN ('preparando','temporario','publicando','disponivel','vinculado','removendo','removido')),
  CONSTRAINT chk_arquivos_imagens_formato CHECK (formato = 'webp'),
  CONSTRAINT chk_arquivos_imagens_tamanho CHECK (tamanho_bytes BETWEEN 1 AND 5242880),
  CONSTRAINT chk_arquivos_imagens_dimensoes CHECK (largura BETWEEN 1 AND 1600 AND altura BETWEEN 1 AND 1600),
  CONSTRAINT chk_arquivos_imagens_expiracao CHECK (expira_em > criado_em),
  CONSTRAINT chk_arquivos_imagens_lease CHECK
    ((lease_id IS NULL AND lease_ate IS NULL) OR (lease_id IS NOT NULL AND lease_ate IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Conferência: deve retornar a estrutura de arquivos_imagens.
SHOW CREATE TABLE arquivos_imagens;
