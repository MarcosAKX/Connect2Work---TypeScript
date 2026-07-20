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

1. Escolher Firebase ou Supabase.
2. Implementar adaptador dos contratos em `src/services/contracts.ts`.
3. Mover criação e cancelamento para operações seguras no backend, usando hora do servidor.
4. Validar propriedade, janela de 24 horas e disponibilidade de forma transacional.
5. Configurar RLS/Security Rules para impedir acesso às reservas de outro usuário.
6. Substituir pagamento demonstrativo por gateway real, reembolso e confirmação via webhook idempotente.
7. Integrar provedor de e-mail e WhatsApp para enviar confirmação após webhook aprovado.
8. Ampliar testes de integração, concorrência e end-to-end.
