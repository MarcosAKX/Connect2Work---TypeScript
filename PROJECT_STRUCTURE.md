# Connect2Work — Estrutura do Projeto

## Padrão para novas telas

A aplicação usa React com serviços por contratos e separação View / ViewModel
progressiva. O padrão orienta novas telas e refatorações; não exige converter
todas as páginas nem implementar MVVM clássico com classes.

- **Página (`src/pages/`):** compõe seções e conecta contexto de autenticação/rota ao fluxo da tela.
- **ViewModel (`src/hooks/`):** concentra estado, validações do fluxo e coordenação das ações. Preferir `useNomeDaTela`; se já existir hook de dados compartilhado, compô-lo sem duplicar seus dados ou regras.
- **Componentes (`src/components/<area>/`):** apresentam seções coerentes com props tipadas. Estado estritamente visual, referências DOM e ciclo de vida de dialogs podem permanecer locais.
- **Domínio e regras puras:** tipos em `src/types/domain.ts`, funções reutilizáveis em `src/utils/`; não copiar regras entre telas.
- **Dados:** operações passam pelos contratos de `src/services/contracts.ts` e seus adaptadores. Páginas/componentes não acessam banco, SDK ou armazenamento diretamente.
- **Backend futuro:** uma API deverá implementar as validações, permissões e transações no servidor e acessar MySQL. A separação do frontend não substitui segurança de backend.

Extrair apenas responsabilidades claras. Não criar hooks sem lógica, componentes
triviais ou uma segunda cópia de estado apenas para cumprir nomenclatura. Manter
os tokens, shells, proteções de rota e componentes compartilhados existentes.

### Critérios de conclusão

1. Testar comportamentos importantes (sucesso, erro, validação e perfis aplicáveis), com datas controladas em cenários temporais.
2. Em refatoração estrutural, preservar textos, HTML relevante, classes, navegação, regras e formato dos dados; não acrescentar funcionalidades.
3. Executar `npm run typecheck`, `npm run test` e `npm run build`. Informar limitações e avisos; comparação de HTML não equivale a teste visual no navegador.
4. Atualizar esta documentação para mudanças estruturais; atualizar os demais documentos somente quando seu conteúdo for afetado.

## Entrada e rotas

Em 08/10/2026, os 22 arquivos `src/pages/*.test.tsx` foram removidos por solicitação do usuário. Referências a esses testes nas seções de refatoração abaixo registram validações históricas; esses arquivos não integram mais a suíte atual. Os testes fora de `src/pages` permanecem.

- `src/main.tsx` — inicializa React, Router e autenticação.
- `src/App.tsx` — rotas públicas, do cliente e administrativas.
- `vite.config.ts` — Vite, React e Vitest.
- `vercel.json` — fallback das rotas da SPA para `index.html` no Vercel.

### Carregamento sob demanda das rotas

- `src/App.tsx` declara as páginas com `React.lazy` e caminhos explícitos de `import()`, fora do componente. Novas páginas devem seguir esse padrão, mantendo os guards existentes.
- `Suspense` em `App` cobre rotas públicas; `AppShell` e `AdminShell` possuem limites junto ao `Outlet`, preservando o cabeçalho enquanto a página é baixada. `RouteLoading` anuncia “Carregando página…” sem animação e usa os tokens dos dois temas.
- O JavaScript de Leaflet acompanha `UnitsPage`, não a entrada do login. Componentes e utilitários compartilhados podem gerar arquivos comuns automaticamente pelo Vite; não há configuração manual de chunks nem alteração de dependências.
- `src/route-styles.ts` mantém os estilos das páginas carregados antecipadamente na ordem anterior. Isto evita que seletores compartilhados mudem de prioridade conforme a navegação. Os estilos globais continuam em `src/styles.css`; otimizar/separar CSS exige outra revisão da cascata, não mover imports silenciosamente para as páginas lazy.
- Falha no download de uma página chega ao `ErrorBoundary` existente, com ação manual “Recarregar aplicação”. Não há recarga automática nem descarte de dados/formulários por um mecanismo de retry. Uma recarga manual pode perder campos ainda não salvos, como já ocorre ao recarregar o site.
- Lazy loading melhora distribuição do código; **não é controle de acesso**. Guards, regras dos gateways e necessidade de validação no futuro backend permanecem inalterados.
- `src/App.test.tsx` cobre as rotas reais, perfis, redirecionamentos, parâmetros, rascunho do checkout, estado de confirmação e navegação sem remontar o cabeçalho. `RouteLoading.test.tsx` cobre espera e falha de download.

