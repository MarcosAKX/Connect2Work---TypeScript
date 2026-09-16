# Connect2Work — Estrutura do Projeto

## Entrada e rotas

- `src/main.tsx` — inicializa React, Router e autenticação.
- `src/App.tsx` — rotas públicas, do cliente e administrativas.
- `vite.config.ts` — Vite, React e Vitest.
- `vercel.json` — fallback das rotas da SPA para `index.html` no Vercel.

## Páginas

- `src/pages/LoginPage.tsx` — `/login`.
- `src/pages/RegisterPage.tsx` — `/cadastro`.
- `src/pages/RecoverPasswordPage.tsx` — `/recuperar-senha`.
- `src/pages/UnitsPage.tsx` — `/unidades`, protegida.
- `src/pages/RoomsPage.tsx` — `/salas?unidade={id}`, protegida.
- `src/pages/BookingPage.tsx` — `/agendamento?sala={id}`, protegida.
- `src/pages/PaymentPage.tsx` — `/pagamento`, protegida; PIX, cartão demonstrativo e confirmação da reserva.
- `src/pages/PaymentConfirmationPage.tsx` — `/pagamento-confirmado`, protegida; confirmação e resumo da reserva.
- `src/pages/BookingsPage.tsx` — `/meus-agendamentos`, protegida; filtros por usuário e cancelamento inline.
- `src/pages/ServicesPage.tsx` — `/servicos`, protegida; composição visual de endereço fiscal, endereço comercial e plano de horas, imagens derivadas do catálogo e consulta pelo WhatsApp.
- `src/pages/AdminDashboardPage.tsx` — `/admin`, protegida por perfil; resumo administrativo e agenda.
- `src/pages/AdminUnitsPage.tsx` — `/admin/unidades`, protegida por perfil; CRUD de unidades e upload local.
- `src/pages/AdminRoomsPage.tsx` — `/admin/salas`, protegida por perfil; CRUD, filtro, imagens e comodidades.
- `src/pages/AdminBusinessServicesPage.tsx` — `/admin/servicos`, exclusiva de administradores; conteúdo, imagem e visibilidade dos serviços empresariais.
- `src/pages/AdminBookingsPage.tsx` — `/admin/agendamentos`, protegida por perfil; métricas, filtros e ações operacionais.
- `src/pages/AdminDailyPanelPage.tsx` — `/admin/painel-do-dia`; visão diária e tela inicial da secretaria.
- `src/pages/AdminUsersPage.tsx` — `/admin/usuarios`, exclusiva de administradores; cadastro, edição, acessos e permissões.
- `src/pages/AdminHoursPlanPage.tsx` — `/admin/planos-horas`; gestão operacional de planos por admin e secretaria.
- `src/pages/AdminTasksPage.tsx` — `/admin/tarefas`; quadro compartilhado por admin e secretaria.
- `src/state/ThemeContext.tsx` — preferência global de tema, detecção do sistema e persistência local.
- `src/assets/css/theme.css` — ajustes ópticos e de contraste específicos do modo claro.

## Componentes

- `src/components/AppShell.tsx` — header autenticado e logout.
- `src/components/ProtectedRoute.tsx` — exige sessão.
- `src/components/AdminRoute.tsx` — exige sessão e aceita lista explícita de papéis permitidos.
- `src/components/AdminShell.tsx` — header e navegação da área administrativa.
- `src/components/AdminSidebar.tsx` — drawer das ferramentas administrativas.
- `src/components/BackLink.tsx` — retorno reutilizável.
- `src/components/ThemeToggle.tsx` — controle único de tema usado por login, cliente, admin e secretaria.
- `src/components/PublicAuthLayout.tsx` — composição compartilhada de fachada e painel usada por login, cadastro e recuperação de senha.
- `src/components/UnitsMap.tsx` — mapa Leaflet/OpenStreetMap, marcadores das unidades e posição opcional do cliente.
- `src/components/NetworkBackground.tsx` — fundo animado legado, disponível para futuras composições públicas.
- `src/components/icons.tsx` — ícones SVG reutilizáveis.

