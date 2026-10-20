# Connect2Work API

API NestJS/TypeScript com MySQL e Cloudinary. Estado vigente em 20/10/2026;
consulte a [matriz de funcionalidades](../FEATURES.md) para o escopo real.

## Configurar e executar localmente

Node.js da linha 24, versão mínima 24.15, conforme `package.json`.
Na raiz do projeto:

```powershell
npm ci --prefix backend
npm run dev --prefix backend
```

Antes de iniciar pela primeira vez, copie `.env.example` para `.env` dentro de
`backend/` **somente se o arquivo local não existir**. Preencha as variáveis no
arquivo local, nunca no frontend ou Git. A conta de execução é `c2w_api`, sem DDL;
não usar root. A configuração atual de banco admite localhost/127.0.0.1.
Credenciais Cloudinary também ficam exclusivamente nesse `.env`, sem prefixo `VITE_`.

A API escuta em `http://127.0.0.1:3001`. `/health` verifica o processo; `/ready`
verifica MySQL e deve retornar `{"status":"ready"}`. A raiz executa o frontend
separadamente: `npm run dev`, em outro terminal. O proxy Vite `/api` encaminha para a API.

`dev` compila uma vez e inicia; não é watcher. Alterou código backend? Pare com
Ctrl+C e execute novamente. Não sobrescrever `.env` para reiniciar. O build fica em `dist/`.

## O que está integrado

- Cadastro, login, sessão, atividade e logout em `/auth/*`.
- Leitura de unidades e salas autenticada.
- Gestão administrativa de usuários, unidades, salas, comodidades e galeria.
- Serviços empresariais: vitrine autenticada de ativos e cadastro/edição por admin.
- Upload autenticado, publicação e limpeza reconciliável de imagens Cloudinary.
- Agendamentos administrativos, Painel do Dia e Tarefas, para admin e secretaria.
- Auditoria transacional para as mutações administrativas implementadas.

Reservas do cliente/provedor de pagamento e demais módulos pendentes não são liberados por existir
uma tabela ou uma tela mock. Google, recuperação real de senha e sincronização
Google Calendar ainda precisam de implementação. Implantação de produção é uma etapa própria.

## Camadas

`controllers/` recebe HTTP; `services/` executa regras; `repositories/contracts/`
define persistência; `repositories/mysql/` implementa SQL/transações; `dto/` define
formatos. `security/` trata sessão/autorização/limites, `storage/` integra Cloudinary,
`database/` encapsula pool, `config/` valida ambiente e `modules/` compõe dependências.
O [guia central](../PROJECT_STRUCTURE.md) contém o fluxo completo de uma funcionalidade.

## Sessão e proteção HTTP

| Método | Rota | Comportamento |
|---|---|---|
| POST | `/auth/register` | Cria cliente, sem iniciar sessão |
| POST | `/auth/login` | Usuário público e prazos; token somente no cookie |
| GET | `/auth/session` | Consulta sem renovar atividade |
| POST | `/auth/activity` | Renova inatividade dentro do limite absoluto |
| POST | `/auth/logout` | Revoga sessão e remove cookie; idempotente |

Escritas JSON exigem origem autorizada, `Content-Type: application/json` e
`X-C2W-Request: 1`. Upload usa multipart e a proteção de origem/cabeçalho correspondente.
Limites e contratos completos são definidos pelos controllers e middlewares, não pelo cliente.

Sessão expira em 15 minutos sem atividade ou 4 horas desde o login, inclusive na
igualdade do limite. Token aleatório de 32 bytes; MySQL guarda SHA-256 BINARY(32).
Cookie HttpOnly/SameSite=Strict, host-only, sem persistência no login; Secure em HTTPS.
`AUTH_HTTPS=false` é apenas para loopback local. Produção exige HTTPS e origens explícitas;
a API não termina TLS por conta própria. Consultas autenticadas revalidam conta/perfil.

Senha usa Argon2id. Por decisão do produto, mínimo de 6 caracteres, sem espaços
no valor completo; geração/verificação usam os primeiros 128 UTF-16, sem trim.
Nunca registrar cookies, corpo com senha, tokens, hashes ou credenciais. Respostas
expõem somente campos públicos e erros internos genéricos. Limites em memória
não constituem uma solução distribuída para várias instâncias.

## Catálogo, transações e imagens

Gravações exigem sessão e perfil admin também dentro da transação. Auditoria é
atômica; `expectedVersion` impede sobrescrita e `requestId` estável evita duplicação
de criações em repetição. Unidade com salas e exclusão/mudança de unidade de sala
com reservas são bloqueadas. Novas referências de imagens são validadas por proprietário.

