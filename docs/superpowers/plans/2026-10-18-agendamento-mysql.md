# Agendamento MySQL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar Agendamento ao MySQL, criando reservas pendentes sem pagamento e impedindo sobreposição inclusive em requisições simultâneas.

**Architecture:** Preservar MVVM no frontend e Controller → Service → Repository no backend. Um objeto de período encapsula fuso e validação; a transação MySQL bloqueia a sala, revalida os dados e grava reserva/auditoria atomicamente. Disponibilidade usa um contrato específico, sem expor reservas de terceiros.

**Tech Stack:** TypeScript estrito, React/Vite, NestJS, mysql2, MySQL/InnoDB, Vitest e node:test. Reaproveitar Intl, Relogio e comConexaoLimitada; não adicionar dependências.

**Spec:** `docs/superpowers/specs/2026-10-18-agendamento-mysql-design.md` — aprovada pelo usuário em 18/10/2026.

**Execution:** Execução na conversa atual, pelo implementador principal, preservando o diretório solicitado e os arquivos em andamento do usuário. Plano aguardando revisão antes da implementação. Revisão independente ao final, conforme requesting-code-review; sem implementação delegada, commit, push ou deploy.

## Global Constraints

- America/Sao_Paulo para data/horário comercial; instantes persistidos em UTC.
- Intervalos de uma hora, entre 08:00 e 21:00; início futuro e datas reais.
- Criar com situacao=pendente, situacao_pagamento=pendente e horas_do_plano=0.
- Reserva pendente bloqueia o período; sem expiração automática nesta etapa.
- Não implementar cobrança, débito de plano, imagens, Meus Agendamentos ou administração nesta entrega.
- Não aceitar usuário, total, status, pagamento ou horas do plano no corpo HTTP de criação.
- Não habilitar BookingGateway.getAll para clientes reais.
- Nenhuma migração, alteração de tabela/grant ou atualização de registros existentes.
- Preservar o sistema visual e as alterações locais anteriores, especialmente CSS, UnitsMap e NearestUnits.
- TypeScript estrito, sem any, @ts-ignore ou casts para esconder erros.

## Review Focus

1. COMMIT concluído com resposta perdida: retry do mesmo requestId deve retornar a reserva original, sem duplicação. Cobertura: tarefas 2, 4 e 5.
2. Outro cliente tentando reutilizar requestId: não receber dados nem sucesso da reserva alheia. Cobertura: tarefas 2 e 3.
3. Sala/data mudando enquanto uma resposta chega: nunca apresentar períodos, valor ou protocolo da seleção anterior. Cobertura: tarefa 5.
4. Início ficando passado enquanto se espera o lock: rejeitar após adquirir a sala, sem gravar reserva/auditoria. Cobertura: tarefas 1 e 2.
5. Replay de reserva cancelada ou com início passado: devolver a situação real, sem recriar nem apresentar nova pendência. Cobertura: tarefas 2, 4 e 5.

## Estrutura e contratos decididos

### Backend

