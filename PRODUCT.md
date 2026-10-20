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
- Persistência local possui schema versionado, backup tipado, auditoria e extrato de plano; contratos e migration SQL preparam troca futura para Supabase.
- Checkout e pagamento demonstrativo implementados; gateway real ainda pendente.
- Login Google aguarda escolha do backend.
- Administração de unidades, salas e imagens locais implementada.
- Dashboard administrativo e gestão de unidades, salas e agendamentos implementados.

## Backend — etapa 1 (08/10/2026)

- Fundação local NestJS/TypeScript em backend/, com health/readiness e driver MySQL. Frontend permanece no mock; autenticação e cobrança reais não implementadas.
- MySQL substitui a direção Supabase para o backend novo; schema antigo permanece legado. Conexao real da API validada por check:database.

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
