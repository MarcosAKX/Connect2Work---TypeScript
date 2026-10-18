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

## Próximos passos

1. Criar projeto Supabase e aplicar migrations versionadas de `supabase/migrations/`.
2. Adicionar migration de funções de papel e policies RLS; tabelas já nascem com RLS habilitado e não devem ser expostas antes disso.
3. Gerar tipos TypeScript pelo Supabase CLI e implementar adaptadores dos contratos existentes.
4. Migrar Auth; criar `profiles` usando o UUID correspondente de `auth.users`.
5. Importar dados locais com mapa entre IDs seed legados e novos UUIDs, preservando todas as chaves estrangeiras.
6. Mover criação/cancelamento de reserva e débito/estorno de horas para funções PostgreSQL transacionais usando hora do servidor.
7. Migrar imagens base64 para Storage, atualizando apenas caminhos via `FileStorageGateway` futuro.
8. Executar reconciliação: contagem, totais, vínculos, saldos e auditoria antes de trocar adaptador ativo.
9. Substituir pagamento demonstrativo por gateway real e webhook idempotente quando decisão financeira existir.

## Preparação concluída no mock

- Novos registros recebem UUID sem prefixo; IDs seed antigos continuam válidos localmente.
- `AuditGateway`, `BackupGateway` e extrato de horas existem sem dependência da UI.
- Mapeadores impedem nomes `snake_case` do banco de vazarem para páginas e hooks.
- Backup usa versão explícita e rejeita formatos incompatíveis.
## Backup independente da autenticação

- O schema 2 exporta somente dados de domínio e informa `credentialsIncluded: false`.
- Senhas, tokens e sessões permanecem fora do `BackupGateway`.
- No Supabase, contas serão administradas pelo Supabase Auth; exportação e restauração das tabelas de negócio poderão manter o mesmo envelope versionado.

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

A decisão atual substitui os passos Supabase acima: MySQL local e API NestJS/TypeScript. Schema de 14 tabelas e seed em database/mysql/, recriados pelo usuário em banco de validação. Backend etapa 1 implementa health/readiness e comando check:database; acesso real aguarda senha local. Próxima etapa: identidade, sessão e autorização antes de trocar gateways. Não importar credenciais mock nem habilitar pagamento real. Histórico Supabase é legado não ativo.

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
