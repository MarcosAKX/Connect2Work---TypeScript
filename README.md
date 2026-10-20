# Connect2Work App

Aplicação principal do Connect2Work, construída com React, TypeScript e Vite.
O frontend funciona sem importar arquivos do projeto HTML anterior.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/login`.

## Validar

```bash
npm run typecheck
npm run test
npm run build
```

## Credencial de demonstração (somente modo mock)

- E-mail: `teste@connect2work.com`
- Senha: `123456`

## Estado do backend

O backend real usa NestJS/TypeScript e MySQL; arquivos de imagens ficam no Cloudinary.
Cadastro, login, sessões, catálogo e gestão administrativa de usuários, unidades e salas
já possuem integração HTTP. Os módulos restantes continuam pendentes no modo API.
O adaptador local permanece apenas para demonstração explícita. Não há integração Supabase.

Para testar o modo real localmente, execute também `npm run dev` na pasta `backend`,
com o `.env` configurado conforme `backend/README.md`. O frontend usa o proxy `/api`.
Produção exige disponibilizar a API e o banco; publicar só o frontend não os hospeda.

## Documentação

| Preciso entender… | Documento vigente |
|---|---|
| O objetivo e escopo do produto | [PRODUCT.md](PRODUCT.md) |
| O que está integrado, mock ou pendente | [FEATURES.md](FEATURES.md) |
| Onde ficam telas, ações, API e banco | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) |
| O sistema visual e acessibilidade | [DESIGN.md](DESIGN.md) |
| Como funciona a demonstração local | [MOCK_DATABASE.md](MOCK_DATABASE.md) |
| Como configurar e rodar a API | [backend/README.md](backend/README.md) |
| Estrutura, migrations e seeds MySQL | [database/mysql/README.md](database/mysql/README.md) |
| Quais integrações faltam e em que ordem | [Planejamento](docs/planejamento/MIGRATION.md) |
| Decisões e relatos anteriores | [Histórico](docs/historico/evolucao-ate-2026-10-19.md) |

`AGENTS.md` contém as instruções para agentes e permanece na raiz. Os planos e
especificações pendentes ficam em `docs/planejamento/`; os concluídos ou substituídos,
em `docs/historico/`. Consulte os guias atuais antes de executar um plano antigo.
