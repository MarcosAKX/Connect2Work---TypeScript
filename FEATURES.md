# Connect2Work — Funcionalidades

## Autenticação

- Login por e-mail e senha: implementado (mock local).
- Cadastro com nome, e-mail, profissão, telefone e senha: implementado (mock local).
- Recuperação de senha com estado de confirmação seguro: implementado (mock local).
- Sessão persistida e logout: implementados (mock local).
- Proteção de rotas: implementada com `ProtectedRoute`.
- Perfis `client` e `admin`, redirecionamento após login e proteção da área administrativa: implementados.
- Login Google: planejado; aguarda Firebase ou Supabase.

## Catálogo

- Listagem de unidades: implementada (dados locais).
- Benefícios “Por que escolher o Connect2Work?”: implementados.
- Listagem de salas por unidade: implementada (dados locais).
- Detalhes, capacidade, preço e comodidades: implementados.
- Carrossel individual em cada card e galeria ampliada deduplicada via `imageUrl` e `imageUrls`: implementados.
- CRUD administrativo e upload local de imagens: implementados.

## Administração

- Usuário administrador seed no mock local: implementado.
- Dashboard com totais de unidades, salas e agendamentos: implementado via gateways.
- Dashboard administrativo inclui usuários ativos, ocupação atual, pagamentos pendentes, check-ins, agenda com datas, atalhos contextuais e gráfico de reservas ativas/canceladas dos últimos seis meses. Receita permanece indisponível até integração financeira.
- O gráfico mensal do dashboard permite alternar entre 6/12 meses, filtrar unidade, ocultar séries, consultar valores em tooltip e abrir Agendamentos com mês/unidade já filtrados.
- O cabeçalho administrativo permite alternar entre modo escuro e claro; a preferência respeita o sistema na primeira visita e fica persistida localmente.
- O cabeçalho do cliente também permite alternar entre modo escuro e claro, compartilhando a mesma preferência persistida.
- A tela de login possui seletor próprio de tema, mas preserva sua composição escura de fachada, rede de conexões e dourado mesmo quando o restante do sistema está claro.
- Agendamentos de hoje e dos próximos sete dias, com identificação do cliente: implementados.
- Receita total: indisponível até o domínio persistir o valor efetivamente pago.
- Gestão de unidades com criação, edição, imagem local e exclusão protegida: implementada via `CatalogGateway`.
- Confirmações de criação, edição e exclusão desaparecem automaticamente após cinco segundos.
- Unidades com salas vinculadas não podem ser excluídas.
- A tabela administrativa usa a contagem real de salas vinculadas.
- Gestão de salas: implementada em `/admin/salas`, com filtro por unidade, criação, edição, imagens, comodidades e exclusão protegida.
- Salas com agendamentos vinculados não podem ser excluídas.
- Notificações de sucesso da gestão de salas desaparecem após cinco segundos.
- Gestão de agendamentos: implementada em `/admin/agendamentos`, com visão diária padrão, busca, filtros, métricas, receita, confirmação e cancelamento.
- Status administrativo usa `pending`, `confirmed` e `cancelled`, mantendo separado o status temporal usado pelo cliente.
- Gestão de usuários: implementada em `/admin/usuarios`, com busca, filtros, estatísticas, cadastro e edição completa de dados, permissão, senha e status.
- Papéis disponíveis: `client`, `admin` e `secretaria`; secretaria acessa exclusivamente `/admin/agendamentos`.
- Secretaria possui navegação reduzida e é redirecionada ao tentar acessar dashboard, unidades, salas ou usuários.
- Cancelamento administrativo exige motivo, persistido e consultável na tabela.
- Admin e secretaria podem criar agendamentos confirmados para clientes ativos, com busca segura, conflito de horário e valor ajustável.
- Criação administrativa permite registrar pagamento `pending` ou `completed`; reservas do checkout nascem concluídas.
- Admin e secretaria podem confirmar pagamentos pendentes diretamente na lista, com confirmação em modal.
- Admin e secretaria podem realizar check-in rápido em reservas confirmadas; horário e responsável ficam registrados.
- Admin e secretaria possuem `/admin/painel-do-dia`, com nomes dos clientes, agenda cronológica, próxima chegada, presença atual e pendências de check-in/pagamento. A agenda diária pode ser filtrada por busca, unidade, situação operacional e período do dia. Esta é a tela inicial da secretaria.
- Admin e secretaria compartilham o quadro `/admin/tarefas`, com três etapas fixas, responsáveis da equipe, prioridades, prazos, filtro pessoal e movimentação por drag-and-drop.
- Os menus administrativos exibem a contagem de tarefas vencidas ou vencendo hoje.
- Lista destaca reservas confirmadas de hoje ainda aguardando chegada e mostra a métrica “Check-ins Hoje”.
- O administrador autenticado não pode remover a própria permissão nem desativar a própria conta.
- Menu lateral de ferramentas administrativas: implementado no shell admin.

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
