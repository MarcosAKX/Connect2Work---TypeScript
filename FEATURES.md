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
- Cards de salas com fotos 16:9, comparação compacta de capacidade e comodidades e CTA de agendamento com preço por hora: implementados.
- CRUD administrativo e upload local de imagens: implementados.
- Endereço Fiscal, Endereço Comercial e Plano de Horas são entidades próprias, com conteúdo, imagem, benefícios, ordem e visibilidade editáveis em `/admin/servicos`.

## Administração

- Usuário administrador seed no mock local: implementado.
- Dashboard com totais de unidades, salas e agendamentos: implementado via gateways.
- Dashboard administrativo inclui faixa de indicadores, atalhos contextuais, central de atenção com pagamentos, confirmações, chegadas e tarefas críticas, agenda com datas e gráfico de reservas ativas/canceladas. Receita permanece fora do painel até integração financeira.
- A seleção de unidades possui mapa interativo Leaflet/OpenStreetMap, marcadores vinculados ao catálogo, geolocalização opcional e cálculo local da unidade mais próxima.
- Painel do Dia oferece faixa operacional, filtros da agenda, linha do tempo diária, confirmação de pagamento, check-in rápido, central de pendências e contagem de reservas dos próximos sete dias.
- O gráfico mensal do dashboard permite alternar entre 6/12 meses, filtrar unidade, ocultar séries, consultar valores em tooltip e abrir Agendamentos com mês/unidade já filtrados.
- O cabeçalho administrativo permite alternar entre modo escuro e claro; a preferência respeita o sistema na primeira visita e fica persistida localmente.
- O cabeçalho do cliente também permite alternar entre modo escuro e claro, compartilhando a mesma preferência persistida.
- A tela de login possui seletor próprio de tema e composição dividida entre a fachada e o painel escuro de acesso, preservando o amarelo solar mesmo quando o restante do sistema está claro.
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
- Papéis disponíveis: `client`, `admin` e `secretaria`; secretaria acessa as ferramentas operacionais autorizadas, sem acessar gestão de contas, unidades ou salas.
- Secretaria possui navegação reduzida e é redirecionada ao tentar acessar dashboard, unidades, salas ou usuários.
- Na gestão de agendamentos, a receita total é exibida somente ao administrador; a secretária mantém os valores e pagamentos individuais necessários à operação.
- Cancelamento administrativo exige motivo, persistido e consultável na tabela.
- Admin e secretaria podem criar agendamentos confirmados para clientes ativos, com busca segura, conflito de horário e valor ajustável.
- Criação administrativa permite registrar pagamento `pending` ou `completed`; reservas do checkout nascem concluídas.
- Admin e secretaria podem confirmar pagamentos pendentes diretamente na lista, com confirmação em modal.
- Admin e secretaria podem realizar check-in rápido em reservas confirmadas; horário e responsável ficam registrados.
- Admin e secretaria possuem `/admin/painel-do-dia`, com nomes dos clientes, agenda cronológica, próxima chegada, presença atual, pendências de check-in/pagamento e uma prévia não redundante dos agendamentos dos próximos sete dias. A agenda diária pode ser filtrada por busca, unidade, situação operacional e período do dia. Esta é a tela inicial da secretaria.
- Admin e secretaria compartilham o quadro `/admin/tarefas`, com três etapas fixas, responsáveis da equipe, prioridades, prazos, filtro pessoal e movimentação por drag-and-drop.
- Administradores podem editar e excluir qualquer tarefa. Secretárias editam e excluem somente as próprias tarefas; após a criação, a data estimada não pode ser alterada por secretárias. A movimentação entre etapas permanece compartilhada.
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
- Seleção de horários contínuos por intervalos: implementada; cada botão já seleciona uma hora completa, e cliques posteriores podem ampliar o período consecutivo.
- Bloqueio de horários ocupados e de intervalos já iniciados no dia atual: implementado (mock local).
- Nova checagem de conflito antes da criação: implementada (mock local).
- Cálculo de duração e valor: implementado.
- Criação e persistência: implementadas (mock local).
- Consulta por próximos, passados e cancelados: implementada.
- Filtragem estrita por usuário autenticado: implementada (mock local).
- Mudança automática de próximo para passado conforme data e hora: implementada (mock local).
- Cancelamento pelo proprietário com antecedência mínima de 24 horas: implementado (mock local).
- Confirmação inline, retorno acessível e contagens atualizadas após cancelar: implementados.
- Plano de horas: consumo integral ou parcial, bloqueio por renovação vencida, débito atômico no mock e estorno no cancelamento elegível implementados.
- Cliente visualiza o saldo atualizado em um único local, no resumo da tela de agendamento; ao selecionar a duração, vê imediatamente o saldo projetado após a reserva. Reservas pagas com plano são identificadas em “Meus Agendamentos”.
- Admin/secretaria aplicam automaticamente o saldo ao criar reserva em nome do cliente; excedente permanece como valor operacional ajustável.
- Planos vencidos podem ser renovados por admin/secretaria na tela dedicada; no agendamento operacional, o plano vencido apenas gera aviso e não concede desconto.
- Gestão dedicada de planos disponível em `/admin/planos-horas` para admin e secretaria, com busca, filtros, métricas, ativação, ajuste, desativação e confirmação de renovação. A gestão de contas permanece separada e exclusiva do admin.
- Validação transacional no backend: planejada.

## Próxima etapa de backend

- Fundação Supabase preparada: UUID em novos registros, mapeadores `snake_case`/domínio, schema SQL inicial com RLS habilitado, backup versionado, auditoria e extrato de horas no adaptador local.
- Backup e auditoria já existem nos gateways, ainda sem tela administrativa própria.
- IDs seed antigos permanecem durante fase local para preservar referências; importação futura deverá gerar mapa de IDs UUID.

- Revalidar no servidor a identidade do proprietário e a janela exata de 24 horas.
- Impedir reservas concorrentes com transação/constraint no banco.
- Aplicar políticas de acesso por usuário (RLS no Supabase ou Security Rules no Firebase).
- Integrar cobrança real, reembolso e confirmação por webhook idempotente.
- Cobrir criação, cancelamento e concorrência com testes de integração e end-to-end.

## Interface e acessibilidade

- Visual responsivo das sete telas: implementado.
- App shell compartilhado com nome e saída vermelha: implementado.
- Retorno visível e contextual: implementado.
- Fachada nas telas públicas e rede animada no cadastro e na recuperação de senha: implementadas.
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
## Governança local e preparação para backend

- O administrador pode exportar e restaurar um backup JSON versionado em `/admin/backup`.
- A restauração valida o arquivo, usa rollback em caso de falha e encerra a sessão ao concluir.
- A tela `/admin/atividades` apresenta auditoria das operações e extrato do plano de horas.
- Sessões de usuários removidos ou inativos são invalidadas automaticamente.
- Uploads administrativos aceitam apenas JPEG, PNG e WebP, com limite de 2 MB e normalização WebP.
- A aplicação possui tela 404 e limite global para falhas inesperadas da interface.
- O backup operacional usa schema 3, inclui serviços empresariais e não exporta senhas, tokens ou sessões; autenticação fica separada para a futura adoção do Supabase Auth.
