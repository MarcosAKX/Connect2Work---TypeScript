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
- O título “Selecione a Data” no agendamento usa o CalendarIcon SVG compartilhado, alinhado ao ícone da seleção de horário.
- O endereço da unidade na lista de salas usa o SVG compartilhado MapPinIcon, em amarelo dentro do círculo existente.
- Os períodos Manhã e Tarde do agendamento usam SVGs de sol e sol no horizonte, com 18px e amarelo solar, alinhados aos rótulos.
- O total de salas no cabeçalho da unidade usa selo amarelo solar sólido com texto escuro e peso forte nos dois temas.
- Na lista de salas e na tela de agendamento, galerias sem imagens exibem ícone e “Fotos em breve”; no tema claro usam superfície clara, sem gradiente escuro. Fotos cadastradas são preservadas.
- Login, cadastro e recuperação compartilham composição dividida: fachada contextual fixa à esquerda e painel de autenticação à direita; no celular, fachada passa para o topo.
- O contêiner dividido mantém `overflow: visible` para que a fachada sticky acompanhe a rolagem da página em formulários longos, sem deixar uma faixa vazia abaixo da imagem no desktop. No celular, a fachada permanece no fluxo normal.
- Checkout usa painel principal e resumo lateral sticky; no celular, ambos formam fluxo vertical.
- Formas de pagamento usam seleção tipo radio tile, sem cards aninhados.
- Serviços usa composição editorial com três entidades próprias, imagens administráveis, benefícios compactos e CTAs dourados de consulta.
- Dashboard administrativo usa cabeçalho com ações frequentes, uma faixa contínua de métricas, área central de análise e pendências, seguida pela agenda; azul, verde, amarelo e vermelho mantêm uso semântico.
- Gestão administrativa usa tabelas no desktop, linhas reordenadas no celular e modais nativos para formulários e confirmações destrutivas.
- Gestão de salas usa filtro por unidade, tags compactas para comodidades e alvos interativos de pelo menos 44 px.
- A listagem de salas usa duas colunas assimétricas no desktop, primeira sala em destaque, fotos dominantes, galeria própria com setas, contador e indicadores, informações compactas e CTA solar com preço por hora; no celular retorna a uma coluna e a tela de agendamento mantém galeria ampliada.
- A seleção de unidades combina cartões horizontais e mapa lateral sticky; o mapa respeita os dois temas, mantém atribuição do provedor e solicita localização somente após ação explícita do usuário.
- Os marcadores das unidades no mapa usam pin GPS SVG amarelo com contorno e centro escuros; a lista de unidades próximas usa `cwlogo.ico` proporcional, sem fundo ou círculo adicional, sem repetir a logo dentro do pin.
- O seletor de agendamento apresenta limites de início e término, explica a duração com um exemplo e usa o estado cinza para intervalos ocupados ou já iniciados.
- A tela de agendamento organiza galeria e detalhes da sala, três etapas visuais, calendário e horários lado a lado no desktop e resumo sticky; em telas menores o fluxo se torna vertical.
- No tema claro, calendário e horários usam superfícies frias de alto contraste; amarelo identifica seleção, contorno identifica o dia atual e cinza sólido identifica indisponibilidade.
- Gestão de agendamentos abre filtrada no dia atual, destaca pendências por fundo e mantém busca, status, unidade e datas em uma barra operacional compacta.
- O Painel do Dia é uma tela operacional independente da listagem histórica e organiza o trabalho por urgência: faixa de ocupação, pagamentos, check-ins e próxima chegada; agenda cronológica em tabela; pendências acionáveis e horizonte dos próximos sete dias.
- No Painel do Dia, a lateral reúne pendências acionáveis e o total diário de reservas dos próximos sete dias; indicadores gerais não são repetidos fora da faixa de métricas.
- Os filtros do Painel do Dia refinam apenas a agenda; os indicadores superiores preservam os totais completos de hoje para manter contexto operacional.
- Secretaria recebe navegação mínima, com apenas Agendamentos; criação manual usa formulário modal e busca compacta de clientes.
- O menu lateral administrativo abre por hover em dispositivos com mouse e preserva abertura por clique em telas touch; o fechamento por hover possui atraso curto para permitir a travessia do cursor.
- O dashboard administrativo organiza a leitura em três níveis: visão geral, itens que precisam de atenção e agenda. Métricas e pendências são navegáveis; o gráfico mensal usa reservas reais, sem estimar receita.
- A análise mensal usa interação progressiva: controles visíveis para período/unidade, legenda acionável, detalhes no hover/foco e drill-down por clique sem depender exclusivamente do mouse.
- Os temas escuro e claro compartilham tokens semânticos; login, cliente, admin e secretaria usam o mesmo componente de alternância, com dimensões, ícone, estados, rótulo acessível e tooltip idênticos. No modo claro, o controle usa superfície levemente solar; sobre o painel escuro de autenticação, preserva fundo escuro e ícone solar.
- Nos cabeçalhos autenticados, identidade, tema e saída são ações visualmente separadas e seguem a mesma composição para cliente, admin e secretaria.
- O quadro de tarefas usa três colunas operacionais, badges semânticos de prioridade, prazos legíveis e alertas de atraso que não dependem apenas da cor.
- Admin e secretaria abrem e editam tarefas de qualquer autor da equipe. O prazo aparece desabilitado em toda edição, com indicação de que é definido na criação.
- O formulário de tarefas mantém rótulos na mesma linha de base, campos alinhados em grade e ações destrutivas separadas das ações de confirmação.
- Em telas pequenas, o controle de tema mantém área de toque mínima de 44 px.
- Em telas de até 720 px, o cabeçalho administrativo oculta a navegação horizontal e usa exclusivamente o drawer; filtros empilham, modais ocupam a largura disponível com rolagem interna e ações fixadas ao final. Em até 480 px, grades de métricas passam para uma coluna.
- O modo claro usa fundo frio, superfícies brancas delimitadas, campos contrastantes e amarelo de marca ajustado para contraste; não é uma simples inversão do tema escuro.
- Os temas claro e escuro compartilham amarelo solar `#ffc400` e hover `#ffd54a` em gráficos, seleções, ícones e ações.
- Na lista de salas, o rodapé separa preço destacado à esquerda (com sufixo /hora) e botão amarelo “Ver horários” à direita, nos dois temas. O selo no cabeçalho do agendamento permanece amarelo solar com texto quase preto.
- Login, cadastro e recuperação preservam a fachada fotográfica nos dois temas; no modo claro, o painel de autenticação, campos, textos e controles usam as superfícies e contrastes claros do sistema.
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

