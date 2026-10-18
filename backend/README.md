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
