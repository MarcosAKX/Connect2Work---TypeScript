# Connect2Work — Estrutura do Projeto

Guia vigente após a organização de 19/10/2026. Este é o documento central para
localizar código, entender responsabilidades e registrar a refatoração.

## Mapa geral

```text
connect2work-app/
├── src/
│   ├── app/                 # rotas, lazy loading, 404 e registro ordenado dos estilos
│   ├── features/            # telas, componentes exclusivos, hooks e testes por funcionalidade
│   ├── components/          # interface compartilhada: shells, proteção de rotas, ícones etc.
│   ├── hooks/               # lógica reutilizada: seleção/envio de imagens
│   ├── services/
│   │   ├── http/            # adaptadores da API e respectivos testes
│   │   ├── mock/            # demonstração local e seus dados/testes
│   │   ├── contracts.ts     # contratos independentes da implementação
│   │   ├── create-app-services.ts # composição explícita API ou mock
│   │   ├── index.ts         # instância dos serviços usados pela aplicação
│   │   ├── errors.ts        # erros compartilhados entre adaptadores
│   │   └── ids.ts           # UUIDs e compatibilidade com IDs da demonstração
│   ├── state/               # sessão, atividade da sessão e tema globais
│   ├── __tests__/           # testes de integração que atravessam funcionalidades
│   ├── types/               # tipos compartilhados do domínio
│   ├── utils/               # funções puras compartilhadas entre áreas
│   ├── assets/              # imagens e CSS; caminhos e ordem dos estilos preservados
│   ├── main.tsx             # inicialização React e providers
│   └── styles.css           # entrada dos estilos globais
├── backend/                 # API NestJS/TypeScript organizada por camadas
├── database/mysql/          # estrutura inicial, migrations e seeds MySQL
├── docs/
│   ├── planejamento/        # integrações e documentos ainda pendentes
│   └── historico/           # relatos anteriores e planos concluídos/substituídos
├── outputs/                 # materiais de apoio; não fazem parte da aplicação
└── PROJECT_STRUCTURE.md     # este guia
```

Não existem mais as pastas genéricas `src/pages/` ou pastas de componentes por
área dentro de `src/components/`. Não foram criados arquivos intermediários de
reexportação para simular os caminhos antigos. Nomes dos arquivos foram mantidos,
exceto pela eliminação dos quatro hooks de coordenação consolidados.

## Funcionalidades e telas

| Pasta em `src/features/` | Páginas | Ações/estado principais |
|---|---|---|
| `autenticacao/` | `LoginPage`, `RegisterPage`, `RecoverPasswordPage` | `useLogin`, `useRegister`, `useRecoverPassword` |
| `unidades/` | `UnitsPage`, `AdminUnitsPage` | `useUnits`, `useAdminUnits`, `useUnitForm` |
| `salas/` | `RoomsPage`, `AdminRoomsPage` | `useRooms`, `useAdminRooms`, `useRoomForm` |
| `agendamentos/` | `BookingPage`, `BookingsPage`, `AdminBookingsPage` | `useBooking`, `useBookings`, `useAdminBookings`, `useAdminBookingsPage`, `useCreateBookingForAdmin` |
| `pagamentos/` | `PaymentPage`, `PaymentConfirmationPage` | `usePayment`; validação específica em `payment.ts` |
| `usuarios/` | `AdminUsersPage` | `useAdminUsers`, `useAdminUsersPage`, `useManagedUserForm` |
| `servicos/` | `ServicesPage`, `AdminBusinessServicesPage` | `useServices`, `useAdminBusinessServices`, `useBusinessServiceForm` |
| `planos-horas/` | `AdminHoursPlanPage` | `useAdminHoursPlan`, `useHoursPlanForm` |
| `tarefas/` | `AdminTasksPage` | `useAdminTasks`, `useAdminTasksPage` |
| `dashboard/` | `AdminDashboardPage` | `useAdminDashboard`, `useMonthlyBookingsChart` |
| `painel-do-dia/` | `AdminDailyPanelPage` | `useAdminDailyPanel`; formatação específica em `daily-panel.ts` |
| `auditoria/` | `AdminActivityPage` | `useAdminActivity`, `useHoursStatement` |
| `backup/` | `AdminBackupPage` | `useAdminBackup` |

