# Administração de usuários MySQL — Implementation Plan

> Registro histórico de etapa concluída ou proposta substituída; não executar como roteiro atual.
> Estrutura vigente: `PROJECT_STRUCTURE.md`, na raiz do projeto.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execução na sessão atual; não criar tarefas externas, commits ou publicações.

**Goal:** liberar a gestão de usuários reais exclusivamente para administradores, com permissões no servidor, auditoria atômica, paginação e revogação de sessões.

**Architecture:** preservar backend por camadas e POO com controller → serviço → contrato → repositório MySQL. No frontend, useAdminUsers coordena a tela pelo gateway HTTP, sem acesso direto a banco ou localStorage. Reutilizar sessão, política de senha e infraestrutura SQL existentes.

**Tech Stack:** NestJS 11, Node 24, TypeScript estrito, mysql2/promise, Argon2id, React e Vitest.

**Spec:** docs/planejamento/especificacoes/2026-10-18-administracao-mysql-design.md — segurança comum e etapa 1. Demais módulos terão planos separados.

## Global Constraints

- Ler PRODUCT.md, DESIGN.md, FEATURES.md, PROJECT_STRUCTURE.md e MOCK_DATABASE.md antes de alterar código.
- Sem any, @ts-ignore ou casts que escondam erros; preservar alterações locais do usuário.
- Cookie HttpOnly; sessão com 15 minutos de inatividade e máximo absoluto de 4 horas. Leituras não renovam atividade.
- Apenas admin pode listar, criar e alterar contas. Secretaria e cliente recebem 403, sem dados administrativos.
- Nome/profissão rejeitam números Unicode; e-mail normalizado; telefone segue validação existente; senha mínimo 6, nenhum espaço no valor completo e primeiros 128 UTF-16.
- Sem exclusão física de usuários; sem alterar plano de horas, dashboard, backup, reservas ou tarefas nesta entrega.
- Nenhum BLOB: fotos usarão Cloudinary em etapa posterior. Não solicitar credenciais para esta etapa nem criar conta externa.
- Nenhuma mudança DDL necessária para usuários; banco existente e conta real admin preservados.
- Não executar commit/push/deploy ou restaurar arquivos para limpar alterações existentes.

## Review Focus

1. Admin usa o formulário completo para se inativar/rebaixar: negar como nas ações específicas (tarefas 1/2).
2. Sessão revogada ou papel alterado enquanto o pedido aguarda lock: negar gravação após revalidação transacional (tarefa 2).
3. Duas edições do mesmo usuário: versão esperada desatualizada retorna 409 e não sobrescreve (tarefas 2/3).
4. Busca alterada rapidamente ou página vazia após filtro: ignorar resposta antiga e reiniciar paginação (tarefa 3).
5. Troca de senha do próprio admin: transação revoga sessões e interface retorna ao login; falha de rede não anuncia sucesso nem repete a gravação automaticamente (tarefas 2/3).

## Arquivos e interfaces comuns

Novos arquivos seguem as pastas por camada já existentes, sem reorganizar o backend inteiro:

- backend/src/dto/usuario-gerenciado.dto.ts: entrada validada, DTO e página.
- backend/src/security/acesso-administrativo.ts: autenticação/papel para leituras; identidade confirmada na transação para escritas.
- backend/src/security/limite-administrativo.ts: limite por conta, memória limitada e limpeza.
- backend/src/services/servico-usuarios-administrativos.ts: validação e coordenação de hash/repositório.
- backend/src/repositories/contracts/repositorio-usuarios-administrativos.ts: contrato de persistência.
- backend/src/repositories/mysql/repositorio-usuarios-administrativos-mysql.ts: SQL e transações.
- backend/src/controllers/usuarios-administrativos.controller.ts e backend/src/modules/administracao.module.ts: transporte e composição.
- src/services/usuarios-http.ts: gateway e parser de DTO público.
- src/types/domain.ts: tipos ManagedUser, ManagedUsersQuery e ManagedUsersPage. ManagedUser estende User com version: string opaca; dados de plano existentes somente lidos para compatibilidade, sem ações novas.
- src/services/contracts.ts: adicionar listUsersPage(query) e expectedVersion obrigatório às escritas administrativas; atualizar implementação mock e consumidores existentes sem mudar suas permissões.

Contrato HTTP desta etapa:

