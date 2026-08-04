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
- `src/assets/img/` — imagens próprias da aplicação, incluindo a logo compacta `cwlogo.ico`.

## Testes

- `src/services/local-storage.test.ts` — autenticação, persistência, propriedade e cancelamento.
- `src/services/supabase/mappers.test.ts` — conversão tipada entre Supabase e domínio.
- `src/utils/booking.test.ts` — conflito, horário, status e limite exato de 24 horas.

## Contexto para agentes

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
