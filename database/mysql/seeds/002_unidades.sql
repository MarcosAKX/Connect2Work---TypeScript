-- Unidades aprovadas pelo usuário a partir do mockup, em 17/10/2026.
-- Executar no banco connect2work. Não altera nem exclui unidades existentes.
-- IDs UUID fixos permitem relacionar as salas em uma etapa posterior.
-- Coordenadas são as aproximações usadas no mockup; não são levantamento geográfico.
-- Sem imagens cadastradas: a interface usa o placeholder existente.
-- Não cria salas: a contagem exibida pela API depende dos registros reais de salas.
USE connect2work;
SET time_zone = '+00:00';
START TRANSACTION;

-- Insere a unidade somente se não existir registro com mesmo ID, nome ou endereço.
INSERT INTO unidades (id, nome, endereco, descricao, chave_imagem, latitude, longitude)
SELECT 'e9c833f0-2af0-4c34-977a-6d4f8b2c3001',
  'Connect2Work 1',
  'Av. Osvaldo Perrone, 776 - Parque Eldorado, Bebedouro - SP, 14706-136',
  'Unidade no Parque Eldorado, com acesso facilitado e estrutura completa para trabalho e reuniões.',
  NULL, -20.939809, -48.499324
WHERE NOT EXISTS (
  SELECT 1 FROM unidades
  WHERE id = 'e9c833f0-2af0-4c34-977a-6d4f8b2c3001'
    OR nome = 'Connect2Work 1'
    OR endereco = 'Av. Osvaldo Perrone, 776 - Parque Eldorado, Bebedouro - SP, 14706-136'
);

-- A mesma proteção evita duplicar a segunda unidade ao reaplicar o arquivo.
INSERT INTO unidades (id, nome, endereco, descricao, chave_imagem, latitude, longitude)
SELECT 'e9c833f0-2af0-4c34-977a-6d4f8b2c3002',
  'Connect2Work 2',
  'R. Lucas Evangelista, 368 - Centro, Bebedouro - SP, 14700-425',
  'Espaço moderno no Centro de Bebedouro, ideal para reuniões e trabalho em equipe.',
  NULL, -20.949552, -48.479537
WHERE NOT EXISTS (
  SELECT 1 FROM unidades
  WHERE id = 'e9c833f0-2af0-4c34-977a-6d4f8b2c3002'
    OR nome = 'Connect2Work 2'
    OR endereco = 'R. Lucas Evangelista, 368 - Centro, Bebedouro - SP, 14700-425'
);

-- Confirma as duas inclusões como uma operação. Em erro, executar ROLLBACK.
COMMIT;

-- Conferência sem expor dados de usuários ou credenciais.
SELECT id, nome, endereco, latitude, longitude
FROM unidades
WHERE nome IN ('Connect2Work 1', 'Connect2Work 2')
ORDER BY nome;
