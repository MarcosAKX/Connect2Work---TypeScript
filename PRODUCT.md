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
- Serviços empresariais públicos ainda mostram conteúdo demonstrativo.
- Agendamentos, pagamento, plano de horas e demais módulos administrativos ainda
  aguardam integração no modo API. A existência da tela/tabela não comprova entrega.
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
