# Connect2Work — Banco de Dados Mock

Persistência provisória no `localStorage`. Implementação em
`src/services/local-storage.ts`. Não usar senhas em texto puro fora deste mock.

## Chaves

- `c2w_mock_users` — usuários cadastrados.
- `c2w_mock_units` — unidades cadastradas e editadas pelo administrador.
- `c2w_mock_rooms` — salas cadastradas e editadas pelo administrador.
- `c2w_mock_session` — usuário autenticado, sem senha.
- `c2w_mock_bookings` — agendamentos.
- `c2w_mock_password_resets` — solicitações simuladas de redefinição.
- `c2w_checkout_draft` — rascunho do checkout no `sessionStorage`.
- `c2w_mock_tasks` — quadro compartilhado de tarefas administrativas.

## Entidades

### User

- `id`, `name`, `email`, `role`, `active`, `createdAt`, `hasHoursPlan`, `hoursBalance`, `hoursPlanTotal?`, `hoursPlanRenewsOn?`, `hoursPlanPaymentConfirmed?`, `hoursPlanLastRenewalAt?`.
- `role`: `client`, `admin` ou `secretaria`; registros antigos sem o campo são tratados como `client`.
- `active`: controla acesso ao sistema; registros antigos sem o campo são migrados como ativos.
- `profession` e `phone` opcionais.
- Usuários antigos recebem `hasHoursPlan: false` e `hoursBalance: 0`. A data de renovação apenas bloqueia o uso após vencida; saldo só é restaurado pela confirmação manual do novo ciclo.
- `StoredUser` acrescenta `password` somente no mock.

### Unit

- `id`, `name`, `address`, `availableRooms`, `imageUrl`, `description?`.
- Seed inicial em `src/services/mock-data.ts` e persistência administrativa em `c2w_mock_units`.
- Imagens do mock são armazenadas como base64 em `imageUrl`.
- Exclusão é bloqueada enquanto houver registros `Room` vinculados.

### Room

- `id`, `unitId`, `name`, `capacity`, `pricePerHour`, `amenities`, `imageUrl`, `imageUrls?`.
- Seed inicial em `src/services/mock-data.ts` e persistência administrativa em `c2w_mock_rooms`.
- Imagens podem ser caminhos, URLs ou base64; `imageUrl` mantém a imagem principal e `imageUrls` a galeria.
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
- `BookingGateway` — consulta, contagem, criação com rejeição de intervalos sobrepostos, confirmação administrativa e cancelamento de cliente ou administrador.
- `CheckoutGateway` — leitura, gravação e remoção do rascunho.
- `TaskGateway` — listagem, criação e movimentação compartilhada; administrador edita/exclui qualquer tarefa, enquanto secretária edita/exclui somente as próprias e não pode alterar a data estimada depois da criação.

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