- GET /admin/usuarios?search=&role=&active=&page=1&pageSize=50 → { items: ManagedUser[], page, pageSize, total, summary }; pageSize máximo 100, busca máximo 254, enum de papel e ativo estritos. total conta resultados filtrados; summary contém total/active/inactive/admin/client/secretaria globais da coleção autorizada, independentemente dos filtros.
- POST /admin/usuarios → ManagedUser, status 201; corpo name/email/profession/phone/password/role/active.
- PATCH /admin/usuarios/:id → ManagedUser, status 200; mesmo corpo sem password obrigatório, mais expectedVersion. Campo password omitido mantém hash; presente vazio é inválido.
- PATCH /admin/usuarios/:id/perfil → ManagedUser; corpo role/expectedVersion.
- PATCH /admin/usuarios/:id/status → ManagedUser; corpo active/expectedVersion.
- GET /admin/equipe → {id,name}[] para equipe ativa, admin/secretaria; resultado limitado a 100 e ordenado. Não integrar ainda o quadro de tarefas.
- GET /admin/clientes/busca?search= → {id,name,email}[] de clientes ativos, máximo 20. Não inventar saldo/plano para preencher ClientSummary legado: criar tipo de resumo operacional próprio quando o consumidor for conectado.
- Erros: 400 entrada, 401 sessão, 403 perfil, 404 alvo, 409 e-mail/versão/proteção de acesso, 429 limite, 503 falha interna. Mensagens fixas e sem detalhes SQL.

### Task 1: validação, autorização e proteção HTTP

**Files:** criar DTO, acesso-administrativo.ts, limite-administrativo.ts, servico-usuarios-administrativos.ts e contrato de repositório; modificar backend/src/security/protecao-http.ts; testes backend/test/admin-usuarios.spec.ts e backend/test/protecao-http.spec.ts (reaproveitar arquivo existente se houver).

**Interfaces:**
- ConsultaUsuarios { search?: string; role?: 'client'|'admin'|'secretaria'; active?: boolean; page: number; pageSize: number }.
- AcessoAdministrativo.exigir(token: string|null, papeis: readonly Papel[]): Promise<AtorAdministrativo>; AtorAdministrativo contém id/name/role e tokenHash: Buffer interno, nunca DTO HTTP.
- ServicoUsuariosAdministrativos.listar(token, query: unknown), criar(token, body: unknown), atualizar(token,id,body: unknown), alterarPerfil(token,id,body: unknown), alterarStatus(token,id,body: unknown), listarEquipe(token), buscarClientes(token,query: unknown).
- Repositório recebe entradas já validadas, ator interno e hash gerado no serviço; nunca senha original. Tipos de retorno iguais ao DTO paginado/ManagedUser, sem casts entre frontend/backend.

- [ ] Escrever testes que negam client/secretaria, campos extras e actorUserId; rejeitam nome numérico, senha com espaço além do caractere 128, boolean string e paginação inválida; confirmam versão opaca e DTO sem credenciais.
- [ ] Rodar npm.cmd --prefix backend test e observar falha pelos símbolos ausentes; não considerar erro de ambiente como teste vermelho válido.
- [ ] Implementar validadores reaproveitando regras atuais do cadastro, extraindo utilitário compartilhado apenas onde necessário. Argon2 antes da transação; revalidar sessão depois no repositório.
- [ ] Expandir protecaoHttp para métodos mutantes em todas as rotas, mantendo Origin permitido, X-C2W-Request: 1 e JSON. GET/HEAD seguem sem corpo mutante. Normalização de caminho não pode contornar checagem. Upload multipart será exceção explícita somente na etapa de imagens.
- [ ] Limitar consultas admin a 120/min e mutações a 30/min por conta, antes de Argon2; limitador até 1000 entradas com limpeza. Erro de capacidade falha fechado com 429; não remover contador ativo para burlar limite.
- [ ] Testar CSRF negado também fora de /auth/, inclusive caminhos com query/case/barra final. Rodar backend test até passar.

### Task 2: repositório, endpoints e integração MySQL real

**Files:** criar repositório MySQL, controller/module e backend/src/check-admin-usuarios.ts; modificar backend/src/application.ts, backend/src/app.module.ts, backend/src/main.ts, backend/package.json; testes em backend/test/admin-usuarios.spec.ts.

**Interfaces:** constructor(config: DatabaseConfig, relogio: Relogio = new RelogioSistema()) com nome concreto compatível ao módulo existente; métodos públicos implementam o contrato da tarefa 1. createApplication recebe dependência administrativa opcional adicional, sem quebrar chamadas de checks existentes.