Medição local em 21/09/2026 (build de produção): JavaScript único anterior de **626,63 kB / 176,38 kB gzip**; entrada nova de **282,70 kB / 87,12 kB gzip**. Somando entrada, runtime e dependências necessárias para abrir o login: **295,54 kB / 91,22 kB gzip**, redução aproximada de **53% sem compressão / 48% gzip**. `UnitsPage` com mapa: **155,94 kB / 45,98 kB gzip**, sob demanda. Nenhum chunk ultrapassou 500 kB, sem aumentar o limite do aviso. Estes números medem arquivos, não tempo de carregamento nem Core Web Vitals em produção.

Validação visual/funcional local: login dos três perfis, mapa com tiles, fluxo cliente até o checkout sem confirmar pagamento, dashboard e modal via `novo=1`, restrição da secretária, recarga de rota privada, temas claro/escuro e navegação mobile. CSS anterior comparado byte a byte no build: idêntico, exceto pela regra nova `.route-loading`. Não substitui medição em aparelho/rede reais nem teste do próximo deploy.

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

### Separação View / ViewModel — Planos de Horas

- `src/pages/AdminHoursPlanPage.tsx` compõe a View e lê o usuário autenticado para preservar o retorno ao dashboard exclusivo do admin.
- `src/hooks/useAdminHoursPlanPage.ts` coordena edição, renovação e conversão dos campos para a entrada do gateway; fecha os modais somente após sucesso.
- `src/hooks/useHoursPlanForm.ts` mantém campos e validações do formulário. Saldo acima do pacote continua permitido com aviso, como antes.
- `src/components/admin-hours-plan/` separa `HoursPlanStats`, `HoursPlanFilters`, `HoursPlanTable`, `PlanDialog` e `RenewalDialog`, mantendo HTML, classes e ciclo de vida dos dialogs.
- `useAdminHoursPlan` permanece inalterado: busca, filtros, métricas globais, notificações e mutações via serviços. Regras de saldo, renovação, auditoria e extrato permanecem no gateway existente.
- `src/pages/AdminHoursPlanPage.test.tsx` cobre filtros, ativação, validações, ajuste, desativação, renovação por admin/secretaria, falhas e recuperação de carregamento com relógio controlado.
- Sem alterações de CSS, rotas, permissões, contratos ou dados persistidos.

### Separação View / ViewModel — Gerenciar Serviços

- `src/pages/AdminBusinessServicesPage.tsx` compõe a View, usando `ServiceCard` e `ServiceDialog` em `src/components/admin-business-services/`.
- `src/hooks/useAdminBusinessServicesPage.ts` coordena edição, fechamento, erros e mensagem de sucesso. A mensagem permanece persistente como no comportamento anterior.
- `src/hooks/useBusinessServiceForm.ts` concentra campos, validação, normalização dos benefícios por linha e upload via `prepareImageUpload`.
- `useAdminBusinessServices` permanece inalterado, com leitura e atualização via gateway. Tipo, ordem, visibilidade e benefícios secundários são preservados ao salvar.
- `src/pages/AdminBusinessServicesPage.test.tsx` cobre listagem, cancelamento, validação, edição, benefícios, visibilidade e erro de persistência.
- Sem alterações de CSS, rotas, contratos ou regras de dados.

### Separação View / ViewModel — Atividades

- `src/pages/AdminActivityPage.tsx` compõe a View e fornece o usuário autenticado ao `useAdminActivity`.
- `src/hooks/useAdminActivity.ts` concentra carregamento via gateways, clientes, busca e limite incremental de 30 registros. A leitura inicial mantém o limite de 500 registros.
- `src/hooks/useHoursStatement.ts` coordena consulta do extrato pelo cliente e ator autenticado, preservando o comportamento existente.
- `src/components/admin-activity/ActivityList.tsx` e `HoursStatement.tsx` apresentam registros e movimentos. Rótulos compartilhados ficam em `src/utils/activity-labels.ts`.
- `src/pages/AdminActivityPage.test.tsx` cobre paginação, busca, seleção de cliente, identificação do ator, extrato vazio e falha inicial.
- Sem mudanças de CSS, rotas, permissões, gateways ou dados. Tratamento de falhas/concorrência na consulta do extrato não foi ampliado nesta refatoração.

