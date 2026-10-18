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
- Cards de salas com fotos 16:9, comparação compacta de capacidade e comodidades, preço por hora destacado e CTA separado “Ver horários”: implementados.
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
- Login, cadastro e recuperação de senha possuem seletor de tema e compartilham composição dividida entre fachada e painel de acesso; o painel acompanha o tema claro ou escuro e preserva o amarelo solar como destaque.
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
- Na gestão de agendamentos, a receita total e a coluna de valor são exibidas somente ao administrador; a secretária mantém o estado e as ações de pagamento necessários à operação.
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

- Código das páginas carregado sob demanda, com aviso acessível e cabeçalho autenticado preservado durante a espera. O mapa é baixado ao abrir Unidades, não junto do login.
- Falhas no download de tela usam a recuperação global existente; regras, dados locais e permissões não foram alterados por essa otimização.

- Visual responsivo das sete telas: implementado.
- App shell compartilhado com nome e saída vermelha: implementado.
- Retorno visível e contextual: implementado.
- Fachada persistente no fluxo público de autenticação: implementada no login, cadastro e recuperação de senha.
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

## API local — etapa 1

- GET /health e /ready implementados, com testes isolados do backend. Nenhuma rota de dados privados foi habilitada.
- Validação de configuração, pool MySQL, decimais como string, consultas parametrizadas e sessões UTC. Senha em backend/.env ignorado pelo Git.
- Conexão real ainda depende de configuração local; oito testes não comprovam acesso ao banco real. Login/cadastro continuam mock.
- Direção atual: MySQL. Referências Supabase anteriores são preparação histórica, não integração ativa.

## Cadastro real — etapa de backend (11/10/2026)

POST /auth/register implementado com classes ServicoCadastro, ServicoSenha (Argon2id) e RepositorioUsuariosMysql. Senha de 6 a 128 unidades UTF-16, sem caracteres em branco; perfil client definido no servidor, consultas parametrizadas, respostas sem senha/hash. Migracao senha_hash confirmada pelo usuario. Teste HTTP/MySQL real validou criacao e duplicata; fixture temporaria removida.

Frontend e MVVM existentes permanecem no mock. Integracao da tela, maxlength, login e sessao sao proximas etapas. Contrato HTTP, limites locais e verificacoes detalhados em backend/README.md.
## Integracao progressiva do cadastro — 11/10/2026

CadastroHttpGateway implementa cadastro HTTP e AuthHttpGateway implementa login/sessão/logout. create-app-services.ts seleciona os adaptadores conforme modo, preservando View/RegisterPage e ViewModel/useRegister. Cadastro confirmado navega para /login sem iniciar sessão. Contas MySQL agora podem entrar no login real. Não copia contas/senhas para mock nem faz fallback se HTTP falhar.

Integração atual: VITE_AUTH_API=true em .env.development.local ativa cadastro, login, sessão e logout HTTP no desenvolvimento. Produção usa API obrigatoriamente e falha fechada se /api estiver indisponível. Proxy Vite /api aponta para http://127.0.0.1:3001; implantação exige proxy HTTPS equivalente. Nenhuma credencial MySQL usa variável VITE_.

Gateway envia somente os cinco campos do contrato, timeout de 10 segundos, sem cookies; valida resposta em runtime e seleciona apenas campos publicos. Erros sao traduzidos por status, sem exibir mensagem interna do servidor. Os dois inputs ja possuiam maxlength=128; mantidos e conferidos no navegador. Validacao de espacos e comprimento permanece no ViewModel e backend. Testes adicionados fora de pages, em hooks e services.
## Validacao de nome e profissao — 11/10/2026

Nome e profissao rejeitam caracteres numericos (categoria Unicode N) com mensagens especificas. Validadores compartilhados do frontend e ServicoCadastro do backend aplicam a regra antes de cadastrar; acentos, espacos e pontuacao continuam permitidos conforme as validacoes existentes. Nao remove numeros silenciosamente nem altera registros ja gravados.
## Etapa de sessões no backend — 11/10/2026

Implementados POST /auth/login, GET /auth/session, POST /auth/activity e POST /auth/logout. Perfil e usuário ativo consultados no banco; login inválido retorna “Senha incorreta”. Limites de sessão: 15min de inatividade e 4h absolutas. Token aleatório com hash no banco, cookie HttpOnly/SameSiteStrict; proteção de Origin/JSON/cabeçalho nos POST de auth e limites de tentativas. Operações MySQL de autenticação têm prazo integral de 5 segundos e descarte de conexões falhas.

