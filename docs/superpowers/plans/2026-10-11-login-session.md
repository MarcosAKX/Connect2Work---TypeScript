# Login e sessões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after human review and execution-method selection. Steps use checkbox syntax for tracking.

**Goal:** Autenticar usuários no MySQL com expiração por 15 minutos de inatividade e limite absoluto de 4 horas.

**Architecture:** Backend POO nas camadas controllers, services, repositories, DTO e security existentes. Frontend mantém MVVM e gateways; restauração assíncrona substitui a confiança no usuário armazenado localmente. Implementação progressiva sem disponibilizar mutações mock como operações reais.

**Tech Stack:** Node >=24.15 <25, NestJS 11, TypeScript estrito, mysql2, Argon2id, React, Vitest e node:test. Usar node:crypto e cookies HTTP sem biblioteca de autenticação externa.

**Spec:** docs/superpowers/specs/2026-10-11-login-session-design.md

## Global Constraints

- 15 minutos sem atividade; máximo de 4 horas desde o login, sem extensão.
- Senha: mínimo 6; proibir espaços no valor completo recebido; truncar aos primeiros 128 caracteres UTF-16 antes de hash/verificação, conforme decisão explícita do usuário. Não aplicar trim.
- Cookie não persistente, HttpOnly, SameSite=Strict, Path=/, sem Domain; Secure em HTTPS.
- Token aleatório de 32 bytes em base64url; somente SHA-256 BINARY(32) no banco.
- UTC, queries parametrizadas, DTO público explícito; nenhum segredo em logs ou respostas.
- Nenhum any, @ts-ignore ou cast para esconder erros. Não ler ou imprimir .env.
- Migração administrativa manual no Workbench; runtime continua c2w_api sem DDL.
- Ler PRODUCT.md, DESIGN.md, FEATURES.md, PROJECT_STRUCTURE.md e MOCK_DATABASE.md antes de alterar código.
- Não implementar pagamento, e-mail, Google, recuperação de senha ou demais módulos de negócio.
- Atualizar documentos; executar typecheck, test e build. Falhas preexistentes de App.test.tsx devem ser registradas separadamente.

## Review Focus

1. Aba em segundo plano e consultas periódicas não prolongam a sessão — teste na tarefa 5.
2. Logout concorre com atualização de atividade sem reativar sessão — teste na tarefa 2.
3. Conta desativada ou perfil alterado após login reflete o banco — teste na tarefa 3.
4. Falha de rede durante restauração não abre rotas nem ativa fallback — teste na tarefa 5.
5. Senhas com sufixos diferentes após 128 usam o mesmo prefixo, mas espaços no sufixo são rejeitados — teste na tarefa 3.

## Mapa de arquivos

- database/mysql/migrations/003_sessoes.sql: nova tabela e comentários para execução manual.
- backend/src/repositories/contracts/repositorio-sessoes.ts e backend/src/repositories/mysql/repositorio-sessoes-mysql.ts: persistência e concorrência de sessões.
- backend/src/security/token-sessao.ts, politica-senha.ts, relogio.ts, limite-autenticacao.ts: segredo, normalização, tempo e controle de trabalho.
- backend/src/services/servico-sessoes.ts e servico-autenticacao.ts: limites e autenticação.
- backend/src/dto/sessao.dto.ts e usuario-publico.dto.ts: respostas públicas.
- backend/src/controllers/autenticacao.controller.ts e backend/src/security/protecao-http.ts: endpoints, cookie, origem e corpo.
- backend/src/repositories/contracts/repositorio-usuarios.ts e implementação MySQL: leitura de credenciais e perfil atualizado.
- backend/src/security/servico-senha-argon2.ts, services/servico-cadastro.ts: política compartilhada e verificação.
- backend/src/application.ts, app.module.ts, modules/auth.module.ts, main.ts, config/environment.ts e .env.example: composição e configuração pública.
- src/services/auth-http.ts, contratos e composição: autenticação real sem fallback.
- src/state/AuthContext.tsx, src/hooks/useSessionActivity.ts, ProtectedRoute.tsx e AdminRoute.tsx: restauração, atividade e expiração.
- Tests novos em backend/test, src/services, src/hooks e src/state; não criar testes em pages.

