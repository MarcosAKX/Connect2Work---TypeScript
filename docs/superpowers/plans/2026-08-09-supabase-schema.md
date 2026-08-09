# Supabase Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a migration monolítica não aplicada por um schema PostgreSQL profissional, sequencial e validado, mantendo o frontend no adaptador local.

**Architecture:** O banco será normalizado em migrations pequenas com UUID, enums, chaves estrangeiras, constraints, índices e timestamps. O frontend, os contratos e os gateways não mudam nesta fase; diferenças como `starts_at`/`ends_at` serão absorvidas por adaptadores numa fase posterior.

**Tech Stack:** PostgreSQL 15+, Supabase CLI, pgTAP, React 19, TypeScript 7, Vitest, Vite 8.

## Global Constraints

- Não implementar RLS, policies, funções de papel, gateways ou UI nesta fase.
- Não aplicar migrations em produção.
- Não persistir senhas, tokens, sessões, base64 ou dados de cartão.
- Preservar `src/services/contracts.ts`, `src/types/domain.ts` e `src/services/local-storage.ts`.
- Manter TypeScript estrito e o mock como adaptador ativo.
- Atualizar `MIGRATION.md`, `MOCK_DATABASE.md` e `PROJECT_STRUCTURE.md`.
- Executar `npm.cmd run typecheck`, `npm.cmd run test` e `npm.cmd run build` antes de concluir.

---

## File Map

- Delete: `supabase/migrations/202608030001_initial_schema.sql` — migration monolítica sem evidência de aplicação.
- Create: `supabase/migrations/202608090001_extensions_and_types.sql` — extensão, enums e função de `updated_at`.
- Create: `supabase/migrations/202608090002_profiles.sql` — perfis vinculados ao Supabase Auth.
- Create: `supabase/migrations/202608090003_units_and_rooms.sql` — unidades e salas.
- Create: `supabase/migrations/202608090004_room_images.sql` — metadados de imagens.
- Create: `supabase/migrations/202608090005_amenities.sql` — catálogo e junção N:N.
- Create: `supabase/migrations/202608090006_business_services.sql` — serviços empresariais.
- Create: `supabase/migrations/202608090007_hours_plans.sql` — plano 1:0..1 por perfil.
- Create: `supabase/migrations/202608090008_bookings.sql` — reservas por período absoluto.
- Create: `supabase/migrations/202608090009_hours_plan_transactions.sql` — extrato do plano.
- Create: `supabase/migrations/202608090010_tasks.sql` — tarefas operacionais.
- Create: `supabase/migrations/202608090011_audit_logs.sql` — auditoria com metadados JSON.
- Create: `supabase/migrations/202608090012_indexes_and_triggers.sql` — índices e triggers compartilhados.
- Create: `supabase/tests/schema.test.sql` — contrato executável do schema com pgTAP.
- Modify: `supabase/seed.sql` — seeds de comodidades e serviços, sem usuários ou credenciais.
- Modify: `MIGRATION.md` — status e decisões da Fase 1.
- Modify: `MOCK_DATABASE.md` — diferenças deliberadas entre mock e schema canônico.
- Modify: `PROJECT_STRUCTURE.md` — migrations e teste SQL.

## Interfaces

- Consumes: unions e obrigatoriedade definidos em `src/types/domain.ts`.
- Produces: tabelas PostgreSQL canônicas para futuros adaptadores Supabase.
- Preserves: todos os contratos públicos de `src/services/contracts.ts`.

---

### Task 1: Preparar ambiente local e teste de contrato

**Files:**
- Create: `supabase/tests/schema.test.sql`

- [ ] **Step 1: Confirmar pré-requisitos sem alterar sistema**

Run:

```powershell
docker version
npx.cmd supabase --version
```

Expected: Docker responde e Supabase CLI imprime versão. Se Docker estiver ausente, parar antes de escrever migrations e registrar bloqueio de validação real.

- [ ] **Step 2: Inicializar configuração Supabase, caso ausente**

Run:

```powershell
npx.cmd supabase init
```

Expected: `supabase/config.toml` criado sem vínculo remoto.

- [ ] **Step 3: Escrever teste pgTAP do schema desejado**

