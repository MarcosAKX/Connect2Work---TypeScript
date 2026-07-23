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
- `src/pages/ServicesPage.tsx` — `/servicos`, protegida; endereço fiscal, endereço comercial, plano de horas e consulta pelo WhatsApp.
- `src/pages/AdminDashboardPage.tsx` — `/admin`, protegida por perfil; resumo administrativo e agenda.
- `src/pages/AdminUnitsPage.tsx` — `/admin/unidades`, protegida por perfil; CRUD de unidades e upload local.
- `src/pages/AdminRoomsPage.tsx` — `/admin/salas`, protegida por perfil; CRUD, filtro, imagens e comodidades.
- `src/pages/AdminBookingsPage.tsx` — `/admin/agendamentos`, protegida por perfil; métricas, filtros e ações operacionais.
- `src/pages/AdminDailyPanelPage.tsx` — `/admin/painel-do-dia`; visão diária e tela inicial da secretaria.
- `src/pages/AdminUsersPage.tsx` — `/admin/usuarios`, exclusiva de administradores; acessos e permissões.

## Componentes

- `src/components/AppShell.tsx` — header autenticado e logout.
- `src/components/ProtectedRoute.tsx` — exige sessão.
- `src/components/AdminRoute.tsx` — exige sessão e aceita lista explícita de papéis permitidos.
- `src/components/AdminShell.tsx` — header e navegação da área administrativa.
- `src/components/AdminSidebar.tsx` — drawer das ferramentas administrativas.
- `src/components/BackLink.tsx` — retorno reutilizável.
- `src/components/NetworkBackground.tsx` — fundo animado das telas públicas.
- `src/components/icons.tsx` — ícones SVG reutilizáveis.

## Dados e serviços

- `src/types/domain.ts` — entidades e entradas tipadas.
- `src/services/contracts.ts` — contratos independentes do backend.
- `src/services/index.ts` — composição dos serviços ativos.
- `src/services/local-storage.ts` — adaptador local provisório.
- `CheckoutGateway` — rascunho temporário entre agendamento e pagamento.
- `src/services/mock-data.ts` — unidades e salas locais.
- `src/state/AuthContext.tsx` — estado da sessão para React.
- `src/hooks/useAdminDashboard.ts` — composição dos dados administrativos via gateways.
- `src/hooks/useAdminUnits.ts` — listagem, contagem de salas e mutações administrativas de unidades.
- `src/hooks/useAdminRooms.ts` — listagem filtrada e mutações administrativas de salas.
- `src/hooks/useAdminBookings.ts` — enriquecimento, filtros, estatísticas e ações administrativas de agendamentos.
- `src/hooks/useCreateBookingForAdmin.ts` — clientes, catálogo, horários, conflito e criação manual.
- `src/hooks/useAdminUsers.ts` — listagem, filtros, métricas e mutações administrativas de usuários.
- `src/utils/validators.ts` — validações e máscara de telefone.
- `src/utils/booking.ts` — datas, horários, conflitos, status automático e janela de cancelamento.
- `src/utils/room-images.ts` — normalização e remoção de imagens duplicadas da galeria de salas.

## Visual

- `src/styles.css` — entrada dos estilos e pequenos ajustes compartilhados.
- `src/assets/css/base.css` — tokens, reset e tipografia.
- `src/assets/css/components.css` — componentes compartilhados.
- `src/assets/css/pages/` — estilos por tela.
- `src/assets/css/pages/pagamento.css` — checkout responsivo e estados de pagamento.
- `src/assets/css/pages/pagamento-confirmado.css` — confirmação responsiva após pagamento.
- `src/assets/css/pages/servicos.css` — comparação de serviços e etapas de contratação.
- `src/assets/css/pages/admin-dashboard.css` — shell, métricas, agenda e responsividade administrativa.
- `src/assets/css/pages/admin-units.css` — tabela, modais, upload e responsividade da gestão de unidades.
- `src/assets/css/pages/admin-rooms.css` — tabela, filtro, modal e responsividade da gestão de salas.
- `src/assets/css/pages/admin-bookings.css` — painel diário, filtros, tabela e modal da gestão de agendamentos.
- `src/assets/css/pages/admin-users.css` — painel responsivo de usuários, filtros, tabela e modais.
- `src/assets/css/admin-sidebar.css` — drawer administrativo, overlay e estados ativos.
- `src/assets/img/` — imagens próprias da aplicação, incluindo a logo compacta `cwlogo.ico`.

## Testes

- `src/services/local-storage.test.ts` — autenticação, persistência, propriedade e cancelamento.
- `src/utils/booking.test.ts` — conflito, horário, status e limite exato de 24 horas.

## Contexto para agentes

- `AGENTS.md` — instruções gerais.
- `.cursor/rules/` — regras sempre aplicadas.
- `.agents/skills/` — skills locais instaladas.
- `PRODUCT.md` e `DESIGN.md` — produto e sistema visual.
- `FEATURES.md`, `MOCK_DATABASE.md` e `MIGRATION.md` — estado funcional e técnico.
