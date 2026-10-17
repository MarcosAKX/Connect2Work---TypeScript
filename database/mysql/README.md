# MySQL — estrutura atual

Servidor local confirmado: MySQL 26.7.0, portas 3306/33060 em 127.0.0.1.

`estrutura-inicial.sql` contém as 14 tabelas extraídas do dump do usuário, ordenadas pelas dependências. Não altera o banco atual. Não usar sobre tabelas existentes. Selecione explicitamente um schema vazio antes de executar; não há DROP ou desativação de FKs. O arquivo substitui a versão anterior com seis tabelas.

`seeds/001_perfis.sql` contém apenas os três perfis de referência, sem senhas. Não reaplicar no banco atual, que já contém esses registros. Contas MySQL são provisionadas separadamente e não estão nesses arquivos.

## Evidências fornecidas pelo usuário no Workbench

- 14 tabelas InnoDB/utf8mb4_0900_ai_ci.
- Relações válidas 1:N e N:N por JOIN.
- FK ausente rejeitada (1452); exclusão de unidade vinculada rejeitada (1451).
- Associação repetida rejeitada (1062).
- Capacidade zero, preço negativo, período invertido e saldo negativo rejeitados (3819).
- Após ROLLBACK, sete tabelas consultadas estavam vazias; perfis preservados.
- c2w_api@localhost conseguiu ler perfis e teve CREATE negado (1142); grants informados: SELECT/INSERT/UPDATE/DELETE em connect2work.*.

O agente inspecionou o dump completo, encontrou as 14 criações e não encontrou INSERTs ou contas. A versão consolidada ainda não foi restaurada em outro schema. Testes do frontend não validam SQL. Sobreposição de reservas, atualização atômica de saldo, autorização HTTP e pagamento real permanecem pendentes.

Arquivos e colunas usam português; códigos client/admin/secretaria permanecem compatíveis com o frontend. Planos e movimentações são provisórios. A API ainda não está implementada; frontend permanece com mock local.
## Preparacao do cadastro — 11/10/2026

`migrations/002_usuarios_senha_hash.sql` adiciona somente `usuarios.senha_hash`: VARCHAR(255), ASCII bin, nullable, sem senha padrao. Executar uma vez com a conta administrativa; c2w_api nao recebe ALTER. Contas sem hash deverao ter login negado pelo backend. Hash nunca deve ser retornado pela API, registrado em logs ou incluido em auditoria.

O arquivo estrutura-inicial.sql continua representando a base original: em instalacoes novas, aplicar a migracao depois dele. Aplicacao no banco atual ainda pendente de confirmacao do operador. Nenhuma rota de cadastro ou login foi implementada nesta etapa. A fundacao da API e a conexao real foram validadas anteriormente; o frontend segue no mock.

## Estado atual — 17/10/2026

As descrições anteriores registram etapas históricas. Cadastro, login, sessões e consulta de unidades estão implementados na API MySQL. As migrações 002 e 003 já foram aplicadas e confirmadas; não reaplicar sobre o banco atual. Consulta de unidades usa estrutura existente, sem nova migração. O agente validou LEFT JOIN/contagem e coordenadas com dados temporários próprios, removidos após o teste. Não há seed permanente de unidades. A aplicação mostra lista vazia quando não existem unidades reais.

## Cadastro inicial das unidades — 17/10/2026

A pedido do usuário, as duas unidades do mockup foram cadastradas no MySQL local pelo arquivo comentado database/mysql/seeds/002_unidades.sql: Connect2Work 1 (Av. Osvaldo Perrone, 776, Parque Eldorado) e Connect2Work 2 (R. Lucas Evangelista, 368, Centro), ambas em Bebedouro/SP. Endereços, descrições e coordenadas aproximadas foram preservados do mock-data.ts, com novos UUIDs fixos. Nenhum usuário ou sala foi importado; imagens seguem sem arquivo configurado. A contagem de salas é calculada do banco e não copia o número cinco do mockup. O seed evita duplicação por ID/nome/endereço e não atualiza registros existentes. Aplicação local confirmou duas inclusões. Não houve publicação na Vercel.