Cada pasta também contém seus componentes exclusivos: tabelas, formulários,
seções e diálogos. Telas do cliente e da administração ficam na mesma área,
identificadas pelos nomes `Admin...` quando necessário. Não há subpastas vazias
para funcionalidades futuras nem um arquivo `index` obrigatório por área.

A página 404 fica em `src/app/NotFoundPage.tsx`, pois pertence à navegação geral.
Ter uma tela nessa tabela não significa que ela já esteja integrada ao MySQL.

## Padrão para novas telas

- **Página (`features/<area>/*Page.tsx`):** compõe a interface e conecta rota/contexto ao fluxo.
- **Hook (`features/<area>/use*.ts`):** controla estado e ações, chamando os contratos dos serviços.
- **Componente da área:** apresenta tabela, formulário, seção ou confirmação com responsabilidade própria.
- **Gateway (`services/http/`):** encapsula HTTP, valida respostas e traduz erros.
- **Função pura:** fica na área quando exclusiva; em `utils/` quando compartilhada.
- **Estado global (`state/`):** somente informação global real, como sessão e tema.

Estar na mesma pasta não significa misturar interface, validação, HTTP e SQL no
mesmo arquivo. Componentes não acessam banco ou `localStorage` diretamente.
Preservar TypeScript estrito; não usar `any`, `@ts-ignore` ou casts para esconder erros.

Telas simples podem permanecer simples. Criar um novo arquivo quando ele tiver
responsabilidade clara, complexidade própria ou reutilização real. Não extrair
componentes ou criar camadas somente para seguir um modelo. Não criar um hook
para cada ação nem concentrar todas as telas em um único arquivo.

## Exemplo completo: Unidades

```text
src/features/unidades/
├── UnitsPage.tsx             # tela do cliente
├── useUnits.ts               # consulta e localização das unidades
├── UnitsMap.tsx              # mapa exclusivo desta funcionalidade
├── NearestUnits.tsx
├── UnitLocationCard.tsx
├── AdminUnitsPage.tsx        # compõe a tela administrativa
├── UnitTable.tsx             # apresenta a listagem
├── UnitFormDialog.tsx        # apresenta o formulário
├── DeleteUnitDialog.tsx      # confirmação nativa, mantida separada
├── useAdminUnits.ts          # consulta, paginação, edição, exclusão e controle dos diálogos
├── useUnitForm.ts            # campos, validações e preparação da imagem
└── __tests__/                # testes específicos da área
```

Para encontrar o salvamento de uma unidade:

1. **Campos e botão:** `src/features/unidades/UnitFormDialog.tsx`.
2. **Validação e imagem selecionada:** `src/features/unidades/useUnitForm.ts`.
3. **Ação de salvar e versão capturada na edição:** `src/features/unidades/useAdminUnits.ts`.
4. **Contrato:** `src/services/contracts.ts` (`AdminCatalogGateway` e tipos relacionados).
5. **Requisição:** `src/services/http/catalogo-admin-http.ts` (`CatalogoAdminHttpGateway`).
6. **Endpoint:** `backend/src/controllers/catalogo-administrativo.controller.ts`.
7. **Regra de negócio:** `backend/src/services/servico-catalogo-administrativo.ts`.
8. **Transação/SQL:** `backend/src/repositories/mysql/repositorio-catalogo-administrativo-mysql.ts`.
9. **Persistência:** tabela `unidades`; imagens usam referências/controladores próprios e Cloudinary.

A leitura pública usa `src/services/http/unidades-http.ts`, seguida de
`unidades.controller.ts`, `servico-unidades.ts` e `repositorio-unidades-mysql.ts` no backend.

## Junções realizadas e limites preservados

