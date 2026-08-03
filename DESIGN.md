# Sistema visual — Connect2Work

## Direção

Visual escuro, profissional e acolhedor. Fachada e rede dourada identificam as
telas públicas. Telas autenticadas priorizam leitura, comparação e execução.

## Tokens

Fonte: `src/assets/css/base.css`.

- Fundo: `--color-bg`.
- Superfícies: `--color-surface`, `--color-surface-raised`.
- Bordas: `--color-border`, `--color-border-hover`.
- Texto: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`.
- Marca: `--color-accent`, `--color-accent-hover`, `--color-accent-text`.
- Estados: `--color-error`, `--color-success`, `--color-info`.
- Títulos: Space Grotesk.
- Interface e corpo: Inter.
- Raios máximos de cards: `--radius-lg`, 16px.

## Componentes e padrões

- Botão principal dourado; secundário transparente com borda.
- Campos escuros, foco dourado e erro vermelho.
- `AppShell` fixo com logo, navegação, usuário e ação “Sair” vermelha.
- `AdminShell` fixo com logo, badge de perfil, navegação administrativa e ação de saída.
- Navegação autenticada com três áreas principais: Unidades, Meus Agendamentos e Serviços.
- `BackLink` ou retorno contextual em todas as telas.
- Cards usados apenas para unidades reais de informação.
- Telas públicas compartilham `NetworkBackground`, fachada e card de autenticação.
- Checkout usa painel principal e resumo lateral sticky; no celular, ambos formam fluxo vertical.
- Formas de pagamento usam seleção tipo radio tile, sem cards aninhados.
- Serviços usa composição editorial com três entidades próprias, imagens administráveis, benefícios compactos e CTAs dourados de consulta.
- Dashboard administrativo usa cabeçalho com ações frequentes, uma faixa contínua de métricas, área central de análise e pendências, seguida pela agenda; azul, verde, amarelo e vermelho mantêm uso semântico.
- Gestão administrativa usa tabelas no desktop, linhas reordenadas no celular e modais nativos para formulários e confirmações destrutivas.
- Gestão de salas usa filtro por unidade, tags compactas para comodidades e alvos interativos de pelo menos 44 px.
- A listagem de salas usa duas colunas assimétricas no desktop, primeira sala em destaque, fotos dominantes, galeria própria com setas, contador e indicadores, informações compactas e CTA solar com preço por hora; no celular retorna a uma coluna e a tela de agendamento mantém galeria ampliada.
- A seleção de unidades combina cartões horizontais e mapa lateral sticky; o mapa respeita os dois temas, mantém atribuição do provedor e solicita localização somente após ação explícita do usuário.
- O seletor de agendamento apresenta limites de início e término, explica a duração com um exemplo e usa o estado cinza para intervalos ocupados ou já iniciados.
- No tema claro, calendário e horários usam superfícies frias de alto contraste; amarelo identifica seleção, contorno identifica o dia atual e cinza sólido identifica indisponibilidade.
- Gestão de agendamentos abre filtrada no dia atual, destaca pendências por fundo e mantém busca, status, unidade e datas em uma barra operacional compacta.
- O Painel do Dia é uma tela operacional independente da listagem histórica e organiza o trabalho por urgência: faixa de ocupação, pagamentos, check-ins e próxima chegada; agenda cronológica em tabela; pendências acionáveis e horizonte dos próximos sete dias.
- No Painel do Dia, a lateral reúne pendências acionáveis e o total diário de reservas dos próximos sete dias; indicadores gerais não são repetidos fora da faixa de métricas.
- Os filtros do Painel do Dia refinam apenas a agenda; os indicadores superiores preservam os totais completos de hoje para manter contexto operacional.
- Secretaria recebe navegação mínima, com apenas Agendamentos; criação manual usa formulário modal e busca compacta de clientes.
- O menu lateral administrativo abre por hover em dispositivos com mouse e preserva abertura por clique em telas touch; o fechamento por hover possui atraso curto para permitir a travessia do cursor.
- O dashboard administrativo organiza a leitura em três níveis: visão geral, itens que precisam de atenção e agenda. Métricas e pendências são navegáveis; o gráfico mensal usa reservas reais, sem estimar receita.
- A análise mensal usa interação progressiva: controles visíveis para período/unidade, legenda acionável, detalhes no hover/foco e drill-down por clique sem depender exclusivamente do mouse.
- Os temas escuro e claro compartilham tokens semânticos; login, cliente, admin e secretaria usam o mesmo componente de alternância, com dimensões, ícone, estados, rótulo acessível e tooltip idênticos.
- Nos cabeçalhos autenticados, identidade, tema e saída são ações visualmente separadas e seguem a mesma composição para cliente, admin e secretaria.
- O quadro de tarefas usa três colunas operacionais, badges semânticos de prioridade, prazos legíveis e alertas de atraso que não dependem apenas da cor.
- Para secretárias, tarefas criadas por outro usuário exibem “Somente visualização” e não abrem o formulário. Ao editar uma tarefa própria, a data estimada permanece visivelmente bloqueada; administradores mantêm edição completa.
- O formulário de tarefas mantém rótulos na mesma linha de base, campos alinhados em grade e ações destrutivas separadas das ações de confirmação.
- Em telas pequenas, o controle de tema mantém área de toque mínima de 44 px.
- O modo claro usa fundo frio, superfícies brancas delimitadas, campos contrastantes e amarelo de marca ajustado para contraste; não é uma simples inversão do tema escuro.
- Os temas claro e escuro compartilham amarelo solar `#ffc400` e hover `#ffd54a` em gráficos, seleções, ícones e ações.
- No modo claro, o CTA com preço na lista de salas e o selo no cabeçalho do agendamento usam amarelo solar, texto quase preto e contorno discreto para manter leitura sobre superfícies claras ou imagens.
- O login é uma exceção deliberada ao tema claro: mantém fundo e card escuros como assinatura da marca, ajustando apenas textos, campos e contraste.
- A ação “Novo Agendamento” usa tamanho compacto; o formulário registra também a situação do pagamento.
- Pagamentos pendentes são ações clicáveis e pedem confirmação antes de mudar para concluído.
- Plano de horas usa resumo contextual na etapa de agendamento, badge discreto no histórico e estado vencido com orientação acionável; o saldo não é repetido em outras telas do cliente.
- A gestão de planos é uma ferramenta operacional própria no menu lateral, com métricas compactas, tabela de todos os usuários e ações progressivas; não replica permissões nem status de conta.
- Agendamentos, Painel do Dia e Planos de Horas compartilham ritmo, superfícies, densidade de tabela, controles de 44px e rótulos visíveis nos filtros; métricas não são repetidas no cabeçalho da lista.
- Check-in usa ação direta sem modal; chegadas concluídas ficam verdes e esperados de hoje recebem indicador azul discreto.
- Ferramentas do menu lateral são agrupadas por Operação, Administração e Controle, reduzindo procura sem aumentar a navegação principal.
- Telas administrativas compartilham foco visível, estados desabilitados, cabeçalhos de tabela fixos, números tabulares, hover discreto e hierarquia tipográfica compacta.
- Buscas e seletores administrativos usam rótulos visíveis; carregamentos preservam a estrutura com skeletons e estados vazios oferecem um próximo passo.

## Acessibilidade

- Seletores administrativos declaram o esquema do tema para manter fundo e texto legíveis também na lista nativa de opções.

- Ferramentas administrativas secundárias usam drawer lateral com overlay, fechamento por clique externo, botão e tecla Esc.
- Gestão de usuários mantém badges semânticos, filtros compactos, tabela responsiva e confirmações em modal.

- Foco visível em todos os controles.
- Alvo mínimo de 44px em celular.
- Estados selecionados usam semântica e `aria-pressed` quando aplicável.
- Mensagens de erro usam `role="alert"`; confirmações usam `role="status"`.
- Animações respeitam `prefers-reduced-motion`.
- Contraste mínimo: 4.5:1 para texto normal e 3:1 para texto grande.

## Restrições

- Não introduzir nova paleta sem atualizar tokens.
- Não usar cores hardcoded quando existir token semântico equivalente.
- Não criar variantes visuais diferentes para mesma ação.
- Não usar gradiente em texto, glassmorphism decorativo ou cards excessivamente arredondados.