## Dados e serviços

- `src/types/domain.ts` — entidades e entradas tipadas.
- `src/services/contracts.ts` — contratos independentes do backend.
- `src/services/index.ts` — composição dos serviços ativos.
- `src/services/local-storage.ts` — adaptador local provisório.
- `src/services/errors.ts` — erros de domínio estáveis entre adaptadores.
- `src/services/ids.ts` — geração e validação de UUID para novos registros.
- `src/services/supabase/mappers.ts` — fronteira entre linhas `snake_case` e domínio TypeScript.
- `supabase/migrations/` — schema PostgreSQL inicial, índices e RLS habilitado.
- `supabase/seed.sql` — ponto seguro para seeds futuros, sem senhas do mock.
- `CheckoutGateway` — rascunho temporário entre agendamento e pagamento.
- `src/services/mock-data.ts` — unidades e salas locais.
- `src/services/mock-business-services.ts` — seeds de Endereço Fiscal, Endereço Comercial e Plano de Horas.
- `src/hooks/useAdminBusinessServices.ts` — leitura e atualização administrativa dos serviços empresariais.
- `src/state/AuthContext.tsx` — estado da sessão para React.
- `src/hooks/useAdminDashboard.ts` — composição dos dados administrativos via gateways.
- `src/hooks/useAdminUnits.ts` — listagem, contagem de salas e mutações administrativas de unidades.
- `src/hooks/useAdminRooms.ts` — listagem filtrada e mutações administrativas de salas.
- `src/hooks/useAdminBookings.ts` — enriquecimento, filtros, estatísticas e ações administrativas de agendamentos.
- `src/hooks/useCreateBookingForAdmin.ts` — clientes, catálogo, horários, conflito e criação manual.
- `src/hooks/useAdminUsers.ts` — listagem, filtros, métricas e mutações administrativas de usuários.
- `src/hooks/useAdminHoursPlan.ts` — listagem, filtros, métricas, ajustes e renovação de planos de horas.
- `src/hooks/useAdminTasks.ts` — quadro, responsáveis, filtro pessoal, CRUD, movimentação otimista e indicador de prazos.
- `src/utils/validators.ts` — validações e máscara de telefone.
- `src/utils/booking.ts` — datas, horários, conflitos, status automático e janela de cancelamento.
- `src/utils/booking.ts` também centraliza validade e divisão de consumo/cobrança do plano de horas.
- `src/utils/room-images.ts` — normalização e remoção de imagens duplicadas da galeria de salas.
- `src/utils/tasks.ts` — comparação local de prazos, formatação e contagem de tarefas que exigem atenção.

## Visual

- `src/styles.css` — entrada dos estilos e pequenos ajustes compartilhados.
- `src/assets/css/base.css` — tokens, reset e tipografia.
- `src/assets/css/components.css` — componentes compartilhados.
- `src/assets/css/pages/` — estilos por tela.
- `src/assets/css/pages/pagamento.css` — checkout responsivo e estados de pagamento.
- `src/assets/css/pages/pagamento-confirmado.css` — confirmação responsiva após pagamento.
- `src/assets/css/pages/servicos.css` — comparação de serviços e etapas de contratação.
- `src/assets/css/pages/admin-business-services.css` — cards e formulário administrativo dos serviços empresariais.
- `src/assets/css/pages/admin-dashboard.css` — shell, métricas, agenda e responsividade administrativa.
- `src/assets/css/pages/admin-units.css` — tabela, modais, upload e responsividade da gestão de unidades.
- `src/assets/css/pages/admin-rooms.css` — tabela, filtro, modal e responsividade da gestão de salas.
- `src/assets/css/pages/admin-bookings.css` — painel diário, filtros, tabela e modal da gestão de agendamentos.
- `src/assets/css/pages/admin-users.css` — painel responsivo de usuários, filtros, tabela e modais.
- `src/assets/css/pages/admin-hours-plan.css` — gestão responsiva de saldo, ciclos e renovação dos planos.
- `src/assets/css/pages/admin-operations-polish.css` — acabamento compartilhado das três telas operacionais críticas.
- `src/assets/css/pages/admin-tasks.css` — quadro Kanban, cards, estados de prazo e modais de tarefas.
- `src/assets/css/admin-sidebar.css` — drawer administrativo, overlay e estados ativos.
- `src/assets/css/ui-foundations.css` — foco, tabelas, tipografia administrativa, placeholders e movimento reduzido compartilhados.
- `src/assets/css/mobile-phase-one.css` — correções estruturais mobile compartilhadas: header administrativo compacto, filtros empilhados, modais responsivos, alvos de toque e grades de métricas.
- `src/assets/img/` — imagens próprias da aplicação, incluindo a logo compacta `cwlogo.ico`.

