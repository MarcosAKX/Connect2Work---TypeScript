# Fundação MySQL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execução proposta pelo agente principal nesta conversa; aguardar revisão do usuário.

**Goal:** Criar e validar o schema MySQL do Connect2Work e preparar sua API privada de acesso ao banco.

**Architecture:** Migrations SQL independentes do frontend. API NestJS/TypeScript com configuração própria, pool MySQL e endpoints de saúde; endpoints privados só serão habilitados em etapa de identidade. Mock permanece ativo.

**Tech Stack:** MySQL instalado 26.7.0 (confirmado no Workbench), InnoDB, utf8mb4, Node.js, TypeScript, NestJS e driver mysql2. Compatibilidade é comprovada por execução, não presumida a partir da versão.

**Spec:** ../specs/2026-10-08-mysql-backend-design.md

## Global Constraints

- Sem Docker nesta máquina; servidor já instalado e limitado a 127.0.0.1 nas portas 3306/33060.
- Sem pagamentos, importação automática, alteração das telas ou troca do mock.
- Não pedir senha root no chat; comandos administrativos serão executados pelo usuário no Workbench.
- Sem DROP DATABASE, reset ou exclusão automática de dados existentes.
- CHAR(36) ASCII binário para UUID/FKs; DECIMAL(12,2) para dinheiro; DECIMAL(10,2) para horas; DATETIME(6) UTC e DATE para datas civis.
- Nenhuma credencial em VITE_*, Git, SQL versionado, respostas ou logs.
- O schema Supabase existente é legado; não será aplicado ou apagado nesta entrega.

## Review Focus

- Schema existente: detectar e interromper criação incompatível sem apagar dados.
- DDL parcial: registrar falha e não marcar migration aplicada; não prometer rollback de DDL MySQL.
- Valor monetário: preservar decimal como string no driver, sem arredondamento por number.
- Banco indisponível: prontidão retorna 503 genérico sem host/usuário/senha.
- Privilégios: conta runtime deve falhar ao tentar CREATE/ALTER/DROP.

### Task 1: Schema e integridade

**Files:** database/mysql/README.md; migrations/001_identity.sql, 002_catalog.sql, 003_operations.sql (sob database/mysql/); database/mysql/tests/integrity.sql; database/mysql/seeds/demo.sql; database/mysql/schema.md.

**Interfaces:** SQL executado no schema connect2work; migrations sem banco hardcoded, ordem numérica. Produz roles, users, units, rooms, amenities, room_amenities, room_images, business_services, service_features, hours_plans, bookings, hours_plan_transactions, tasks e audit_logs.

- [ ] Criar testes SQL de integridade em schema de validação separado: FK inexistente rejeitada; room_amenities duplicado rejeitado; capacidade zero, preço/saldo negativos e fim <= início rejeitados. Testes válidos demonstram duas salas compartilhando comodidade e uma unidade com duas salas. Fixture usa UUIDs fixos de demonstração. Asserções em procedures temporárias com SIGNAL SQLSTATE '45000'; handlers aceitam somente códigos esperados.
- [ ] Executar testes antes das migrations: falha por tabela ausente, sem tratar isso como sucesso.
- [ ] Criar migrations com InnoDB, PK/FK/UNIQUE/CHECK e índices de período por sala, reservas por usuário, tarefas por responsável/prazo e extrato por usuário/data.
- [ ] roles.code aceita client/admin/secretaria; users.email único normalizado; business_services.kind único; room_amenities PK composta. Estado administrativo pending/confirmed/cancelled; pagamento manual pending/completed fica explícito em bookings para compatibilidade, sem afirmar liquidação online.
- [ ] Criar seed mínimo explícito sem senhas: papéis e catálogo fictício. Nenhum seed automático para dados pessoais reais.
- [ ] Incluir consultas INFORMATION_SCHEMA e SHOW CREATE TABLE para evidenciar constraints; executar em dois schemas novos de validação, sem apagar schemas existentes.
- [ ] Documentar que sobreposição exige protocolo transacional futuro da API; schema sozinho não resolve concorrência. Bloquear transferência de sala com histórico na implementação futura.