Uma foto por unidade e até seis por sala. Upload ocorre ao salvar: JPEG/PNG/WebP
até 10 MiB e 40 MP, conteúdo real validado; otimização WebP até 1600 px/5 MiB e
remoção de metadados. Limites em `src/config/limites-imagens.ts`. Até dois uploads
simultâneos. Arquivos públicos do catálogo ficam no Cloudinary, referências no
MySQL; documentos privados não devem usar esse fluxo.

Temporários são autenticados e têm prazo de 24h. A publicação precede o vínculo SQL;
falha preserva a imagem anterior. MySQL e Cloudinary não formam transação distribuída:
intenções em `arquivos_imagens` permitem reconciliar respostas incertas.

Limpeza roda com API ativa, a cada minuto, até 20 intenções por lote, com lease,
retentativa e carência de 24h para desvinculados. Referências são reconferidas antes
de remover. `npm run cleanup:imagens --prefix backend` executa um lote com as mesmas
regras; o término não significa que todas as retentativas pendentes foram resolvidas.
Namespace padrão local: `connect2work/local`; produção exige namespace próprio.

## Verificações

Na raiz:

```powershell
npm run typecheck --prefix backend
npm run test --prefix backend
npm run build --prefix backend
```

Testes padrão usam dublês e verificações locais; não equivalem a todos os checks reais:

| Script no pacote backend | Escopo |
|---|---|
| `check:database` | Conexão MySQL, conta, decimais e perfis; somente leitura |
| `check:registration` / `check:authentication` | Cadastro/sessões com fixtures próprias |
| `check:unidades` / `check:salas` | Consultas HTTP/MySQL com fixtures próprias |
| `check:admin-usuarios` / `check:catalogo-admin` | Fluxos administrativos reais com fixtures |
| `check:cloudinary` | Envia e remove imagem sintética no provedor |
| `cleanup:imagens` | Manutenção real; não é teste |

Checks com fixtures/Cloudinary são destinados ao ambiente local de validação,
não à produção. Usam o `.env` do backend e removem seus próprios registros ao terminar.
Não executar apenas para validar mudanças de documentação.

## Banco e implantação

[SQL oficial](../database/mysql/README.md) · [Planejamento pendente](../docs/planejamento/MIGRATION.md).
A conta runtime não executa migrations. As migrations 002/003/004 já foram aplicadas
no ambiente local, conforme registros anteriores; não reaplicar sem verificar.
Hospedar apenas frontend na Vercel não hospeda API nem MySQL.

[Relatos anteriores e evidências por etapa](../docs/historico/evolucao-ate-2026-10-19.md).

## Check de agendamentos administrativos

`npm run check:agendamentos-admin --prefix backend` verifica concorrência,
adjacência, idempotência, versões, permissões, valores ocultos, pagamento manual,
check-in, painel e rollback no MySQL local. Usa fixtures próprias com limpeza em
finally e recusa produção. Não aplica DDL. Rotas no guia PROJECT_STRUCTURE.md.

## Upload falha apenas na API local

A API precisa de acesso HTTPS externo ao Cloudinary. Se ela for iniciada por uma
ferramenta com rede restrita, o MySQL local pode funcionar enquanto o upload falha
com EACCES. Execute a API em um terminal local com acesso à rede ou autorize a
execução da ferramenta. Não altere permissões do banco nem exponha as credenciais
no frontend. O check `check:cloudinary` precisa usar o mesmo ambiente de rede.

Serviços reutilizam catálogo, armazenamento e controle de versão. GET `/servicos`,
GET/POST `/admin/servicos` e PATCH `/admin/servicos/:id`. Não exigem migration nova.
O check de catálogo inclui benefícios, idempotência, versão, rollback e visibilidade
do serviço quando há tipo livre para fixture; não altera serviços reais existentes.

## Tarefas

GET/POST `/admin/tarefas`; PATCH/DELETE `/admin/tarefas/:id`;
PATCH `/admin/tarefas/:id/situacao`; GET `/admin/tarefas/equipe` e `/atencao`.
Somente equipe ativa; cliente é recusado antes de consultar o repositório.
Prazo não faz parte do contrato de edição nem do UPDATE. Autor da sessão, versões,
requestId e auditoria transacional protegem gravações. Não usar root nem SQL novo.
`npm run check:tarefas --prefix backend` compila e verifica MySQL local com limpeza
de fixtures; não usa tarefas/contas reais como alvo e recusa NODE_ENV=production.
