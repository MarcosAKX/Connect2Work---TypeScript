-- Salas e comodidades aprovadas do mockup — 18/10/2026.
-- Requer as duas unidades de seeds/002_unidades.sql. Conferir que cada nome de unidade é único.
-- Apenas inclusões: não altera preço/capacidade de salas já cadastradas.
-- IDs fixos para salas e comodidades; associações usam os IDs reais encontrados por nome.
-- Sem imagens e sem agendamentos; executar em transação no banco local.
USE connect2work;
SET time_zone = '+00:00';
START TRANSACTION;

-- Comodidade: Wi-Fi
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10001', 'Wi-Fi'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Wi-Fi' OR id = 'ac74a812-c118-46f1-8074-3f8134a10001');

-- Comodidade: Ar Condicionado
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10002', 'Ar Condicionado'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Ar Condicionado' OR id = 'ac74a812-c118-46f1-8074-3f8134a10002');

-- Comodidade: TV
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10003', 'TV'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'TV' OR id = 'ac74a812-c118-46f1-8074-3f8134a10003');

-- Comodidade: Projetor
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10004', 'Projetor'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Projetor' OR id = 'ac74a812-c118-46f1-8074-3f8134a10004');

-- Comodidade: Quadro Branco
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10005', 'Quadro Branco'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Quadro Branco' OR id = 'ac74a812-c118-46f1-8074-3f8134a10005');

-- Comodidade: Videoconferência
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10006', 'Videoconferência'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Videoconferência' OR id = 'ac74a812-c118-46f1-8074-3f8134a10006');

-- Comodidade: Café
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10007', 'Café'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Café' OR id = 'ac74a812-c118-46f1-8074-3f8134a10007');

-- Comodidade: Som Ambiente
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10008', 'Som Ambiente'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Som Ambiente' OR id = 'ac74a812-c118-46f1-8074-3f8134a10008');

-- Comodidade: Iluminação Ajustável
INSERT INTO comodidades (id, nome)
SELECT 'ac74a812-c118-46f1-8074-3f8134a10009', 'Iluminação Ajustável'
WHERE NOT EXISTS (SELECT 1 FROM comodidades WHERE nome = 'Iluminação Ajustável' OR id = 'ac74a812-c118-46f1-8074-3f8134a10009');

-- Connect2Work 1 / Sala Executive
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0001', u.id, 'Sala Executive', 8, 80.00
FROM unidades u WHERE u.nome = 'Connect2Work 1'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0001' OR (s.unidade_id = u.id AND s.nome = 'Sala Executive'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Executive' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Executive' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Executive' AND c.nome = 'TV'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Executive' AND c.nome = 'Projetor'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Executive' AND c.nome = 'Quadro Branco'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 1 / Sala Focus
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0002', u.id, 'Sala Focus', 4, 45.00
FROM unidades u WHERE u.nome = 'Connect2Work 1'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0002' OR (s.unidade_id = u.id AND s.nome = 'Sala Focus'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Focus' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Focus' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 1 / Sala Brainstorm
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0003', u.id, 'Sala Brainstorm', 12, 120.00
FROM unidades u WHERE u.nome = 'Connect2Work 1'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0003' OR (s.unidade_id = u.id AND s.nome = 'Sala Brainstorm'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Brainstorm' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Brainstorm' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Brainstorm' AND c.nome = 'TV'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Brainstorm' AND c.nome = 'Projetor'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Brainstorm' AND c.nome = 'Videoconferência'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 1 / Sala Solo
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0004', u.id, 'Sala Solo', 1, 25.00
FROM unidades u WHERE u.nome = 'Connect2Work 1'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0004' OR (s.unidade_id = u.id AND s.nome = 'Sala Solo'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Solo' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Solo' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 1 / Sala Meeting
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0005', u.id, 'Sala Meeting', 6, 60.00
FROM unidades u WHERE u.nome = 'Connect2Work 1'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0005' OR (s.unidade_id = u.id AND s.nome = 'Sala Meeting'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Meeting' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Meeting' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Meeting' AND c.nome = 'TV'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 1' AND s.nome = 'Sala Meeting' AND c.nome = 'Projetor'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 2 / Sala Horizon
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0006', u.id, 'Sala Horizon', 10, 90.00
FROM unidades u WHERE u.nome = 'Connect2Work 2'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0006' OR (s.unidade_id = u.id AND s.nome = 'Sala Horizon'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Horizon' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Horizon' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Horizon' AND c.nome = 'TV'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Horizon' AND c.nome = 'Projetor'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Horizon' AND c.nome = 'Café'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 2 / Sala Compact
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0007', u.id, 'Sala Compact', 3, 40.00
FROM unidades u WHERE u.nome = 'Connect2Work 2'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0007' OR (s.unidade_id = u.id AND s.nome = 'Sala Compact'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Compact' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Compact' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 2 / Sala Board
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0008', u.id, 'Sala Board', 14, 130.00
FROM unidades u WHERE u.nome = 'Connect2Work 2'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0008' OR (s.unidade_id = u.id AND s.nome = 'Sala Board'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Board' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Board' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Board' AND c.nome = 'TV'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Board' AND c.nome = 'Projetor'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Board' AND c.nome = 'Videoconferência'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Board' AND c.nome = 'Som Ambiente'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 2 / Sala Quiet
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0009', u.id, 'Sala Quiet', 2, 35.00
FROM unidades u WHERE u.nome = 'Connect2Work 2'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0009' OR (s.unidade_id = u.id AND s.nome = 'Sala Quiet'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Quiet' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Quiet' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Quiet' AND c.nome = 'Iluminação Ajustável'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

-- Connect2Work 2 / Sala Connect
INSERT INTO salas (id, unidade_id, nome, capacidade, preco_por_hora)
SELECT 'eb6be390-1a5a-4581-831f-6bfca96a0010', u.id, 'Sala Connect', 6, 65.00
FROM unidades u WHERE u.nome = 'Connect2Work 2'
  AND NOT EXISTS (SELECT 1 FROM salas s WHERE s.id = 'eb6be390-1a5a-4581-831f-6bfca96a0010' OR (s.unidade_id = u.id AND s.nome = 'Sala Connect'));
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Connect' AND c.nome = 'Wi-Fi'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Connect' AND c.nome = 'Ar Condicionado'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Connect' AND c.nome = 'TV'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);
INSERT INTO sala_comodidades (sala_id, comodidade_id)
SELECT s.id, c.id FROM salas s JOIN unidades u ON u.id = s.unidade_id CROSS JOIN comodidades c
WHERE u.nome = 'Connect2Work 2' AND s.nome = 'Sala Connect' AND c.nome = 'Projetor'
  AND NOT EXISTS (SELECT 1 FROM sala_comodidades sc WHERE sc.sala_id = s.id AND sc.comodidade_id = c.id);

COMMIT;
-- Conferência: cinco salas por unidade após a aplicação inicial.
SELECT u.nome, COUNT(s.id) AS salas_cadastradas FROM unidades u LEFT JOIN salas s ON s.unidade_id = u.id WHERE u.nome IN ('Connect2Work 1','Connect2Work 2') GROUP BY u.id ORDER BY u.nome;
