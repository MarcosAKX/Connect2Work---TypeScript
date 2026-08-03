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
