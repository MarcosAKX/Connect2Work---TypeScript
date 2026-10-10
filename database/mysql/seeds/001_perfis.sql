-- Dados de referência: executar uma vez no banco selecionado após criar as tabelas.
-- Se houver conflito, interromper e comparar os perfis existentes; não sobrescrever.
INSERT INTO perfis (id, codigo)
VALUES (1, 'client'), (2, 'admin'), (3, 'secretaria');