# Histórico de evolução até 19/10/2026

Este arquivo preserva integralmente o conteúdo dos sete guias antes de separar
instruções vigentes de relatos de implementação. Há repetições, caminhos antigos
e estados intermediários contraditórios. **Não usar como instrução operacional.**
Consulte o [índice atual](../../README.md#documentação) e o
[mapa do projeto](../../PROJECT_STRUCTURE.md).

Datas e resultados aqui são relatos anteriores, não novas verificações.

---

## Documento original: PRODUCT.md

# Produto — Connect2Work

## Visão

Plataforma web para encontrar unidades de coworking, reservar salas e conhecer
serviços empresariais, como endereço fiscal e comercial.

## Usuários

- Profissionais autônomos.
- Pequenas equipes.
- Pessoas que precisam de salas por hora para reunião ou trabalho concentrado.
- Administradores responsáveis por acompanhar unidades, salas e agendamentos.

## Objetivos principais

1. Criar conta ou entrar.
2. Escolher unidade.
3. Comparar salas.
4. Selecionar data e período contínuo.
5. Conferir resumo e criar agendamento.
6. Consultar reservas por status.
7. Comparar serviços empresariais e consultar condições nas unidades.
8. Acessar um painel administrativo conforme o perfil autenticado.

## Plataforma

Web responsiva. Uso esperado em desktop e celular.

## Registro visual

Interface de produto. Design serve à tarefa: familiar, direto, escuro e com
destaque dourado reservado para marca, foco, seleção e ações principais.

## Estado atual

- Gestão de usuários implementada para administradores, com cadastro, edição de dados pessoais e credenciais, papéis `client`, `admin` e `secretaria`, controle de acesso e autoproteção administrativa.
- Secretaria entra pelo Painel do Dia e acessa também a gestão de agendamentos. O painel concentra chegadas, presença, pagamentos e ações urgentes para uso contínuo no balcão.

- Catálogo inicial de serviços empresariais implementado; consultas comerciais direcionadas ao WhatsApp e contratação digital pendente.

- Frontend React completo.
- Persistência local provisória.
- Persistência local possui schema versionado, backup tipado, auditoria e extrato de plano; contratos permitem integração progressiva com a API MySQL.
- Checkout e pagamento demonstrativo implementados; gateway real ainda pendente.
- Login Google aguarda escolha do backend.
- Administração de unidades, salas e imagens locais implementada.
- Dashboard administrativo e gestão de unidades, salas e agendamentos implementados.

## Backend — etapa 1 (08/10/2026)

- Fundação local NestJS/TypeScript em backend/, com health/readiness e driver MySQL. Frontend permanece no mock; autenticação e cobrança reais não implementadas.
- MySQL substitui a direção Supabase para o backend novo; o schema legado foi removido em 19/10/2026. Conexao real da API validada por check:database.

## Cadastro real — etapa de backend (11/10/2026)

POST /auth/register implementado com classes ServicoCadastro, ServicoSenha (Argon2id) e RepositorioUsuariosMysql. Senha de 6 a 128 unidades UTF-16, sem caracteres em branco; perfil client definido no servidor, consultas parametrizadas, respostas sem senha/hash. Migracao senha_hash confirmada pelo usuario. Teste HTTP/MySQL real validou criacao e duplicata; fixture temporaria removida.

Frontend e MVVM existentes permanecem no mock. Integracao da tela, maxlength, login e sessao sao proximas etapas. Contrato HTTP, limites locais e verificacoes detalhados em backend/README.md.
## Integracao progressiva do cadastro — 11/10/2026

CadastroHttpGateway implementa cadastro HTTP e AuthHttpGateway implementa login/sessão/logout. create-app-services.ts seleciona os adaptadores conforme modo, preservando View/RegisterPage e ViewModel/useRegister. Cadastro confirmado navega para /login sem iniciar sessão. Contas MySQL agora podem entrar no login real. Não copia contas/senhas para mock nem faz fallback se HTTP falhar.

Integração atual: VITE_AUTH_API=true em .env.development.local ativa cadastro, login, sessão e logout HTTP no desenvolvimento. Produção usa API obrigatoriamente e falha fechada se /api estiver indisponível. Proxy Vite /api aponta para http://127.0.0.1:3001; implantação exige proxy HTTPS equivalente. Nenhuma credencial MySQL usa variável VITE_.

Gateway envia somente os cinco campos do contrato, timeout de 10 segundos, sem cookies; valida resposta em runtime e seleciona apenas campos publicos. Erros sao traduzidos por status, sem exibir mensagem interna do servidor. Os dois inputs ja possuiam maxlength=128; mantidos e conferidos no navegador. Validacao de espacos e comprimento permanece no ViewModel e backend. Testes adicionados fora de pages, em hooks e services.
## Login e sessões — backend (11/10/2026)

API local agora oferece login, consulta de sessão, atividade e logout com MySQL. Sessões expiram após 15 minutos sem atividade ou 4 horas absolutas; consultas não renovam atividade. Cookie HttpOnly, SameSite=Strict, sem persistência; apenas hash SHA-256 do token no banco. Senha continua Argon2id e, por decisão do produto, somente os primeiros 128 caracteres UTF-16 participam do hash, com proibição de espaços no valor completo recebido. Nenhuma senha ou hash é devolvido.

Backend e frontend agora integram login e sessão. Recuperação de senha e Google ainda não existem na API. Publicação exige HTTPS e revisão da infraestrutura.

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

A gestão de usuários em /admin/usuarios passou a usar a API e o MySQL no modo real. Administrador pode buscar, paginar, cadastrar, editar e ativar/inativar contas. Autoproteção, versão concorrente, auditoria atômica e revogação de sessões são verificadas no servidor. Login admin HTTP abre usuários. Demais módulos administrativos continuam bloqueados até suas etapas; Cloudinary está autenticado, mas upload ainda não implementado.

## Estado atual — catálogo administrativo (18/10/2026)

No modo API, além dos usuários, o admin gerencia unidades, salas, comodidades e galeria de até seis imagens por sala. Fotos são enviadas pelo formulário ao Cloudinary; MySQL guarda referências e controle técnico de limpeza. Dashboard, plano de horas, backup e os outros módulos administrativos permanecem nas etapas seguintes. Esta integração foi feita localmente; hospedagem da API e do MySQL permanece separada do frontend Vercel.

Limite de upload atualizado por solicitação do usuário: arquivos originais até10MiB. As imagens continuam armazenadas no Cloudinary, com referências no MySQL.

Atualização de 19/10/2026: fotos originais aceitam até 10 MiB e 40 megapixels. O limite de resolução foi ampliado para permitir fotografias de câmeras de 24 MP; continua havendo validação de formato, limite de dois uploads simultâneos e otimização para WebP até1600px/5MiB. Os limites ficam em backend/src/config/limites-imagens.ts. Alterações no backend exigem reiniciar npm run dev na pasta backend. Erros de resolução agora têm código específico e mensagem distinta de arquivo inválido.

---

## Documento original: FEATURES.md

# Connect2Work — Funcionalidades

## Autenticação

- Login por e-mail e senha: implementado (mock local).
- Cadastro com nome, e-mail, profissão, telefone e senha: implementado (mock local).
- Recuperação de senha com estado de confirmação seguro: implementado (mock local).
- Sessão persistida e logout: implementados (mock local).
- Proteção de rotas: implementada com `ProtectedRoute`.
- Perfis `client` e `admin`, redirecionamento após login e proteção da área administrativa: implementados.
- Login Google: planejado; aguarda implementação OAuth no backend.

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

- Adaptador de demonstração: UUID em novos registros, backup versionado, auditoria e extrato de horas. A integração real usa API e MySQL; o legado Supabase foi removido.
- Backup e auditoria já existem nos gateways, ainda sem tela administrativa própria.
- IDs seed antigos permanecem durante fase local para preservar referências; importação futura deverá gerar mapa de IDs UUID.

- Revalidar no servidor a identidade do proprietário e a janela exata de 24 horas.
- Impedir reservas concorrentes com transação/constraint no banco.
- Concluir autorização por usuário e perfil no backend para os módulos ainda sem API.
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
- O backup operacional usa schema 3, inclui serviços empresariais e não exporta senhas, tokens ou sessões; autenticação fica separada do backup; no modo real, é responsabilidade da API MySQL.

## API local — etapa 1

- GET /health e /ready implementados, com testes isolados do backend. Nenhuma rota de dados privados foi habilitada.
- Validação de configuração, pool MySQL, decimais como string, consultas parametrizadas e sessões UTC. Senha em backend/.env ignorado pelo Git.
- Conexão real ainda depende de configuração local; oito testes não comprovam acesso ao banco real. Login/cadastro continuam mock.
- Direção atual: MySQL. O código e SQL da preparação Supabase foram removidos em 19/10/2026.

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

## Entrega de 18/10/2026 — catálogo e imagens no admin HTTP

- Unidades e salas: listagem paginada no servidor, criação, edição com versão e exclusão protegida por vínculos.
- Comodidades: conciliação por nome único no MySQL; uma comodidade pode ser compartilhada entre salas.
- Galeria: upload no formulário, preview local, limite de seis imagens, reordenação e remoção; Cloudinary guarda arquivos, MySQL guarda referências. Imagem da unidade usa o mesmo fluxo com limite de uma.
- Somente admin altera catálogo. Leituras autenticadas do cliente mostram fotos publicadas e mantêm fallback quando não há foto.
- Coleta de arquivos abandonados/desvinculados com estado persistido, carência e retentativa. Nada de URLs externas novas no formulário HTTP ou segredo no frontend.
- Módulos ainda não integrados seguem bloqueados no modo HTTP.

Referências antigas de imagens sem prévia são preservadas pelo formulário até remoção explícita. A seleção de unidade nas salas possui busca no servidor e mantém a unidade atual entre as opções, mesmo quando fora do resultado da busca.

Atualização de 18/10/2026: upload de fotos aceita original até10MiB também no backend; saída permanece otimizada. Não requer alteração do banco.

Atualização de 19/10/2026: fotos originais aceitam até 10 MiB e 40 megapixels. O limite de resolução foi ampliado para permitir fotografias de câmeras de 24 MP; continua havendo validação de formato, limite de dois uploads simultâneos e otimização para WebP até1600px/5MiB. Os limites ficam em backend/src/config/limites-imagens.ts. Alterações no backend exigem reiniciar npm run dev na pasta backend. Erros de resolução agora têm código específico e mensagem distinta de arquivo inválido.

---

## Documento original: MOCK_DATABASE.md

# Connect2Work — Banco de Dados Mock

Persistência provisória no `localStorage`. Implementação em
`src/services/mock/local-storage.ts`. Não usar senhas em texto puro fora deste mock.

## Chaves

- `c2w_mock_users` — usuários cadastrados.
- `c2w_mock_units` — unidades cadastradas e editadas pelo administrador.
- `c2w_mock_rooms` — salas cadastradas e editadas pelo administrador.
- `c2w_mock_business_services` — serviços empresariais e conteúdo da vitrine.
- `c2w_mock_session` — usuário autenticado, sem senha.
- `c2w_mock_bookings` — agendamentos.
- `c2w_mock_password_resets` — solicitações simuladas de redefinição.
- `c2w_checkout_draft` — rascunho do checkout no `sessionStorage`.
- `c2w_mock_tasks` — quadro compartilhado de tarefas administrativas.
- `c2w_mock_audit_logs` — últimas ações relevantes, limitado a 5.000 registros.
- `c2w_mock_hours_plan_transactions` — créditos, débitos, estornos e ajustes do plano.
- `c2w_mock_schema_version` — versão do formato persistido, atualmente `1`.

## Entidades

### User

- `id`, `name`, `email`, `role`, `active`, `createdAt`, `hasHoursPlan`, `hoursBalance`, `hoursPlanTotal?`, `hoursPlanRenewsOn?`, `hoursPlanPaymentConfirmed?`, `hoursPlanLastRenewalAt?`.
- `role`: `client`, `admin` ou `secretaria`; registros antigos sem o campo são tratados como `client`.
- `active`: controla acesso ao sistema; registros antigos sem o campo são migrados como ativos.
- `profession` e `phone` opcionais.
- Usuários antigos recebem `hasHoursPlan: false` e `hoursBalance: 0`. A data de renovação apenas bloqueia o uso após vencida; saldo só é restaurado pela confirmação manual do novo ciclo.
- `StoredUser` acrescenta `password` somente no mock.

### Unit

- `id`, `name`, `address`, `availableRooms`, `imageUrl`, `description?`, `latitude?`, `longitude?`.
- Seed inicial em `src/services/mock/mock-data.ts` e persistência administrativa em `c2w_mock_units`.
- Imagens do mock são armazenadas como base64 em `imageUrl`.
- Latitude e longitude posicionam a unidade no mapa; registros seed antigos recebem as coordenadas padrão durante a leitura.
- As unidades seed usam os endereços reais informados em Bebedouro/SP. As coordenadas são pontos aproximados dos respectivos trechos e podem ser refinadas pelo formulário administrativo.
- Exclusão é bloqueada enquanto houver registros `Room` vinculados.

### Room

- `id`, `unitId`, `name`, `capacity`, `pricePerHour`, `amenities`, `imageUrl`, `imageUrls?`.
- Seed inicial em `src/services/mock/mock-data.ts` e persistência administrativa em `c2w_mock_rooms`.
- Imagens podem ser caminhos, URLs ou base64; `imageUrl` mantém a imagem principal e `imageUrls` a galeria.

### BusinessService

- `id`, `kind`, `name`, `description`, `primaryFeatures`, `secondaryFeatures`, `imageUrl`, `active`, `sortOrder`, `createdAt?`, `updatedAt?`.
- `kind`: `fiscal_address`, `commercial_address` ou `hours_plan`; apenas um registro de cada tipo.
- Imagem, benefícios e visibilidade são editados em `/admin/servicos`, sem vínculo artificial com unidades ou salas.
- Exclusão é bloqueada enquanto houver registros `Booking` vinculados.

### Booking

- `id`, `userId`, `unitId`, `roomId`, `date`, `timeSlot`, `status`, `adminStatus?`, `paymentStatus?`, `total?`, `hoursFromPlan?`, `createdAt`, `cancelledAt?`, `cancellationReason?`, `checkedInAt?`, `checkedInBy?`.
- Status: `upcoming`, `past` ou `cancelled`.
- Status administrativo: `pending`, `confirmed` ou `cancelled`; registros antigos ativos são tratados como confirmados.
- `total` guarda o valor final pago; registros antigos têm valor derivado da duração e do preço atual da sala.
- `paymentStatus`: `pending` ou `completed`; registros antigos são tratados como concluídos.
- `confirmPayment` permite avançar de pendente para concluído e bloqueia agendamentos cancelados.
- `checkedInAt` guarda o timestamp ISO da chegada; `checkedInBy` identifica o admin/secretaria responsável.
- Check-in é independente do status da reserva, permitido apenas quando confirmado e somente uma vez.
- Status não cancelados são recalculados pela data/hora atual durante a leitura.
- Cancelamento exige o mesmo `userId` e pelo menos 24 horas até o início.
- Cancelamento administrativo exige `cancellationReason`; registros antigos cancelados podem não possuir motivo.
- `hoursFromPlan` registra o saldo consumido. Cancelamento elegível pela janela de 24h devolve essas horas mesmo se o plano estiver vencido.

### PasswordResetRequest

- `email`, `requestedAt`, `userExists`.
- A resposta da UI não revela se a conta existe.

### CheckoutDraft

- `userId`, `unitId`, `roomId`, `date`, `timeSlot`, `duration`, `total`, `hoursFromPlan?`, `hoursToPay?`.
- Existe apenas durante a sessão e é removido no logout ou após confirmação.
- Não armazena dados de cartão.

### Task

- `id`, `title`, `description?`, `status`, `assignedTo?`, `priority`, `dueDate?`, `createdBy`, `createdAt`, `updatedAt`.
- `status`: `todo`, `in_progress` ou `done`.
- `priority`: `low`, `medium` ou `high`.
- `assignedTo` aceita somente usuários ativos com papel `admin` ou `secretaria`.
- O quadro é compartilhado entre toda a equipe; “Minhas tarefas” é apenas um filtro local pelo usuário autenticado.
- Os seeds incluem tarefas vencida, vencendo hoje, futura e concluída para validação dos estados visuais.

### AuditLog

- `id`, `actorUserId?`, `action`, `entity`, `entityId`, `occurredAt`, `details?`.
- Novos registros usam UUID e guardam somente metadados operacionais; senhas nunca entram na auditoria.

### HoursPlanTransaction

- `id`, `userId`, `bookingId?`, `type`, `hours`, `balanceAfter`, `reason`, `createdAt`, `createdBy?`.
- Débitos usam horas negativas; créditos, estornos e aumentos usam horas positivas.

### BackupPayload

- Envelope com `schemaVersion`, `exportedAt` e coleções persistidas.
- Importação rejeita versão incompatível e exige usuário da equipe válido.
- Enquanto autenticação for mock, backup contém `StoredUser` e portanto credenciais locais; arquivo deve ser tratado como sensível e nunca enviado ao repositório. No modo real, credenciais pertencem à autenticação da API e não ao backup da aplicação.

## Usuários seed

- Perfil cliente:
  - E-mail: `teste@connect2work.com`.
  - Senha: `123456`.

- Perfil administrador:
  - E-mail: `admin@connect2work.com`.
  - Senha: `admin123`.

- Perfil secretaria:
  - E-mail: `secretaria@connect2work.com`.
  - Senha: `secretaria123`.

## Contratos

- `AuthGateway` — sessão, consulta segura de usuário por ID, login, Google, cadastro, reset e logout.
- `UserManagementGateway` — listagem segura, cadastro e edição de dados, papel/status e redefinição opcional de senha, sem exposição da senha armazenada.
- `UserManagementGateway` também lista informações de plano, edita o plano e confirma renovação; esta restaura o pacote, registra auditoria e calcula o próximo vencimento a partir do dia da confirmação.
- `CatalogGateway` — leitura e CRUD de unidades e salas, com exclusões protegidas por vínculos.
- `BusinessServiceGateway` — listagem pública e CRUD dos serviços empresariais.
- `BookingGateway` — consulta, contagem, criação com rejeição de intervalos sobrepostos, confirmação administrativa e cancelamento de cliente ou administrador.
- `CheckoutGateway` — leitura, gravação e remoção do rascunho.
- `TaskGateway` — listagem, criação e movimentação compartilhada; administrador edita/exclui qualquer tarefa, enquanto secretária edita/exclui somente as próprias e não pode alterar a data estimada depois da criação.
- `AuditGateway` — consulta de ações recentes e extrato do plano por usuário.
- `BackupGateway` — exportação e importação validada do estado local, restritas ao administrador.

Os adaptadores HTTP da API MySQL implementam esses contratos progressivamente. Componentes não devem
acessar SDK, banco ou `localStorage` diretamente.

## Permissões administrativas

- `/admin/usuarios` permanece exclusiva para `admin`.
- O admin pode cadastrar contas e editar nome, e-mail, profissão, telefone, papel, status e definir uma nova senha.
- Autoalterações perigosas são bloqueadas na interface e no gateway.
- `secretaria` acessa `/admin/agendamentos`, `/admin/painel-do-dia` e `/admin/tarefas`.
- `secretaria` também acessa `/admin/planos-horas`, sem receber acesso à gestão de contas.
- Dashboard, unidades, salas e usuários permanecem exclusivos de `admin`.
- A busca operacional retorna somente `id`, `name` e `email` de clientes ativos.

## Obrigatório ao trocar o mock

O backend deve repetir todas as validações, mesmo que a interface já as faça:
proprietário autenticado, antecedência de 24 horas, status atual, conflito de
horário e confirmação do pagamento. A hora oficial deve vir do servidor. Use
operação atômica para evitar dois usuários reservando o mesmo intervalo.
## Segurança e recuperação local

- `c2w_mock_last_backup_at`: instante ISO do último backup exportado.
- Valores JSON corrompidos são preservados em chaves iniciadas por `c2w_mock_corrupted_` antes do fallback.
- A restauração de backup é validada, possui rollback local e encerra a sessão ativa.
- O backup do mock inclui `StoredUser`, portanto contém senhas de desenvolvimento em texto simples. Deve ser guardado como dado sensível e esse formato não será usado no backend real.
- Registros de auditoria podem armazenar `actorName` como fotografia do nome exibido no momento da operação.
- Backups novos usam schema 3, incluem `businessServices` e mantêm `credentialsIncluded: false`. Usuários são exportados sem `password`, tokens ou sessão.
- Ao restaurar no mock, credenciais de contas já presentes são preservadas. Contas desconhecidas importadas ficam inativas até revisão do administrador.

## Relação com MySQL e API local

O mock descrito aqui segue ativo no frontend. A API da etapa 1 tem somente saúde/prontidão; não migra usuários, senhas ou dados locais. Schema MySQL em database/mysql/; credenciais de conexão somente em backend/.env. Novas regras de autenticação ainda serão definidas. O banco MySQL é a direção atual, substituindo a preparação Supabase anterior.

## Preparacao do cadastro — 11/10/2026

`migrations/002_usuarios_senha_hash.sql` adiciona somente `usuarios.senha_hash`: VARCHAR(255), ASCII bin, nullable, sem senha padrao. Executar uma vez com a conta administrativa; c2w_api nao recebe ALTER. Contas sem hash deverao ter login negado pelo backend. Hash nunca deve ser retornado pela API, registrado em logs ou incluido em auditoria.

O arquivo estrutura-inicial.sql continua representando a base original: em instalacoes novas, aplicar a migracao depois dele. Aplicacao no banco atual ainda pendente de confirmacao do operador. Nenhuma rota de cadastro ou login foi implementada nesta etapa. A fundacao da API e a conexao real foram validadas anteriormente; o frontend segue no mock.
## Cadastro real — etapa de backend (11/10/2026)

POST /auth/register implementado com classes ServicoCadastro, ServicoSenha (Argon2id) e RepositorioUsuariosMysql. Senha de 6 a 128 unidades UTF-16, sem caracteres em branco; perfil client definido no servidor, consultas parametrizadas, respostas sem senha/hash. Migracao senha_hash confirmada pelo usuario. Teste HTTP/MySQL real validou criacao e duplicata; fixture temporaria removida.

Frontend e MVVM existentes permanecem no mock. Integracao da tela, maxlength, login e sessao sao proximas etapas. Contrato HTTP, limites locais e verificacoes detalhados em backend/README.md.
## Integracao progressiva do cadastro — 11/10/2026

CadastroHttpGateway implementa cadastro HTTP e AuthHttpGateway implementa login/sessão/logout. create-app-services.ts seleciona os adaptadores conforme modo, preservando View/RegisterPage e ViewModel/useRegister. Cadastro confirmado navega para /login sem iniciar sessão. Contas MySQL agora podem entrar no login real. Não copia contas/senhas para mock nem faz fallback se HTTP falhar.

Integração atual: VITE_AUTH_API=true em .env.development.local ativa cadastro, login, sessão e logout HTTP no desenvolvimento. Produção usa API obrigatoriamente e falha fechada se /api estiver indisponível. Proxy Vite /api aponta para http://127.0.0.1:3001; implantação exige proxy HTTPS equivalente. Nenhuma credencial MySQL usa variável VITE_.

Gateway envia somente os cinco campos do contrato, timeout de 10 segundos, sem cookies; valida resposta em runtime e seleciona apenas campos publicos. Erros sao traduzidos por status, sem exibir mensagem interna do servidor. Os dois inputs ja possuiam maxlength=128; mantidos e conferidos no navegador. Validacao de espacos e comprimento permanece no ViewModel e backend. Testes adicionados fora de pages, em hooks e services.
## Validacao de nome e profissao — 11/10/2026

Nome e profissao rejeitam caracteres numericos (categoria Unicode N) com mensagens especificas. Validadores compartilhados do frontend e ServicoCadastro do backend aplicam a regra antes de cadastrar; acentos, espacos e pontuacao continuam permitidos conforme as validacoes existentes. Nao remove numeros silenciosamente nem altera registros ja gravados.
## Sessões MySQL — backend entregue em 11/10/2026

Migração 003_sessoes.sql aplicada pelo operador e estrutura confirmada: 15 tabelas, incluindo sessoes. Campos id/usuario_id UUID, token_hash BINARY(32) único, criado_em/ultima_atividade_em/expira_em/revogado_em UTC; FK usuarios RESTRICT. Base estrutura-inicial.sql continua histórica com 14 tabelas: instalação nova aplica 002 e 003 depois dela.

API armazena somente hash SHA-256 do token de sessão e usa Argon2id para senha. Sessão valida revogação, usuário ativo e limites 15min/4h. Perfil vem de perfis a cada consulta autenticada. Política de senha atual substitui limite superior rejeitado no backend por truncamento explícito aos primeiros 128 UTF-16; espaços no valor completo são rejeitados. Teste real cobriu prazo, concorrência, perfil, inativação e logout, removendo fixtures próprias.

O frontend agora integra sessão real via AuthHttpGateway e AuthContext. Módulos privados ainda sem API permanecem bloqueados.

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

## Conta administrativa local — 18/10/2026

A pedido do usuário, foi criada uma conta separada e ativa com perfil admin no MySQL local. A senha foi armazenada somente como hash Argon2id; vínculo do perfil, estado ativo e verificação do hash foram confirmados. O provisionamento e seu registro de auditoria foram gravados na mesma transação. Credenciais não foram adicionadas a arquivos ou seeds. Isso não integra as telas administrativas, que continuam bloqueadas no modo HTTP, nem publica o backend na Vercel.

## Preparação do Cloudinary — 18/10/2026

Cloudinary escolhido para os arquivos de imagens; MySQL manterá referências e ordem na galeria imagens_salas. Não adicionar BLOBs. Campos CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET preparados no .env local ignorado pelo Git e no .env.example sem valores. Upload, exclusão e resolução de imagens ainda não implementados; esta preparação não valida conexão com o provedor nem altera registros no banco.

Após preenchimento e correção pelo usuário, ping autenticado GET /ping confirmou conexão com Cloudinary (HTTP 200, status ok). Credenciais não foram exibidas e nenhum arquivo foi enviado ou alterado. A verificação confirma autenticação, sem afirmar que o upload do painel está integrado.

## Gestão de usuários MySQL — 18/10/2026

Gestão de usuários reais conectada sem migração DDL. usuarios, perfis, sessoes e registros_auditoria existentes são reutilizados; senha_hash nunca sai da API. Versão opaca preserva microssegundos de atualizado_em. Alteração e auditoria são atômicas, e senha/perfil/inativação revogam sessões. Nenhuma conta real do usuário foi alterada pelos testes. Fixtures próprias são removidas ao terminar. Fotos continuarão referenciadas por chave no MySQL com arquivos no Cloudinary; nenhum BLOB foi adicionado e upload permanece pendente.

## Catálogo real e storage — 18/10/2026

O mock continua sendo demonstração explícita. No modo HTTP, unidades/salas do admin usam exclusivamente MySQL, galeria usa Cloudinary e nenhum File ou preview base64 é persistido no armazenamento local. Credenciais do Cloudinary pertencem ao backend/.env ignorado. Exclusão de uma sala com reservas ou unidade com salas é rejeitada; regras do mock não substituem as transações da API. Módulos ainda sem API continuam bloqueados.

O upload do mock e o envio real aceitam original até10MiB; a API continua validando conteúdo e otimizando antes do storage. Os limites do banco se referem à saída otimizada, não ao arquivo original.

Atualização de 19/10/2026: fotos originais aceitam até 10 MiB e 40 megapixels. O limite de resolução foi ampliado para permitir fotografias de câmeras de 24 MP; continua havendo validação de formato, limite de dois uploads simultâneos e otimização para WebP até1600px/5MiB. Os limites ficam em backend/src/config/limites-imagens.ts. Alterações no backend exigem reiniciar npm run dev na pasta backend. Erros de resolução agora têm código específico e mensagem distinta de arquivo inválido.

---

## Documento original: MIGRATION.md

# Migração React + TypeScript

## Estado

Frontend concluído e independente. A aplicação não importa páginas, scripts,
CSS ou imagens de `../coworking-site/`. O projeto HTML anterior permanece apenas
como backup externo a esta pasta.

## Migrado

- Sete telas e rotas.
- Sistema visual e assets necessários.
- Autenticação local, sessão e validações.
- Catálogo de unidades e salas.
- Calendário, horários, conflitos e criação de reservas.
- Reservas por usuário, status automático e cancelamento com antecedência de 24 horas.
- Checkout responsivo com PIX e cartão em modo demonstrativo.
- Tela dedicada de confirmação após o pagamento demonstrativo.
- Testes unitários essenciais.

## Direção atual e próximas integrações

A aplicação usa API NestJS/TypeScript, MySQL e Cloudinary. O código de preparação
Supabase e seus planos específicos foram removidos em 19/10/2026; o histórico Git
preserva a proposta anterior. Não executar SQL PostgreSQL neste projeto.

1. Continuar a integração dos módulos pendentes por contratos HTTP, com autorização no servidor.
2. Manter migrations e seeds MySQL em `database/mysql/`; não reaplicar migrations já executadas.
3. Preservar IDs e vínculos ao migrar dados de demonstração; nunca importar credenciais mock.
4. Validar transações e concorrência antes de integrar reservas e consumo de horas.
5. Manter arquivos de imagens no Cloudinary e referências/controle no MySQL.
6. Disponibilizar API e MySQL com HTTPS e configuração de produção antes de usar o frontend publicado.
7. Integrar pagamento real e webhook idempotente em etapa própria.

## Preparação concluída no mock

- Novos registros recebem UUID sem prefixo; IDs seed antigos continuam válidos localmente.
- `AuditGateway`, `BackupGateway` e extrato de horas existem sem dependência da UI.
- Contratos e adaptadores isolam a interface dos formatos de persistência.
- Backup usa versão explícita e rejeita formatos incompatíveis.
## Backup independente da autenticação

- O schema 2 exporta somente dados de domínio e informa `credentialsIncluded: false`.
- Senhas, tokens e sessões permanecem fora do `BackupGateway`.
- No modo real, contas e sessões são administradas pela API MySQL; credenciais não pertencem ao backup de domínio.

## Integração com Google Calendar

- A Connect2Work usará um único calendário compartilhado da empresa. Não haverá autorização, calendário ou sincronização individual por cliente.
- Criação, confirmação, alteração relevante e cancelamento de agendamento no C2W deverão refletir automaticamente no evento correspondente desse calendário.
- `client_secret`, `refresh_token`, `access_token` e qualquer outra credencial OAuth 2.0 da conta Google da empresa são segredos de backend. Nunca poderão ser enviados ao frontend, persistidos em `localStorage`/`sessionStorage`, incluídos em backups ou adicionados ao repositório.
- Enquanto a aplicação usar somente o mock local, o frontend não fará chamadas reais à API do Google Calendar. Um futuro `CalendarSyncGateway` mock poderá apenas registrar a intenção de sincronização, sem rede e sem credenciais.
- A configuração necessária no Google Cloud Console já foi realizada manualmente pela empresa.

Passos pendentes:

1. Escolher e disponibilizar o backend real, mantendo os contratos independentes de fornecedor.
2. Implementar no backend o endpoint de callback OAuth 2.0, a troca do código de autorização e o armazenamento criptografado/seguro do refresh token da conta da empresa.
3. Persistir a relação entre `bookingId` e o identificador do evento no Google Calendar, com operações idempotentes.
4. Disparar a sincronização no backend após mutações de agendamento. Preferir fila ou outbox transacional com retry, para não depender do navegador e não perder eventos em falhas temporárias.
5. Implementar a versão real do `CalendarSyncGateway` quando o backend estiver pronto; no frontend, o adaptador deverá chamar somente endpoints próprios autenticados, nunca a API do Google diretamente.
6. Cobrir criação, confirmação, alterações de data/horário/sala e cancelamento; check-in permanece operação interna e não exige atualização do evento.

## Direção vigente — MySQL (08/10/2026)

A decisão registrada nesta etapa adotou MySQL local e API NestJS/TypeScript. Schema de 14 tabelas e seed em database/mysql/, recriados pelo usuário em banco de validação. Backend etapa 1 implementa health/readiness e comando check:database; acesso real aguarda senha local. Próxima etapa: identidade, sessão e autorização antes de trocar gateways. Não importar credenciais mock nem habilitar pagamento real. Os arquivos desse legado foram removidos em 19/10/2026; consultar o Git para o histórico.

## Cadastro real — etapa de backend (11/10/2026)

POST /auth/register implementado com classes ServicoCadastro, ServicoSenha (Argon2id) e RepositorioUsuariosMysql. Senha de 6 a 128 unidades UTF-16, sem caracteres em branco; perfil client definido no servidor, consultas parametrizadas, respostas sem senha/hash. Migracao senha_hash confirmada pelo usuario. Teste HTTP/MySQL real validou criacao e duplicata; fixture temporaria removida.

Frontend e MVVM existentes permanecem no mock. Integracao da tela, maxlength, login e sessao sao proximas etapas. Contrato HTTP, limites locais e verificacoes detalhados em backend/README.md.
## Integracao progressiva do cadastro — 11/10/2026

CadastroHttpGateway implementa cadastro HTTP e AuthHttpGateway implementa login/sessão/logout. create-app-services.ts seleciona os adaptadores conforme modo, preservando View/RegisterPage e ViewModel/useRegister. Cadastro confirmado navega para /login sem iniciar sessão. Contas MySQL agora podem entrar no login real. Não copia contas/senhas para mock nem faz fallback se HTTP falhar.

Integração atual: VITE_AUTH_API=true em .env.development.local ativa cadastro, login, sessão e logout HTTP no desenvolvimento. Produção usa API obrigatoriamente e falha fechada se /api estiver indisponível. Proxy Vite /api aponta para http://127.0.0.1:3001; implantação exige proxy HTTPS equivalente. Nenhuma credencial MySQL usa variável VITE_.

Gateway envia somente os cinco campos do contrato, timeout de 10 segundos, sem cookies; valida resposta em runtime e seleciona apenas campos publicos. Erros sao traduzidos por status, sem exibir mensagem interna do servidor. Os dois inputs ja possuiam maxlength=128; mantidos e conferidos no navegador. Validacao de espacos e comprimento permanece no ViewModel e backend. Testes adicionados fora de pages, em hooks e services.
## Etapa de backend de login — 11/10/2026

Tabela sessoes já criada manualmente no banco atual. Migração preservada em database/mysql/migrations/003_sessoes.sql para instalações novas; não reaplicar no banco existente. API runtime mantém conta c2w_api e não recebe DDL.

Endpoints de autenticação concluídos e testados localmente; integração frontend ainda pendente. POST de auth exige Origin autorizado, JSON e X-C2W-Request: 1. Gateway de cadastro foi adaptado; frontend ainda não seleciona autenticação HTTP completa. Migração posterior deverá substituir modo parcial por modo auth real sem fallback e bloquear módulos privados ainda mock.

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
## Salas e comodidades no MySQL — 18/10/2026

Concluída a integração de /salas?unidade=<UUID>. GET /unidades/:unidadeId/salas lista somente as salas da unidade, incluindo salas sem comodidades; UUID válido inexistente retorna lista vazia. GET /salas/:salaId retorna o detalhe ou 404. Ambas as rotas exigem sessão válida e usuário ativo, não renovam atividade e usam Cache-Control: no-store. Identificadores inválidos retornam 400 e falhas internas têm resposta genérica 503. DTO público não inclui dados de usuários ou credenciais.

SalasController → ServicoSalas → RepositorioSalas → RepositorioSalasMysql segue as camadas existentes. Consulta parametrizada com LEFT JOIN sala_comodidades/comodidades e agrupamento por sala, sem GROUP_CONCAT e sem consultas por comodidade. Preço DECIMAL é convertido para número finito e não negativo; capacidade positiva. Prazo integral e descarte de conexões falhas seguem a infraestrutura atual.

SalasHttpGateway implementa os contratos de listagem/detalhe, valida respostas em runtime e recusa mistura de unidades. Usa cookies, prazo de 10s e revalidação serial de sessão em 401 sem cancelar login novo. createAppServices agora conecta salas reais. useRooms coordena carregamento, vazio, erro/retry, unidade ausente e respostas antigas. Troca de URL não exibe salas da unidade anterior. RoomsPage mantém o layout e usa Salas da unidade, sem prometer disponibilidade por horário.

O seed comentado database/mysql/seeds/003_salas_comodidades.sql foi aplicado localmente: 10 salas (cinco por unidade), 9 comodidades e 38 associações. Preserva nomes, capacidades e preços do mockup. Apenas inclusões, sem atualizar salas existentes; aplicação repetida confirmou zero novas inclusões. Requer os dois nomes de unidade únicos do seed002. Não altera tabelas nem cria contas. Imagens continuam em Fotos em breve; imagens_salas/armazenamento ainda serão integrados. Agendamentos, horários, pagamento e administração permanecem bloqueados até suas etapas. A implantação Vercel não foi alterada.

Teste local npm run check:salas no backend inicia API isolada em porta aleatória, valida MySQL/HTTP com fixtures próprias e as remove em finally. Cobre unidade vazia, sala sem comodidades, N:N compartilhado, agrupamento de várias comodidades, filtro entre unidades, preço decimal, sessão, UUID inválido, detalhe ausente e logout. Navegador conferiu cinco salas de cada unidade, preços/comodidades e bloqueio de agendamentos. As alterações locais pré-existentes do usuário em CSS/mapa foram preservadas.
## Gestão de usuários MySQL — 18/10/2026

Etapa administrativa 1 entregue localmente: /admin/usuarios usa MySQL para leitura paginada e escrita. Rotas /admin/usuarios, /admin/equipe e /admin/clientes/busca têm autorização própria; os dois últimos são contratos reduzidos para as próximas integrações, sem liberar tarefas/reservas. Todas as mutações HTTP exigem origem e cabeçalho de proteção, não apenas /auth. Cloudinary foi escolhido e o ping autenticado passou, mas integração de catálogo/fotos ainda será uma etapa separada. Não houve commit, push ou implantação; Vercel continua exigindo backend hospedado e proxy HTTPS para funcionar com dados reais.

---

## Documento original: DESIGN.md

# Sistema visual — Connect2Work

## Direção

Visual escuro, profissional e acolhedor. Fachada e rede dourada identificam as
telas públicas. Telas autenticadas priorizam leitura, comparação e execução.

## Tokens

Fonte: `src/assets/css/base.css`.

- Fundo: `--color-bg`.
- Superfícies: `--color-surface`, `--color-surface-raised`.
- Bordas: `--color-border`, `--color-border-hover`.
- Texto: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`.
- Marca: `--color-accent`, `--color-accent-hover`, `--color-accent-text`.
- Estados: `--color-error`, `--color-success`, `--color-info`.
- Títulos: Space Grotesk.
- Interface e corpo: Inter.
- Raios máximos de cards: `--radius-lg`, 16px.

## Componentes e padrões

- Botão principal dourado; secundário transparente com borda.
- Campos escuros, foco dourado e erro vermelho.
- `AppShell` fixo com logo, navegação, usuário e ação “Sair” vermelha.
- `AdminShell` fixo com logo, badge de perfil, navegação administrativa e ação de saída.
- Navegação autenticada com três áreas principais: Unidades, Meus Agendamentos e Serviços.
- `BackLink` ou retorno contextual em todas as telas.
- Cards usados apenas para unidades reais de informação.
- O título “Selecione a Data” no agendamento usa o CalendarIcon SVG compartilhado, alinhado ao ícone da seleção de horário.
- O endereço da unidade na lista de salas usa o SVG compartilhado MapPinIcon, em amarelo dentro do círculo existente.
- Os períodos Manhã e Tarde do agendamento usam SVGs de sol e sol no horizonte, com 18px e amarelo solar, alinhados aos rótulos.
- O total de salas no cabeçalho da unidade usa selo amarelo solar sólido com texto escuro e peso forte nos dois temas.
- Na lista de salas e na tela de agendamento, galerias sem imagens exibem ícone e “Fotos em breve”; no tema claro usam superfície clara, sem gradiente escuro. Fotos cadastradas são preservadas.
- Login, cadastro e recuperação compartilham composição dividida: fachada contextual fixa à esquerda e painel de autenticação à direita; no celular, fachada passa para o topo.
- O contêiner dividido mantém `overflow: visible` para que a fachada sticky acompanhe a rolagem da página em formulários longos, sem deixar uma faixa vazia abaixo da imagem no desktop. No celular, a fachada permanece no fluxo normal.
- Checkout usa painel principal e resumo lateral sticky; no celular, ambos formam fluxo vertical.
- Formas de pagamento usam seleção tipo radio tile, sem cards aninhados.
- Serviços usa composição editorial com três entidades próprias, imagens administráveis, benefícios compactos e CTAs dourados de consulta.
- Dashboard administrativo usa cabeçalho com ações frequentes, uma faixa contínua de métricas, área central de análise e pendências, seguida pela agenda; azul, verde, amarelo e vermelho mantêm uso semântico.
- Gestão administrativa usa tabelas no desktop, linhas reordenadas no celular e modais nativos para formulários e confirmações destrutivas.
- Gestão de salas usa filtro por unidade, tags compactas para comodidades e alvos interativos de pelo menos 44 px.
- A listagem de salas usa duas colunas assimétricas no desktop, primeira sala em destaque, fotos dominantes, galeria própria com setas, contador e indicadores, informações compactas e CTA solar com preço por hora; no celular retorna a uma coluna e a tela de agendamento mantém galeria ampliada.
- A seleção de unidades combina cartões horizontais e mapa lateral sticky; o mapa respeita os dois temas, mantém atribuição do provedor e solicita localização somente após ação explícita do usuário.
- Os marcadores das unidades no mapa usam pin GPS SVG amarelo com contorno e centro escuros; a lista de unidades próximas usa `cwlogo.ico` proporcional, sem fundo ou círculo adicional, sem repetir a logo dentro do pin.
- O seletor de agendamento apresenta limites de início e término, explica a duração com um exemplo e usa o estado cinza para intervalos ocupados ou já iniciados.
- A tela de agendamento organiza galeria e detalhes da sala, três etapas visuais, calendário e horários lado a lado no desktop e resumo sticky; em telas menores o fluxo se torna vertical.
- No tema claro, calendário e horários usam superfícies frias de alto contraste; amarelo identifica seleção, contorno identifica o dia atual e cinza sólido identifica indisponibilidade.
- Gestão de agendamentos abre filtrada no dia atual, destaca pendências por fundo e mantém busca, status, unidade e datas em uma barra operacional compacta.
- O Painel do Dia é uma tela operacional independente da listagem histórica e organiza o trabalho por urgência: faixa de ocupação, pagamentos, check-ins e próxima chegada; agenda cronológica em tabela; pendências acionáveis e horizonte dos próximos sete dias.
- No Painel do Dia, a lateral reúne pendências acionáveis e o total diário de reservas dos próximos sete dias; indicadores gerais não são repetidos fora da faixa de métricas.
- Os filtros do Painel do Dia refinam apenas a agenda; os indicadores superiores preservam os totais completos de hoje para manter contexto operacional.
- Secretaria recebe navegação mínima, com apenas Agendamentos; criação manual usa formulário modal e busca compacta de clientes.
- O menu lateral administrativo abre por hover em dispositivos com mouse e preserva abertura por clique em telas touch; o fechamento por hover possui atraso curto para permitir a travessia do cursor.
- O dashboard administrativo organiza a leitura em três níveis: visão geral, itens que precisam de atenção e agenda. Métricas e pendências são navegáveis; o gráfico mensal usa reservas reais, sem estimar receita.
- A análise mensal usa interação progressiva: controles visíveis para período/unidade, legenda acionável, detalhes no hover/foco e drill-down por clique sem depender exclusivamente do mouse.
- Os temas escuro e claro compartilham tokens semânticos; login, cliente, admin e secretaria usam o mesmo componente de alternância, com dimensões, ícone, estados, rótulo acessível e tooltip idênticos. No modo claro, o controle usa superfície levemente solar; sobre o painel escuro de autenticação, preserva fundo escuro e ícone solar.
- Nos cabeçalhos autenticados, identidade, tema e saída são ações visualmente separadas e seguem a mesma composição para cliente, admin e secretaria.
- O quadro de tarefas usa três colunas operacionais, badges semânticos de prioridade, prazos legíveis e alertas de atraso que não dependem apenas da cor.
- Para secretárias, tarefas criadas por outro usuário exibem “Somente visualização” e não abrem o formulário. Ao editar uma tarefa própria, a data estimada permanece visivelmente bloqueada; administradores mantêm edição completa.
- O formulário de tarefas mantém rótulos na mesma linha de base, campos alinhados em grade e ações destrutivas separadas das ações de confirmação.
- Em telas pequenas, o controle de tema mantém área de toque mínima de 44 px.
- Em telas de até 720 px, o cabeçalho administrativo oculta a navegação horizontal e usa exclusivamente o drawer; filtros empilham, modais ocupam a largura disponível com rolagem interna e ações fixadas ao final. Em até 480 px, grades de métricas passam para uma coluna.
- O modo claro usa fundo frio, superfícies brancas delimitadas, campos contrastantes e amarelo de marca ajustado para contraste; não é uma simples inversão do tema escuro.
- Os temas claro e escuro compartilham amarelo solar `#ffc400` e hover `#ffd54a` em gráficos, seleções, ícones e ações.
- Na lista de salas, o rodapé separa preço destacado à esquerda (com sufixo /hora) e botão amarelo “Ver horários” à direita, nos dois temas. O selo no cabeçalho do agendamento permanece amarelo solar com texto quase preto.
- Login, cadastro e recuperação preservam a fachada fotográfica nos dois temas; no modo claro, o painel de autenticação, campos, textos e controles usam as superfícies e contrastes claros do sistema.
- A ação “Novo Agendamento” usa tamanho compacto; o formulário registra também a situação do pagamento.
- Pagamentos pendentes são ações clicáveis e pedem confirmação antes de mudar para concluído.
- Plano de horas usa resumo contextual na etapa de agendamento, badge discreto no histórico e estado vencido com orientação acionável; o saldo não é repetido em outras telas do cliente.
- A gestão de planos é uma ferramenta operacional própria no menu lateral, com métricas compactas, tabela de todos os usuários e ações progressivas; não replica permissões nem status de conta.
- Agendamentos, Painel do Dia e Planos de Horas compartilham ritmo, superfícies, densidade de tabela, controles de 44px e rótulos visíveis nos filtros; métricas não são repetidas no cabeçalho da lista.
- Check-in usa ação direta sem modal; chegadas concluídas ficam verdes e esperados de hoje recebem indicador azul discreto.
- Ferramentas do menu lateral são agrupadas por Operação, Administração e Controle, reduzindo procura sem aumentar a navegação principal.
- Telas administrativas compartilham foco visível, estados desabilitados, cabeçalhos de tabela fixos, números tabulares, hover discreto e hierarquia tipográfica compacta.
- Buscas e seletores administrativos usam rótulos visíveis; carregamentos preservam a estrutura com skeletons e estados vazios oferecem um próximo passo.

## Acessibilidade

- Na primeira abertura de uma rota, o download do código pode exibir “Carregando página…” com `role="status"`, sem animação. Em áreas autenticadas, o cabeçalho permanece disponível. O aviso usa o texto secundário do tema atual; o visual das páginas carregadas não muda.

- Seletores administrativos declaram o esquema do tema para manter fundo e texto legíveis também na lista nativa de opções.

- Ferramentas administrativas secundárias usam drawer lateral com overlay, fechamento por clique externo, botão e tecla Esc.
- Gestão de usuários mantém badges semânticos, filtros compactos, tabela responsiva e confirmações em modal.

- Foco visível em todos os controles.
- Alvo mínimo de 44px em celular.
- Estados selecionados usam semântica e `aria-pressed` quando aplicável.
- Mensagens de erro usam `role="alert"`; confirmações usam `role="status"`.
- Animações respeitam `prefers-reduced-motion`.
- Contraste mínimo: 4.5:1 para texto normal e 3:1 para texto grande.

## Restrições

- Não introduzir nova paleta sem atualizar tokens.
- Não usar cores hardcoded quando existir token semântico equivalente.
- Não criar variantes visuais diferentes para mesma ação.
- Não usar gradiente em texto, glassmorphism decorativo ou cards excessivamente arredondados.


## Estados de sessão — 11/10/2026

Preservar tema e formulários. Verificação inicial usa carregamento; falha usa mensagem genérica e botão Tentar novamente. Módulos privados pendentes usam mensagem Funcionalidade em preparação dentro do Shell. Falha de logout aparece junto ao botão Sair e permite nova tentativa. Verificação em segundo plano conserva a página e suspende interação via inert/aria-busy até confirmação.


## Unidades — integração MySQL em 17/10/2026

Preservar o layout e o mapa existentes. Exibir carregamento, ausência de unidades e falha com nova tentativa antes de montar o mapa. A contagem deve usar Salas na unidade / salas cadastradas: disponibilidade por horário depende da etapa de Agendamentos. Imagem não configurada usa placeholder existente. Sem coordenadas, o card permanece na lista.

## Redirecionamento por expiração — 17/10/2026

Quando o prazo já confirmado pela API é atingido, AuthContext encerra o acesso na interface e as rotas protegidas retornam ao login, sem exigir nova consulta HTTP. O prazo usa o menor entre inatividade e expiração absoluta, com o ajuste de relógio recebido da API. Um temporizador independente continua ativo mesmo se uma verificação falhar ou ficar pendente; respostas antigas não reabrem a sessão. Nova confirmação de atividade substitui o prazo anterior. A interface libera o estado inert ao expirar.

O backend continua sendo a autoridade para aceitar requisições: não houve alteração dos limites de 15 minutos/4 horas nem das verificações no servidor. Esta mudança é conservadora no cliente: o prazo conhecido também pode encerrar essa aba quando outra aba tiver renovado a sessão sem sincronização local. Falhas de verificação antes de conhecer um prazo (por exemplo, primeira abertura com API indisponível) continuam exibindo Tentar novamente; expiração conhecida retorna ao login. Em abas suspensas, a interface atualiza quando o navegador retoma a execução.

Regressões cobrem expiração por inatividade e absoluta com rede indisponível, consulta pendente, resposta tardia, erro anterior ao vencimento e renovação do prazo. Não há alteração de tabelas, credenciais ou dados.


## Salas — integração em 18/10/2026

Layout de cards preservado. Título Salas da unidade identifica catálogo, sem afirmar disponibilidade de horário. Carregamento usa role=status; falha usa role=alert e Tentar novamente; vazio informa ausência de salas cadastradas. Falta de imagens mantém Fotos em breve. Unidade ausente retorna para Unidades. Agendamentos permanecem em preparação.

## Gestão de usuários MySQL — 18/10/2026

A gestão de usuários preserva o sistema visual existente. Paginação usa botões Anterior/Próxima, rótulo de página e bloqueio durante carregamento/gravação; contagem de resultados vem do servidor, enquanto indicadores mantêm o resumo global. Rotas administrativas ainda não integradas mantêm a tela de indisponibilidade. Conferência visual executada no navegador disponível; emulação específica de celular não está disponível nessa ferramenta.

## Formulários de catálogo — 18/10/2026

A integração preserva layout, tokens e componentes existentes. Em modo HTTP, a galeria recebe arquivos pelo controle de upload; URL externa nova não é oferecida. Miniaturas indicam ordem e permitem mover uma posição antes ou remover. Formulário bloqueia interação durante upload/gravação e apresenta erro sem fechar quando falha. Listas administrativas passam a mostrar total do servidor e navegação de páginas. A consulta cliente mantém o fallback Fotos em breve e usa WebP limitado; cards usam variante de 640px e galeria até 1600px.

A validação e as mensagens de upload usam limite de10MiB para o original. O preview segue no formulário; o arquivo só é enviado ao salvar.

Atualização de 19/10/2026: fotos originais aceitam até 10 MiB e 40 megapixels. O limite de resolução foi ampliado para permitir fotografias de câmeras de 24 MP; continua havendo validação de formato, limite de dois uploads simultâneos e otimização para WebP até1600px/5MiB. Os limites ficam em backend/src/config/limites-imagens.ts. Alterações no backend exigem reiniciar npm run dev na pasta backend. Erros de resolução agora têm código específico e mensagem distinta de arquivo inválido.

---

## Documento original: backend/README.md

# Connect2Work API — etapa 1

API local em TypeScript/NestJS, separada do frontend. Apenas GET /health e GET /ready estão disponíveis. Não há login, cadastro, CRUD, pagamento ou integração das telas. /health verifica o processo; /ready testa a conexão MySQL e retorna 503 genérico quando indisponível.

## Configuração

Node.js 24.15 ou superior da linha 24. Dependências têm lockfile próprio. Execute a partir da raiz:

```powershell
npm ci --prefix backend
```

Copie backend/.env.example para backend/.env se o arquivo local não existir. Preencha DB_PASSWORD somente no arquivo local, com a senha de c2w_api. Não use root. Senhas com # ou espaços devem estar entre aspas; não copie o arquivo para o frontend ou Git. A API exige configuração válida antes de iniciar; restringe usuário a c2w_api e host SQL a localhost/127.0.0.1 nesta etapa.

## Verificação e execução

```powershell
npm run typecheck --prefix backend
npm run test --prefix backend
npm run check:database --prefix backend
npm run dev --prefix backend
```

check:database é somente leitura: valida CURRENT_USER, decimal exato e consulta parametrizada ao catálogo de perfis. Não imprime segredo nem realiza DDL. Com a API rodando, acesse http://127.0.0.1:3001/health e http://127.0.0.1:3001/ready. O processo não é prontidão do banco; /ready precisa retornar {"status":"ready"}. Pare com Ctrl+C; o pool é encerrado no shutdown.

start lê backend/.env quando chamado pelo npm --prefix backend; o build fica em backend/dist. dev recompila uma vez e inicia; não é um watcher. Para refletir alterações no código, pare e execute dev novamente.

## Organização e POO

- src/config/environment.ts: valida configurações sem expor valores.
- src/database/database.service.ts: DatabaseService encapsula pool, sessão UTC e liberação das conexões; Readiness define o contrato.
- src/api/health.controller.ts: HealthController recebe requisições e delega verificação, com injeção de dependência.
- src/application.ts: compõe módulo, providers e middleware HTTP.
- src/main.ts: inicialização local e shutdown.
- src/check-database.ts: prova manual da conexão real por comando de leitura.
- test: suíte Node test runner, independente do Vitest frontend.

SQL não vem de HTTP. mysql2 mantém DECIMAL como string, multipleStatements=false, pool de cinco conexões e fila limitada. As sessões usadas são configuradas em UTC explicitamente; timezone do driver sozinho não configura o fuso do servidor. Erros de banco não são retornados nem logados com credenciais. A API escuta só em 127.0.0.1; não habilita CORS ou expõe endpoints de usuários.

Isso é uma fundação de desenvolvimento, não implantação de produção. HTTPS de implantação, autorização dos próximos módulos, repositórios de domínio e transações de reservas virão em etapas próprias. Login/sessões e limites de tentativas de autenticação já estão implementados. MySQL não fica acessível ao navegador por esta API. A classe de infraestrutura demonstra encapsulamento, mas objetos de domínio com comportamentos ainda não foram implementados.

## Evidência atual

Oito testes automatizados passaram: variáveis, portas, conta root rejeitada, decimais/configuração de pool, liberação/shutdown, falhas e respostas HTTP. Não equivalem a login no banco real: a senha será preenchida pelo usuário e check:database precisa ser executado. Nenhuma tabela ou permissão foi alterada pela implementação.
## Cadastro real — etapa de backend (11/10/2026)

POST /auth/register recebe JSON com name, email, profession, phone e password. Todos sao obrigatorios; campos extras sao rejeitados. Nome e sobrenome ate 100 caracteres, profissao de 2 a 80, e-mail ate 254 normalizado em minusculas e telefone brasileiro validado com DDD e salvo como digitos. Senha de 6 a 128 unidades UTF-16 (mesma contagem de string.length e maxlength no frontend), sem caracteres em branco, sem trim ou truncamento. Esta politica foi definida pelo usuario.

ServicoCadastro coordena validacao, UUID, hash e persistencia; ServicoSenha gera Argon2id com salt aleatorio (19 MiB, 2 iteracoes, paralelismo 1). RepositorioUsuariosMysql usa execute parametrizado e resolve o perfil client no banco. O cliente nao escolhe perfil nem ativo. A chave unica de email protege concorrencia; nao ha consulta previa que substitua essa restricao.

Resposta 201 inclui somente dados publicos do usuario, sem senha/hash/sessao. Erros: 400 para entrada invalida, 409 para e-mail duplicado, 503 para indisponibilidade. Corpo JSON limitado a 8 KiB; nesta instancia local, limite global de 12 tentativas por minuto e no maximo 2 hashes simultaneos. O limite global em memoria e adequado apenas a esta etapa local; distribuicao e limites por cliente precisam ser projetados antes da hospedagem. MySQL usa um pool proprio limitado a 5 conexoes para usuarios, separado do pool de prontidao, ambos encerrados no shutdown.

A migracao 002_usuarios_senha_hash.sql foi confirmada pelo usuario no Workbench. Teste HTTP com MySQL real confirmou criacao, perfil client, hash verificavel e rejeicao de duplicata; fixture ficticia removida no finally. npm run check:registration --prefix backend repete esse teste explicito (escreve e remove somente sua fixture aleatoria). Credenciais ficam em backend/.env.

Frontend permanece no mock e no MVVM existente: useRegister coordena formulario por AuthGateway. Limite visual maxlength e adaptador HTTP serao integrados em etapa posterior. Login, sessao, recuperacao de senha e pagamentos nao implementados nesta etapa. Hash nunca deve sair pela API nem entrar em logs/auditoria.
Validacao desta etapa: 14 testes do backend aprovados; check:registration com MySQL real aprovado; typecheck do backend e da raiz e build da raiz aprovados; auditoria de dependencias runtime sem vulnerabilidades reportadas. Revisao estatica independente sem problemas acionaveis no escopo local. Suite da raiz: 96 aprovados e 4 falhas anteriores em App.test.tsx, que espera 'Bem-vindo de volta' enquanto LoginPage exibe 'Bem-vindo'. Nenhum arquivo do frontend foi alterado nesta etapa.
## Organizacao do backend por camadas — 11/10/2026

Estrutura atual de backend/src:

- controllers/: CadastroController e HealthController, entrada HTTP.
- services/: ServicoCadastro, regras e coordenacao.
- repositories/contracts/: contrato RepositorioUsuarios e dados de persistencia NovoUsuario.
- repositories/mysql/: RepositorioUsuariosMysql, SQL parametrizado.
- security/: contrato GeradorHash e implementacao ServicoSenha em servico-senha-argon2.ts.
- dto/: UsuarioCadastradoDto, resposta publica explicitamente sem credenciais.
- database/: infraestrutura de conexao e prontidao MySQL.
- modules/: AuthModule e HealthModule, composicao dos providers existentes.
- config/: validacao do ambiente.
- app.module.ts: composicao raiz; application.ts: fabrica HTTP usada tambem nos testes; main.ts: inicializacao.

Refatoracao estrutural: contratos extraidos e imports atualizados, sem alteracao de rotas, validacoes, SQL, politica de senha, limites ou permissao. Ciclo de vida dos pools preservado; os pools existentes de prontidao e usuarios continuam separados nesta etapa. Frontend e seu MVVM permanecem inalterados. Nao ha pasta auth/api/infrastructure antiga nem pastas vazias criadas para funcionalidades futuras.

Validacao: 14 testes do backend e cadastro HTTP/MySQL real aprovados depois da reorganizacao; fixture temporaria removida pelo teste.
## Testar cadastro pelo frontend local

1. Terminal na raiz: npm start --prefix backend (build backend previamente com npm run build --prefix backend).
2. Outro terminal na raiz: npm run dev.
3. Abrir http://localhost:5173/cadastro. Flag pública VITE_AUTH_API=true em .env.development.local ativa autenticação HTTP em desenvolvimento; reiniciar Vite se mudar a flag. Senhas e conexao MySQL permanecem somente no backend/.env.
4. Entrar em /login usando a conta recém-criada no MySQL. Sessão é confirmada pela API e logout revoga o token.

Teste automatizado via proxy: com ambos servidores rodando, definir REGISTRATION_TEST_PROXY=true no ambiente do comando npm run check:registration --prefix backend. Usa destino fixo localhost:5173/api; cria usuario ficticio aleatorio e o remove no finally, sem migrar contas ou dados existentes.
## Validacao de nome e profissao — 11/10/2026

Nome e profissao rejeitam caracteres numericos (categoria Unicode N) com mensagens especificas. Validadores compartilhados do frontend e ServicoCadastro do backend aplicam a regra antes de cadastrar; acentos, espacos e pontuacao continuam permitidos conforme as validacoes existentes. Nao remove numeros silenciosamente nem altera registros ja gravados.
## Login e sessões — etapa de backend (11/10/2026)

Rotas disponíveis na API local:

| Método | Rota | Resultado |
| --- | --- | --- |
| POST | /auth/login | 200 usuário público e horários de expiração; token somente Set-Cookie |
| GET | /auth/session | 200 sessão pública ou 401; não renova atividade |
| POST | /auth/activity | 200 novos horários ou 401; não prolonga limite absoluto |
| POST | /auth/logout | 204 e remoção do cookie; revoga no banco e é idempotente |

POST /auth/login aceita somente email/password. POST activity/logout recebe {}. Todos os POST /auth/*, inclusive register, exigem Content-Type: application/json, Origin da lista AUTH_ORIGINS e X-C2W-Request: 1. Corpo máximo 8kb. Login errado/conta inexistente/inativa/sem hash: 401 “Senha incorreta”. Login tem 10 tentativas/min por endereço de conexão e 30/min globais; mapa bounded1000, sem confiar em X-Forwarded-For. Atrás do proxy local, endereço pode ser compartilhado entre navegadores. Limites em memória não são solução para múltiplas instâncias.

Sessão: 15min sem atividade ou 4h desde login, inclusive na igualdade do limite; relógio UTC do servidor. Token32bytes base64url gerado criptograficamente; banco guarda SHA256 BINARY32, nunca token original. Cookie c2w_session é HttpOnly/SameSite=Strict/Path=/, host-only, sem Expires/Max-Age no login. Logout usa Max-Age=0. AUTH_HTTPS=false apenas em HTTP loopback local; AUTH_HTTPS=true exige origens HTTPS e cookie Secure. NODE_ENV=production exige HTTPS e AUTH_ORIGINS explícito. A API não termina TLS nesta etapa; publicação requer infraestrutura HTTPS configurada.

Conta e perfil são consultados novamente na sessão; usuário inativo revoga a sessão. Nova sessão substitui apenas o token anterior apresentado, sem desconectar outros dispositivos. SQL de atividade/revogação é atômico, não reativa token revogado ou expirado. Queries têm timeout individual e operações completas de autenticação têm prazo de 5s, inclusive aquisição e transações; conexões falhas são descartadas. Não registrar cookies/corpos/senhas/hashes; DTOs retornam somente campos públicos, erros internos genéricos.

Senha: mínimo6, espaços proibidos no valor completo, sem trim; conforme decisão explícita do produto, truncar aos primeiros128UTF16 antes de gerar/verificar Argon2id. Sufixos além do limite não participam da autenticação. Campo visual mantém maxLength128. Recuperação real de senha ainda não implementada.

Tabela sessoes confirmada pelo operador; migração003 arquivada, não reaplicar no banco atual. Frontend login/AuthContext ainda usam mock. Esta etapa não integra reservas, administração, atividade visual nem logout da interface.

Validação explícita com fixture temporária:

```powershell
npm run check:authentication --prefix backend
```

Cria somente conta aleatória example.invalid; verifica hash do token, truncamento128, expiração15min/4h, perfil atualizado, conta inativa, revogação concorrente e logout. Remove somente essa conta e suas sessões em finally. Usa backend/.env pelo runtime, nunca imprime senha/token/hash. Não executar teste de fixture em produção.

## Integração de sessão no frontend — 11/10/2026

Login e cadastro usam a API local/MySQL. AuthHttpGateway encapsula HTTP; AuthContext coordena estado; hooks coordenam ações e Views apresentam a interface, preservando MVVM no frontend e camadas/POO no backend. Token fica em cookie HttpOnly, sem localStorage. Sessão não persistente: 15 minutos sem atividade e limite absoluto de 4 horas. GET de sessão não renova; interação real em aba visível registra atividade no máximo uma vez por minuto.

Rotas aguardam confirmação inicial da API. Falha de rede bloqueia acesso com mensagem genérica e nova tentativa. Verificação ao retornar à aba preserva a página, bloqueando interação até confirmar; prazo vencido bloqueia imediatamente. Logout só encerra visualmente após confirmação do servidor; falha permite tentar novamente. Respostas antigas não reabrem sessão encerrada.

Em modo HTTP, catálogo de unidades/salas/serviços ainda é demonstração estática somente leitura. Reservas, pagamento, plano de horas, tarefas, auditoria, backup e administração aguardam integração e ficam bloqueados; não usam dados privados mock. Google e recuperação de senha ainda indisponíveis. Desenvolvimento sem VITE_AUTH_API usa mock explicitamente; produção sempre usa API. Sessões reais não são exportadas em backups.

Validação: testes automatizados cobrem limites, falhas e concorrência; navegador confirmou senha incorreta, login real, recarga mantendo sessão, bloqueio de reservas e logout com rota privada redirecionada. Conta fictícia de teste e suas sessões removidas após validação. Não houve publicação.

## Consulta de unidades — 17/10/2026

GET /unidades exige sessão válida pelo CookieSessao e ServicoAutenticacao, sem renovação. Retorna somente UnidadeDto e Cache-Control: no-store; ausência de sessão retorna 401, falhas internas retornam 503 genérico. Repositório MySQL usa LEFT JOIN/COUNT para salas cadastradas, prazo integral de 5s e SQL de 2s. Sem endpoints de escrita nesta etapa.

Com API local iniciada, executar npm run check:unidades para validar HTTP/MySQL. O comando usa apenas fixtures aleatórias próprias (usuário/unidade/sala/sessão) e as remove em finally. Nunca executar em produção. Não imprime credenciais. Não é necessário executar novo SQL de estrutura.

## Salas e comodidades no MySQL — 18/10/2026

Concluída a integração de /salas?unidade=<UUID>. GET /unidades/:unidadeId/salas lista somente as salas da unidade, incluindo salas sem comodidades; UUID válido inexistente retorna lista vazia. GET /salas/:salaId retorna o detalhe ou 404. Ambas as rotas exigem sessão válida e usuário ativo, não renovam atividade e usam Cache-Control: no-store. Identificadores inválidos retornam 400 e falhas internas têm resposta genérica 503. DTO público não inclui dados de usuários ou credenciais.

SalasController → ServicoSalas → RepositorioSalas → RepositorioSalasMysql segue as camadas existentes. Consulta parametrizada com LEFT JOIN sala_comodidades/comodidades e agrupamento por sala, sem GROUP_CONCAT e sem consultas por comodidade. Preço DECIMAL é convertido para número finito e não negativo; capacidade positiva. Prazo integral e descarte de conexões falhas seguem a infraestrutura atual.

SalasHttpGateway implementa os contratos de listagem/detalhe, valida respostas em runtime e recusa mistura de unidades. Usa cookies, prazo de 10s e revalidação serial de sessão em 401 sem cancelar login novo. createAppServices agora conecta salas reais. useRooms coordena carregamento, vazio, erro/retry, unidade ausente e respostas antigas. Troca de URL não exibe salas da unidade anterior. RoomsPage mantém o layout e usa Salas da unidade, sem prometer disponibilidade por horário.

O seed comentado database/mysql/seeds/003_salas_comodidades.sql foi aplicado localmente: 10 salas (cinco por unidade), 9 comodidades e 38 associações. Preserva nomes, capacidades e preços do mockup. Apenas inclusões, sem atualizar salas existentes; aplicação repetida confirmou zero novas inclusões. Requer os dois nomes de unidade únicos do seed002. Não altera tabelas nem cria contas. Imagens continuam em Fotos em breve; imagens_salas/armazenamento ainda serão integrados. Agendamentos, horários, pagamento e administração permanecem bloqueados até suas etapas. A implantação Vercel não foi alterada.

Teste local npm run check:salas no backend inicia API isolada em porta aleatória, valida MySQL/HTTP com fixtures próprias e as remove em finally. Cobre unidade vazia, sala sem comodidades, N:N compartilhado, agrupamento de várias comodidades, filtro entre unidades, preço decimal, sessão, UUID inválido, detalhe ausente e logout. Navegador conferiu cinco salas de cada unidade, preços/comodidades e bloqueio de agendamentos. As alterações locais pré-existentes do usuário em CSS/mapa foram preservadas.
## Gestão de usuários MySQL — 18/10/2026

GET /admin/usuarios aceita search (até 254), role, active=true|false, page (1–10000) e pageSize (1–100; padrão 50). Resposta {items,page,pageSize,total,summary}; total segue filtros, summary é global. POST cria conta com name/email/profession?/phone?/password/role/active. PATCH /admin/usuarios/:id edita com expectedVersion; PATCH /:id/perfil e /:id/status exigem role ou active e expectedVersion. Senha omitida mantém hash, senha vazia é inválida. Campos extras são rejeitados. GET /admin/equipe e /admin/clientes/busca são acessíveis somente à equipe e retornam resumos reduzidos. Atualizações com versão antiga retornam 409; 401/403/429 são distintos. Limites por conta: 120 consultas/min e 30 mutações/min, máximo 1000 contas na memória; hashing simultâneo limitado a dois. Escritas revalidam sessão após locks, preservam ao menos um admin e bloqueiam auto-inativação/rebaixamento. Senha/perfil/inativação revogam sessões na mesma transação da auditoria. Criação de sessão compara sob lock o hash que foi verificado no login, evitando corrida com redefinição. npm run check:admin-usuarios valida HTTP/MySQL com fixtures próprias e limpeza; não executa DDL nem modifica contas reais.

## Catálogo administrativo e imagens — 18/10/2026

Estado atual: no modo API, gestão de usuários, unidades e salas usa MySQL real. O administrador pode criar/editar/excluir unidades e salas, definir comodidades e enviar imagens pelo formulário. Dashboard, planos de horas, backup e demais módulos administrativos aguardam suas etapas e continuam bloqueados no modo HTTP.

Imagens são arquivos públicos do catálogo hospedados no Cloudinary; o MySQL guarda chaves e relações em unidades/imagens_salas e o controle técnico em arquivos_imagens. Não são gravados BLOBs ou previews base64. Documentos privados não devem usar este fluxo.

Upload começa no salvamento: uma foto por unidade, até seis por sala, JPEG/PNG/WebP, até 5 MiB e 20 MP. A API valida conteúdo e converte para WebP de até 1600px, removendo metadados. Temporários são autenticados e expiram em 24h. A publicação precede o vínculo SQL; falha mantém a imagem anterior. Catálogo público recebe URLs somente de arquivos vinculados.

CRUD usa sessão e papel admin verificados também na transação, auditoria atômica e expectedVersion para impedir sobrescrita. Criações usam requestId estável para evitar duplicação em repetição. Exclusão de unidade com salas e exclusão/mudança de unidade de sala com reservas são negadas. Fotos novas não podem ser transferidas de outra entidade por UUID.

Limpeza roda na API uma vez por minuto, até 20 intenções por lote, com leases persistidos, retentativa e carência de 24h para arquivos desvinculados. Referências de unidades, salas e serviços são reconferidas antes da remoção. MySQL e Cloudinary não formam uma transação distribuída: a intenção persistida permite reconciliar chamadas de resultado incerto. A coleta exige API ativa; falhas ficam em arquivos_imagens para retentativa.

Para executar um único lote com as mesmas regras, use npm run cleanup:imagens em backend. O comando não ignora a carência nem remove arquivos ainda vinculados. Falhas individuais são registradas em arquivos_imagens; o término do lote não significa que toda retentativa pendente já foi concluída.

Aplicar uma vez database/mysql/migrations/004_arquivos_imagens.sql pela conexão root; já aplicado no banco local. API continua usando c2w_api sem permissão DDL. Credenciais CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET e CLOUDINARY_NAMESPACE ficam exclusivamente no backend/.env ignorado. Namespace padrão connect2work/local; produção exige namespace próprio (por exemplo connect2work/producao). Não usar prefixo VITE_ para segredos.

Verificações locais: no backend, npm run check:catalogo-admin e npm run check:cloudinary (este envia e remove uma imagem sintética); também check:admin-usuarios, check:authentication, check:unidades e check:salas. Todos usam fixtures próprias; não executar em produção. Desenvolvimento continua com frontend npm run dev na raiz e API npm run dev em backend, em terminais separados. Esta etapa não publica API/MySQL nem altera a implantação Vercel.

Revisão final concluída: dois achados corrigidos com regressões. Referências antigas sem prévia são mantidas ao editar metadados e só removidas por ação explícita. A busca remota de unidades alcança opções além das primeiras 100 e preserva a unidade atual da sala. Frontend: typecheck/build e 191 testes passaram. Backend: typecheck/build, 46 testes e checks MySQL de autenticação, usuários, catálogo, unidades e salas passaram. Teste de retomada após publicação cuja resposta se perdeu confirma consulta pela chave existente sem nova publicação/remoção.

## Ajuste do limite de upload — 18/10/2026

Por solicitação do usuário, o arquivo original aceito pelo formulário e pelo backend passou a até 10 MiB (10 × 1024 × 1024 bytes), mantendo JPEG/PNG/WebP e 20 MP. Os limites do transporte multipart e do decoder usam config/limites-imagens.ts. A saída continua WebP otimizado de até1600px e5MiB; por isso a CHECK da tabela arquivos_imagens permanece correta e não exige nova migração. Mensagens do frontend foram alinhadas. Verificação real pelo proxy Vite → API → Cloudinary aceitou PNG sintético de6.762.422bytes, gerou4.084bytes otimizados e retornou201; conta/arquivo de teste removidos. Testes:191frontend e47backend; typechecks/builds passaram.

Atualização de 19/10/2026: fotos originais aceitam até 10 MiB e 40 megapixels. O limite de resolução foi ampliado para permitir fotografias de câmeras de 24 MP; continua havendo validação de formato, limite de dois uploads simultâneos e otimização para WebP até1600px/5MiB. Os limites ficam em backend/src/config/limites-imagens.ts. Alterações no backend exigem reiniciar npm run dev na pasta backend. Erros de resolução agora têm código específico e mensagem distinta de arquivo inválido.

---

## Documento original: database/mysql/README.md

# MySQL — estrutura atual

Servidor local confirmado: MySQL 26.7.0, portas 3306/33060 em 127.0.0.1.

`estrutura-inicial.sql` contém as 14 tabelas extraídas do dump do usuário, ordenadas pelas dependências. Não altera o banco atual. Não usar sobre tabelas existentes. Selecione explicitamente um schema vazio antes de executar; não há DROP ou desativação de FKs. O arquivo substitui a versão anterior com seis tabelas.

`seeds/001_perfis.sql` contém apenas os três perfis de referência, sem senhas. Não reaplicar no banco atual, que já contém esses registros. Contas MySQL são provisionadas separadamente e não estão nesses arquivos.

## Evidências fornecidas pelo usuário no Workbench

- 14 tabelas InnoDB/utf8mb4_0900_ai_ci.
- Relações válidas 1:N e N:N por JOIN.
- FK ausente rejeitada (1452); exclusão de unidade vinculada rejeitada (1451).
- Associação repetida rejeitada (1062).
- Capacidade zero, preço negativo, período invertido e saldo negativo rejeitados (3819).
- Após ROLLBACK, sete tabelas consultadas estavam vazias; perfis preservados.
- c2w_api@localhost conseguiu ler perfis e teve CREATE negado (1142); grants informados: SELECT/INSERT/UPDATE/DELETE em connect2work.*.

O agente inspecionou o dump completo, encontrou as 14 criações e não encontrou INSERTs ou contas. A versão consolidada ainda não foi restaurada em outro schema. Testes do frontend não validam SQL. Sobreposição de reservas, atualização atômica de saldo, autorização HTTP e pagamento real permanecem pendentes.

Arquivos e colunas usam português; códigos client/admin/secretaria permanecem compatíveis com o frontend. Planos e movimentações são provisórios. A API ainda não está implementada; frontend permanece com mock local.
## Preparacao do cadastro — 11/10/2026

`migrations/002_usuarios_senha_hash.sql` adiciona somente `usuarios.senha_hash`: VARCHAR(255), ASCII bin, nullable, sem senha padrao. Executar uma vez com a conta administrativa; c2w_api nao recebe ALTER. Contas sem hash deverao ter login negado pelo backend. Hash nunca deve ser retornado pela API, registrado em logs ou incluido em auditoria.

O arquivo estrutura-inicial.sql continua representando a base original: em instalacoes novas, aplicar a migracao depois dele. Aplicacao no banco atual ainda pendente de confirmacao do operador. Nenhuma rota de cadastro ou login foi implementada nesta etapa. A fundacao da API e a conexao real foram validadas anteriormente; o frontend segue no mock.

## Estado atual — 17/10/2026

As descrições anteriores registram etapas históricas. Cadastro, login, sessões e consulta de unidades estão implementados na API MySQL. As migrações 002 e 003 já foram aplicadas e confirmadas; não reaplicar sobre o banco atual. Consulta de unidades usa estrutura existente, sem nova migração. O agente validou LEFT JOIN/contagem e coordenadas com dados temporários próprios, removidos após o teste. Não há seed permanente de unidades. A aplicação mostra lista vazia quando não existem unidades reais.

## Cadastro inicial das unidades — 17/10/2026

A pedido do usuário, as duas unidades do mockup foram cadastradas no MySQL local pelo arquivo comentado database/mysql/seeds/002_unidades.sql: Connect2Work 1 (Av. Osvaldo Perrone, 776, Parque Eldorado) e Connect2Work 2 (R. Lucas Evangelista, 368, Centro), ambas em Bebedouro/SP. Endereços, descrições e coordenadas aproximadas foram preservados do mock-data.ts, com novos UUIDs fixos. Nenhum usuário ou sala foi importado; imagens seguem sem arquivo configurado. A contagem de salas é calculada do banco e não copia o número cinco do mockup. O seed evita duplicação por ID/nome/endereço e não atualiza registros existentes. Aplicação local confirmou duas inclusões. Não houve publicação na Vercel.
## Salas e comodidades no MySQL — 18/10/2026

Concluída a integração de /salas?unidade=<UUID>. GET /unidades/:unidadeId/salas lista somente as salas da unidade, incluindo salas sem comodidades; UUID válido inexistente retorna lista vazia. GET /salas/:salaId retorna o detalhe ou 404. Ambas as rotas exigem sessão válida e usuário ativo, não renovam atividade e usam Cache-Control: no-store. Identificadores inválidos retornam 400 e falhas internas têm resposta genérica 503. DTO público não inclui dados de usuários ou credenciais.

SalasController → ServicoSalas → RepositorioSalas → RepositorioSalasMysql segue as camadas existentes. Consulta parametrizada com LEFT JOIN sala_comodidades/comodidades e agrupamento por sala, sem GROUP_CONCAT e sem consultas por comodidade. Preço DECIMAL é convertido para número finito e não negativo; capacidade positiva. Prazo integral e descarte de conexões falhas seguem a infraestrutura atual.

SalasHttpGateway implementa os contratos de listagem/detalhe, valida respostas em runtime e recusa mistura de unidades. Usa cookies, prazo de 10s e revalidação serial de sessão em 401 sem cancelar login novo. createAppServices agora conecta salas reais. useRooms coordena carregamento, vazio, erro/retry, unidade ausente e respostas antigas. Troca de URL não exibe salas da unidade anterior. RoomsPage mantém o layout e usa Salas da unidade, sem prometer disponibilidade por horário.

O seed comentado database/mysql/seeds/003_salas_comodidades.sql foi aplicado localmente: 10 salas (cinco por unidade), 9 comodidades e 38 associações. Preserva nomes, capacidades e preços do mockup. Apenas inclusões, sem atualizar salas existentes; aplicação repetida confirmou zero novas inclusões. Requer os dois nomes de unidade únicos do seed002. Não altera tabelas nem cria contas. Imagens continuam em Fotos em breve; imagens_salas/armazenamento ainda serão integrados. Agendamentos, horários, pagamento e administração permanecem bloqueados até suas etapas. A implantação Vercel não foi alterada.

Teste local npm run check:salas no backend inicia API isolada em porta aleatória, valida MySQL/HTTP com fixtures próprias e as remove em finally. Cobre unidade vazia, sala sem comodidades, N:N compartilhado, agrupamento de várias comodidades, filtro entre unidades, preço decimal, sessão, UUID inválido, detalhe ausente e logout. Navegador conferiu cinco salas de cada unidade, preços/comodidades e bloqueio de agendamentos. As alterações locais pré-existentes do usuário em CSS/mapa foram preservadas.
## Atualização: catálogo e Cloudinary (18/10/2026)

A migração 004_arquivos_imagens.sql cria somente a tabela técnica de arquivos; aplicada no MySQL local. Não reaplicar indiscriminadamente e não substituir as tabelas existentes. Unidades e imagens_salas continuam guardando referências; arquivos ficam no Cloudinary, sem BLOB no banco. Estados, leases e retentativas documentados em backend/README.md. Backups precisam abranger MySQL e os arquivos do storage separadamente; o módulo de backup ainda não foi integrado.

Unidades/salas/comodidades e galeria agora podem ser gerenciadas pelo admin no modo API. Exclusões com vínculos de negócio são bloqueadas e gravações geram registros_auditoria na mesma transação. A estrutura principal continua em database/mysql/estrutura-inicial.sql e nas migrações versionadas; SQL não depende de abas abertas no Workbench. Para testar: npm run check:catalogo-admin em backend. O teste usa IDs próprios e remove suas fixtures.