- `backend/src/domain/periodo-agendamento.ts`: classe `PeriodoAgendamento`, com `static criar(date: string, timeSlot: string): PeriodoAgendamento`, propriedades readonly `date`, `timeSlot`, `inicio: Date`, `fim: Date`, `horas: number`; métodos `validarInicioFuturo(agora: Date): void` e `calcularCentavos(precoDecimal: string): number`. Formato não implica início futuro até a validação explícita, permitindo replay de pedido antigo.
- `backend/src/domain/horario-comercial.ts`: constantes do fuso/faixas e funções `dataComercial(agora: Date): string`, `limitesDoDia(date: string): { inicio: Date; fim: Date }`, `instanteComercial(date: string, hour: string): Date`. Conversão via Intl/IANA, sem depender do fuso do host ou das tabelas de timezone do MySQL; validar round-trip de calendário/horário.
- `backend/src/dto/agendamento.dto.ts`: `SolicitacaoAgendamento { requestId: string; roomId: string; date: string; timeSlot: string }`, `ReservaPublicaDto` compatível com os campos públicos de Booking (`id`, `userId`, `unitId`, `roomId`, `date`, `timeSlot`, `status`, `adminStatus`, `paymentStatus`, `total`, `hoursFromPlan`, `createdAt`) e `ResultadoReserva { reserva: ReservaPublicaDto; criada: boolean }`.
- `backend/src/dto/disponibilidade.dto.ts`: `DisponibilidadeDto { roomId: string; date: string; timeZone: 'America/Sao_Paulo'; serverNow: string; pricePerHour: number; slots: Array<{ start: string; end: string; available: boolean }> }`.
- `backend/src/repositories/contracts/repositorio-agendamentos.ts`: `AtorAgendamento { id: string; name: string }`, `PedidoAgendamento { requestId: string; roomId: string; periodo: PeriodoAgendamento }`, `DiaDaSala { precoDecimal: string; ocupados: Array<{ inicio: Date; fim: Date }> }` e contrato com `consultarDia(roomId: string, inicio: Date, fim: Date): Promise<DiaDaSala | null>` e `criarPendente(ator: AtorAgendamento, pedido: PedidoAgendamento): Promise<ResultadoReserva>`.
- `backend/src/repositories/mysql/repositorio-agendamentos-mysql.ts`: pool e transação, implementando o contrato e OnModuleDestroy. Construtor `(config: DatabaseConfig, relogio: Relogio = new RelogioSistema(), novoIdAuditoria: () => string = randomUUID)` permite testar tempo e rollback sem privilégios DDL.
- `backend/src/services/servico-agendamentos.ts`: `consultarDisponibilidade(roomId: string, date: string): Promise<DisponibilidadeDto>` e `criar(ator: AtorAgendamento, body: unknown): Promise<ResultadoReserva>`, com contrato estrito e Relogio injetável.
- `backend/src/controllers/agendamentos.controller.ts`, `backend/src/modules/agendamentos.module.ts`: autenticação, perfil, limites, HTTP e lifecycle. Dependências `service`, `auth: Pick<ServicoAutenticacao, 'consultar'>`, `config: AuthConfig`, `lifecycle?: OnModuleDestroy`.
- Adaptar `application.ts`, `app.module.ts` e `main.ts` para receber dependência opcional de agendamentos como quarto argumento, preservando os testes existentes.

### Frontend

- `src/types/domain.ts`: tipos públicos `BookingAvailability` (mesmo formato de DisponibilidadeDto) e `requestId?: string` em CreateBookingInput, sem adicionar requestId ao registro persistido Booking.
- `src/services/contracts.ts`: adicionar `BookingGateway.getAvailability(roomId: string, date: string): Promise<BookingAvailability>`.
- `src/services/agendamentos-http.ts`: classe `AgendamentosHttpGateway`, implementando `getAvailability` e `create` com fetch/callback de revalidação de sessão. Corpo POST contém somente requestId, roomId, date e timeSlot; validação runtime das respostas públicas.
- `src/services/local-storage.ts`: implementar o novo método por meio dos registros existentes, sem alterar o comportamento de criação/pagamento mock. `create-app-services.ts` conecta os dois métodos reais e conserva os demais métodos bloqueados.
- `src/utils/business-time.ts`: `businessWallDate(instant: string): Date` e `businessDateKey(instant: string): string`, usando Intl em America/Sao_Paulo. O Date retornado representa calendário comercial para os componentes, não um instante para persistir.
- Modificar `src/hooks/useBooking.ts`, sem mudar a ordem dos hooks: ramificações mock/HTTP nos efeitos e ações. Preservar os membros existentes e acrescentar `loadError`, `availabilityLoading`, `availabilityError`, `retryLoad`, `retryAvailability`, `pendingReservation`, `resetReservation`, `businessToday`.
- `src/components/booking/PendingBookingReceipt.tsx`: protocolo e situação real da própria reserva, valor, data e período; não indicar pagamento realizado. Atualizar BookingPage, BookingCalendar, BookingTimeSlots e BookingSummary com estados e rótulos reais, mantendo estilos/componentes compartilhados.

---

## Task 1: Período e regras comerciais testáveis

**Files:** Create `backend/src/domain/periodo-agendamento.ts`, `backend/src/domain/horario-comercial.ts`; Test `backend/test/periodo-agendamento.spec.ts`.

**Interfaces:** Produz as funções/classes de domínio descritas acima; consome apenas Date e Intl, sem banco ou HTTP.