### Separação View / ViewModel — Dashboard

- `src/pages/AdminDashboardPage.tsx` compõe cabeçalho, estado de erro, indicadores, gráfico, pendências e agendas.
- `src/components/admin-dashboard/` separa `DashboardOverview`, `DashboardAttention`, `DashboardSchedules`, `BookingList` e `MonthlyBookingsChart`.
- `src/hooks/useMonthlyBookingsChart.ts` concentra período, unidade, séries visíveis e geometria derivada do gráfico. Links mensais e formatação permanecem na apresentação.
- `useAdminDashboard` permanece inalterado: carregamento via gateways, agregações, datas e métricas não foram duplicados ou modificados.
- `src/pages/AdminDashboardPage.test.tsx` cobre métricas, agenda limitada a quatro registros, nomes, links, período, unidade, séries, estados vazios e recuperação de erro, com relógio controlado.
- Sem alterações de CSS, rotas, permissões ou regras. A comparação temporária de HTML/SVG passou nos estados inicial, 12 meses, unidade filtrada e série oculta; não substitui avaliação visual no navegador.

### Separação View / ViewModel — Meus Agendamentos

- `src/pages/BookingsPage.tsx` compõe a View e fornece o usuário autenticado ao `src/hooks/useBookings.ts`.
- `useBookings` coordena catálogo, reservas por status, contagens, confirmação/cancelamento e feedback temporário. Leituras e mutações continuam pelos gateways.
- `src/components/bookings/BookingTabs.tsx` mantém navegação acessível por teclado e referências de foco locais; `BookingList.tsx` apresenta cartões, datas, plano de horas e confirmação inline.
- `canCancelBooking` e o gateway de cancelamento permanecem inalterados, inclusive proprietário e limite exato de 24 horas.
- `src/pages/BookingsPage.test.tsx` cobre isolamento por usuário, categorias/contagens, 24h, erro, foco por teclado, aviso temporário e estado vazio.
- Sem mudanças de CSS, rotas, contratos ou regras. Tratamento de erros/concorrência das leituras iniciais não foi ampliado nesta refatoração.

### Separação View / ViewModel — Pagamento

- `src/pages/PaymentPage.tsx` compõe a View e preserva redirecionamentos por rascunho ausente, de outro usuário ou catálogo indisponível.
- `src/hooks/usePayment.ts` coordena catálogo, método, campos do cartão em memória, cópia PIX, checagem de conflito e confirmação demonstrativa pelos gateways.
- `src/components/payment/` separa `PaymentPanel`, `PaymentSummary` e `DemoQrCode`; `src/utils/payment.ts` mantém as máscaras e validações existentes.
- `src/pages/PaymentPage.test.tsx` cobre rascunhos inválidos, PIX/cartão, conflito, falha de persistência e consumo parcial do plano. Comparação temporária de HTML passou em PIX, cartão e validação.
- Sem mudanças de CSS, cobrança real, regras de cartão, contratos ou dados. Campos de cartão não são enviados aos gateways.

### Separação View / ViewModel — Salas do cliente

- `src/pages/RoomsPage.tsx` mantém composição, parâmetro de unidade, redirecionamento e distribuição dos cartões nas duas colunas.
- `src/hooks/useRooms.ts` coordena leitura da unidade e das salas pelo CatalogGateway, sem duplicar dados ou usar o campo estático `availableRooms` na contagem.
- `src/components/rooms/RoomCard.tsx` apresenta fotos, comodidades, preço e link de reserva; índice do carrossel permanece local a cada cartão por ser estado de apresentação.
- `src/pages/RoomsPage.test.tsx` cobre unidade ausente/inexistente, contagem real, colunas, preços, links, carrosséis independentes, placeholder e estado vazio.
- Sem alterações de CSS, contratos, permissões ou regras. Comparação temporária de HTML passou no estado inicial e após avançar uma foto. Tratamento de falhas/concorrência das leituras foi preservado.

