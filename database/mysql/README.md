# MySQL — estrutura e operação local

Referência vigente em 19/10/2026. A API usa MySQL real; arquivos de imagens ficam
no Cloudinary. O frontend não acessa diretamente o banco.

## Arquivos oficiais

| Arquivo | Responsabilidade |
|---|---|
| `estrutura-inicial.sql` | Base original com 14 tabelas, sem contas ou credenciais |
| `migrations/002_usuarios_senha_hash.sql` | Acrescenta `usuarios.senha_hash` |
| `migrations/003_sessoes.sql` | Cria sessões e restrições de integridade |
| `migrations/004_arquivos_imagens.sql` | Controle técnico das imagens Cloudinary |
| `seeds/001_perfis.sql` | Perfis `client`, `admin`, `secretaria`, sem senhas |
| `seeds/002_unidades.sql` | Duas unidades iniciais do mockup |
| `seeds/003_salas_comodidades.sql` | Salas e comodidades iniciais |

## Banco existente e instalação nova

O ambiente local já recebeu estrutura, migrations 002/003/004 e os seeds informados
nos registros de implementação. **Não executar novamente a estrutura inicial nem
as migrations sobre esse banco sem verificar o estado.** SQL salvo não depende de
abas abertas no Workbench. O rascunho duplicado `Untitled.sql` foi removido.

Em instalação nova, revisar os scripts e aplicar a estrutura inicial, depois as
migrations na ordem numérica e os seeds necessários. A conta administrativa executa
DDL; a API usa `c2w_api` com SELECT/INSERT/UPDATE/DELETE no schema `connect2work`.
Provisionamento de contas é separado e não faz parte dos seeds. Não usar credenciais
mock em produção nem adicionar senhas aos scripts.

Arquivos são versionados para reconstrução da estrutura; não são um backup dos
registros atuais. Para mudar de máquina/servidor com dados existentes, é necessário
exportar/restaurar os dados e conferir versões, vínculos e permissões.

## Imagens e dados sensíveis

`unidades.chave_imagem` e `imagens_salas.chave_arquivo` guardam referências;
`arquivos_imagens` controla proprietário, estados e limpeza. Não há BLOBs.
Backups precisam abranger MySQL e os arquivos do storage separadamente; o backup
real pela interface ainda não foi integrado. Hash de senha/token não é devolvido
pela API nem incluído em auditoria.

## Verificar a conexão

Na raiz: `npm run check:database --prefix backend`. É leitura e não aplica DDL.
Com a API ativa, `http://127.0.0.1:3001/ready` precisa retornar `{"status":"ready"}`.
Os demais checks usam fixtures; consulte [backend/README.md](../../backend/README.md).
Testes frontend não validam restauração SQL nem integridade de um dump.

[Histórico de aplicação e testes anteriores](../../docs/historico/evolucao-ate-2026-10-19.md).

Agendamentos administrativos reutilizam as tabelas existentes; esta etapa não exige migration nova. Escritas usam transações, lock da sala, versão concorrente e auditoria atômica. Horas de plano não são consumidas na criação administrativa.

Serviços empresariais utilizam `servicos_empresariais` e `beneficios_servicos`
existentes, sem SQL novo. Conteúdo, benefícios, imagem e auditoria são transacionais.
Tipo é único e imutável; ativo controla a vitrine, sem habilitar plano ou pagamento.

Tarefas reutilizam a tabela `tarefas` existente. Prazo/autor imutáveis na edição,
versão derivada de atualizado_em com microssegundos e auditoria na mesma transação.
Nenhuma migration nova nesta integração.
