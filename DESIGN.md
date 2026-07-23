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
- Serviços usa três planos comparáveis; apenas o plano recomendado recebe destaque dourado.
- Dashboard administrativo usa métricas compactas, dois painéis operacionais e uma faixa de ações rápidas; azul e verde têm uso semântico.
- Gestão administrativa usa tabelas no desktop, linhas reordenadas no celular e modais nativos para formulários e confirmações destrutivas.
- Gestão de salas usa filtro por unidade, tags compactas para comodidades e alvos interativos de pelo menos 44 px.
- Cada card de sala possui galeria própria com setas, contador e indicadores; a tela de agendamento mantém galeria ampliada com os mesmos controles.
- Gestão de agendamentos abre filtrada no dia atual, destaca pendências por fundo e mantém busca, status, unidade e datas em uma barra operacional compacta.
- O Painel do Dia é uma tela operacional independente da listagem histórica e organiza o trabalho por urgência: aguardando chegada, presentes agora, pagamentos pendentes, check-ins, próxima chegada e agenda cronológica com ações rápidas.
- Os filtros do Painel do Dia refinam apenas a agenda; os indicadores superiores preservam os totais completos de hoje para manter contexto operacional.
- Secretaria recebe navegação mínima, com apenas Agendamentos; criação manual usa formulário modal e busca compacta de clientes.
- O menu lateral administrativo abre por hover em dispositivos com mouse e preserva abertura por clique em telas touch; o fechamento por hover possui atraso curto para permitir a travessia do cursor.
- O dashboard administrativo separa cadastros, situação operacional e tendência mensal. Cards estruturais são navegáveis; o gráfico mensal usa volume de reservas reais, sem estimar receita.
- A análise mensal usa interação progressiva: controles visíveis para período/unidade, legenda acionável, detalhes no hover/foco e drill-down por clique sem depender exclusivamente do mouse.
- A ação “Novo Agendamento” usa tamanho compacto; o formulário registra também a situação do pagamento.
- Pagamentos pendentes são ações clicáveis e pedem confirmação antes de mudar para concluído.
- Check-in usa ação direta sem modal; chegadas concluídas ficam verdes e esperados de hoje recebem indicador azul discreto.

## Acessibilidade

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
