# Meus Agendamentos — integração sem mudança visual

Pedido: continuar API preservando o visual de todas as telas existentes.
Decisão do usuário: permitir cancelamento de reservas pagas, com reembolso manual.

- Consultar somente reservas do cliente da sessão; próximas/passadas/canceladas,
  contagens e nomes de sala/unidade em uma resposta, sem carregar outros usuários.
- Paginação por cursor de 20 registros, carregando mais ao rolar; sem novos controles
  visuais ou CSS. Conservar abas, cartões, confirmação inline e política no rodapé.
- Manter limite existente de 24 horas para cancelar. Revalidar no servidor, após
  locks, sessão/conta ativa, proprietário, versão e antecedência. Plano consumido
  exige estorno ainda não integrado e bloqueia cancelamento do cliente.
- Pagamento concluído não vira pendente nem estornado. Cancelamento pago informa
  reembolso manual da equipe; auditoria e cancelamento atômicos. Retry de cancelado
  é idempotente. Não implementar pagamento, refund ou débito de plano.
- GET /agendamentos/meus, POST /agendamentos/:id/cancelamento; corpo de cancelamento
  aceita somente expectedVersion, nunca proprietário, pagamento ou saldo.
- Reaproveitar módulo, serviço, repositório e gateway existentes. Mock permanece
  explícito, sem fallback em falha real. Não alterar schema/grants/dados reais.
- TDD: autorização/propriedade, filtros/cursor, limites temporais, pago/plano,
  replay, rollback e sessão; gateway e hook com respostas atrasadas e paginação.
- Verificações: typecheck/test/build raiz e backend, check MySQL com fixtures e
  limpeza; revisão independente e conferência visual usando componentes existentes.
- Preservar alterações anteriores não commitadas; sem commit, push ou deploy.

## Resultado

Implementado sem alteração de CSS/layout. Verificações: raiz typecheck, 242 testes e build; backend 59 testes (inclui build); checks MySQL de criação e Meus Agendamentos passaram com limpeza das fixtures. Revisão independente sem problemas importantes. Conferência no navegador dos componentes reais com dados ilustrativos, sem alterar a conta do usuário. A validação transacional foi feita nos checks HTTP/MySQL; não houve cancelamento de reserva real pela interface. Sem SQL adicional, commit ou deploy.