O teste deve abrir transação, habilitar pgTAP no schema de extensões, declarar
`plan(12)` e verificar:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
select has_table('public', 'profiles');
select has_table('public', 'units');
select has_table('public', 'rooms');
select has_table('public', 'room_images');
select has_table('public', 'amenities');
select has_table('public', 'room_amenities');
select has_table('public', 'business_services');
select has_table('public', 'hours_plans');
select has_table('public', 'bookings');
select has_table('public', 'hours_plan_transactions');
select has_table('public', 'tasks');
select has_table('public', 'audit_logs');
select * from finish();
rollback;
```

- [ ] **Step 4: Executar teste e confirmar RED**

Run:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db supabase/tests/schema.test.sql
```

Expected: FAIL porque `amenities`, `room_amenities` e demais decisões canônicas ainda não existem integralmente.

- [ ] **Step 5: Commit do teste RED**

```powershell
git add supabase/config.toml supabase/tests/schema.test.sql
git commit -m "test(db): define schema contract"
```

---

### Task 2: Criar fundação, perfis e catálogo

**Files:**
- Delete: `supabase/migrations/202608030001_initial_schema.sql`
- Create: migrations `001` até `005` listadas no File Map.

- [ ] **Step 1: Criar extensão, enums e função compartilhada**

`202608090001_extensions_and_types.sql` deve criar `pgcrypto`; enums de papel, booking, pagamento, tarefa, prioridade, transação, ação de auditoria, entidade de auditoria e tipo de serviço; função `set_updated_at()` que atribui `new.updated_at = now()`.

- [ ] **Step 2: Criar `profiles`**

Campos: `id uuid` PK/FK para `auth.users(id)` com cascade; `name`, `email`, `role`, `active`, `profession`, `phone`, `created_at`, `updated_at`. `email` único; papel default `client`; ativo default `true`.

- [ ] **Step 3: Criar `units` e `rooms`**

`units`: UUID, nome, endereço, descrição, imagem principal nullable, latitude/longitude `double precision`, timestamps. Não criar `available_rooms`.

`rooms`: UUID, `unit_id` com delete restrict, nome, capacidade positiva, preço não negativo, timestamps. Não criar array `amenities` nem URLs/base64.

- [ ] **Step 4: Criar `room_images`**

Campos: UUID, `room_id` cascade, `storage_path` não vazio, `sort_order >= 0`, `is_cover boolean default false`, timestamps. Adicionar unicidade `(room_id, sort_order)`.

- [ ] **Step 5: Criar comodidades N:N**

`amenities`: UUID, nome único case-insensitive e timestamps.

`room_amenities`: `room_id`, `amenity_id`, PK composta e cascata nos dois vínculos.

- [ ] **Step 6: Resetar banco e observar progresso**

Run:

```powershell
npx.cmd supabase db reset
npx.cmd supabase test db supabase/tests/schema.test.sql
```

Expected: teste ainda FAIL porque tabelas posteriores ainda não existem; migrations `001`–`005` aplicam sem erro.

- [ ] **Step 7: Commit**

```powershell
git add supabase/migrations
git commit -m "feat(db): add catalog schema"
```

---

### Task 3: Criar serviços e planos

**Files:**
- Create: migrations `006` e `007`.

- [ ] **Step 1: Criar `business_services`**

Campos: UUID, `kind` enum único, nome, descrição, listas de benefícios em `text[]`, `image_storage_path` nullable, `active`, `sort_order >= 0`, timestamps. Defaults somente `active = true` e arrays vazios, compatíveis com seeds e domínio.

- [ ] **Step 2: Criar `hours_plans`**

Campos: `user_id` PK/FK cascade, `enabled default false`, `balance default 0`, `total` nullable positivo, `renews_on`, `payment_confirmed`, `last_renewal_at`, timestamps. Constraint exige saldo não negativo e, quando habilitado, total positivo.

- [ ] **Step 3: Resetar e validar aplicação parcial**

Run:

```powershell
npx.cmd supabase db reset
```

Expected: sucesso sem dependência circular.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations
git commit -m "feat(db): add services and plans"
```

---

### Task 4: Criar bookings e extrato de horas

**Files:**
- Create: migrations `008` e `009`.

- [ ] **Step 1: Criar `bookings`**

Campos: UUID; FKs `user_id`, `unit_id`, `room_id`; `starts_at`; `ends_at`; estados; valor; pagamento; horas do plano; cancelamento; check-in; timestamps. Constraints: `ends_at > starts_at`, valores não negativos e campos de cancelamento coerentes com estado cancelado.

Não criar bloqueio de sobreposição ainda; operação transacional pertence à fase posterior.

- [ ] **Step 2: Criar `hours_plan_transactions`**

Campos iguais ao domínio persistente, com FKs para perfil, booking e criador; `balance_after >= 0`; timestamps. `booking_id` e `created_by` permanecem nullable.

- [ ] **Step 3: Resetar banco**

Run:

```powershell
npx.cmd supabase db reset
```

Expected: sucesso.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations
git commit -m "feat(db): add booking ledger"
```

