# Ledger — plan: docs/superpowers/plans/2026-10-11-login-session.md

Task 1: tabela sessoes aplicada pelo usuário e SHOW CREATE TABLE confirmado.
Ruling: executar na pasta atual — usuário pediu explicitamente esta pasta e execução aqui; preservar alterações anteriores, não criar checkout sem os arquivos não versionados necessários.
Ruling: este ciclo entrega somente backend (tarefas 1–4 e validação correspondente); integração frontend é próxima etapa conforme pedido de trabalhar devagar.
Pre-flight: tarefa 2 produz sessão/hash; tarefa 3 consome exatamente essas interfaces. Tarefa 4 consome DTO e serviço da tarefa 3.
Ruling: datas e relógio regressivo falham fechados; testes de concorrência e SQL reais usam somente fixtures próprias.

Task 1: complete — migração003 preservada; SHOW CREATE TABLE do usuário confirma15ªtabela.
Task 2: complete — testes limites/tokens e SQL real passaram; inatividade/absoluto e concorrência validados.
Task 3: complete — autenticação/perfil/inativação/truncamento Argon2 validados; DTO sem segredo.
Task 4: complete — endpoints/cookie/Origin/JSON/rate validados; cadastro gateway adaptado sem alteração visual.
Final: fixed bypass case-insensitive — POST /AUTH/login RED(401)→GREEN(403).
Final: fixed prazo MySQL — revisão identificou rollback sem prazo; testes de aquisição/travamento/descartar RED→GREEN; suite28/28 e integração real PASS.
Ruling: descartar conexão em qualquer erro da operação — impede devolver comandos possivelmente pendentes ao pool; custo é reconexão em erros comuns, inclusive duplicatas.
Ruling: cabeçalho de cadastro no frontend ajustado nesta etapa — necessário para preservar cadastro existente após ativar proteção HTTP; não migra login/estado MVVM ainda.
Task 5: pending — integração frontend será próxima etapa conforme instrução do usuário.
Task 6: backend integration PASS; verificações raiz/documentação em andamento. Nenhum deploy/commit.
Verificação final: backend typecheck/build28/28tests e check:authentication/check:registration PASS; frontend typecheck/buildPASS, test120/124,4falhas anteriores em App.test.tsx (Bem-vindo de volta versus Bem-vindo). Revisão independente2achados corrigidos; não integrou frontendauth.

Task 5: gateway HTTP, AuthContext, atividade e rotas implementados; testes focados69/69 e typecheckPASS.
Ruling: modo real não inicializa createLocalStorageServices — impede seeds de credenciais locais; catálogo público demonstra seeds somente leitura, rascunho de checkout só em memória. Custo: edições locais antigas não aparecem no catálogo real até migrar catálogo paraMySQL.
Ruling: produção seleciona API obrigatoriamente, sem mock implícito — protege contra build publicado autenticando contas seed; sem /api configurada acesso falha fechado.
Ruling: clockOffset calculado pelo Date HTTP do servidor — evita expiração visual prematura por relógio do navegador; servidor segue autoridade, offset tem precisão aproximada de segundos.
Ruling: atualizar expectativas de título nos testes existentes — título real permanece Bem-vindo; remove4falhas antigas sem mudar a interface.
Task 5: ativada VITE_AUTH_API em desenvolvimento, removido modo parcial VITE_REGISTRATION_API. Validação browser e revisão independente pendentes.
Task 5: complete — login, restauração, atividade e logout integrados; browser real/MySQL PASS, fixture removida.
Revisão frontend: achado P2 retorno à aba desmontava página. Corrigido com verificação em segundo plano preservando componente e inert/aria-busy; regressão PASS.
Task 6: documentação atualizada; verificação final após correção em andamento. Produção sempre API; implantação não executada.

Task 6: complete — frontend typecheck/test149/149/build PASS; backend28/28/build PASS; revisão independente e correção de retorno à aba concluídas. Browser login/recarga/logout/rota privada PASS. Nenhum commit/deploy.

## Unidades — 17/10/2026: concluída

Escopo autorizado: leitura da tela existente de Unidades via API/MySQL, mantendo contrato/MVVM e backend por camadas. Implementados GET /unidades autenticado, contagem LEFT JOIN, DTO público validado, gateway HTTP, loading/vazio/erro/retry e descarte de respostas antigas. Salas reais pendentes, rota bloqueada para não misturar IDs com mock. Sem migração nem seed permanente.

Revisão independente: P2 resposta401 antiga cancelava novo login; reproduzido com teste RED e corrigido por checkCurrentSession serial sem invalidar geração ao agendar. Teste de regressão GREEN. Rótulo corrigido para salas cadastradas (contagem não é disponibilidade por horário).

Verificação final: npm run typecheck/test/build na raiz PASS (156 testes,18 arquivos); backend npm run test PASS (29 testes) e npm run check:unidades PASS com MySQL real. Browser: login fictício, unidade temporária presente no card/mapa, recarga após remoção mostra lista vazia, logout confirmado. Unidade/conta/sessões próprias removidas. Nenhum dado existente alterado, nenhum deploy/commit. Documentação raiz e READMEs atualizados.