| Antes em `src/hooks/` | Agora na funcionalidade |
|---|---|
| `useAdminUnits.ts` + `useAdminUnitsPage.ts` | `unidades/useAdminUnits.ts` |
| `useAdminRooms.ts` + `useAdminRoomsPage.ts` | `salas/useAdminRooms.ts` |
| `useAdminBusinessServices.ts` + `useAdminBusinessServicesPage.ts` | `servicos/useAdminBusinessServices.ts` |
| `useAdminHoursPlan.ts` + `useAdminHoursPlanPage.ts` | `planos-horas/useAdminHoursPlan.ts` |

Os quatro pares passaram de oito para quatro arquivos. Cada hook reúne os estados
e ações de sua tela; não acessa o banco diretamente. Em salas/serviços, `data`
continua agrupando os dados do catálogo; em planos, `plan` mantém esse papel.
Esses objetos são derivados do estado já existente, não uma segunda cópia dele.

Tabelas, formulários e confirmações com responsabilidade clara foram mantidos.
Não houve junção de JSX com regras de negócio. A confirmação de exclusão continua
separada para preservar seu ciclo de vida e acessibilidade sem sobrecarregar a página.

`useAdminBookings` permanece separado da coordenação da página porque também
atende o Painel do Dia. `useAdminTasks` mantém `useTaskAttentionCount`, consumido
pelo AdminShell. `useAdminUsers` e sua coordenação permanecem separados pela
complexidade de paginação, edição e permissões. Não houve junção automática de
arquivos apenas pela semelhança dos nomes.

## Integrações, sessão e imagens

- `services/index.ts` continua sendo a entrada dos serviços; não criar instâncias nas páginas.
- `services/create-app-services.ts` escolhe os adaptadores; HTTP não faz fallback silencioso para mock.
- `services/http/` contém autenticação, cadastro, unidades, salas, usuários e catálogo administrativo.
- `services/mock/` contém o adaptador `local-storage.ts`, seus testes e dados demonstrativos.
- `hooks/useImageSelection.ts` é compartilhado entre formulários de unidades, salas e serviços.
- `state/AuthContext.tsx` coordena a sessão; `state/useSessionActivity.ts` registra atividade.
- Sessão real continua com cookie HttpOnly, 15 minutos de inatividade e 4 horas absolutas.
- Imagens continuam no Cloudinary; MySQL armazena referências, ordem e controle de limpeza.
- Upload continua validando JPEG/PNG/WebP, até 10 MiB e 40 MP, otimizando até 1600 px/5 MiB.
- Segredos ficam no `.env` do backend, ignorado pelo Git; nunca usar variáveis `VITE_` para credenciais.

No modo API estão integrados cadastro/login/sessão, leitura de unidades/salas e
administração de usuários, unidades, salas, comodidades e galeria. Serviços públicos
ainda usam conteúdo demonstrativo. Reservas/pagamentos e demais módulos pendentes
continuam com suas restrições anteriores. Esta refatoração não implementa novas integrações.

## Backend e banco

O backend mantém a organização por camadas, sem mudanças nesta refatoração:

| Pasta em `backend/src/` | Responsabilidade |
|---|---|
| `controllers/` | transporte HTTP, entrada e resposta |
| `services/` | regras e coordenação de operações |
| `repositories/contracts/` | contratos de persistência |
| `repositories/mysql/` | consultas e transações parametrizadas |
| `dto/` | formatos tipados de entrada/saída |
| `security/` | sessão, senha, autorização, limites e proteção HTTP |
| `storage/` | contrato e implementação Cloudinary |
| `database/` | pool, conexão e prontidão |
| `config/` | validação de ambiente e limites |
| `modules/` | composição e injeção de dependências |

Os comandos `check-*.ts` e `limpar-imagens.ts` continuam em `backend/src/`, vinculados
aos scripts do pacote. Não foram movidos apenas por estética. Os testes ficam em
`backend/test/`. Estrutura SQL, migrations e seeds oficiais ficam em `database/mysql/`.
Não foi executada nenhuma migration, limpeza de dados ou alteração no Cloudinary.