Frontend integrado: login, restauração, atividade e logout via API; contratos privados sem implementação HTTP ficam bloqueados.

## Integração de sessão no frontend — 11/10/2026

Login e cadastro usam a API local/MySQL. AuthHttpGateway encapsula HTTP; AuthContext coordena estado; hooks coordenam ações e Views apresentam a interface, preservando MVVM no frontend e camadas/POO no backend. Token fica em cookie HttpOnly, sem localStorage. Sessão não persistente: 15 minutos sem atividade e limite absoluto de 4 horas. GET de sessão não renova; interação real em aba visível registra atividade no máximo uma vez por minuto.

Rotas aguardam confirmação inicial da API. Falha de rede bloqueia acesso com mensagem genérica e nova tentativa. Verificação ao retornar à aba preserva a página, bloqueando interação até confirmar; prazo vencido bloqueia imediatamente. Logout só encerra visualmente após confirmação do servidor; falha permite tentar novamente. Respostas antigas não reabrem sessão encerrada.

Em modo HTTP, catálogo de unidades/salas/serviços ainda é demonstração estática somente leitura. Reservas, pagamento, plano de horas, tarefas, auditoria, backup e administração aguardam integração e ficam bloqueados; não usam dados privados mock. Google e recuperação de senha ainda indisponíveis. Desenvolvimento sem VITE_AUTH_API usa mock explicitamente; produção sempre usa API. Sessões reais não são exportadas em backups.

Validação: testes automatizados cobrem limites, falhas e concorrência; navegador confirmou senha incorreta, login real, recarga mantendo sessão, bloqueio de reservas e logout com rota privada redirecionada. Conta fictícia de teste e suas sessões removidas após validação. Não houve publicação.
## Unidades no MySQL — 17/10/2026

A tela /unidades agora consulta GET /api/unidades pelo UnidadesHttpGateway. A API exige sessão válida e usuário ativo, sem renovar atividade em consultas GET. UnidadesController → ServicoUnidades → RepositorioUnidades → RepositorioUnidadesMysql preserva a arquitetura por camadas; View UnitsPage e ViewModel useUnits continuam separados.

A consulta lê unidades e conta salas por LEFT JOIN, incluindo unidades sem salas. O campo availableRooms do contrato legado significa quantidade de salas cadastradas; a interface usa esse rótulo, sem prometer disponibilidade por horário. Coordenadas DECIMAL são convertidas para números e validadas. Sem coordenadas, a unidade continua na lista e não recebe marcador no mapa. Imagens continuam provisórias: URL HTTPS ou caminho relativo à raiz são aceitos; chave ainda sem armazenamento configurado usa a imagem substituta da interface. Upload/resolução de chaves será uma etapa própria.

Carregamento, lista vazia e falha com Tentar novamente são explícitos. Respostas atrasadas são ignoradas; não há fallback de unidades para seeds ou localStorage no modo HTTP. Um 401 revalida a sessão atual na fila de autenticação sem cancelar um login/logout em andamento. Salas ficam bloqueadas até a integração seguinte, evitando misturar IDs reais com salas demonstrativas. Serviços empresariais ainda são demonstrativos somente leitura; administração e reservas continuam pendentes.

Nenhuma alteração de tabela ou migração foi necessária. Não foram importados dados demonstrativos permanentes. Teste HTTP/MySQL com fixtures próprias cobriu acesso sem sessão, contagem zero/um, coordenadas e rejeição após logout; fixtures removidas ao finalizar. Navegador conferiu card e mapa com dados temporários reais. Cadastro de unidades pela administração ainda não implementado no modo HTTP.
## Cadastro inicial das unidades — 17/10/2026

A pedido do usuário, as duas unidades do mockup foram cadastradas no MySQL local pelo arquivo comentado database/mysql/seeds/002_unidades.sql: Connect2Work 1 (Av. Osvaldo Perrone, 776, Parque Eldorado) e Connect2Work 2 (R. Lucas Evangelista, 368, Centro), ambas em Bebedouro/SP. Endereços, descrições e coordenadas aproximadas foram preservados do mock-data.ts, com novos UUIDs fixos. Nenhum usuário ou sala foi importado; imagens seguem sem arquivo configurado. A contagem de salas é calculada do banco e não copia o número cinco do mockup. O seed evita duplicação por ID/nome/endereço e não atualiza registros existentes. Aplicação local confirmou duas inclusões. Não houve publicação na Vercel.
## Redirecionamento por expiração — 17/10/2026