## Testes

- `src/hooks/useBooking.test.tsx` — seleção de períodos, conflitos, plano integral/parcial/vencido, rascunho e erros de pagamento, com relógio controlado.
- `src/pages/BookingPage.test.tsx` — integração React da página: calendário, carrossel, resumo e navegação ao checkout.
- `src/pages/AdminBookingsPage.test.tsx` — integração da listagem administrativa: filtros, contexto da URL, criação, cancelamento com motivo, pagamento, check-in com responsável e diferenças entre admin/secretaria.
- `src/pages/AdminDailyPanelPage.test.tsx` — filtros operacionais/período, métricas globais, limite temporal da presença, pagamento/check-in de admin e secretaria, erros, estados vazios e links dos próximos sete dias.
- `src/pages/AdminTasksPage.test.tsx` — quadro por responsável, criação, edição/exclusão por autor e papel, prazo bloqueado para secretária, teclado, drag-and-drop, rollback e erros de persistência.
- `src/pages/AdminUsersPage.test.tsx` — busca e filtros, cadastro, validação, edição de dados/senha/papel, autoproteção administrativa, atualização da sessão, ativação/desativação e erros de persistência.

## Piloto de separação View / ViewModel — Agendamento

- `src/pages/BookingPage.tsx` compõe a View, lê a rota e mantém carregamento/redirecionamento.
- `src/hooks/useBooking.ts` é o ViewModel: estado único da reserva, coordenação dos gateways, disponibilidade apresentada, saldo, total e ações de confirmação/pagamento.
- `src/components/booking/RoomGallery.tsx`, `BookingCalendar.tsx`, `BookingTimeSlots.tsx` e `BookingSummary.tsx` são seções visuais. A galeria mantém apenas seu índice local de imagem.
- Regras de conflito, datas e plano permanecem em `src/utils/booking.ts` e nos serviços. O hook aceita `AppServices` para testes sem acoplar a View ao armazenamento.
- Primeiro piloto aplicado a Agendamento; Gerenciar Agendamentos, Painel do Dia, Tarefas e Gerenciar Usuários seguem as separações descritas abaixo. As demais telas ainda seguem sua organização anterior. CSS e rotas foram preservados.
- A futura API com MySQL deverá implementar os contratos de serviços; esta separação não instala nem integra um backend.

- Cenários temporais de disponibilidade e listagem de reservas usam datas explícitas nas funções e no relógio injetável do adaptador local, sem depender do dia de execução. Cobrem datas passadas, início do horário, cancelamento e transição para histórico.

- `src/services/local-storage.test.ts` — autenticação, persistência, propriedade e cancelamento.
- `src/services/supabase/mappers.test.ts` — conversão tipada entre Supabase e domínio.
- `src/utils/booking.test.ts` — conflito, horário, status e limite exato de 24 horas.

## Separação View / ViewModel — Gerenciar Agendamentos

