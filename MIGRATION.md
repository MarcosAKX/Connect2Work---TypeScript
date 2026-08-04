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
