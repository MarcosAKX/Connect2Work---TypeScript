# Connect2Work — Funcionalidades

Status vigente em 21/10/2026. O modo API é a referência para integração real;
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
| Serviços empresariais e benefícios | MySQL, admin cadastra/edita; cliente consulta ativos | Disponíveis |
| Agendamento do cliente: disponibilidade e solicitação | Integrado; pendente, sem pagamento/plano | Disponível |
| Meus Agendamentos do cliente | Integrado: lista própria e cancelamento | Disponível |
| Checkout e confirmação de pagamento | Pendentes; rotas bloqueadas | PIX/cartão simulados |
| Agendamentos administrativos e Painel do Dia | Integrados; admin/secretaria, pagamento manual | Disponíveis |
| Dashboard | Página inicial liberada; indicadores pendentes | Disponível |
| Tarefas compartilhadas | Integradas, admin/secretaria; prazo imutável | Disponíveis |
| Plano de horas e renovação | Pendentes; rotas bloqueadas | Disponíveis |
| Auditoria na interface | Integrada, somente admin; busca e paginação | Disponível |
| Extrato de horas | Pendente; aviso na tela de atividades | Disponível |
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
- Admin HTTP entra no Dashboard. Secretaria acessa Agendamentos, Painel do Dia e Tarefas;
  valores acordados e receita não são enviados na listagem desse perfil.

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

Etapa administrativa: 237 testes frontend e 57 backend aprovados, com typechecks,
builds e checks MySQL `check:agendamentos-admin` e `check:agendamentos`. Conferência no navegador com
fixtures próprias: criação, pagamento manual, check-in, painel e cancelamento.

[Próximas integrações](docs/planejamento/MIGRATION.md) ·
[Organização do código](PROJECT_STRUCTURE.md) ·
[Histórico](docs/historico/evolucao-ate-2026-10-19.md)

## Agendamentos administrativos reais



Lista com filtros/paginação no servidor; painel com métricas completas de hoje e

contagens dos próximos sete dias. Horário comercial America/Sao_Paulo, 08h–21h,

intervalos em horas inteiras. Nova reserva administrativa nasce confirmada e

bloqueia o horário. Criação repetida usa requestId; sobreposição é verificada sob

lock da sala. Ações usam versão, autorização e auditoria na transação.

Pagamento é registro manual; cancelamento exige motivo e não devolve dinheiro.

Cancelamento de reserva com horas do plano fica bloqueado até integrar estorno.

O cliente solicita reservas pendentes pela integração de 21/10; checkout continua separado.

## Serviços empresariais reais

Admin cadastra os tipos ainda ausentes e edita conteúdo, benefícios e imagem.
Tipos: Endereço Fiscal, Endereço Comercial e Plano de Horas (apenas vitrine).
Cada tipo existe uma vez; seu tipo não muda ao editar. Serviço inativo fica oculto
aos clientes. Referência da imagem, benefícios ordenados e auditoria são gravados
na mesma transação, com versão concorrente e requestId na criação. Exclusão não
é oferecida nesta etapa; desative para ocultar. Não há importação automática do
mock, ativação de planos, saldo, cobrança ou contratação pelo site.

## Tarefas compartilhadas

Admin e secretaria criam, editam, movem e excluem tarefas da equipe, incluindo as
de outros autores. Clientes não acessam quadro, equipe ou API de tarefas.
Prazo definido somente na criação; edição não aceita esse campo, inclusive para
admin e quando a tarefa foi criada sem prazo. Título, descrição, responsável ativo
e prioridade continuam editáveis. Autor vem da sessão e permanece preservado.
Quadro paginado, filtro Minhas tarefas pelo responsável e contagens do servidor;
movimentação ao arrastar os cartões entre as colunas. Mutações usam versão, auditoria
atômica e requestId na criação. Indicador de pendências considera o dia de São Paulo.

Cartões de tarefas sinalizam prazo com verde (dentro do prazo), amarelo (até 24h
para vencer) ou vermelho (vencido), além do texto. Vencimento no fim do dia de
São Paulo; concluídas e sem prazo permanecem neutras.


## Campos obrigatórios das tarefas

Título, responsável da equipe e prioridade são obrigatórios ao criar ou editar.
A prioridade inicia em Média e pode ser alterada. O prazo é obrigatório na criação
e permanece travado depois; tarefas antigas sem prazo são preservadas. A descrição
continua opcional. Formulário, API e mock validam a obrigatoriedade; não é necessário
alterar as tabelas existentes.


## Entrada administrativa

O login de admin redireciona para `/admin` (Dashboard), inclusive com sessão já
ativa. No modo API, a página mostra os atalhos administrativos e informa que os
indicadores aguardam integração, sem consultar ou apresentar dados de demonstração.
Secretaria continua no Painel do Dia e cliente em Unidades.


## Agendamento do cliente — integração de 21/10/2026

Cliente ativo consulta faixas de uma hora (08h–21h) em America/Sao_Paulo e solicita
reserva pendente pela API. A disponibilidade não contém dados de outras reservas.
O servidor calcula o preço e define usuário, situação pendente, pagamento pendente
e zero horas de plano. A transação compartilha o bloqueio da sala com o admin,
revalida sessão e horário após espera, e grava reserva/auditoria atomicamente.
O requestId permite repetir a mesma solicitação sem duplicar; replay conserva o
estado real, inclusive cancelamento ou período encerrado. Respostas antigas de
outra visita à sala são descartadas, mesmo no percurso A→B→A.

A tela usa carregamento/erro/retry, calendário comercial, valor estimado e protocolo
real após sucesso. Sem checkout, cobrança ou uso de plano. Uma reserva pendente
bloqueia o horário e não expira automaticamente; a equipe pode confirmar ou cancelar
no módulo administrativo já integrado. Meus Agendamentos e cancelamento do cliente foram integrados na etapa seguinte. Não há nova tabela, grant, importação de mock ou deploy.


## Visual de pagamento e conclusão preservado — 21/10/2026

Por solicitação do usuário, após registrar a reserva pendente a interface reutiliza
os componentes e o layout de pagamento anterior (PIX/cartão e resumo lateral).
A etapa é visual: não gera QR de cobrança ou código PIX fictício, nem permite
preencher dados de cartão enquanto o provedor não estiver integrado. Concluir
agendamento abre o painel de conclusão anterior, com ícone, detalhes e botões,
mostrando a situação real da solicitação; não confirma pagamento nem executa
outra reserva. O calendário e o resumo de seleção preservam a aparência anterior,
com validações, bloqueios e persistência reais mantidos.


## Meus Agendamentos — 21/10/2026

Meus Agendamentos: próximas/passadas/canceladas, contagens reais, nomes de sala/unidade e carregamento por cursor de 20 registros. Cancelamento próprio com antecedência mínima de 24h, versão e sessão revalidadas. Pago: mantém pagamento concluído, informa reembolso manual e registra essa necessidade na auditoria. Plano consumido: bloqueado para o cliente. Sem reembolso automático.



## Auditoria — integração de 21/10/2026

Auditoria: GET /admin/atividades com busca por pessoa, item ou identificador e cursor de 30 registros, ordenados do mais recente. Ator histórico preservado; cliente/secretaria não acessam. Cancelamento, pagamento e check-in recebem rótulos específicos a partir de operações conhecidas. Sem edição/exclusão na interface. Extrato de horas permanece sinalizado como pendente.