- `src/pages/AdminBookingsPage.tsx` compõe a View e recebe usuário/consulta da rota, sem coordenar mutações ou manter o estado dos modais.
- `src/hooks/useAdminBookingsPage.ts` coordena modais, filtros recebidos pela URL, ações operacionais e notificações de cinco segundos. Compõe o `useAdminBookings` existente, sem duplicar dados ou regras.
- `src/hooks/useAdminBookings.ts` permanece inalterado: leitura via gateways, filtros, métricas e mutações continuam compartilhados com Painel do Dia.
- `src/components/admin-bookings/AdminBookingStats.tsx`, `AdminBookingFilters.tsx` e `AdminBookingTable.tsx` apresentam métricas, filtros, estados de carregamento/vazio e tabela, mantendo HTML e classes existentes.
- `CancelBookingDialog.tsx`, `CancellationReasonDialog.tsx`, `ConfirmPaymentDialog.tsx` e `CreateBookingDialog.tsx`, na mesma pasta, separam os modais. Estado local do campo de motivo e ciclo de vida do elemento dialog permanecem nos componentes; criação reaproveita `useCreateBookingForAdmin`, sem alterar suas regras.
- `src/components/admin-bookings/formatters.ts` contém apenas formatação de moeda, datas, horário de check-in e rótulos exibidos.
- Refatoração interna: sem mudança de CSS, rotas, permissões, contratos, persistência ou regras de pagamento/cancelamento/check-in. Não integra MySQL nem modifica Painel do Dia.

## Contexto para agentes

### Separação View / ViewModel — Painel do Dia

- `src/pages/AdminDailyPanelPage.tsx` compõe a View e fornece o usuário autenticado ao ViewModel; não mantém filtros, estado do modal ou coordenação de mutações.
- `src/hooks/useAdminDailyPanel.ts` compõe `useAdminBookings` e concentra busca/unidade/situação/período, agenda filtrada, próximos sete dias, estado do modal, check-in, confirmação de pagamento e notificações temporárias.
- `src/components/admin-daily-panel/` separa `DailyPanelMetrics`, `DailyPanelFilters`, `DailyPanelAgenda`, `DailyPanelAttention`, `DailyPanelUpcoming` e `DailyConfirmPaymentDialog`. Os componentes mantêm HTML, classes e textos existentes; o modal conserva o ciclo de vida do elemento dialog.
- `src/utils/daily-panel.ts` reúne os auxiliares puros de formatação de datas e limites de horário antes locais à página.
- Filtros continuam afetando somente a agenda, não as métricas globais. Presença exige check-in e horário em andamento; check-ins permanecem contabilizados após o fim do intervalo.
- Refatoração sem alteração de CSS, rotas, contratos, persistência ou regras. `useAdminBookings`, compartilhado com Gerenciar Agendamentos, permanece inalterado.

### Separação View / ViewModel — Tarefas

- `src/pages/AdminTasksPage.tsx` compõe a View e fornece o usuário autenticado ao `useAdminTasksPage`.
- `src/hooks/useAdminTasksPage.ts` coordena formulário, edição, exclusão, validação do título, referências dos dialogs e eventos de arrastar/soltar. Mantém o ciclo de abertura/fechamento existente.
- `src/components/admin-tasks/TaskBoard.tsx` renderiza colunas e estados vazios/carregamento; `TaskCard.tsx` apresenta conteúdo, responsável, prioridade, prazo e interações existentes.
- `TaskEditorDialog.tsx` e `TaskDeleteDialog.tsx`, na mesma pasta, apresentam os formulários e confirmações sem acessar armazenamento.
- `src/hooks/useAdminTasks.ts` permanece inalterado: contratos de dados, filtro por responsável, mutações, notificações e rollback da movimentação continuam centralizados nele. O indicador de tarefas do menu não foi modificado.
- Admin continua editando/excluindo qualquer tarefa; secretária somente as próprias, sem alterar prazo após criação. Movimentação entre colunas continua compartilhada. HTML, CSS, rotas e regras do gateway foram preservados.

### Separação View / ViewModel — Gerenciar Usuários

