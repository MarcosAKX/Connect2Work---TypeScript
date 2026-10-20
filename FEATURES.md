# Connect2Work — Funcionalidades

Status vigente em 19/10/2026. O modo API é a referência para integração real;
mock significa demonstração local, sem comprovação de persistência no servidor.

## Matriz de integração

| Funcionalidade | Modo API / MySQL | Mock de desenvolvimento |
|---|---|---|
| Cadastro por e-mail/senha | Integrado | Disponível |
| Login, sessão, atividade e logout | Integrados | Disponíveis com sessão local |
| Google e recuperação de senha | Pendentes | Google indisponível; recuperação simulada |
| Consulta de unidades, mapa e salas | Integrada | Dados demonstrativos |
| Administração de usuários | Integrada, exclusiva de admin | Disponível |
| Administração de unidades/salas/comodidades | Integrada, exclusiva de admin | Disponível |
| Imagens de unidades e galeria de salas | Cloudinary + referências MySQL | Dados locais de demonstração |
| Vitrine de serviços empresariais | Conteúdo demonstrativo somente leitura | Editável pela administração |
| Agendamentos, horários e reservas | Pendentes; rotas bloqueadas | Fluxos demonstrativos |
| Checkout e confirmação de pagamento | Pendentes; rotas bloqueadas | PIX/cartão simulados |
| Dashboard e Painel do Dia | Pendentes; rotas administrativas bloqueadas | Disponíveis |
| Tarefas, plano de horas e renovação | Pendentes; rotas administrativas bloqueadas | Disponíveis |
| Auditoria e extrato na interface | Pendentes; rotas administrativas bloqueadas | Disponíveis |
| Backup/restauração pela interface | Pendente; rota administrativa bloqueada | Disponível, schema 3 |

## Autenticação e acesso

- Sessão real: 15 minutos sem atividade e máximo absoluto de 4 horas.
- Cookie HttpOnly/SameSite=Strict; Secure em HTTPS. Token original não fica no banco.
- Senhas Argon2id. Por decisão do produto: mínimo de 6 caracteres, sem espaços;
  hash/verificação consideram os primeiros 128 caracteres UTF-16. Campos limitados a 128.
- Nome e profissão rejeitam números; e-mail e telefone possuem validação de formato.
- Não há confirmação de posse do e-mail por link/código nesta etapa.
- Expiração conhecida retorna ao login; falha de verificação sem prazo conhecido
  permite tentar novamente. Consultar sessão não renova a atividade.
- Perfis existentes: `client`, `admin`, `secretaria`. Rotas conferem sessão e perfil;
  endpoints reais também autorizam no servidor.
- Admin HTTP entra em usuários. Secretaria tem rotas definidas, mas os módulos
  operacionais correspondentes ainda estão bloqueados no modo API.

## Catálogo e administração reais

- Unidades: nome, endereço, descrição, imagem e coordenadas opcionais.
- A contagem de salas mostra salas cadastradas, não disponibilidade por horário.
- Salas: unidade, nome, capacidade, preço por hora, comodidades e galeria de até seis fotos.
- Admin pode criar/editar/excluir unidades e salas; vínculos de negócio bloqueiam
  exclusões indevidas e mudança de unidade da sala com reservas.
- Gestão de usuários: busca, paginação, cadastro, edição e ativação/inativação;
  autoproteção administrativa, versão concorrente, auditoria e revogação de sessões.
- Gravações de catálogo usam versão capturada ao abrir edição/exclusão e
  identificação estável de criação; auditoria acompanha a transação.
- Listagens tratam carregamento, vazio, erro e respostas atrasadas. Busca de unidade
  para salas consulta o servidor e preserva a seleção atual.

## Imagens

- Envio pelo formulário ao salvar; uma imagem por unidade e até seis por sala.
- Original JPEG/PNG/WebP: até 10 MiB e 40 megapixels; conteúdo real é validado.
- API remove metadados e otimiza para WebP até 1600 px e 5 MiB.
- Arquivos ficam no Cloudinary; referências, posição e estado técnico ficam no MySQL.
- Falhas não substituem silenciosamente a imagem anterior. Referências antigas sem
  preview são preservadas ao editar metadados até remoção explícita.
- Limpeza usa intenção persistida, carência e retentativas; exige API ativa.

## Interface e modo de demonstração

Temas claro/escuro, layouts responsivos, navegação protegida e componentes
compartilhados permanecem conforme [DESIGN.md](DESIGN.md). O mock permite explorar
calendário, conflitos, cancelamento com antecedência, plano de horas, tarefas,
check-in e pagamentos simulados. Essas regras precisam de implementação e testes
na API antes da liberação dos módulos reais; não são garantias do MySQL atual.

## Validação registrada

Após a reorganização do código: 191 testes frontend e 47 backend, typechecks e
builds aprovados. Scripts `check:*` de integração real são verificações separadas,
não equivalem ao comando `test` e não foram rerodados na refatoração estrutural.

[Próximas integrações](docs/planejamento/MIGRATION.md) ·
[Organização do código](PROJECT_STRUCTURE.md) ·
[Histórico](docs/historico/evolucao-ate-2026-10-19.md)