- [ ] Escrever testes RED: `2026-02-30` inválida; `08:30 - 10:00`, `07:00 - 09:00`, `20:00 - 22:00`, período invertido e data fora de quatro dígitos rejeitados. Aceitar `08:00 - 21:00` e um intervalo de uma hora.
- [ ] Fixar conversão: `2026-11-09 / 08:00 - 10:00` corresponde a `2026-11-09T11:00:00.000Z` e `13:00Z`, duração 2h; `2026-11-09T02:30Z` é dia comercial `2026-11-08`.
- [ ] Fixar futuro no limite: início igual a agora rejeitado; 1ms antes do início aceito. Parsing de pedido antigo não falha até chamar validarInicioFuturo.
- [ ] Testar centavos: 2h × `50.25` = 10050; aceitar zero; rejeitar preço inválido/negativo e resultado maior que 999999999999 centavos, limite de DECIMAL(12,2).
- [ ] Rodar `cd backend; npm run test` e confirmar falhas das novas regras antes de implementar.
- [ ] Implementar período, cálculo inteiro e conversão com round-trip; não usar Date local do processo para interpretar horários comerciais.
- [ ] Rodar os testes de domínio com TZ=UTC e TZ=America/Sao_Paulo e confirmar os mesmos instantes. Executar typecheck do backend.

## Task 2: Transação de reserva e integração MySQL

**Files:** Create os dois DTOs, contrato/repositorio-agendamentos, implementação MySQL; Test `backend/test/agendamentos-repositorio.spec.ts`; Create `backend/src/check-agendamentos.ts`. Modify `backend/package.json` para `check:agendamentos`.

**Interfaces:** Consome PeriodoAgendamento, Relogio, DatabaseConfig e comConexaoLimitada. Produz o contrato RepositorioAgendamentos e ResultadoReserva definidos acima.

- [ ] Escrever testes RED do protocolo transacional e um verificador de integração local, sem alterar dados do usuário. Fixtures aleatórias de duas contas client, duas salas/unidades, agendamentos e auditoria; remover somente IDs próprios em finally.
- [ ] Fixar ordem da criação: SET timezone UTC / SET TRANSACTION ISOLATION LEVEL READ COMMITTED / BEGIN; bloquear usuário, conferir ativo e perfil; consultar requestId; bloquear sala; revalidar tempo; consultar sobreposição; inserir reserva/auditoria; COMMIT.
- [ ] Fixar idempotência: mesmo ator+requestId+sala+período retorna criada=false; alteração do pedido ou outra conta recebe 409 genérico sem campos alheios. Replay anterior a agora/cancelado retorna o registro existente e sua situação atual.
- [ ] Implementar consultarDia com preço e períodos não cancelados somente da sala/dia; devolver null para sala inexistente. Usar início inclusivo/fim exclusivo no conflito e UTC nos parâmetros.
- [ ] Implementar transação com todos os valores comerciais calculados no servidor. Auditoria: UUID próprio, ator/nome consultados, acao=create, entidade=booking, entidade_id=requestId e detalhes operacionais sem senha/cookie.
- [ ] Integração RED→GREEN: duas chamadas concorrentes para a mesma sala/período, em conexões independentes, deixam exatamente uma reserva e uma auditoria; a outra recebe 409.
- [ ] Integração: aceitar períodos adjacentes e salas distintas; pendente bloqueia e cancelado libera. Confirmar valor decimal e horas_do_plano=0, sem alterar planos/saldos existentes.
- [ ] Forçar falha de auditoria por UUID duplicado de uma fixture própria, usando o gerador de ID injetado; confirmar rollback da reserva e preservação da auditoria anterior, sem DDL/grants/triggers.
- [ ] Simular espera de lock com relógio injetado avançando até o início; rejeitar a reserva e não gravar auditoria. Confirmar timeout descarta conexão seguindo a infraestrutura existente.
- [ ] Rodar `npm run test` e `npm run check:agendamentos` no backend. Verificar limpeza de todas as fixtures; não gerar seed de reservas reais.

## Task 3: API de disponibilidade e criação protegida

**Files:** Create `backend/src/services/servico-agendamentos.ts`, `backend/src/security/limite-agendamentos.ts`, `backend/src/controllers/agendamentos.controller.ts`, `backend/src/modules/agendamentos.module.ts`. Modify `backend/src/security/protecao-http.ts`, `backend/src/application.ts`, `backend/src/app.module.ts`, `backend/src/main.ts`. Tests `backend/test/agendamentos-http.spec.ts`, `backend/test/agendamentos.spec.ts`.