### Tarefa 1: tabela de sessões e instruções administrativas

**Files:** Create database/mysql/migrations/003_sessoes.sql; modify backend/README.md e MOCK_DATABASE.md.

**Interfaces:** tabela sessoes(id CHAR(36) ASCII bin, usuario_id CHAR(36) ASCII bin, token_hash BINARY(32), criado_em DATETIME(6), ultima_atividade_em DATETIME(6), expira_em DATETIME(6), revogado_em DATETIME(6) NULL). PK id; UNIQUE token_hash; FK usuario_id REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT; índices usuario_id e expira_em.

- [ ] Escrever SQL comentado InnoDB/utf8mb4, sem DROP ou recriação; checks expira_em > criado_em e ultima_atividade_em >= criado_em.
- [ ] Revisar compatibilidade com UUID/charset das tabelas existentes e ausência de secrets.
- [ ] Entregar ao usuário os comandos USE, CREATE e SHOW CREATE TABLE com explicação e aguardar resultado da execução administrativa antes de testes reais.
- [ ] Atualizar documentação de dados com a 15ª tabela. Não alterar dump histórico de 14 tabelas.

### Tarefa 2: sessão e persistência atômica

**Files:** novos repository/session/security/service acima; backend/test/sessoes.spec.ts e sessoes-mysql.spec.ts.

**Interfaces:** Relogio.agora(): Date; TokenSessao.gerar(): { token: string; hash: Buffer }; TokenSessao.hash(token: string): Buffer | null. SessaoValida { usuarioId: string; ultimaAtividadeEm: Date; expiraEm: Date }. RepositorioSessoes.criar(usuarioId: string, hash: Buffer, agora: Date, expiraEm: Date, hashAnterior: Buffer | null): Promise<void>; consultar(hash: Buffer, agora: Date): Promise<SessaoValida | null>; registrarAtividade(hash: Buffer, agora: Date): Promise<SessaoValida | null>; revogar(hash: Buffer, agora: Date): Promise<void>. ServicoSessoes.criar(usuarioId: string, tokenAnterior: string | null): Promise<{ token: string; sessao: SessaoValida }>; consultar(token: string | null): Promise<SessaoValida | null>; registrarAtividade(token: string | null): Promise<SessaoValida | null>; revogar(token: string | null): Promise<void>.

- [ ] Escrever testes com relógio fixo: consultar em +899999ms válido; +900000ms inválido; atividade em +10min seguida de consulta em +20min válida; atividade repetida nunca aceita consulta em +14400000ms.
- [ ] Executar npm run test --prefix backend; confirmar falha por serviço ainda ausente.
- [ ] Implementar token de 43 caracteres base64url, SHA-256, SQL parametrizado e predicados de expiração/revogação. Atualização não aceita relógio anterior à última atividade. Transação na substituição da sessão; update condicional/lock na atividade.
- [ ] Testar revogação concorrente com atividade, token malformado sem consulta SQL e duas gerações diferentes; assert hash.length === 32 e nenhum token cru armazenado.
- [ ] Executar testes backend; esperado PASS. Testes reais aguardam tarefa 1.

### Tarefa 3: credenciais, política de senha e DTO público

**Files:** servico-autenticacao.ts, politica-senha.ts, limite-autenticacao.ts, DTOs, repository usuarios, cadastro e Argon2; backend/test/autenticacao.spec.ts; atualizar cadastro.spec.ts.

**Interfaces:** PoliticaSenha.normalizar(input: unknown): string; VerificadorSenha.verificar(hash: string, senha: string): Promise<boolean>; RepositorioUsuarios.buscarCredenciais(email: string): Promise<{ usuario: UsuarioPublicoDto; senhaHash: string | null } | null>; buscarPublico(id: string): Promise<UsuarioPublicoDto | null>. UsuarioPublicoDto preserva campos públicos de cadastro, mas role admite client/admin/secretaria. SessaoDto { user: UsuarioPublicoDto; idleExpiresAt: string; absoluteExpiresAt: string }. ServicoAutenticacao.login(input: unknown, tokenAnterior: string | null): Promise<{ token: string; resposta: SessaoDto }>; consultar(token: string | null): Promise<SessaoDto | null>; atividade(token: string | null): Promise<SessaoDto | null>; logout(token: string | null): Promise<void>.

