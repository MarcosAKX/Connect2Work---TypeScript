# Instruções para agentes

Antes de alterar código, leia `PRODUCT.md`, `DESIGN.md`, `FEATURES.md`,
`PROJECT_STRUCTURE.md` e `MOCK_DATABASE.md`.

## Regras essenciais

- Esta pasta é a aplicação principal. Não depender de `../coworking-site/`.
- Manter TypeScript estrito. Não usar `any`, `@ts-ignore` ou casts para esconder erros.
- Componentes não acessam Firebase, Supabase ou `localStorage` diretamente. Usar os contratos em `src/services/contracts.ts`.
- Preservar o sistema visual e os componentes compartilhados existentes.
- Toda tela autenticada usa `AppShell` e toda rota privada usa `ProtectedRoute`.
- Atualizar os documentos da raiz desta pasta quando comportamento, estrutura ou dados mudarem.
- Antes de concluir: executar `npm run typecheck`, `npm run test` e `npm run build`.

## Organização de novas telas e refatorações

- Seguir a separação View / ViewModel descrita em `PROJECT_STRUCTURE.md`, na seção “Padrão para novas telas”.
- Páginas compõem a interface; hooks coordenam estado e ações; componentes apresentam seções; gateways encapsulam acesso aos dados.
- Reaproveitar hooks e contratos existentes antes de criar novas camadas. Não duplicar regras nem estado derivável.
- Telas simples podem permanecer simples: não criar ViewModel ou componente sem responsabilidade clara.
- Em refatorações estruturais, preservar interface, comportamento, permissões e dados. Melhorias funcionais ou visuais exigem escopo próprio.
- Cobrir comportamentos relevantes com testes e executar as verificações essenciais acima; testes passando não substituem revisão visual quando houver mudança de interface.

## Skills locais

- `impeccable`: UX/UI, acessibilidade, responsividade e refinamento visual.
- `caveman`: comunicação curta, sem perder precisão.
- `caveman-commit`: mensagens de commit em Conventional Commits.
