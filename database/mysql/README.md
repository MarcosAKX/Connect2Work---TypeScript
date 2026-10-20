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
## Salas e comodidades no MySQL — 18/10/2026

Concluída a integração de /salas?unidade=<UUID>. GET /unidades/:unidadeId/salas lista somente as salas da unidade, incluindo salas sem comodidades; UUID válido inexistente retorna lista vazia. GET /salas/:salaId retorna o detalhe ou 404. Ambas as rotas exigem sessão válida e usuário ativo, não renovam atividade e usam Cache-Control: no-store. Identificadores inválidos retornam 400 e falhas internas têm resposta genérica 503. DTO público não inclui dados de usuários ou credenciais.

SalasController → ServicoSalas → RepositorioSalas → RepositorioSalasMysql segue as camadas existentes. Consulta parametrizada com LEFT JOIN sala_comodidades/comodidades e agrupamento por sala, sem GROUP_CONCAT e sem consultas por comodidade. Preço DECIMAL é convertido para número finito e não negativo; capacidade positiva. Prazo integral e descarte de conexões falhas seguem a infraestrutura atual.

SalasHttpGateway implementa os contratos de listagem/detalhe, valida respostas em runtime e recusa mistura de unidades. Usa cookies, prazo de 10s e revalidação serial de sessão em 401 sem cancelar login novo. createAppServices agora conecta salas reais. useRooms coordena carregamento, vazio, erro/retry, unidade ausente e respostas antigas. Troca de URL não exibe salas da unidade anterior. RoomsPage mantém o layout e usa Salas da unidade, sem prometer disponibilidade por horário.

O seed comentado database/mysql/seeds/003_salas_comodidades.sql foi aplicado localmente: 10 salas (cinco por unidade), 9 comodidades e 38 associações. Preserva nomes, capacidades e preços do mockup. Apenas inclusões, sem atualizar salas existentes; aplicação repetida confirmou zero novas inclusões. Requer os dois nomes de unidade únicos do seed002. Não altera tabelas nem cria contas. Imagens continuam em Fotos em breve; imagens_salas/armazenamento ainda serão integrados. Agendamentos, horários, pagamento e administração permanecem bloqueados até suas etapas. A implantação Vercel não foi alterada.

Teste local npm run check:salas no backend inicia API isolada em porta aleatória, valida MySQL/HTTP com fixtures próprias e as remove em finally. Cobre unidade vazia, sala sem comodidades, N:N compartilhado, agrupamento de várias comodidades, filtro entre unidades, preço decimal, sessão, UUID inválido, detalhe ausente e logout. Navegador conferiu cinco salas de cada unidade, preços/comodidades e bloqueio de agendamentos. As alterações locais pré-existentes do usuário em CSS/mapa foram preservadas.
## Atualização: catálogo e Cloudinary (18/10/2026)

A migração 004_arquivos_imagens.sql cria somente a tabela técnica de arquivos; aplicada no MySQL local. Não reaplicar indiscriminadamente e não substituir as tabelas existentes. Unidades e imagens_salas continuam guardando referências; arquivos ficam no Cloudinary, sem BLOB no banco. Estados, leases e retentativas documentados em backend/README.md. Backups precisam abranger MySQL e os arquivos do storage separadamente; o módulo de backup ainda não foi integrado.

Unidades/salas/comodidades e galeria agora podem ser gerenciadas pelo admin no modo API. Exclusões com vínculos de negócio são bloqueadas e gravações geram registros_auditoria na mesma transação. A estrutura principal continua em database/mysql/estrutura-inicial.sql e nas migrações versionadas; SQL não depende de abas abertas no Workbench. Para testar: npm run check:catalogo-admin em backend. O teste usa IDs próprios e remove suas fixtures.