## Navegação, estilos e testes

- `src/app/App.tsx` registra as mesmas URLs e páginas com `lazy`/`Suspense`.
- `ProtectedRoute`/`AdminRoute`, `AppShell`/`AdminShell` e permissões foram preservados.
- `src/app/route-styles.ts` mantém a mesma ordem dos imports CSS, evitando mudança da cascata.
- CSS permanece em `src/assets/css/`; nenhuma classe, marcação de página ou layout foi redesenhado.
- Testes exclusivos acompanham sua área; testes HTTP/mock acompanham o adaptador.
- `src/__tests__/useAdminCatalog.test.tsx` e `useCatalogForms.test.tsx` atravessam unidades/salas/formulários.
- `src/app/__tests__/App.test.tsx` verifica rotas/permissões; sessão e shells mantêm seus testes próprios.

Verificações essenciais na raiz: `npm run typecheck`, `npm run test`, `npm run build`.
No backend, executar os mesmos três comandos quando o trabalho afetar a API ou
para confirmar a integridade da entrega completa. Testes não substituem revisão
visual quando a interface mudar.

## Plano de aplicação e registro da entrega

- [x] Piloto Unidades: agrupar arquivos e consolidar o controle administrativo.
- [x] Agrupar demais funcionalidades e consolidar os três pares locais restantes.
- [x] Agrupar rotas em `app` e adaptadores em `services/http` e `services/mock`.
- [x] Atualizar este guia e referências existentes sem criar outro manual concorrente.
- [x] Finalizar validação completa e revisão independente.

Foram realocados 157 arquivos e eliminados quatro arquivos de coordenação por
consolidação. Comparação com o estado imediatamente anterior à refatoração confirmou
214 arquivos com corpo preservado, descontando somente caminhos de módulos e os nomes
dos hooks consolidados; os 29 arquivos CSS permaneceram idênticos. Os quatro hooks
e o teste adicional do catálogo foram conferidos separadamente.

O teste adicional verifica que atualização da lista não substitui a versão capturada
na edição/exclusão de sala; a mesma proteção de unidades já tinha cobertura.
Validação final: frontend com typecheck, 191 testes (26 arquivos) e build aprovados;
backend com typecheck, 47 testes e build aprovados. `git diff --check` sem erros.
O build preserva o mesmo CSS de 259,91 kB (mesmo hash), rotas em chunks separados e
reduz os módulos transformados de 202 para 198, correspondendo às quatro junções.

Conferência no navegador em origem local de demonstração separada (porta 5174):
listagem/mapa do cliente, login/logout administrativo, listagens de unidades/salas
e abertura/cancelamento dos formulários de edição. Não foram salvos dados reais.
O servidor temporário foi encerrado; o ambiente normal da porta 5173 foi preservado.
Revisão independente sem achados críticos, importantes ou menores. A revisão não
certifica módulos pendentes nem a infraestrutura de produção, que não foram alterados.

A execução ocorreu na pasta atual, preservando as mudanças anteriores de limpeza e
integração. Não houve commit, push, publicação, alteração de credenciais ou operação
no banco. Planos pendentes ficam em `docs/planejamento/`; entregas e propostas substituídas
ficam em `docs/historico/`. Este guia é a referência atual para caminhos e organização.

## Materiais auxiliares e limpeza anterior

Caches TypeScript ficam em `node_modules/.cache/`, ignorados pelo Git. Comparações
locais em `tmp/bundle-check/` e imagens em `tmp/pdfs/requirements-review/` também são
ignoradas. `outputs/` preserva materiais de apoio, sem participação no runtime.
A migration oficial de sessões é `database/mysql/migrations/003_sessoes.sql`;
o rascunho duplicado `Untitled.sql` foi removido. O código/SQL e os documentos
específicos da antiga proposta Supabase foram removidos; o Git preserva o histórico.

## Organização da documentação — 19/10/2026

