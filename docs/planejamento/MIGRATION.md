# Próximas integrações — Connect2Work

Planejamento vigente em 19/10/2026. Esta lista não afirma que as funcionalidades
pendentes já foram entregues. Consulte [FEATURES.md](../../FEATURES.md) para o estado
real e [PROJECT_STRUCTURE.md](../../PROJECT_STRUCTURE.md) para localizar o código.

## Direção técnica

React/TypeScript por funcionalidade; API NestJS por camadas; MySQL para dados e
Cloudinary para arquivos de imagens. Preservar contratos, IDs, vínculos, sessão e
permissões ao conectar cada módulo. Não copiar credenciais do mock para o MySQL.

## Sequência de trabalho

1. **Agendamentos:** revisar o plano aprovado, implementar consulta de horários e
   gravação transacional com proteção contra sobreposição. A decisão registrada
   é salvar reserva pendente e bloquear o horário; ainda precisa da integração real.
2. **Administração restante:** agendamentos/Painel do Dia, serviços, tarefas e
   auditoria conforme a especificação administrativa; dashboard, plano de horas e
   backup continuam fora da integração já entregue.
3. **Plano de horas:** revisar campos e regras antes de habilitar consumo, renovação
   e estorno reais. Tabelas e telas atuais são provisórias nesse aspecto.
4. **Pagamento:** provedor real, confirmação por webhook idempotente e conciliação;
   checkout mock não comprova cobrança ou pagamento.
5. **Identidade:** recuperação real de senha e, em etapa própria, confirmação de
   e-mail e Google. O login atual não verifica posse do e-mail por mensagem.
6. **Implantação:** disponibilizar API/MySQL, HTTPS/proxy, segredos, monitoramento
   e backup/restauração testados. Frontend Vercel sozinho não atende essa etapa.

Validar cada módulo antes de liberar a rota HTTP. Não usar fallback mock em falha
da API. Migrations novas devem ser revisadas e aplicadas uma vez pela conta adequada.

## Google Calendar — intenção de produto ainda pendente

A intenção registrada é usar um único calendário compartilhado da empresa,
sem OAuth individual dos clientes. Criação, confirmação, alteração relevante e
cancelamento deverão refletir no evento correspondente.

Implementação futura: callback OAuth no backend, armazenamento seguro de refresh
token, vínculo entre agendamento/evento e sincronização com idempotência/retry
(preferencialmente fila ou outbox). Credenciais e tokens Google nunca vão para
frontend, localStorage, backups de domínio ou repositório. Check-in não precisa
alterar o evento. Configuração manual anterior no Google Cloud não comprova que
a integração esteja implementada.

## Documentos de planejamento

- [Especificação de agendamentos](especificacoes/2026-10-18-agendamento-mysql-design.md).
- [Plano de implementação de agendamentos](planos/2026-10-18-agendamento-mysql.md).
- [Especificação administrativa](especificacoes/2026-10-18-administracao-mysql-design.md):
  etapas de usuários e catálogo entregues; demais etapas continuam pendentes.

Planos antigos podem citar caminhos anteriores à organização; usar o mapa atual
para localizar arquivos e revisar o plano antes de executar. Histórico não é roteiro
operacional: [relatos de evolução](../historico/evolucao-ate-2026-10-19.md).