### Task 2: Provisionamento seguro

**Files:** database/mysql/admin/provision.template.sql; database/mysql/admin/verify-access.sql; database/mysql/README.md.

**Interfaces:** usuário c2w_migrations e c2w_api restritos a localhost; senha escolhida localmente, sem salvar substituição no Git.

- [ ] Script começa com consulta de schemas/contas existentes e instrui parar em conflitos. CREATE DATABASE connect2work com utf8mb4 apenas quando inexistente.
- [ ] Template administrativo cria contas sem root remoto; conta migrations recebe somente DDL/DML necessários sobre connect2work; runtime recebe SELECT/INSERT/UPDATE/DELETE somente nesse schema. Sem GRANT OPTION ou privilégios globais.
- [ ] Usuário executa provisionamento no Workbench; agente não recebe senha root. Não imprimir credenciais nem usar senha em argumento de processo.
- [ ] Verificação por conexão runtime: leitura permitida e DDL rejeitado. Nunca testar DDL destrutivo em tabela real; tentativa CREATE em nome reservado de teste deve falhar e qualquer sucesso inesperado interrompe homologação.
- [ ] Arquivo local backend/.env ignorado; .env.example somente placeholders. Conta runtime não considera os papéis da aplicação; autorização é responsabilidade adicional da API.

### Task 3: Fundação da API

**Files:** backend/package.json, tsconfig.json, .env.example, src/main.ts, src/app.module.ts, src/infrastructure/database/database.module.ts, database.service.ts, src/config/environment.ts, src/api/health.controller.ts e test/health.test.ts.

**Interfaces:** validateEnvironment(input: Record<string,string|undefined>) retorna configuração validada; DatabaseService.isReady(): Promise<boolean>; GET /health retorna {status:'ok'}; GET /ready retorna {status:'ready'} ou 503 {status:'unavailable'}.

- [ ] Conferir versões suportadas e documentação oficial de NestJS/mysql2/Node antes de instalar dependências; fixar versões compatíveis no lockfile próprio.
- [ ] Escrever testes para variável ausente, porta inválida, health, ready com banco indisponível e decimal preservado como string. Executar e registrar falha inicial.
- [ ] Implementar pool mysql2 com execute parametrizado, UTC e decimalNumbers:false; encerrar pool no shutdown. Não aceitar SQL vindo de HTTP. Configurar listen da API em 127.0.0.1 para desenvolvimento.
- [ ] Implementar somente health/ready nesta fundação; sem CRUD anônimo ou rotas financeiras. Prontidão usa SELECT 1; erros internos sanitizados.
- [ ] Testar conexão real runtime e ausência de privilégios DDL; teste HTTP verifica respostas sem detalhes internos. AuthContext e gateways do frontend continuam locais.

### Task 4: Evidências e documentação

**Files:** PRODUCT.md, FEATURES.md, PROJECT_STRUCTURE.md, MOCK_DATABASE.md, MIGRATION.md; database/mysql/VALIDATION.md.

- [ ] Atualizar direção MySQL e marcar Supabase como legado não ativo; corrigir referências históricas sem afirmar recursos implementados quando não foram validados.
- [ ] Registrar versão real, schema, resultados de constraints, contas/permissões (sem segredos), comandos e limitações. Distinguir testes executados no Workbench de testes automatizados do agente.
- [ ] Executar npm run typecheck, npm run test e npm run build na raiz; executar checks próprios do backend. Todos devem sair com código 0.
- [ ] Revisar diffs para preservar exclusões de testes já autorizadas e não misturar alterações anteriores em commits. Commit somente após validação e escopo claro.
- [ ] Relatar o que funciona e o que depende da próxima etapa: identidade, autorização, reservas transacionais, integração das telas e relatórios.

## Execução

Proposta: execução direta pelo agente principal nesta conversa, com passos administrativos pontuais do usuário no Workbench. Primeiro entregar SQL revisável da Task 1 e instruções de aplicação; nunca presumir execução no banco só por ter produzido arquivos. A etapa de API vem depois de comprovar a integridade do banco.