### Separação View / ViewModel — Serviços do cliente

- `src/pages/ServicesPage.tsx` compõe a vitrine editorial e fornece o nome do usuário autenticado aos conteúdos.
- `src/hooks/useServices.ts` coordena o carregamento público pelo BusinessServiceGateway e deriva os três tipos de serviço, mantendo a proteção contra atualizações após desmontagem.
- `src/components/services/ServiceContent.tsx` apresenta descrição, benefícios, modalidades e CTA; `ServiceMedia.tsx` apresenta imagem ou fallback administrativo.
- `src/utils/service-contact.ts` preserva número do WhatsApp, saudação por horário local e codificação da mensagem com nome do cliente e serviço.
- `src/pages/ServicesPage.test.tsx` cobre catálogo, ordem editorial, imagens, fallback, modalidades, mensagens/saudações, nome vazio, carregamento e catálogo vazio. Comparação temporária de HTML passou com o catálogo completo.
- Sem mudanças de CSS, rotas, contratos ou dados. O tratamento de falha de leitura permanece como antes; não foi acrescentada recuperação de erro nesta refatoração estrutural.

### Separação View / ViewModel — Unidades do cliente

- `src/pages/UnitsPage.tsx` compõe catálogo, mapa e painel de proximidade.
- `src/hooks/useUnits.ts` coordena leitura via CatalogGateway, seleção, solicitação explícita de geolocalização e estados de permissão. Distâncias e unidades ordenadas são derivadas sem duplicar estado.
- `src/components/units/UnitLocationCard.tsx` apresenta a unidade; `NearestUnits.tsx` apresenta proximidade, permissão e retorno à lista. A rolagem DOM permanece na apresentação.
- `src/utils/coordinates.ts` preserva o cálculo de distância geográfica antes local à página. O componente `UnitsMap` e seu ciclo de vida Leaflet permanecem inalterados.
- `src/pages/UnitsPage.test.tsx` cobre catálogo, seleção sincronizada, links, geolocalização explícita, ordenação, unidades sem coordenadas, erros de permissão/indisponibilidade e catálogo vazio. Leaflet é simulado na fronteira; testes não validam carregamento de tiles externos. Comparação temporária de HTML inicial passou.
- Sem mudanças de CSS, rotas, permissões ou dados. Contagem continua usando `unit.availableRooms`, como antes nesta tela; tratamento de falhas de leitura não foi ampliado.

### Separação View / ViewModel — Login

- `src/pages/LoginPage.tsx` apresenta formulário e redirecionamento declarativo; visibilidade da senha permanece local por ser estado visual.
- `src/hooks/useLogin.ts` concentra campos, validação obrigatória, loading, erros e coordenação de login/Google via AuthContext, preservando destinos por perfil e atualização da sessão.
- `PublicAuthLayout`, tema, contratos, autenticação mock e rotas permanecem inalterados. Não foi criada integração real com Google nem novos componentes sem responsabilidade própria.
- `src/pages/LoginPage.test.tsx` cobre sessões e login dos três perfis, validação, senha visível, links, loading, falha com nova tentativa, Google indisponível e tema. Comparação temporária de HTML passou nos estados inicial e de erro obrigatório.
- Sem alterações de CSS, mensagens, regras, permissões ou persistência.

### Separação View / ViewModel — Cadastro

- `src/pages/RegisterPage.tsx` compõe o formulário e mantém visibilidade das duas senhas como estado visual independente.
- `src/hooks/useRegister.ts` coordena campos, máscara, ordem das validações, loading, erros e cadastro via AuthGateway, preservando retorno ao login com `registered: true`.
- `src/components/auth/RegisterFormField.tsx` apresenta os campos tipados e controles de visibilidade antes locais à página; validadores existentes são reaproveitados sem mudanças.
- `src/pages/RegisterPage.test.tsx` cobre sequência de validação, telefone, dados enviados, retorno ao login, falha/repetição e visibilidade independente. Comparação temporária de HTML passou nos estados inicial e de validação.
- Sem mudanças de CSS, contratos, permissões, regras ou persistência. Confirmação da senha não é enviada ao gateway.

### Separação View / ViewModel — Recuperar senha

