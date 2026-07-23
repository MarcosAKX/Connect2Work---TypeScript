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

- Gestão de usuários implementada para administradores, com cadastro, edição de dados pessoais e credenciais, papéis `client`, `admin` e `secretaria`, controle de acesso e autoproteção administrativa.
- Secretaria entra pelo Painel do Dia e acessa também a gestão de agendamentos. O painel concentra chegadas, presença, pagamentos e ações urgentes para uso contínuo no balcão.

- Catálogo inicial de serviços empresariais implementado; consultas comerciais direcionadas ao WhatsApp e contratação digital pendente.

- Frontend React completo.
- Persistência local provisória.
- Checkout e pagamento demonstrativo implementados; gateway real ainda pendente.
- Login Google aguarda escolha do backend.
- Administração de unidades, salas e imagens locais implementada.
- Dashboard administrativo e gestão de unidades, salas e agendamentos implementados.