---

### Task 5: Criar tarefas, auditoria, índices e triggers

**Files:**
- Create: migrations `010`, `011` e `012`.

- [ ] **Step 1: Criar `tasks`**

Campos conforme domínio; `assigned_to` nullable com delete set null; `created_by` obrigatório com delete restrict; status default `todo`; timestamps.

- [ ] **Step 2: Criar `audit_logs`**

Campos: UUID, ator nullable, `actor_name`, ação enum, entidade enum, `entity_id text`, `occurred_at default now()` e `details jsonb`. Ator usa delete set null.

- [ ] **Step 3: Criar índices e triggers**

Índices mínimos: salas por unidade; imagens por sala/ordem; bookings por usuário/início; bookings por sala/início; tarefas por responsável; transações por usuário/data; auditoria por ocorrência. Aplicar trigger `set_updated_at` nas tabelas que possuem `updated_at`.

- [ ] **Step 4: Executar GREEN completo**

Run:

```powershell
npx.cmd supabase db reset
npx.cmd supabase test db supabase/tests/schema.test.sql
```

Expected: PASS, 12 tabelas encontradas e migrations aplicadas do zero.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations supabase/tests/schema.test.sql
git commit -m "feat(db): complete operational schema"
```

---

### Task 6: Criar seeds seguros

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Expandir teste antes do seed**

Adicionar assertions para três tipos de serviço, comodidades únicas e ausência de usuários seed em `auth.users`.

- [ ] **Step 2: Executar RED**

```powershell
npx.cmd supabase db reset
npx.cmd supabase test db supabase/tests/schema.test.sql
```

Expected: FAIL porque seeds ainda estão vazios.

- [ ] **Step 3: Inserir seeds idempotentes**

Adicionar comodidades atuais e os três serviços de `src/services/mock-business-services.ts`, usando `on conflict` e sem usuários, senhas, tokens, bookings ou dados pessoais.

- [ ] **Step 4: Executar GREEN**

```powershell
npx.cmd supabase db reset
npx.cmd supabase test db supabase/tests/schema.test.sql
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add supabase/seed.sql supabase/tests/schema.test.sql
git commit -m "feat(db): seed public catalog"
```

---

### Task 7: Sincronizar documentação e validar projeto

**Files:**
- Modify: `MIGRATION.md`
- Modify: `MOCK_DATABASE.md`
- Modify: `PROJECT_STRUCTURE.md`

- [ ] **Step 1: Documentar estado real**

Registrar que schema local está criado e validado, mock ainda está ativo, RLS permanece pendente e nenhuma migration foi aplicada em produção.

- [ ] **Step 2: Documentar diferenças deliberadas**

Explicar `starts_at`/`ends_at`, `room_images`, `room_amenities`, `hours_plans`, remoção de `availableRooms` persistido e responsabilidade do Supabase Auth por senhas/reset.

- [ ] **Step 3: Executar validação final do banco**

```powershell
npx.cmd supabase db reset
npx.cmd supabase test db supabase/tests/schema.test.sql
```

Expected: PASS sem warnings de migration.

- [ ] **Step 4: Executar validação final do frontend**

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Expected: TypeScript passa; 49 ou mais testes passam; build termina com sucesso. Warning existente de bundle acima de 500 kB pode permanecer, pois performance está fora desta fase.

- [ ] **Step 5: Conferir diff e segredos**

```powershell
git diff --check
git diff --name-only
rg -n -i "service_role|refresh_token|client_secret|password\s*=" supabase docs MIGRATION.md MOCK_DATABASE.md PROJECT_STRUCTURE.md
```

Expected: nenhum segredo; referências documentais permitidas não contêm valores.

- [ ] **Step 6: Commit final**

```powershell
git add MIGRATION.md MOCK_DATABASE.md PROJECT_STRUCTURE.md
git commit -m "docs(db): record canonical schema"
```

## Completion Gate

- Banco local resetado duas vezes consecutivas sem erro.
- Teste pgTAP verde.
- Typecheck, Vitest e build verdes.
- Mock permanece adaptador ativo.
- Nenhuma policy/RLS implementada nesta fase.
- Nenhuma credencial ou dado pessoal seedado.
- Working tree contém somente mudanças esperadas ou está limpo após commits.