Quando o prazo já confirmado pela API é atingido, AuthContext encerra o acesso na interface e as rotas protegidas retornam ao login, sem exigir nova consulta HTTP. O prazo usa o menor entre inatividade e expiração absoluta, com o ajuste de relógio recebido da API. Um temporizador independente continua ativo mesmo se uma verificação falhar ou ficar pendente; respostas antigas não reabrem a sessão. Nova confirmação de atividade substitui o prazo anterior. A interface libera o estado inert ao expirar.

O backend continua sendo a autoridade para aceitar requisições: não houve alteração dos limites de 15 minutos/4 horas nem das verificações no servidor. Esta mudança é conservadora no cliente: o prazo conhecido também pode encerrar essa aba quando outra aba tiver renovado a sessão sem sincronização local. Falhas de verificação antes de conhecer um prazo (por exemplo, primeira abertura com API indisponível) continuam exibindo Tentar novamente; expiração conhecida retorna ao login. Em abas suspensas, a interface atualiza quando o navegador retoma a execução.

Regressões cobrem expiração por inatividade e absoluta com rede indisponível, consulta pendente, resposta tardia, erro anterior ao vencimento e renovação do prazo. Não há alteração de tabelas, credenciais ou dados.
## Salas e comodidades no MySQL — 18/10/2026

Concluída a integração de /salas?unidade=<UUID>. GET /unidades/:unidadeId/salas lista somente as salas da unidade, incluindo salas sem comodidades; UUID válido inexistente retorna lista vazia. GET /salas/:salaId retorna o detalhe ou 404. Ambas as rotas exigem sessão válida e usuário ativo, não renovam atividade e usam Cache-Control: no-store. Identificadores inválidos retornam 400 e falhas internas têm resposta genérica 503. DTO público não inclui dados de usuários ou credenciais.

SalasController → ServicoSalas → RepositorioSalas → RepositorioSalasMysql segue as camadas existentes. Consulta parametrizada com LEFT JOIN sala_comodidades/comodidades e agrupamento por sala, sem GROUP_CONCAT e sem consultas por comodidade. Preço DECIMAL é convertido para número finito e não negativo; capacidade positiva. Prazo integral e descarte de conexões falhas seguem a infraestrutura atual.

SalasHttpGateway implementa os contratos de listagem/detalhe, valida respostas em runtime e recusa mistura de unidades. Usa cookies, prazo de 10s e revalidação serial de sessão em 401 sem cancelar login novo. createAppServices agora conecta salas reais. useRooms coordena carregamento, vazio, erro/retry, unidade ausente e respostas antigas. Troca de URL não exibe salas da unidade anterior. RoomsPage mantém o layout e usa Salas da unidade, sem prometer disponibilidade por horário.

O seed comentado database/mysql/seeds/003_salas_comodidades.sql foi aplicado localmente: 10 salas (cinco por unidade), 9 comodidades e 38 associações. Preserva nomes, capacidades e preços do mockup. Apenas inclusões, sem atualizar salas existentes; aplicação repetida confirmou zero novas inclusões. Requer os dois nomes de unidade únicos do seed002. Não altera tabelas nem cria contas. Imagens continuam em Fotos em breve; imagens_salas/armazenamento ainda serão integrados. Agendamentos, horários, pagamento e administração permanecem bloqueados até suas etapas. A implantação Vercel não foi alterada.

Teste local npm run check:salas no backend inicia API isolada em porta aleatória, valida MySQL/HTTP com fixtures próprias e as remove em finally. Cobre unidade vazia, sala sem comodidades, N:N compartilhado, agrupamento de várias comodidades, filtro entre unidades, preço decimal, sessão, UUID inválido, detalhe ausente e logout. Navegador conferiu cinco salas de cada unidade, preços/comodidades e bloqueio de agendamentos. As alterações locais pré-existentes do usuário em CSS/mapa foram preservadas.
## Gestão de usuários MySQL — 18/10/2026

Gestão de usuários HTTP/MySQL liberada exclusivamente para admin: busca com debounce de 250 ms, filtros e paginação de 50 registros, resumo global, cadastro/edição e ativação/inativação. Versão esperada evita sobrescrita concorrente (409). Secretaria/cliente não recebem dados de contas. Auto-inativação/rebaixamento são bloqueados. Mudança de senha/perfil/inativação revoga sessões; login com senha antiga em andamento não cria sessão após redefinição. Dashboard, plano de horas, backup e demais módulos pendentes continuam bloqueados no modo HTTP.