**Interfaces:** GET `/salas/:salaId/disponibilidade?data=AAAA-MM-DD` → DisponibilidadeDto; POST `/agendamentos` com SolicitacaoAgendamento → ReservaPublicaDto (201/200 conforme criada). Auth vem de ServicoAutenticacao.consultar e CookieSessao.

- [ ] Testes RED: 13 faixas por dia; preços vindos da sala; período iniciado e faixas ocupadas indisponíveis; ausência de id/userId/contatos de outras reservas no JSON. UUID/data inválidos →400; sala ausente →404.
- [ ] Testes RED: corpo com userId, total, status ou outros extras rejeitado; requestId apenas UUID v4 canônico; perfil admin/secretaria →403 na criação; sem sessão →401, usuário desativado não cria.
- [ ] Ampliar proteção HTTP para todos os métodos de mutação; GET/HEAD de leitura não exigem JSON. Rejeitar POST sem Origin permitido, Content-Type JSON ou X-C2W-Request:1; testar também `/AGENDAMENTOS/`.
- [ ] Implementar serviço com validação de quatro campos, parser do domínio, preço/faixas obtidos do repositório e relógio do servidor. Criar o ator usando apenas o usuário autenticado, sem identificadores de proprietário do corpo.
- [ ] Implementar rate limit por conta: 10 tentativas de criação/minuto e 60 consultas/minuto. Estruturas com limpeza e no máximo 1000 contas; excedente e mapa cheio →429, sem crescimento ilimitado ou logs sensíveis.
- [ ] Implementar módulo/controller e ligar lifecycle/main. Montar proteção HTTP e parser JSON de 8kb quando agendamentos estiver configurado, mesmo em testes sem o módulo de cadastro.
- [ ] Fixar erros: 409 por conflito/pedido incompatível, 429 por limite e 503 genérico por falhas internas. Usar códigos de negócio estáveis `HORARIO_OCUPADO` e `PEDIDO_INCOMPATIVEL` para mapear ações no frontend, sem usar mensagens SQL.
- [ ] Rodar testes HTTP incluindo a suite de autenticação anterior; validar que POST login/cadastro/logout mantêm suas proteções e nenhum GET renova a sessão.

## Task 4: Gateway de disponibilidade e reserva real

**Files:** Modify `src/types/domain.ts`, `src/services/contracts.ts`, `src/services/local-storage.ts`, `src/services/create-app-services.ts`; Create `src/services/agendamentos-http.ts`; Test `src/services/agendamentos-http.test.ts`, adaptar fixtures AppServices dos testes existentes.

**Interfaces:** BookingAvailability e BookingGateway.getAvailability conforme estrutura definida; método create continua retornando Booking. CreateBookingInput recebe requestId opcional para compatibilidade mock; modo HTTP exige o UUID gerado no ViewModel.

- [ ] Testes RED: GET por sala/data codificadas na URL; cookie incluído, cache=no-store e timeout; resposta inválida, sala/data divergentes ou grade de horários inconsistente rejeitadas, sem fallback.
- [ ] Testes RED: POST envia só requestId/roomId/date/timeSlot mesmo se o input legado tiver userId/status/total. Confirmar JSON de 201 e 200 pertence ao requestId e ao pedido; situação cancelada em replay é preservada.
- [ ] Testar 401 com callback serial checkCurrentSession, sem cancelar login pendente; 409 de horário ocupado tem erro identificável que exige atualizar disponibilidade. Rede/503 não expõem mensagem interna.
- [ ] Implementar AgendamentosHttpGateway com whitelist de campos públicos, prazo de 10s incluindo leitura do corpo e origem/cabeçalho já usados pela autenticação. Não incluir cookies em logs.
- [ ] Implementar getAvailability do mock usando os registros locais e os mesmos períodos, preservando os testes de pagamento/plano demonstrativos.
- [ ] Conectar getAvailability e create no modo HTTP; manter getAll, cancelamento, contagens, consulta de outros usuários e funções administrativas indisponíveis.
- [ ] Rodar `npm run typecheck` e os testes de gateways; adaptar somente fixtures necessárias ao novo contrato, sem enfraquecer as expectativas antigas.

## Task 5: Agendamento real na tela e validação final

