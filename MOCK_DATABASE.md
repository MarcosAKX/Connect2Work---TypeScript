# Connect2Work — Banco de Dados Mock

Persistência provisória no `localStorage`. Implementação em
`src/services/local-storage.ts`. Não usar senhas em texto puro fora deste mock.

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
- Seed inicial em `src/services/mock-data.ts` e persistência administrativa em `c2w_mock_units`.
- Imagens do mock são armazenadas como base64 em `imageUrl`.
- Latitude e longitude posicionam a unidade no mapa; registros seed antigos recebem as coordenadas padrão durante a leitura.
- As unidades seed usam os endereços reais informados em Bebedouro/SP. As coordenadas são pontos aproximados dos respectivos trechos e podem ser refinadas pelo formulário administrativo.
- Exclusão é bloqueada enquanto houver registros `Room` vinculados.

### Room

- `id`, `unitId`, `name`, `capacity`, `pricePerHour`, `amenities`, `imageUrl`, `imageUrls?`.
- Seed inicial em `src/services/mock-data.ts` e persistência administrativa em `c2w_mock_rooms`.
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
- Enquanto autenticação for mock, backup contém `StoredUser` e portanto credenciais locais; arquivo deve ser tratado como sensível e nunca enviado ao repositório. Na migração, Supabase Auth elimina esse campo do backup da aplicação.

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

Firebase ou Supabase deve implementar esses contratos. Componentes não devem
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