- [ ] Criar testes HTTP com dependência fake: sessão ausente 401, cliente/secretaria 403; admin sucesso; respostas não incluem senha_hash/token_hash/password; configuração sem módulo não expõe rotas.
- [ ] Rodar backend test para falha esperada antes de implementar controller/module.
- [ ] Implementar consultas parametrizadas, COUNT consistente com filtros, ordenação por nome/id, offsets limitados (page máximo 10000), JOIN perfis e leitura de planos sem alterações. Versão vem de DATE_FORMAT(atualizado_em, '%Y-%m-%d %H:%i:%s.%f'), preservando microssegundos; não converter a versão em Date JS.
- [ ] Implementar escritas em UTC, timeout SQL 2s e comConexaoLimitada existente. Ordem uniforme: perfil admin estável → usuários ator/alvo por ID ordenado → sessão do pedido. Revalidar ativo/papel/sessão, inatividade e duração absoluta após aguardar locks. Revogações seguem depois dos locks de usuários; revisar compatibilidade com login/logout atuais e testar concorrência.
- [ ] Inserção define UUID e perfil por código validado, sem aceitar ID de perfil arbitrário. Atualização compara expectedVersion, aplica campos explicitamente e garante nova versão monotônica mesmo dentro do mesmo microssegundo. Nunca usar spread de corpo em SQL.
- [ ] Bloquear auto-inativação/rebaixamento em qualquer endpoint, proteger último admin com lock de perfil e contagem atual. E-mail duplicado é 409. Atualização de senha/perfil/inativação revoga sessões do alvo na mesma transação. Auditoria grava apenas metadados permitidos e campos alterados.
- [ ] Adicionar npm run check:admin-usuarios: cria fixtures próprias, sobe API isolada, executa HTTP/MySQL e remove apenas fixtures em finally. Não mudar contas reais. Confirmar também que sessão revogada aguardando escrita não altera alvo.
- [ ] No check, cobrir duas edições com mesma versão (uma vence), mudança de perfil/inativação concorrente, ausência de admin ativo após tentativas negadas, Argon2 verificado, revogação e falha de auditoria com rollback. Falha de auditoria pode ser induzida por gerador de UUID injetável que duplica ID de fixture própria; nenhum DDL para simular falha.
- [ ] Rodar npm.cmd --prefix backend test e npm.cmd --prefix backend run check:admin-usuarios; ambos devem passar e fixtures não podem permanecer.

### Task 3: gateway, ViewModel, paginação e liberação da tela

**Files:** criar src/services/usuarios-http.ts e src/services/usuarios-http.test.ts; modificar contracts.ts, create-app-services.ts, domain.ts, implementação local-storage e testes afetados, useAdminUsers.ts, useManagedUserForm.ts, useAdminUsersPage.ts, AdminUsersPage.tsx, componentes da listagem se necessários, AdminRoute.tsx e redirecionamento após login; criar src/hooks/useAdminUsers.test.tsx.

**Interfaces:**
- ManagedUsersQuery { search?: string; role?: UserRole; active?: boolean; page: number; pageSize: number } e ManagedUsersPage {items: ManagedUser[];page:number;pageSize:number;total:number;summary:ManagedUsersSummary}. ManagedUsersSummary contém total/active/inactive/admin/client/secretaria: number.
- UserManagementGateway.listUsersPage(query): Promise<ManagedUsersPage>; escritas recebem expectedVersion nas atualizações. Mock aplica filtro/paginação e versão; listUsers legado continua com suas restrições, sem ser usado para carregar a lista HTTP inteira.
- UsuariosHttpGateway usa fetcher e callback de revalidação 401 como salas-http; timeout 10s, cookies, no-store e cabeçalho de proteção. Retorna somente whitelist de dados validados.

