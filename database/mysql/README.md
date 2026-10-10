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