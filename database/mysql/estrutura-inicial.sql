-- Schema extraído do MySQL 26.7.0 em 08/10/2026.
-- Somente criação: executar em banco vazio selecionado pelo operador.
-- Não contém DROP, dados, contas, credenciais ou desativação de chaves estrangeiras.
-- Configure a conexão em UTC antes de gravar timestamps.

-- Tabela: perfis
CREATE TABLE `perfis` (
  `id` tinyint unsigned NOT NULL,
  `codigo` varchar(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`codigo`),
  CONSTRAINT `chk_perfis_codigo` CHECK ((`codigo` in (_utf8mb4'client',_utf8mb4'admin',_utf8mb4'secretaria')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: usuarios
CREATE TABLE `usuarios` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `perfil_id` tinyint unsigned NOT NULL,
  `nome` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `profissao` varchar(150) DEFAULT NULL,
  `telefone` varchar(30) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`perfil_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`perfil_id`) REFERENCES `perfis` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_usuarios_ativo` CHECK ((`ativo` in (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: unidades
CREATE TABLE `unidades` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `nome` varchar(150) NOT NULL,
  `endereco` varchar(500) NOT NULL,
  `descricao` text,
  `chave_imagem` varchar(500) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_units_coordinates` CHECK ((((`latitude` is null) and (`longitude` is null)) or ((`latitude` is not null) and (`longitude` is not null)))),
  CONSTRAINT `chk_units_latitude` CHECK ((`latitude` between -(90) and 90)),
  CONSTRAINT `chk_units_longitude` CHECK ((`longitude` between -(180) and 180))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: salas
CREATE TABLE `salas` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `unidade_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `nome` varchar(150) NOT NULL,
  `capacidade` smallint unsigned NOT NULL,
  `preco_por_hora` decimal(12,2) NOT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_rooms_unit` (`unidade_id`),
  CONSTRAINT `fk_rooms_unit` FOREIGN KEY (`unidade_id`) REFERENCES `unidades` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_salas_capacidade` CHECK ((`capacidade` > 0)),
  CONSTRAINT `chk_salas_preco` CHECK ((`preco_por_hora` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: comodidades
CREATE TABLE `comodidades` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `nome` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_comodidades_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: sala_comodidades
CREATE TABLE `sala_comodidades` (
  `sala_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `comodidade_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`sala_id`,`comodidade_id`),
  KEY `idx_sala_comodidades_comodidade` (`comodidade_id`),
  CONSTRAINT `fk_sala_comodidades_comodidade` FOREIGN KEY (`comodidade_id`) REFERENCES `comodidades` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sala_comodidades_sala` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: imagens_salas
CREATE TABLE `imagens_salas` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sala_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `chave_arquivo` varchar(500) NOT NULL,
  `texto_alternativo` varchar(255) DEFAULT NULL,
  `posicao` smallint unsigned NOT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_imagens_salas_posicao` (`sala_id`,`posicao`),
  CONSTRAINT `fk_imagens_salas_sala` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: servicos_empresariais
CREATE TABLE `servicos_empresariais` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tipo` varchar(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `nome` varchar(150) NOT NULL,
  `descricao` text NOT NULL,
  `chave_imagem` varchar(500) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ordem` smallint unsigned NOT NULL DEFAULT '0',
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_servicos_empresariais_tipo` (`tipo`),
  CONSTRAINT `chk_servicos_empresariais_ativo` CHECK ((`ativo` in (0,1))),
  CONSTRAINT `chk_servicos_empresariais_tipo` CHECK ((`tipo` in (_utf8mb4'endereco_fiscal',_utf8mb4'endereco_comercial',_utf8mb4'plano_horas')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: beneficios_servicos
CREATE TABLE `beneficios_servicos` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `servico_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `categoria` varchar(15) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `descricao` varchar(500) NOT NULL,
  `ordem` smallint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_beneficios_servicos_ordem` (`servico_id`,`categoria`,`ordem`),
  CONSTRAINT `fk_beneficios_servicos_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos_empresariais` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `chk_beneficios_servicos_categoria` CHECK ((`categoria` in (_utf8mb4'principal',_utf8mb4'secundario')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: planos_horas
CREATE TABLE `planos_horas` (
  `usuario_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '0',
  `saldo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_horas` decimal(10,2) DEFAULT NULL,
  `renova_em` date DEFAULT NULL,
  `pagamento_confirmado` tinyint(1) NOT NULL DEFAULT '0',
  `ultima_renovacao_em` datetime(6) DEFAULT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`usuario_id`),
  CONSTRAINT `fk_planos_horas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_planos_horas_ativo` CHECK ((`ativo` in (0,1))),
  CONSTRAINT `chk_planos_horas_pagamento` CHECK ((`pagamento_confirmado` in (0,1))),
  CONSTRAINT `chk_planos_horas_saldo` CHECK ((`saldo` >= 0)),
  CONSTRAINT `chk_planos_horas_total` CHECK (((`total_horas` is null) or (`total_horas` > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: agendamentos
CREATE TABLE `agendamentos` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `usuario_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sala_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `inicio_em` datetime(6) NOT NULL,
  `fim_em` datetime(6) NOT NULL,
  `situacao` varchar(15) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'pendente',
  `situacao_pagamento` varchar(15) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'pendente',
  `valor_acordado` decimal(12,2) NOT NULL,
  `horas_do_plano` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cancelado_em` datetime(6) DEFAULT NULL,
  `motivo_cancelamento` varchar(1000) DEFAULT NULL,
  `chegada_em` datetime(6) DEFAULT NULL,
  `chegada_por` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_agendamentos_sala_periodo` (`sala_id`,`inicio_em`,`fim_em`),
  KEY `idx_agendamentos_usuario_inicio` (`usuario_id`,`inicio_em`),
  KEY `idx_agendamentos_chegada_por` (`chegada_por`),
  CONSTRAINT `fk_agendamentos_chegada_por` FOREIGN KEY (`chegada_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_agendamentos_sala` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_agendamentos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_agendamentos_chegada` CHECK ((((`chegada_em` is null) and (`chegada_por` is null)) or ((`chegada_em` is not null) and (`chegada_por` is not null)))),
  CONSTRAINT `chk_agendamentos_horas` CHECK ((`horas_do_plano` >= 0)),
  CONSTRAINT `chk_agendamentos_pagamento` CHECK ((`situacao_pagamento` in (_utf8mb4'pendente',_utf8mb4'concluido'))),
  CONSTRAINT `chk_agendamentos_periodo` CHECK ((`fim_em` > `inicio_em`)),
  CONSTRAINT `chk_agendamentos_situacao` CHECK ((`situacao` in (_utf8mb4'pendente',_utf8mb4'confirmado',_utf8mb4'cancelado'))),
  CONSTRAINT `chk_agendamentos_valor` CHECK ((`valor_acordado` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: movimentacoes_plano_horas
CREATE TABLE `movimentacoes_plano_horas` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `usuario_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `agendamento_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `tipo` varchar(15) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `horas` decimal(10,2) NOT NULL,
  `saldo_apos` decimal(10,2) NOT NULL,
  `motivo` varchar(1000) NOT NULL,
  `criado_por` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_movimentacoes_usuario_data` (`usuario_id`,`criado_em`),
  KEY `idx_movimentacoes_agendamento` (`agendamento_id`),
  KEY `idx_movimentacoes_criado_por` (`criado_por`),
  CONSTRAINT `fk_movimentacoes_agendamento` FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_movimentacoes_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_movimentacoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_movimentacoes_horas` CHECK ((((`tipo` in (_utf8mb4'credito',_utf8mb4'estorno')) and (`horas` > 0)) or ((`tipo` = _utf8mb4'debito') and (`horas` < 0)) or ((`tipo` = _utf8mb4'ajuste') and (`horas` <> 0)))),
  CONSTRAINT `chk_movimentacoes_saldo` CHECK ((`saldo_apos` >= 0)),
  CONSTRAINT `chk_movimentacoes_tipo` CHECK ((`tipo` in (_utf8mb4'credito',_utf8mb4'debito',_utf8mb4'estorno',_utf8mb4'ajuste')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: tarefas
CREATE TABLE `tarefas` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `descricao` text,
  `situacao` varchar(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'a_fazer',
  `prioridade` varchar(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'media',
  `prazo` date DEFAULT NULL,
  `responsavel_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `criado_por` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_tarefas_responsavel_prazo` (`responsavel_id`,`prazo`),
  KEY `idx_tarefas_situacao_prazo` (`situacao`,`prazo`),
  KEY `idx_tarefas_criado_por` (`criado_por`),
  CONSTRAINT `fk_tarefas_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_tarefas_responsavel` FOREIGN KEY (`responsavel_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_tarefas_prioridade` CHECK ((`prioridade` in (_utf8mb4'baixa',_utf8mb4'media',_utf8mb4'alta'))),
  CONSTRAINT `chk_tarefas_situacao` CHECK ((`situacao` in (_utf8mb4'a_fazer',_utf8mb4'em_andamento',_utf8mb4'concluida')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela: registros_auditoria
CREATE TABLE `registros_auditoria` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `usuario_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `nome_usuario` varchar(150) DEFAULT NULL,
  `acao` varchar(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `entidade` varchar(50) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `entidade_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `detalhes` json DEFAULT NULL,
  `ocorrido_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_data` (`ocorrido_em`),
  KEY `idx_auditoria_usuario_data` (`usuario_id`,`ocorrido_em`),
  KEY `idx_auditoria_entidade` (`entidade`,`entidade_id`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