- `src/pages/AdminUsersPage.tsx` compõe a View e fornece usuário/atualização de sessão ao `useAdminUsersPage`.
- `src/hooks/useAdminUsersPage.ts` coordena criação/edição, atualização da sessão ao editar a própria conta e confirmação de desativação. O estado `formUser` mantém os significados existentes: `undefined` fechado, `null` cadastro e `User` edição.
- `src/hooks/useManagedUserForm.ts` mantém campos, validações de nome/e-mail/senha e indicadores de edição/autoproteção, sem acessar persistência. Senha vazia na edição continua preservando a atual.
- `src/components/admin-users/` separa `UserStats`, `UserFilters`, `UserTable`, `UserFormDialog` e `DeactivateUserDialog`, mantendo HTML, classes, textos e ciclo de vida dos dialogs.
- `src/hooks/useAdminUsers.ts` permanece inalterado: gateways, filtros, métricas, mutações e notificações existentes são reaproveitados. Rotas, permissões, CSS, contratos e formato dos dados não mudam.
- A refatoração preserva o bloqueio de perda de permissão/desativação da própria conta administrativa; não acrescenta segurança de backend ao mock.

### Separação View / ViewModel — Gerenciar Salas

- `src/pages/AdminRoomsPage.tsx` compõe a View; `src/hooks/useAdminRoomsPage.ts` coordena modais, ações e notificações temporárias.
- `src/hooks/useRoomForm.ts` concentra campos, validações, imagens e comodidades do formulário. Reaproveita `prepareImageUpload`, mantendo o limite de seis imagens.
- `src/components/admin-rooms/` separa tabela, formulário, confirmação de exclusão e campos de imagens/comodidades, preservando HTML e classes.
- `useAdminRooms` permanece inalterado: leitura, filtro e mutações continuam via CatalogGateway. Exclusão com reservas vinculadas permanece bloqueada no serviço.
- `src/pages/AdminRoomsPage.test.tsx` cobre filtros, cadastro, edição, validação, galeria, comodidades, erros e exclusão protegida. O processamento de pixels do upload é simulado no teste de persistência; depende do canvas do navegador.
- Sem alterações de CSS, rotas, permissões, contratos ou formato dos dados.

### Separação View / ViewModel — Gerenciar Unidades

- `src/pages/AdminUnitsPage.tsx` compõe a View; `src/hooks/useAdminUnitsPage.ts` coordena modais, ações e notificações de cinco segundos.
- `src/hooks/useUnitForm.ts` mantém campos, validações de coordenadas e upload via `prepareImageUpload`.
- `src/components/admin-units/` separa `UnitTable`, `UnitFormDialog` e `DeleteUnitDialog`, preservando HTML, classes e ciclo de vida dos dialogs.
- `useAdminUnits` permanece inalterado: contagem real de salas, leitura e mutações via CatalogGateway. Exclusão de unidades com salas permanece bloqueada.
- `src/pages/AdminUnitsPage.test.tsx` cobre contagem, cadastro, coordenadas, edição, exclusão protegida, falhas, imagem e estado vazio. Processamento de pixels é simulado na fronteira de upload; depende de canvas no navegador.
- Sem mudanças de CSS, rotas, permissões, contratos ou formato dos dados.

### Instruções e referências

- `AGENTS.md` — instruções gerais.
- `.cursor/rules/` — regras sempre aplicadas.
- `.agents/skills/` — skills locais instaladas.
- `PRODUCT.md` e `DESIGN.md` — produto e sistema visual.
- `FEATURES.md`, `MOCK_DATABASE.md` e `MIGRATION.md` — estado funcional e técnico.
### Governança e resiliência

- `src/pages/AdminBackupPage.tsx`: exportação e restauração administrativa do mock local.
- `src/pages/AdminActivityPage.tsx`: auditoria e extrato de movimentações do plano de horas.
- `src/components/ErrorBoundary.tsx`: recuperação global de falhas de renderização.
- `src/pages/NotFoundPage.tsx`: destino explícito para rotas inexistentes.
- `src/utils/image-upload.ts`: validação, redimensionamento e normalização dos uploads locais.