- `src/pages/RecoverPasswordPage.tsx` apresenta formulário e confirmação, reaproveitando PublicAuthLayout.
- `src/hooks/useRecoverPassword.ts` concentra e-mail, validação existente, loading, erro genérico e solicitação via AuthGateway. O e-mail continua enviado com `trim()`.
- `src/pages/RecoverPasswordPage.test.tsx` cobre validação, confirmação uniforme para endereços distintos, loading, falha sem exposição do detalhe interno e nova tentativa. Comparação temporária de HTML passou nos estados inicial e de confirmação.
- Sem mudanças de CSS, textos, contratos ou dados. O envio permanece simulado no adaptador local; não foi implementada integração de e-mail.

### Revisão estrutural — Confirmação de pagamento

- `src/pages/PaymentConfirmationPage.tsx` permanece uma View simples: recebe resumo da rota, apresenta detalhes, volta ao topo e fornece atalhos. Não coordena persistência ou pagamento.
- Não foi criado ViewModel: extrair apenas leitura da rota e formatação local acrescentaria camada sem responsabilidade própria. A confirmação não substitui validação financeira no backend.
- `src/pages/PaymentConfirmationPage.test.tsx` cobre estado ausente/sem ID, resumo, data, duração singular/plural, rolagem inicial, aviso de integrações futuras e navegação dos dois atalhos.
- Código da página, CSS, dados, textos e comportamento permanecem inalterados.

### Revisão estrutural — Página 404

- `src/pages/NotFoundPage.tsx` permanece uma View simples, sem ViewModel artificial: exibe aviso e deriva destino de retorno do perfil autenticado.
- `src/pages/NotFoundPage.test.tsx` cobre ausência de sessão e os perfis cliente, admin e secretaria, verificando mensagem, destino e navegação pelo link.
- Página, CSS e rota curinga permanecem inalterados. Backup também foi revisado após autorização posterior, conforme seção abaixo. Otimização do bundle permanece etapa separada.

### Separação View / ViewModel — Backup

- `src/pages/AdminBackupPage.tsx` compõe cabeçalho, feedback e as seções de exportação/restauração, fornecendo usuário e logout do AuthContext.
- `src/hooks/useAdminBackup.ts` coordena data do último backup, arquivo, confirmação, estados de operação, feedback temporário, download e restauração pelos gateways.
- `src/components/admin-backup/BackupExport.tsx` e `BackupRestore.tsx` apresentam os controles; a referência DOM do arquivo permanece local à apresentação.
- Mantidos limite de 20 MB, aceite de JSON, confirmação exata `RESTAURAR`, validação estrutural no gateway, logout após importação e retorno a `/login`. Persistência, permissões, schema e política de credenciais não mudaram.
- `src/pages/AdminBackupPage.test.tsx` cobre exportação, aviso de cinco segundos, arquivo inválido/grande, confirmação, erros, limpeza ao trocar arquivo e sequência importação/logout/redirecionamento com gateways simulados. Comparação temporária de HTML passou antes e depois de selecionar arquivo.
- Revisão estrutural das telas previstas concluída. Otimização do bundle e conferência do mapa externo no navegador continuam separadas. Tratamento de concorrência na leitura de arquivos não foi ampliado nesta refatoração.

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

## SQL MySQL consolidado

- database/mysql/estrutura-inicial.sql contém as 14 tabelas em português extraídas do banco local e ordenadas por dependências, somente com criações. Substitui o arquivo anterior de seis tabelas.
- database/mysql/seeds/001_perfis.sql guarda os perfis iniciais sem credenciais.
- database/mysql/README.md registra evidências e limitações. A restauração em outro schema ainda não foi validada. Frontend permanece no mock local.

## Backend local — etapa 1

- backend/ tem package.json, lockfile e TypeScript estrito próprios; configuração em src/config, infraestrutura MySQL em src/infrastructure/database e controller em src/api.
- backend/src/application.ts compõe NestJS; main.ts inicia em loopback; check-database.ts testa acesso real sem alterar dados.
- backend/test usa Node test runner; Vitest da raiz inclui somente src/**/*.test.{ts,tsx}, separando as suítes.
- backend/.env, node_modules e dist são ignorados pelo Git. Frontend continua no mock. Leia backend/README.md para executar.
