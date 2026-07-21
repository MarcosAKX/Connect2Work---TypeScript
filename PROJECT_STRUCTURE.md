# Connect2Work — Estrutura do Projeto

## Entrada e rotas

- `src/main.tsx` — inicializa React, Router e autenticação.
- `src/App.tsx` — rotas públicas e protegidas sob `/app`.
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

## Componentes

- `src/components/AppShell.tsx` — header autenticado e logout.
- `src/components/ProtectedRoute.tsx` — exige sessão.
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
- `src/utils/validators.ts` — validações e máscara de telefone.
- `src/utils/booking.ts` — datas, horários, conflitos, status automático e janela de cancelamento.

## Visual

- `src/styles.css` — entrada dos estilos e pequenos ajustes compartilhados.
- `src/assets/css/base.css` — tokens, reset e tipografia.
- `src/assets/css/components.css` — componentes compartilhados.
- `src/assets/css/pages/` — estilos por tela.
- `src/assets/css/pages/pagamento.css` — checkout responsivo e estados de pagamento.
- `src/assets/css/pages/pagamento-confirmado.css` — confirmação responsiva após pagamento.
- `src/assets/css/pages/servicos.css` — comparação de serviços e etapas de contratação.
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