**Files:** Modify `src/hooks/useBooking.ts`, `src/pages/BookingPage.tsx`, `src/components/booking/BookingCalendar.tsx`, `src/components/booking/BookingTimeSlots.tsx`, `src/components/booking/BookingSummary.tsx`, `src/components/ProtectedRoute.tsx`; Create `src/utils/business-time.ts`, `src/components/booking/PendingBookingReceipt.tsx`. Tests `src/hooks/useBookingHttp.test.tsx`, `src/utils/business-time.test.ts`, `src/components/booking/PendingBookingReceipt.test.tsx`; preserve `src/hooks/useBooking.test.tsx` e atualizar casos de rotas quando necessário.

**Interfaces:** useBooking conserva a interface anterior e acrescenta os estados/ações definidos no mapa. Componentes recebem hoje comercial e bloqueios explícitos; pendingReservation é Booking retornado pelo servidor, não um sucesso inferido do request.

- [ ] Testes RED: carregar sala/unidade reais; seleção de dia chama só disponibilidade da sala/dia, nunca getAll; slots/confirmar ficam bloqueados durante carregamento ou erro.
- [ ] Testar troca de sala/data, respostas fora de ordem e desmontagem; não exibir intervalo ou protocolo anterior. Remover seleção antiga imediatamente ao trocar a chave sala/dia.
- [ ] Testar calendário comercial com navegador em UTC e outro fuso; instante informado pelo servidor determina hoje/horários iniciados. Mock mantém seu comportamento anterior.
- [ ] Implementar ramificações de modo dentro dos efeitos/ações existentes, sem chamadas condicionais de hooks. No modo real, não consultar nem consumir saldo do plano e não salvar draft de checkout.
- [ ] Gerar requestId com crypto.randomUUID para cada nova seleção; preservar a mesma solicitação em retry após falha de rede. Enquanto confirma, bloquear mudanças de seleção; ao navegar para outra sala, descartar a resposta para a tela anterior sem afirmar que a gravação foi cancelada.
- [ ] Testar e implementar confirmação pendente: total estimado antes do envio, total final do backend depois; sem navigate para /pagamento ou /pagamento-confirmado. Exibir protocolo e situação real com os textos `Agendamento solicitado`, `Pendente de confirmação` e `Nenhum pagamento foi realizado nesta etapa.`; replay cancelado mostra cancelamento, sem criar outra reserva.
- [ ] Em HORARIO_OCUPADO, atualizar disponibilidade, limpar intervalo e orientar nova escolha. Em falha de rede preservar requestId, não declarar que a reserva não foi criada. Nova seleção voluntária gera outro pedido.
- [ ] Habilitar apenas /agendamento nas rotas reais; manter Meus Agendamentos, checkout e administração bloqueados. A sessão expirada continua retornando ao login.
- [ ] Revisar no navegador desktop e celular com conta fictícia: escolher sala/data, criar pendência, verificar período bloqueado, repetir um conflito, nova seleção e logout. Usar apenas reservas/contas próprias descartáveis e removê-las depois; preservar as dez salas cadastradas.
- [ ] Atualizar PRODUCT.md, FEATURES.md, DESIGN.md, PROJECT_STRUCTURE.md, MOCK_DATABASE.md, MIGRATION.md, backend/README.md e database/mysql/README.md com escopo/limites reais.
- [ ] Verificação final: raiz `npm run typecheck`, `npm run test`, `npm run build`; backend `npm run test`, `npm run check:agendamentos`; `git diff --check`. Relatar cada resultado observado, sem garantir ausência absoluta de falhas.
- [ ] Revisão independente conforme requesting-code-review: foco em concorrência, idempotência, privacidade, fuso, CSRF e respostas atrasadas. Corrigir achados importantes e repetir somente as verificações afetadas.
- [ ] Entregar instruções de teste local e limitações: pendências não expiram automaticamente, pagamentos/plano/admin e Meus Agendamentos ainda não integrados. Não fazer commit/push/deploy.

## Revisão do plano

- [x] Especificação aprovada e coberta por tarefas de domínio, persistência, HTTP, gateway e tela.
- [x] Contratos compartilhados e nomes de métodos alinhados entre tarefas.
- [x] Cinco riscos do Review Focus possuem testes atribuídos.
- [x] Preservação do mock, edição administrativa futura e pagamentos fora do escopo explícitos.
- [ ] Revisão do usuário antes da implementação.