- [ ] Testes: cadastro recebe senha de 130 e hasher recebe somente 128; login verifica o mesmo prefixo; sufixo com espaço é rejeitado; mínimo 6 preservado. Assert nenhum trim.
- [ ] Testes de credenciais: inexistente, hash nulo, inativo ou senha errada retornam 401 “Senha incorreta”; teste de perfil alterado e usuário desativado durante sessão. Conta inexistente executa verificação fictícia.
- [ ] Rodar testes para obter falhas esperadas.
- [ ] Implementar consultas JOIN perfis/planos_horas sem expor hashes; tratar DECIMAL explicitamente. Compartilhar limite máximo de 2 operações Argon2 entre cadastro/login e garantir liberação finally.
- [ ] Implementar serviço; origem do perfil é banco. Falha DB retorna 503 genérico. Sessão de usuário inativo é revogada.
- [ ] Rodar testes backend e atualizar validação/gateway de cadastro para política consistente de truncamento sem mudar maxLength existente.

### Tarefa 4: endpoints, cookie e proteção HTTP

**Files:** controller e protecao-http; composição/configuração; backend/test/autenticacao-http.spec.ts; backend/test/environment.spec.ts; check-registration.ts e cadastro-http.spec.ts.

**Interfaces:** POST /auth/login -> 200 SessaoDto + Set-Cookie; GET /auth/session -> 200 SessaoDto ou 401; POST /auth/activity -> 200 SessaoDto ou 401; POST /auth/logout -> 204 + cookie removido. Cookie c2w_session. Cabeçalho X-C2W-Request: 1 em POST; Content-Type application/json; Origin exato autorizado. Configuração AUTH_ORIGINS explícita localhost:5173/127.0.0.1:5173 no desenvolvimento; AUTH_HTTPS define cookie Secure, com verificação de configuração de produção. Sem CORS externo.

- [ ] Testes HTTP cookie HttpOnly/SameSite=Strict/Path=/ sem Expires/Max-Age no login; Secure em configuração HTTPS. Logout remove cookie e token não reaparece no JSON.
- [ ] Testes rejeitam Origin ausente/indevida, cabeçalho ausente, corpo não JSON, campos extras, corpo >8kb e tentativa excedente.
- [ ] Rodar testes e confirmar falhas antes de implementação.
- [ ] Implementar limites locais: login 10 tentativas/minuto por endereço, limite global 30/minuto; mapa de no máximo 1000 endereços com limpeza de entradas expiradas e rejeição quando saturado. Não confiar em X-Forwarded-For. Preservar limite do cadastro.
- [ ] Compor controllers/services/repositories na aplicação; parsing defensivo do cookie; no-store e sanitização de erros. Logout é idempotente mesmo se sessão ausente.
- [ ] Atualizar testes/utilitário de cadastro com cabeçalhos e executar testes/typecheck/build backend; esperado PASS.

### Tarefa 5: gateway e restauração MVVM

**Files:** src/services/auth-http.ts, contracts.ts, local-storage.ts, create-app-services.ts, index.ts, cadastro-http.ts; src/state/AuthContext.tsx; src/hooks/useSessionActivity.ts; ProtectedRoute/AdminRoute; validators e consumidores de refreshUser encontrados por rg. Tests src/services/auth-http.test.ts e src/state/AuthContext.test.tsx, src/hooks/useSessionActivity.test.tsx.

**Interfaces:** AuthGateway.restoreSession(): Promise<SessaoDtoFrontend | null>; recordActivity(): Promise<SessaoDtoFrontend | null>; SessaoDtoFrontend { user: User; idleExpiresAt: string; absoluteExpiresAt: string }. Preservar getCurrentUser(): User | null como cache de memória. refreshUser(): Promise<void>; contexto expõe status 'checking' | 'authenticated' | 'anonymous' | 'error' e expiração.