A [tabela no README](README.md#documentação) é a entrada da documentação. Os cinco
arquivos exigidos pelo `AGENTS.md` permanecem na raiz: `PRODUCT.md`, `DESIGN.md`,
`FEATURES.md`, `PROJECT_STRUCTURE.md` e `MOCK_DATABASE.md`.

- Guias atuais descrevem responsabilidades e estado vigente; não recebem novas
  cópias do mesmo relato cronológico a cada etapa.
- `backend/README.md` e `database/mysql/README.md` mantêm instruções junto dos módulos.
- `docs/planejamento/MIGRATION.md` substitui o antigo `MIGRATION.md` da raiz como
  roteiro de próximas integrações; não é um script SQL.
- `docs/planejamento/especificacoes/` e `planos/` mantêm agendamentos e especificação
  administrativa com as etapas ainda pendentes identificadas.
- `docs/historico/especificacoes/` e `planos/` guardam os documentos de etapas
  concluídas ou propostas substituídas, marcados como históricos.
- `docs/historico/evolucao-ate-2026-10-19.md` preserva os sete guias anteriores à
  separação entre instrução atual e relatos. Pode conter estados intermediários;
  não deve orientar configuração ou execução.

Foram realocados 13 documentos, sem apagar decisões. A matriz vigente deixou
explícito o que funciona na API, o que é demonstração e o que ainda falta. A referência
do mock foi corrigida para schema 3 e exportação atual sem credenciais, conforme o
código já existente; isso não altera o comportamento do backup.

Ao documentar mudanças: atualizar o guia responsável, ligar pelo índice quando
necessário e registrar decisões de uma etapa uma única vez no histórico. Não
duplicar a descrição completa da mesma implementação em todos os documentos.

Validação desta organização documental: 39 links locais conferidos sem destinos
ausentes; sete guias anteriores preservados integralmente no histórico. Tipos,
191 testes frontend, 47 backend e ambos os builds novamente aprovados. Nenhum
arquivo de implementação, banco ou configuração de execução foi alterado nesta etapa.

## Agrupamento dos testes — 19/10/2026

Os 26 arquivos frontend `.test.ts` e `.test.tsx` ficam em `__tests__/` dentro de
cada funcionalidade ou módulo. Testes que atravessam áreas ficam em `src/__tests__/`.
Exemplos: `src/features/unidades/__tests__/useUnits.test.tsx` e
`src/services/http/__tests__/auth-http.test.ts`.

A descoberta do Vitest continua automática; imports e mocks foram ajustados.
O backend já possui uma pasta dedicada `backend/test/` e permanece nela, sem criar
uma pasta redundante. A exclusão foi adiada pelo usuário para o final do projeto;
nenhum teste foi removido ou desativado nesta etapa.

Validação do agrupamento: typecheck, os mesmos 191 testes em 26 arquivos e build
frontend aprovados; comparação confirmou que os corpos dos testes foram preservados,
com alteração apenas dos caminhos de módulos.

## Agendamentos administrativos — integração de 20/10/2026

- Interface: `src/features/agendamentos/` e `src/features/painel-do-dia/`.
- Estado/ações: `useAdminBookings`, `useAdminBookingsPage`, `useAdminDailyPanel`
  e `useCreateBookingForAdmin`; contratos em `src/services/contracts.ts`.
- HTTP: `src/services/http/agendamentos-admin-http.ts`; sem fallback mock,
  sem carregar todas as reservas ou buscar contas individualmente.
- API: `backend/src/controllers/agendamentos-administrativos.controller.ts`,
  serviço/validação em `services/`, contrato e implementação em `repositories/`.
- Regras de calendário/fuso e centavos: `backend/src/domain/`.
- Rotas: GET `/admin/agendamentos`, GET `/admin/painel-do-dia`, POST
  `/admin/agendamentos`, PATCH `/admin/agendamentos/:id/` com `confirmacao`,
  `pagamento`, `cancelamento` ou `chegada`. Frontend usa proxy `/api`.
- Criação recebe requestId; ações recebem expectedVersion. Operador vem da sessão.
- Testes frontend nas pastas `__tests__` correspondentes; backend em `backend/test/`.
  `backend/src/check-agendamentos-admin.ts` verifica MySQL com fixtures e limpeza.

Para testar localmente, mantenha frontend e backend abertos, entre como admin e
acesse Agendamentos. Crie uma reserva futura para um cliente ativo/sala cadastrada,
consulte pelo filtro de datas e teste pagamento manual/cancelamento. Check-in só
vale no dia comercial da reserva, antes do término. Painel do Dia mostra hoje.
Não é necessário executar SQL novo para esta etapa.

## Serviços empresariais — integração de 20/10/2026

A interface permanece em `src/features/servicos/`: página, hooks e formulário.
`CatalogoAdminHttpGateway` também implementa `BusinessServiceGateway`, reutilizando
o upload de imagens. `create-app-services.ts` seleciona HTTP ou mock explicitamente.
Backend reaproveita o catálogo por camadas: DTO/validação, serviço, contrato e
`RepositorioCatalogoAdministrativoMysql`. Não há módulo ou galeria duplicados.

GET `/servicos` exige sessão e retorna ativos; GET `/admin/servicos` retorna todos
somente para admin. POST `/admin/servicos` recebe requestId; PATCH
`/admin/servicos/:id` exige expectedVersion. O servidor traduz os três tipos para
os códigos existentes do banco. Benefícios principal/secundário mantêm ordem.
Imagem usa imageId e Cloudinary; nenhum base64, URL arbitrário ou segredo é aceito
na escrita. Novos tipos não são inventados; o banco vazio apresenta opções de cadastro.

Testes: `backend/test/servicos-empresariais.spec.ts`, testes HTTP do catálogo,
`src/services/http/__tests__/servicos-http.test.ts` e
`src/features/servicos/__tests__/useBusinessServicesHttp.test.tsx`. O check
`check:catalogo-admin` também testa serviços com fixtures quando o tipo fiscal está
livre, preservando registros já existentes. Validação de upload e exibição com
perfil cliente conferida no navegador; serviço/arquivo temporários removidos.

## Tarefas — integração de 20/10/2026

Interface em `src/features/tarefas/`; `useAdminTasks` coordena leitura paginada e
mutações, `useAdminTasksPage` mantém formulário/modais. `TarefasHttpGateway`, em
`src/services/http/tarefas-http.ts`, implementa os contratos de tarefas sem listar
contas completas ou carregar toda a base. Equipe usa apenas id/nome.

Backend: `controllers/tarefas.controller.ts`, `services/servico-tarefas.ts` e
`validacao-tarefas.ts`, `dto/tarefa.dto.ts`, contrato `repositories/contracts/`
e implementação `repositories/mysql/repositorio-tarefas-mysql.ts`. Composição no
módulo administrativo existente. Não há alteração de schema nem migration nova.

GET `/admin/tarefas` recebe page/pageSize/ownership. GET `/admin/tarefas/equipe`
retorna equipe ativa; GET `/admin/tarefas/atencao` retorna contador. POST cria com
requestId; PATCH `/:id` edita conteúdo; PATCH `/:id/situacao` move; DELETE `/:id`
exclui. Mutações de registros existentes exigem expectedVersion. Toda rota exige
admin/secretaria; autoria vem da sessão. O SQL de edição não inclui prazo/autor.
Tarefas antigas sem prazo continuam legíveis; novas tarefas exigem prazo. Auditoria acompanha a transação.

`npm run check:tarefas --prefix backend` usa fixtures próprias com limpeza em
finally e recusa produção. Verifica edição entre cargos, prazo preservado, autoria,
versões, concorrência, repetição, paginação, rollback e sessão revogada. Testes
frontend/backend nas pastas correspondentes. Conferência no navegador incluiu
criação pela secretaria, edição de outro autor, movimento e prazo bloqueado para
ambos os cargos. Dados temporários removidos. Para testar, acesse `/admin/tarefas`.

Por decisão do usuário, os cartões de Tarefas não possuem seletor de situação;
a movimentação usa o drag-and-drop já existente, mantendo gravação pela API.


## Campos obrigatórios das tarefas

Título, responsável da equipe e prioridade são obrigatórios ao criar ou editar.
A prioridade inicia em Média e pode ser alterada. O prazo é obrigatório na criação
e permanece travado depois; tarefas antigas sem prazo são preservadas. A descrição
continua opcional. Formulário, API e mock validam a obrigatoriedade; não é necessário
alterar as tabelas existentes.


## Entrada administrativa

O login de admin redireciona para `/admin` (Dashboard), inclusive com sessão já
ativa. No modo API, a página mostra os atalhos administrativos e informa que os
indicadores aguardam integração, sem consultar ou apresentar dados de demonstração.
Secretaria continua no Painel do Dia e cliente em Unidades.


## Agendamento do cliente — integração de 21/10/2026

Cliente ativo consulta faixas de uma hora (08h–21h) em America/Sao_Paulo e solicita
reserva pendente pela API. A disponibilidade não contém dados de outras reservas.
O servidor calcula o preço e define usuário, situação pendente, pagamento pendente
e zero horas de plano. A transação compartilha o bloqueio da sala com o admin,
revalida sessão e horário após espera, e grava reserva/auditoria atomicamente.
O requestId permite repetir a mesma solicitação sem duplicar; replay conserva o
estado real, inclusive cancelamento ou período encerrado. Respostas antigas de
outra visita à sala são descartadas, mesmo no percurso A→B→A.

A tela usa carregamento/erro/retry, calendário comercial, valor estimado e protocolo
real após sucesso. Sem checkout, cobrança ou uso de plano. Uma reserva pendente
bloqueia o horário e não expira automaticamente; a equipe pode confirmar ou cancelar
no módulo administrativo já integrado. Meus Agendamentos e cancelamento do cliente foram integrados na etapa seguinte. Não há nova tabela, grant, importação de mock ou deploy.

Código: `src/features/agendamentos/useBooking.ts` coordena o fluxo e
`PendingBookingReceipt.tsx` apresenta o protocolo; `src/services/http/agendamentos-http.ts`
encapsula GET/POST. `BookingGateway.getAvailability` tem implementação HTTP e mock.
Backend: `agendamentos.module.ts` → `agendamentos.controller.ts` →
`servico-agendamentos.ts` → `repositorio-agendamentos-mysql.ts`. Domínio comercial e
bloqueios são reutilizados; métodos administrativos e listagens globais não são expostos.


## Visual de pagamento e conclusão preservado — 21/10/2026

Por solicitação do usuário, após registrar a reserva pendente a interface reutiliza
os componentes e o layout de pagamento anterior (PIX/cartão e resumo lateral).
A etapa é visual: não gera QR de cobrança ou código PIX fictício, nem permite
preencher dados de cartão enquanto o provedor não estiver integrado. Concluir
agendamento abre o painel de conclusão anterior, com ícone, detalhes e botões,
mostrando a situação real da solicitação; não confirma pagamento nem executa
outra reserva. O calendário e o resumo de seleção preservam a aparência anterior,
com validações, bloqueios e persistência reais mantidos.


## Meus Agendamentos — 21/10/2026

Meus Agendamentos mantém BookingsPage (composição), useBookings (estado, consulta, cursor e cancelamento), BookingList/BookingTabs (apresentação). O gateway HTTP implementa listOwn/cancel; mock permanece separado. Reutiliza o módulo de agendamentos e acrescenta validacao-meus-agendamentos no backend; sem nova camada ou tabela.


## Auditoria — integração de 21/10/2026

Auditoria usa AdminActivityPage/ActivityList/useAdminActivity em features/auditoria e AuditoriaHttpGateway em services/http. A consulta passa por AuditoriaController → ServicoAuditoria → RepositorioAuditoriaMysql, registrado no módulo administrativo existente. O contrato e DTOs de leitura ficam em repositories/contracts/repositorio-auditoria.ts. JSON interno não faz parte do DTO público. Reutiliza sessão, limites e conexão limitada.
