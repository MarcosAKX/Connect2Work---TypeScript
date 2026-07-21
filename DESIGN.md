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

## Acessibilidade

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