- Na primeira abertura de uma rota, o download do código pode exibir “Carregando página…” com `role="status"`, sem animação. Em áreas autenticadas, o cabeçalho permanece disponível. O aviso usa o texto secundário do tema atual; o visual das páginas carregadas não muda.

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


## Estados de sessão

Preservar tema e formulários. Verificação inicial usa carregamento; falha usa mensagem genérica e botão Tentar novamente. Módulos privados pendentes usam mensagem Funcionalidade em preparação dentro do Shell. Falha de logout aparece junto ao botão Sair e permite nova tentativa. Verificação em segundo plano conserva a página e suspende interação via inert/aria-busy até confirmação.


## Unidades

Preservar o layout e o mapa existentes. Exibir carregamento, ausência de unidades e falha com nova tentativa antes de montar o mapa. A contagem deve usar Salas na unidade / salas cadastradas: disponibilidade por horário depende da etapa de Agendamentos. Imagem não configurada usa placeholder existente. Sem coordenadas, o card permanece na lista.

## Redirecionamento por expiração

Quando o prazo já confirmado pela API é atingido, AuthContext encerra o acesso na interface e as rotas protegidas retornam ao login, sem exigir nova consulta HTTP. O prazo usa o menor entre inatividade e expiração absoluta, com o ajuste de relógio recebido da API. Um temporizador independente continua ativo mesmo se uma verificação falhar ou ficar pendente; respostas antigas não reabrem a sessão. Nova confirmação de atividade substitui o prazo anterior. A interface libera o estado inert ao expirar.