- [ ] Testar parser rejeitando senha/hash inesperados por não repassá-los, papel inválido, datas inválidas, items/total inconsistentes e versão ausente; corpo enviado não inclui plano/ator nem campos extras.
- [ ] Testar ViewModel: busca debounce de 250ms, filtro novo reinicia página 1, resposta antiga ignorada, erro mantém dados identificados corretamente, 409 solicita recarregar em vez de reenviar. Modal usa versão do registro editado; botão salvar bloqueia pedido duplicado.
- [ ] Rodar npm.cmd run test -- src/services/usuarios-http.test.ts src/hooks/useAdminUsers.test.tsx e confirmar falha esperada.
- [ ] Implementar gateway e adapter mock; hook usa página/total/filtros do servidor, sem calcular estatísticas globais apenas sobre a página. Preservar contadores existentes via summary definido nas tarefas 1/2, agregado sobre toda a coleção autorizada e não sobre a página ou busca. COUNT, summary e página são lidos em um snapshot consistente.
- [ ] Testar summary com números inteiros não negativos, active + inactive = total global e soma de papéis igual ao total global; total filtrado pode ser menor. Nenhuma estatística do dashboard é liberada por isso: são os contadores já existentes na tela de usuários.
- [ ] Aplicar validadores de cadastro ao formulário gerenciado; sem senha em estado após fechar modal. Mudança de senha própria encerra sessão visual mediante confirmação do servidor; revalidar autenticação depois de sucesso. Se resposta falhar, mostrar estado incerto e permitir consulta, sem repetir PATCH automaticamente.
- [ ] Liberar somente /admin/usuarios no modo HTTP; /admin continua bloqueado, links continuam acessíveis pelo shell. Destino inicial do admin HTTP vai para usuários. Preservar secretaria no painel ainda bloqueado. Badge de tarefas não deve iniciar consultas reais de módulo pendente ao liberar usuários: habilitá-lo somente quando tarefas estiverem integradas.
- [ ] Rodar os testes de gateway/ViewModel e App.test.tsx, cobrindo acesso direto a rotas excluídas e recuperação de sessão expirada.

### Task 4: validação visual, regressões e documentação

**Files:** atualizar PRODUCT.md, FEATURES.md, PROJECT_STRUCTURE.md, MOCK_DATABASE.md, docs/planejamento/MIGRATION.md, backend/README.md; DESIGN.md somente se houver ajuste visual necessário à paginação.

- [ ] Conferir no navegador desktop e celular: login admin real, listagem paginada, cadastro de fixture própria, edição, e-mail duplicado, falha de rede e sessão expirada. Não usar conta real como alvo de teste; remover fixtures e seus registros de teste com rastreio por UUID ao finalizar.
- [ ] Verificar que novos usuários aparecem em consultas MySQL, hash não aparece na API, cliente/secretaria não acessam endpoints de contas e rotas de dashboard/planos/backup permanecem bloqueadas.
- [ ] Executar npm.cmd run typecheck, npm.cmd run test, npm.cmd run build; backend run typecheck, test, build, check:admin-usuarios e check:authentication (regressão pela mudança HTTP/sessão). Sem repetir verificações se não houve alterações novas.
- [ ] Revisar diff contra alterações pré-existentes; documentação descreve somente etapa entregue e Cloudinary como decisão futura, sem afirmar upload integrado.
- [ ] Revisão independente de permissões/transações/segredos antes da conclusão. Se a skill de revisão exigir subagente, limitar ao diff desta etapa e somente leitura.
- [ ] Comunicar resultado, evidências dos testes e como acessar usuários; não afirmar demais telas conectadas. Próximo plano cobre catálogo e Cloudinary.

## Revisão do plano

- [x] Escopo limitado a fundação/usuários, sem confundir escolha de Cloudinary com integração concluída.
- [x] Contratos e resumo paginado definidos; contadores não representam apenas a página.
- [x] Cinco riscos de Review Focus têm verificações nas tarefas correspondentes.
- [x] Sem DDL, credenciais nos documentos, publicação ou modificação de contas reais de teste.
- [x] Revisão do usuário e execução autorizadas: retomar banco/admin e permitir Cloudinary; pasta atual confirmada em resposta própria.

## Resultado de execução — 18/10/2026

Etapa 1 implementada e validada. Raiz: typecheck,178 testes e build passaram. Backend: typecheck,37 testes e build passaram; check:admin-usuarios e check:authentication passaram com MySQL real. Navegador confirmou login/redirecionamento, listagem, busca, edição de fixture e bloqueio de backup; fixture removida. Nenhuma migração DDL ou publicação. Demais módulos e upload Cloudinary continuam pendentes.

Revisão independente encontrou corrida de login durante redefinição de senha e refresh com query antiga; ambas reproduzidas e corrigidas com testes. Regressão de busca revertida também corrigida. Revisão independente foi parcial por limite do serviço, complementada por revisão local. Emulação de celular não disponível: conferência visual realizada no viewport existente. Detalhes de execução e decisões no ledger .superpowers/sdd/2026-10-18-admin-usuarios-mysql/progress.md.
