# Connect2Work — Funcionalidades

## Autenticação

- Login por e-mail e senha: implementado (mock local).
- Cadastro com nome, e-mail, profissão, telefone e senha: implementado (mock local).
- Recuperação de senha com estado de confirmação seguro: implementado (mock local).
- Sessão persistida e logout: implementados (mock local).
- Proteção de rotas: implementada com `ProtectedRoute`.
- Login Google: planejado; aguarda Firebase ou Supabase.

## Catálogo

- Listagem de unidades: implementada (dados locais).
- Benefícios “Por que escolher o Connect2Work?”: implementados.
- Listagem de salas por unidade: implementada (dados locais).
- Detalhes, capacidade, preço e comodidades: implementados.
- Galeria preparada para `imageUrl` e `imageUrls`: implementada.
- CRUD administrativo e upload: planejados.

## Serviços empresariais

- Nova área principal “Serviços”: implementada.
- Comparação entre Endereço Fiscal, Endereço Comercial e Plano de Horas: implementada.
- Plano de Horas apresenta as modalidades Flex mensal e Flex semestral/anual.
- Benefícios e fluxo explicativo de contratação: implementados.
- Valores exibidos como “sob consulta” até definição comercial oficial.
- Consulta comercial pelo WhatsApp com nome do usuário e serviço preenchidos: implementada.
- Contratação digital: planejada.

## Agendamentos

- Calendário mensal e bloqueio de datas passadas: implementados.
- Seleção de horários contínuos: implementada.
- Bloqueio de horários ocupados: implementado (mock local).
- Nova checagem de conflito antes da criação: implementada (mock local).
- Cálculo de duração e valor: implementado.
- Criação e persistência: implementadas (mock local).
- Consulta por próximos, passados e cancelados: implementada.
- Filtragem estrita por usuário autenticado: implementada (mock local).
- Mudança automática de próximo para passado conforme data e hora: implementada (mock local).
- Cancelamento pelo proprietário com antecedência mínima de 24 horas: implementado (mock local).
- Confirmação inline, retorno acessível e contagens atualizadas após cancelar: implementados.
- Validação transacional no backend: planejada.

## Próxima etapa de backend

- Revalidar no servidor a identidade do proprietário e a janela exata de 24 horas.
- Impedir reservas concorrentes com transação/constraint no banco.
- Aplicar políticas de acesso por usuário (RLS no Supabase ou Security Rules no Firebase).
- Integrar cobrança real, reembolso e confirmação por webhook idempotente.
- Cobrir criação, cancelamento e concorrência com testes de integração e end-to-end.

## Interface e acessibilidade

- Visual responsivo das sete telas: implementado.
- App shell compartilhado com nome e saída vermelha: implementado.
- Retorno visível e contextual: implementado.
- Fachada e rede animada nas telas públicas: implementadas.
- Foco visível, estados de seleção, loading, disabled e movimento reduzido: implementados.

## Pagamento

- Tela de pagamento acessada após data e horários: implementada.
- Resumo da sala, unidade, data, período, duração e total: implementado.
- PIX com QR demonstrativo e cópia de código: implementado (mock local).
- Cartão com máscara, validação e aviso de não armazenamento: implementado (mock local).
- Nova verificação de conflito antes de confirmar: implementada (mock local).
- Criação da reserva somente após confirmação do pagamento simulado: implementada.
- Tela dedicada de pagamento aprovado e agendamento confirmado: implementada.
- Resumo da reserva e atalhos para agendamentos ou nova reserva: implementados.
- Aviso transparente sobre futuras confirmações por e-mail e WhatsApp: implementado.
- Gateway de pagamento e cobrança real: planejados.
- Envio real de confirmação por e-mail e WhatsApp: planejado.