O backend continua sendo a autoridade para aceitar requisições: não houve alteração dos limites de 15 minutos/4 horas nem das verificações no servidor. Esta mudança é conservadora no cliente: o prazo conhecido também pode encerrar essa aba quando outra aba tiver renovado a sessão sem sincronização local. Falhas de verificação antes de conhecer um prazo (por exemplo, primeira abertura com API indisponível) continuam exibindo Tentar novamente; expiração conhecida retorna ao login. Em abas suspensas, a interface atualiza quando o navegador retoma a execução.

Regressões cobrem expiração por inatividade e absoluta com rede indisponível, consulta pendente, resposta tardia, erro anterior ao vencimento e renovação do prazo. Não há alteração de tabelas, credenciais ou dados.


## Salas

Layout de cards preservado. Título Salas da unidade identifica catálogo, sem afirmar disponibilidade de horário. Carregamento usa role=status; falha usa role=alert e Tentar novamente; vazio informa ausência de salas cadastradas. Falta de imagens mantém Fotos em breve. Unidade ausente retorna para Unidades. Agendamentos permanecem em preparação.

## Gestão de usuários MySQL

A gestão de usuários preserva o sistema visual existente. Paginação usa botões Anterior/Próxima, rótulo de página e bloqueio durante carregamento/gravação; contagem de resultados vem do servidor, enquanto indicadores mantêm o resumo global. Rotas administrativas ainda não integradas mantêm a tela de indisponibilidade.

## Formulários de catálogo

A integração preserva layout, tokens e componentes existentes. Em modo HTTP, a galeria recebe arquivos pelo controle de upload; URL externa nova não é oferecida. Miniaturas indicam ordem e permitem mover uma posição antes ou remover. Formulário bloqueia interação durante upload/gravação e apresenta erro sem fechar quando falha. Listas administrativas passam a mostrar total do servidor e navegação de páginas. A consulta cliente mantém o fallback Fotos em breve e usa WebP limitado; cards usam variante de 640px e galeria até 1600px.

A validação e as mensagens de upload usam limite de10MiB para o original. O preview segue no formulário; o arquivo só é enviado ao salvar.

Fotos originais aceitam até 10 MiB e 40 megapixels; continua havendo validação de formato, limite de dois uploads simultâneos e otimização para WebP até1600px/5MiB. Os limites ficam em backend/src/config/limites-imagens.ts. Alterações no backend exigem reiniciar npm run dev na pasta backend. Erros de resolução agora têm código específico e mensagem distinta de arquivo inválido.

## Referências

[Organização](PROJECT_STRUCTURE.md) · [Status das funcionalidades](FEATURES.md) ·
[Histórico de decisões](docs/historico/evolucao-ate-2026-10-19.md).

Na integração administrativa real, pagamento é identificado como registro manual. Listas usam paginação do servidor; indicadores do Painel do Dia preservam os totais de hoje mesmo com filtros. Valores não autorizados ficam ausentes. Datas e horas operacionais usam São Paulo.

Serviços administrativos exibem ações de cadastro apenas para os tipos ausentes.
O formulário preserva sua composição; upload segue o limite de 10 MiB do catálogo.
A vitrine mostra estado vazio ou erro com nova tentativa conforme a resposta real.

No quadro real, cada cartão também oferece seletor de situação para teclado e
touch. Edição e exclusão preservam versão capturada; campos e ações ficam
bloqueados durante gravação. Falhas aparecem no diálogo e permitem atualizar o quadro.
