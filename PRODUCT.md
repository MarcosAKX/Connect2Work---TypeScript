# Produto — Connect2Work

## Visão

Plataforma web para encontrar unidades de coworking, reservar salas e conhecer
serviços empresariais, como endereço fiscal e comercial.

## Usuários

- Profissionais autônomos.
- Pequenas equipes.
- Pessoas que precisam de salas por hora para reunião ou trabalho concentrado.
- Administradores responsáveis por acompanhar unidades, salas e agendamentos.

## Objetivos principais

1. Criar conta ou entrar.
2. Escolher unidade.
3. Comparar salas.
4. Selecionar data e período contínuo.
5. Conferir resumo e criar agendamento.
6. Consultar reservas por status.
7. Comparar serviços empresariais e consultar condições nas unidades.
8. Acessar um painel administrativo conforme o perfil autenticado.

## Plataforma

Web responsiva. Uso esperado em desktop e celular.

## Registro visual

Interface de produto. Design serve à tarefa: familiar, direto, escuro e com
destaque dourado reservado para marca, foco, seleção e ações principais.

## Estado atual

A aplicação usa frontend React/TypeScript, API NestJS/TypeScript, MySQL e Cloudinary.
O frontend está organizado por funcionalidade; o backend mantém camadas.

- Cadastro, login, sessão e logout estão integrados à API/MySQL.
- Cliente consulta unidades e salas; administrador gerencia usuários, unidades,
  salas, comodidades e galeria de imagens com dados reais.
- Arquivos de imagens ficam no Cloudinary; o banco mantém referências e controle.
- Serviços empresariais usam MySQL: cadastro/edição pelo admin e vitrine de ativos
  para clientes, com imagens no Cloudinary.
- Agendamentos administrativos e Painel do Dia estão integrados: criação,
  cancelamento, check-in e registro manual de pagamento.
- Reservas do cliente, checkout/provedor, dashboard, planos, backup,
  consulta de auditoria na interface continuam pendentes no modo API.
- Tarefas usam MySQL: admin e secretaria editam o quadro compartilhado; prazo
  definido somente na criação e imutável para ambos.
- Google e recuperação real de senha continuam pendentes.
- O mock permanece disponível explicitamente para desenvolvimento e demonstração;
  falha da API não autoriza fallback para dados locais.

## Limites de implantação

O frontend publicado na Vercel não hospeda automaticamente a API nem o MySQL.
O ambiente real completo precisa de configuração de infraestrutura, HTTPS,
segredos, backups e monitoramento. O desenvolvimento atual continua local.

## Referências

- [Funcionalidades e status](FEATURES.md).
- [Mapa do código e critérios de organização](PROJECT_STRUCTURE.md).
- [Próximas integrações](docs/planejamento/MIGRATION.md).
- [Histórico de evolução](docs/historico/evolucao-ate-2026-10-19.md).


## Campos obrigatórios das tarefas

Título, responsável da equipe e prioridade são obrigatórios ao criar ou editar.
A prioridade inicia em Média e pode ser alterada. O prazo é obrigatório na criação
e permanece travado depois; tarefas antigas sem prazo são preservadas. A descrição
continua opcional. Formulário, API e mock validam a obrigatoriedade; não é necessário
alterar as tabelas existentes.
