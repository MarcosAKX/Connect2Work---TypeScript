# Connect2Work — Banco de Dados Mock

Persistência provisória no `localStorage`. Implementação em
`src/services/local-storage.ts`. Não usar senhas em texto puro fora deste mock.

## Chaves

- `c2w_mock_users` — usuários cadastrados.
- `c2w_mock_units` — unidades cadastradas e editadas pelo administrador.
- `c2w_mock_session` — usuário autenticado, sem senha.
- `c2w_mock_bookings` — agendamentos.
- `c2w_mock_password_resets` — solicitações simuladas de redefinição.
- `c2w_checkout_draft` — rascunho do checkout no `sessionStorage`.

## Entidades

### User

- `id`, `name`, `email`, `role`, `createdAt`.
- `role`: `client` ou `admin`; registros antigos sem o campo são tratados como `client`.
- `profession` e `phone` opcionais.
- `StoredUser` acrescenta `password` somente no mock.

### Unit

- `id`, `name`, `address`, `availableRooms`, `imageUrl`, `description?`.
- Seed inicial em `src/services/mock-data.ts` e persistência administrativa em `c2w_mock_units`.
- Imagens do mock são armazenadas como base64 em `imageUrl`.
- Exclusão é bloqueada enquanto houver registros `Room` vinculados.

### Room

- `id`, `unitId`, `name`, `capacity`, `pricePerHour`, `amenities`, `imageUrl`, `imageUrls?`.
- Dados estáticos em `src/services/mock-data.ts`.

### Booking

- `id`, `userId`, `unitId`, `roomId`, `date`, `timeSlot`, `status`, `createdAt`, `cancelledAt?`.
- Status: `upcoming`, `past` ou `cancelled`.
- Status não cancelados são recalculados pela data/hora atual durante a leitura.
- Cancelamento exige o mesmo `userId` e pelo menos 24 horas até o início.

### PasswordResetRequest

- `email`, `requestedAt`, `userExists`.
- A resposta da UI não revela se a conta existe.

### CheckoutDraft

- `userId`, `unitId`, `roomId`, `date`, `timeSlot`, `duration`, `total`.
- Existe apenas durante a sessão e é removido no logout ou após confirmação.
- Não armazena dados de cartão.

## Usuários seed

- Perfil cliente:
  - E-mail: `teste@connect2work.com`.
  - Senha: `123456`.

- Perfil administrador:
  - E-mail: `admin@connect2work.com`.
  - Senha: `admin123`.

## Contratos

- `AuthGateway` — sessão, consulta segura de usuário por ID, login, Google, cadastro, reset e logout.
- `CatalogGateway` — leitura de unidades e salas, além de criação, edição e exclusão protegida de unidades.
- `BookingGateway` — consulta, contagem, criação e cancelamento.
- `CheckoutGateway` — leitura, gravação e remoção do rascunho.

Firebase ou Supabase deve implementar esses contratos. Componentes não devem
acessar SDK, banco ou `localStorage` diretamente.

## Obrigatório ao trocar o mock

O backend deve repetir todas as validações, mesmo que a interface já as faça:
proprietário autenticado, antecedência de 24 horas, status atual, conflito de
horário e confirmação do pagamento. A hora oficial deve vir do servidor. Use
operação atômica para evitar dois usuários reservando o mesmo intervalo.
