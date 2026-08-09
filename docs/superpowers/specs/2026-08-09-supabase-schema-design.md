# Supabase Schema Design — Fase 1

## Objetivo

Criar um schema PostgreSQL profissional e versionado para o Connect2Work sem
alterar o adaptador ativo em `localStorage`, componentes, páginas, RLS ou
integrações externas nesta fase.

## Estado de partida

- O frontend usa os contratos de `src/services/contracts.ts`.
- O adaptador ativo permanece em `src/services/local-storage.ts`.
- Não há configuração local, vínculo remoto ou variáveis de ambiente do
  Supabase neste workspace.
- A migration inicial existente não possui evidência local de aplicação.
- IDs seed legados não são UUID; registros novos do mock usam UUID.

## Estratégia de compatibilidade

O schema será preparado sem trocar o backend ativo. O domínio TypeScript e os
gateways não serão alterados nesta fase. Diferenças deliberadas entre o domínio
atual e o modelo relacional serão resolvidas posteriormente por adaptadores e
mapeadores, preservando as páginas existentes.

Nenhuma migration será aplicada em produção. A validação ocorrerá do zero em
ambiente local ou staging descartável. Se Supabase CLI ou Docker não estiverem
disponíveis, a ausência será registrada e a aplicação real ficará bloqueada até
existir ambiente capaz de executar PostgreSQL.

## Modelo relacional

### Identidade e perfis

`profiles` complementa `auth.users` em relação 1:1. Guarda nome, e-mail de
exibição, papel, estado da conta, profissão, telefone e timestamps. Senhas,
tokens e credenciais permanecem exclusivamente no Supabase Auth.

Papéis aceitos: `client`, `admin` e `secretaria`.

### Unidades e salas

`units` mantém dados cadastrais, endereço, descrição, imagem principal,
coordenadas e timestamps. `availableRooms` não será persistido; a quantidade
será calculada a partir das salas relacionadas.

`rooms` pertence a uma unidade, com nome, capacidade, preço por hora e
timestamps. A relação `units 1:N rooms` usa exclusão restrita.

### Imagens

`room_images` pertence a uma sala e guarda caminho no Storage, ordem e indicação
de capa. Binários e base64 não serão gravados no PostgreSQL. A relação é
`rooms 1:N room_images`.

### Comodidades

`amenities` contém o catálogo de comodidades. `room_amenities` associa salas e
comodidades com chave composta. A relação `rooms N:N amenities` fica explícita
e impede duplicidade da mesma comodidade na mesma sala.

### Serviços empresariais

`business_services` representa os três tipos atuais:
`fiscal_address`, `commercial_address` e `hours_plan`. Nesta fase, haverá no
máximo um registro por tipo, mantendo compatibilidade com o contrato atual.
Expansão para tipos livres exige mudança coordenada do domínio e da UI em fase
separada.

### Planos de horas

`hours_plans` pertence opcionalmente a um perfil em relação 1:0..1. Guarda
ativação, saldo, total contratado, data de renovação, confirmação do pagamento,
última renovação e timestamps.

`hours_plan_transactions` registra créditos, débitos, estornos e ajustes. Cada
transação pertence a um usuário, pode referenciar um agendamento e pode registrar
o usuário responsável.

### Agendamentos

`bookings` associa usuário, unidade e sala. O período será persistido em
`starts_at` e `ends_at` como `timestamptz`, com constraint garantindo término
posterior ao início. O futuro adaptador converterá esses campos para `date` e
`timeSlot`, preservando o contrato atual.

Estados aceitos:

- domínio: `upcoming`, `past`, `cancelled`;
- administrativo: `pending`, `confirmed`, `cancelled`;
- pagamento: `pending`, `completed`.

Campos de cancelamento, check-in, valor e consumo do plano permanecem opcionais
quando também são opcionais no domínio atual.

Bloqueio transacional de sobreposição não pertence a esta fase. Será criado com
as funções de booking e regras de backend após o schema ser aprovado.

### Tarefas

`tasks` registra título, descrição, estado, prioridade, prazo, responsável,
criador e timestamps. Responsável pode ser nulo; criador é obrigatório.

### Auditoria

`audit_logs` registra ator opcional, fotografia opcional do nome, ação, entidade,
identificador, instante e detalhes `jsonb`. Ações e entidades usarão enums ou
constraints equivalentes aos unions TypeScript existentes.

### Dados que não viram tabelas de domínio

- `PasswordResetRequest`: responsabilidade do Supabase Auth.
- `CheckoutDraft`: estado temporário do fluxo, não dado persistente definitivo.
- sessão: responsabilidade do Supabase Auth.
- `BackupPayload`: envelope de transporte, não entidade relacional.
- versão do mock, último backup e cópias corrompidas: metadados locais.

## Migrations

As migrations serão pequenas, sequenciais e aplicáveis do zero:

1. extensões, enums e função de timestamp;
2. perfis;
3. unidades e salas;
4. imagens;
5. comodidades e associação N:N;
6. serviços empresariais;
7. planos de horas;
8. agendamentos;
9. transações de horas;
10. tarefas;
11. auditoria;
12. índices, constraints adicionais e triggers.

A migration monolítica atual será substituída somente porque não existe vínculo
ou histórico local de aplicação. Se surgir evidência posterior de aplicação em
ambiente remoto, o histórico deverá ser preservado e a estratégia mudará para
migrations incrementais.

## Fora de escopo

- RLS, policies e funções de papel.
- Geração de tipos TypeScript do Supabase.
- Implementação ou troca de gateways.
- Alterações de UI.
- Upload real para Storage.
- Importação dos dados do mock.
- Pagamento, Google Calendar, e-mail ou WhatsApp.
- Aplicação em produção.

## Validação

1. Aplicar migrations em banco vazio.
2. Confirmar ordem sem dependência circular.
3. Confirmar tabelas, enums, chaves estrangeiras, constraints e índices.
4. Executar novamente após reset completo.
5. Executar `npm run typecheck`, `npm run test` e `npm run build` para provar
   que preparação do banco não afetou o frontend.

## Critérios de aceite

- Migrations aplicam do zero sem erro.
- Nenhuma senha ou credencial aparece no schema, seed ou repositório.
- Relações 1:N e N:N estão explícitas.
- Campos opcionais do domínio não viram `not null` sem justificativa.
- Defaults refletem comportamento atual ou infraestrutura PostgreSQL documentada.
- Mock continua sendo adaptador ativo.
- Nenhum componente ou gateway é alterado.
- RLS permanece reservado para próxima fase.