- [ ] Testes: chamadas same-origin credentials include, no-store e cabeçalhos próprios; 401 limpa sessão; falha de rede distingue erro; payload público validado por guard sem casts.
- [ ] Testes de restauração: rota não redireciona nem exibe conteúdo privado enquanto checking; erro não ativa usuário local; logout revoga e limpa estado/checkout. Resposta antiga de restauração não sobrescreve logout novo.
- [ ] Testes atividade: eventos somente de página visível, coalescidos por 60 segundos; aba parada não envia heartbeat; GET restore não renova atividade. Timer absoluto encerra frontend em 4h; servidor permanece autoridade.
- [ ] Executar npx vitest run com arquivos específicos para confirmar falha.
- [ ] Implementar AuthHttpGateway, guards públicos e abort timeout de 10 segundos; sem escrita de tokens em storage. Implementação local atende contratos novos sem assumir que mock tem sessão de servidor.
- [ ] Implementar contexto/hook com cleanup de timers/listeners e proteção contra respostas fora de ordem. Usar RouteLoading existente na verificação; falha mostra opção de tentar novamente.
- [ ] VITE_AUTH_API seleciona todo auth real; remover seleção parcial VITE_REGISTRATION_API. Google/reset real retornam funcionalidade indisponível, sem mock fallback. Usar proxy Vite existente.
- [ ] Em modo real, catálogo/serviços podem fornecer leitura pública mock; bloquear leituras privadas de users/bookings/tasks/audit/backup e todas mutações mock com mensagem “Funcionalidade ainda não integrada à API”. Checkout permanece rascunho local sem credenciais e é limpo no logout. getUserById real só consulta usuário atual, nunca expõe lookup arbitrário mock.
- [ ] Rodar testes específicos e npm run typecheck; esperado PASS sem alterar design visual.

### Tarefa 6: integração real, revisão e documentação

**Files:** backend/src/check-authentication.ts, backend/package.json, backend/README.md; PRODUCT.md, FEATURES.md, PROJECT_STRUCTURE.md, MOCK_DATABASE.md, MIGRATION.md.

- [ ] Criar npm run check:authentication --prefix backend: gerar usuário fictício exclusivo, login, consultar sessão, verificar perfil, logout, confirmar rejeição da sessão revogada; validar banco armazena apenas hash. Limpar somente sessões e usuário próprios em finally. Não registrar credenciais/tokens.
- [ ] Executar contra banco local após confirmação da migração; esperado saída resumida PASS e zero fixtures restantes.
- [ ] Testar browser: login/cadastro, reload, rota privada, logout, limite visual de senha e comportamento de funcionalidades ainda bloqueadas. Usar credenciais fictícias; não publicar valores.
- [ ] Executar npm run typecheck, npm run test e npm run build; executar npm run typecheck --prefix backend e npm run test --prefix backend. Reportar as 4 falhas anteriores de App.test.tsx separadamente se persistirem; nenhum erro novo é aceitável.
- [ ] Atualizar documentos para indicar autenticação real e módulos ainda mock, configuração local, limites, política de truncamento e ausência de recuperação real de senha.
- [ ] Revisão final independente conforme skill requesting-code-review, limitada às alterações desta etapa; corrigir achados e repetir verificações afetadas.
- [ ] Informar conclusão e próximo módulo; não avançar para reservas/admin sem nova etapa. Não publicar nem criar commits misturados com alterações anteriores.

## Execução proposta

Executar nesta conversa, pelo agente principal, uma tarefa de cada vez, com atualização ao concluir cada etapa. A primeira entrega será o SQL comentado de sessoes para o usuário aplicar no Workbench. Não começar implementação até a revisão deste plano.

## Autorrevisão

Cobertura: banco (1), limites/token/concorrência (2), credenciais/truncamento/perfil (3), cookie/origem/limites HTTP (4), MVVM/restore/atividade/mock (5), integração/documentos/verificação (6). Interfaces posteriores usam os nomes definidos nas tarefas anteriores. Os cinco riscos de Review Focus têm testes previstos. Não há dependência de pagamento, e-mail ou serviço externo.