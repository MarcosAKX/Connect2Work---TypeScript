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
- src/infrastructure/database/database.service.ts: DatabaseService encapsula pool, sessão UTC e liberação das conexões; Readiness define o contrato.
- src/api/health.controller.ts: HealthController recebe requisições e delega verificação, com injeção de dependência.
- src/application.ts: compõe módulo, providers e middleware HTTP.
- src/main.ts: inicialização local e shutdown.
- src/check-database.ts: prova manual da conexão real por comando de leitura.
- test: suíte Node test runner, independente do Vitest frontend.

SQL não vem de HTTP. mysql2 mantém DECIMAL como string, multipleStatements=false, pool de cinco conexões e fila limitada. As sessões usadas são configuradas em UTC explicitamente; timezone do driver sozinho não configura o fuso do servidor. Erros de banco não são retornados nem logados com credenciais. A API escuta só em 127.0.0.1; não habilita CORS ou expõe endpoints de usuários.

Isso é uma fundação de desenvolvimento, não implantação de produção. HTTPS, identidade/sessões, autorização, limitação de requisições privadas, repositórios de domínio e transações de reservas virão em etapas próprias. MySQL não fica acessível ao navegador por esta API. A classe de infraestrutura demonstra encapsulamento, mas objetos de domínio com comportamentos ainda não foram implementados.

## Evidência atual

Oito testes automatizados passaram: variáveis, portas, conta root rejeitada, decimais/configuração de pool, liberação/shutdown, falhas e respostas HTTP. Não equivalem a login no banco real: a senha será preenchida pelo usuário e check:database precisa ser executado. Nenhuma tabela ou permissão foi alterada pela implementação.