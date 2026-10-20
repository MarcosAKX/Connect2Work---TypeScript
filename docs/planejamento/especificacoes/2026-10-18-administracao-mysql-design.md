# Integração administrativa com MySQL

> Planejamento pendente ou parcialmente implementado; não comprova entrega.
> Estrutura vigente: `PROJECT_STRUCTURE.md`, na raiz do projeto.

Data: 18/10/2026. Status atual em 19/10/2026: etapas 1 (usuários) e 2 (catálogo/Cloudinary) entregues; demais etapas pendentes. O texto abaixo preserva a especificação, não indica que tudo esteja implementado.

## Objetivo e escopo solicitado

Conectar as telas administrativas existentes ao MySQL pela API, com segurança, POO no backend por camadas e MVVM no frontend. Preservar o sistema visual e os dados locais existentes. Não depender de pastas externas à aplicação.

Inclui usuários, unidades, salas/comodidades/imagens, serviços empresariais/benefícios, agendamentos, painel do dia, tarefas e atividades administrativas. Exclui dashboard, gestão e consumo de plano de horas, extratos de horas, backup e restauração. Não publica backend, banco ou frontend e não executa commit/push.

O pedido abrange subsistemas independentes. Este documento define o contrato geral e a sequência. Cada etapa terá seu plano de implementação e será validada antes de liberar a próxima rota. Uma etapa concluída não significa que as demais estejam conectadas.

## Evidências do código atual

- Autenticação e sessão reais já funcionam; limite de inatividade de 15 minutos e duração absoluta de 4 horas são mantidos.
- Unidades e salas têm leitura HTTP real. Escritas administrativas, tarefas, usuários gerenciados, serviços, auditoria e reservas ainda estão indisponíveis em createAppServices no modo HTTP.
- AdminRoute bloqueia todo AdminShell no modo HTTP. A liberação deve ser específica por rota e somente depois da integração correspondente.
- protecaoHttp cobre apenas /auth/. Todas as novas escritas precisam da mesma defesa de origem e cabeçalho antes de serem expostas.
- useAdminBookings busca todas as reservas e consulta cada cliente; useAdminTasks usa a listagem administrativa de usuários para selecionar equipe. Esses acessos precisam de DTOs e consultas próprios, sem ampliar privilégios da secretaria.
- AdminActivityPage inclui extrato e consulta informações de plano. Essa seção ficará indisponível no modo HTTP; a auditoria não dependerá do plano.
- Os formulários de imagens produzem data URLs. As colunas chave_imagem/chave_arquivo de 500 caracteres são referências e não comportam arquivos codificados.
- Já existe uma conta admin local separada. Seu login não substitui autorização em cada endpoint.

## Abordagens e decisão proposta

1. **Integração por módulos sobre os contratos existentes — recomendada.** Mantém as telas e permite verificar permissões, transações e erros a cada liberação. Exige adaptar contratos que carregam dados excessivos do mock.
2. Um único gateway e controlador para toda administração: menos arquivos iniciais, mas mistura validações e permissões de subsistemas diferentes. Não adotar.
3. Reescrever o painel ou trocar o banco/provedor: escopo maior, sem necessidade para esta integração. Não adotar.

Fluxo de escrita: View → ViewModel → gateway HTTP → controller → serviço → contrato de repositório → repositório MySQL. Somente repositórios executam SQL. DTOs explícitos, validação de entrada unknown e SQL parametrizado. Consultas agregadas evitam busca por usuário/registro no frontend.

## Segurança comum e consistência

- Cookie HttpOnly e sessão validada em todas as rotas privadas. Identidade e papel vêm do servidor; actorUserId, criado_por e chegada_por nunca são aceitos como autoridade do navegador.
- 401 para sessão ausente/expirada; 403 para papel insuficiente. Leituras não renovam atividade. Frontend revalida sessão em 401, preserva mensagem de permissão em 403 e não mistura dados reais com mock.
- Escritas JSON exigem Origin permitido, X-C2W-Request: 1 e Content-Type correto, inclusive fora de /auth/. Rotas de upload terão validação equivalente com Content-Type multipart específico. GET/HEAD não executam mutações.
- Limites explícitos de corpo, campos, imagens e frequência. Limites por conta para mutações e consultas dispendiosas, com limpeza e número máximo de entradas no limitador. São proteção local de instância única; múltiplas instâncias exigirão coordenação antes da implantação.
- Não retornar senha, hash, token ou dados de sessão nas listagens, erros, logs ou auditoria. Respostas privadas com Cache-Control: no-store. Sem detalhes SQL em erros.
- Mutações revalidam o ator ativo e seu papel na transação, com ordem de locks definida por operação. Dados e auditoria na mesma transação; falha na auditoria desfaz a escrita. Timeout descarta conexão cuja transação não terminou.
- Atualizações/exclusões usam versão esperada pelo cliente, comparando atualizado_em com precisão de microssegundos ou equivalente opaco. Estado alterado por outro operador retorna 409 em vez de sobrescrever silenciosamente. Comodidades, benefícios e imagens são atualizados atomicamente com a entidade principal.
- GETs de listas usam paginação no servidor (padrão 50, máximo 100), filtros limitados e ordenação estável por identificador como desempate. Combos de equipe e busca de clientes têm endpoints reduzidos e limites próprios. Adaptar hooks, sem baixar coleções inteiras para filtrá-las.
- Nenhuma nova permissão DDL para c2w_api. Qualquer migração necessária será entregue em SQL comentado para aplicação pelo operador. Não apagar nem recriar tabelas existentes.

## Etapa 1 — fundação administrativa e usuários

Exclusiva para admin: GET/POST /admin/usuarios, PATCH /admin/usuarios/:id e ações específicas de perfil/status. GET aceita busca por nome/e-mail e filtros de perfil/status com paginação. Retorna somente dados pessoais necessários, perfil, estado, datas e versão; não altera nem expõe a gestão do plano de horas.

Cadastro permite client/admin/secretaria e estado ativo/inativo. Reutilizar validadores de e-mail, nome/profissão sem números, telefone e política de senha existente (mínimo 6, nenhum espaço no valor inteiro, primeiros 128 caracteres UTF-16). Guardar somente Argon2id. E-mail normalizado e único. Atualização sem password mantém o hash; atualização com password gera novo hash e revoga sessões anteriores na mesma transação.

Bloquear autoalteração de papel e auto-inativação, inclusive através do formulário completo. Não excluir contas fisicamente. Mudança de perfil ou inativação revoga sessões do alvo. Consultas autenticadas continuam verificando usuário ativo e papel atual.

Proteção do último administrador é serializada por lock de uma linha estável do perfil admin antes de avaliar administradores ativos, sem DDL e com ordem de locks uniforme. Testar duas tentativas concorrentes para impedir remoção simultânea do último acesso. A concessão de papel admin é auditada.

Adicionar GET /admin/equipe para admin/secretaria, limitado a identificador/nome de equipe ativa, e GET /admin/clientes/busca para resumo operacional de clientes ativos. Não permitir que secretaria use listagem/edição de contas. Tarefas não dependerão de listUsers.

Testar cadastro, edição, duplicata de e-mail, campos inválidos, autoalteração, revogação, 401/403, adulteração de ator/papel, concorrência e rollback. Liberar /admin/usuarios somente depois da validação HTTP/MySQL e navegador. O destino inicial do admin em modo HTTP será uma rota já integrada, inicialmente usuários; /admin continuará exibindo indisponibilidade do dashboard.

## Etapa 2 — catálogo e imagens

Admin cria/edita/exclui unidades e salas, preservando coordenadas em pares e limites, capacidade positiva e preço decimal. Não copiar availableRooms do navegador: contagem vem do banco. Exclusão de unidade com salas e de sala com agendamentos retorna conflito legível; não apagar reservas para liberar exclusão.

Comodidades são reutilizadas por nome conforme a collation do banco, sem vínculos duplicados. Corridas de criação resolvem pela chave única e releitura, dentro da transação. Alterar unidade de sala com agendamentos será bloqueado para não reescrever a unidade histórica dessas reservas.

**Decisão final do usuário:** usar Cloudinary para os arquivos e referências no MySQL, com integração substituível. Isso substitui a preferência anterior por BLOB, que não foi implementada. A galeria do desenho corresponde à tabela existente imagens_salas; não criar outra galeria duplicada nem substituir os UUIDs do projeto pelos inteiros do desenho. Não conectar OneDrive. A integração real do Cloudinary dependerá de uma conta configurada pelo usuário; não criar assinatura paga.

Adaptador Cloudinary no backend: cloud name e credenciais obtidos da configuração de servidor, sem prefixo VITE_. API secret nunca é enviado ao navegador. Upload passa pela autorização e validação de imagens da API; não habilitar upload irrestrito sem assinatura. Persistir public_id estável como chave, e metadados necessários para resolver a versão correta da imagem. URLs HTTPS de entrega são produzidas pelo adaptador, com conjunto limitado de tamanhos/transformações para evitar criação ilimitada de derivados. Não depender de recursos exclusivos de plano pago. A substituição de imagens só remove o recurso antigo depois do commit e de conferir ausência de outras referências.

Manter chave_arquivo em imagens_salas e chave_imagem em unidades/serviços como referências, sem adicionar MEDIUMBLOB. Um contrato de armazenamento no backend encapsula envio, remoção e resolução das imagens. Guardar chaves estáveis, sem URLs temporárias ou credenciais no MySQL. URLs de exibição são resolvidas pelo adaptador. Troca de provedor exige copiar arquivos e ajustar referências/configuração, sem refazer Views e ViewModels. Qualquer mudança adicional de schema será entregue em SQL comentado, preservando registros.

Aceitar JPEG/PNG/WebP com máximo real de 5 MiB por arquivo e 6 imagens por sala. Decodificar e reprocessar no servidor com limite de pixels, remoção de metadados e geração de WebP; não confiar em extensão/MIME declarados ou só no processamento do frontend. Não aceitar SVG, nomes/caminhos arbitrários ou data URLs nas escritas de catálogo. Corrigir o limite incoerente existente do frontend (constante 10 MiB e mensagem 5 MB).

Enviar arquivos via multipart com metadados validados e limite total de requisição definido para a galeria (até seis arquivos de 5 MiB, mais metadados limitados). Autenticar e autorizar antes do processamento pesado; limitar concorrência, memória e pixels durante decodificação. Não transformar fotos em base64 para persistência ou respostas JSON. Uploads temporários têm proprietário e expiração, validados ao vincular. Enviar ao storage antes da transação de vínculo, com duração limitada; vínculo, posições e auditoria são atômicos no MySQL. Não manter locks de banco durante chamadas ao provedor.

Listagens retornam metadados e URLs de exibição, nunca os arquivos codificados. Credenciais de storage ficam somente no backend. Fotos publicadas do catálogo podem ser entregues por URLs públicas do storage; arquivos ainda temporários não são publicados. URLs assinadas, se utilizadas para acesso privado, são temporárias e não persistidas como chave. O servidor não busca URLs arbitrárias. Uma sala recebe somente imagens vinculadas ao seu ID; uploads e fotos de outra sala não podem ser adotados ou removidos.

Falha na gravação mantém a referência e o arquivo anterior. Após commit, remoção de arquivos sem referência usa limpeza idempotente com verificação de vínculos; uploads abandonados expiram após 24h. Banco e storage não compartilham transação: compensação e coleta de órfãos são explícitas. Testar tamanho, formato falso, vínculo indevido, ordem e falhas parciais no banco/provedor. Dados existentes não recebem fotos inventadas. Arquivos e credenciais não entram em logs ou auditoria. Backup futuro deverá abranger banco e arquivos; o recurso de backup do painel continua excluído desta etapa.

## Etapa 3 — serviços empresariais e tarefas

Serviços: leitura real para cliente dos ativos e listagem administrativa incluindo inativos; admin edita os três tipos existentes e seus benefícios principal/secundário/ordem na mesma transação. Tipos traduzidos entre DTO e banco, unicidade preservada. Quando a base estiver vazia, apresentar vazio e permitir cadastro dos tipos previstos, sem reimportação automática de mock. O conteúdo comercial do tipo plano_horas pode existir no catálogo; isso não ativa plano, cobrança, saldo ou renovação.

Tarefas: admin e secretaria leem o quadro compartilhado e criam tarefas. Responsável deve ser equipe ativa. Admin edita/exclui qualquer tarefa. Secretaria edita/exclui somente tarefas criadas por ela, sem alterar prazo depois da criação; mudança de situação de qualquer tarefa compartilhada segue o comportamento existente. Autor real vem da sessão. Data válida, prioridades e estados mapeados para valores existentes do MySQL. Mudança de status usa versão para evitar rollback otimista sobrescrevendo outra operação. Auditoria em cada ação.

Liberar rotas por módulo testado, preservando o restante bloqueado.

## Etapa 4 — agendamentos e painel do dia

Reutilizar as regras e infraestrutura de concorrência da especificação de agendamento já aprovada em 18/10. O plano de implementação de agendamento do cliente ainda aguarda revisão; este trabalho não libera pagamento ou checkout nem presume essa implementação concluída.

Equipe consulta lista paginada com resumo de cliente/sala/unidade, filtros por datas, unidade, situação e busca. Não buscar contas individualmente com AuthGateway. Datas operacionais em America/Sao_Paulo; instantes armazenados em UTC, relógio oficial no servidor.

Criação administrativa permite escolher cliente ativo, sala, data, intervalo contínuo dentro de 08:00–21:00 e valor acordado decimal não negativo. Nasce confirmada como o formulário atual, com pagamento pendente ou manualmente confirmado pela equipe. Confirmação manual registra metadado de operação e não simula processamento por provedor. Não usar saldo do plano; horas_do_plano fica zero. Exibir pagamento manual como tal.

Toda criação usa identificador de requisição para repetição segura e serializa na linha da sala em READ COMMITTED. Após aguardar lock, verificar horário futuro e sobreposição inicio < fim solicitado e fim > inicio solicitado. Pendentes e confirmadas bloqueiam; canceladas não. Intervalos adjacentes permitidos. Valor de cliente é calculado no servidor; valor administrativo acordado só é permitido para equipe autorizada e é auditado.

Confirmação de reserva, pagamento manual, cancelamento com motivo e check-in são ações específicas, com estados revalidados na transação. Não confirmar/cobrar reserva cancelada nem realizar check-in de reserva não confirmada. Check-in uma única vez; operador vem da sessão. Cancelamento não executa estorno financeiro automático. Reservas com horas_do_plano > 0 terão ações que exigem devolução bloqueadas até integração do plano, em vez de alterar saldo incorretamente.

Painel do dia consulta resumo operacional próprio com filtros e paginação, sem carregar toda a base. Mesmo conjunto de permissões e ações de agendamentos. Testar criação simultânea entre cliente/equipe quando ambos estiverem implementados, repetição de pedido, transições concorrentes, cancelamento e leitura de fuso.

## Etapa 5 — atividades e fechamento

Somente admin consulta auditoria paginada, com busca e ordenação estável. Sem endpoint de escrita livre, edição ou exclusão do histórico. Autor/nome são obtidos no servidor. Detalhes guardam apenas metadados permitidos (campos alterados, estado e identificadores), nunca senha, hash, cookie, corpo completo ou conteúdo de imagem. Não disponibilizar extratos de plano nessa tela no modo HTTP.

Concluir revisão das permissões e fluxos de todas as rotas liberadas, inclusive acesso direto pela URL e API. Dashboard, plano de horas e backup continuam bloqueados também nos gateways reais. Não usar saldo zero inventado para autorizar ações nem criar fallback para localStorage.

## Verificação e critérios de aceite

- Testes de domínio/serviços e HTTP com admin, secretaria, cliente, sessão expirada e conta inativa; negação antes de ler/escrever dados indevidos.
- Testes reais MySQL com fixtures próprias e limpeza em finally; sem usar contas reais do usuário como alvo de alteração. Concorrência, integridade referencial, paginação e auditoria atômica.
- Testes dos gateways validando respostas e whitelist de campos; testes de ViewModels para falhas, respostas atrasadas, troca de filtro e sessão encerrada durante uma gravação.
- Revisão visual desktop/celular de cada tela alterada, mantendo sistema visual e componentes compartilhados. Indisponibilidade não deve aparentar gravação concluída.
- Executar npm run typecheck, npm run test e npm run build na raiz; backend typecheck/test/build e verificadores de integração de cada módulo. Atualizar documentos da raiz e README do backend/banco conforme a etapa efetivamente entregue.
- Não afirmar segurança absoluta ou integração concluída antes desses resultados. Este documento, sozinho, não altera API, banco ou rotas.

## Revisão deste documento

Escopo e exclusões conferidos contra o pedido. Dependências de plano removidas dos módulos incluídos. Pagamento manual distinguido de processamento financeiro. Decisão final incorporada: Cloudinary substituível com referências no MySQL, sem BLOB. Dados existentes preservados. Desenvolvimento dividido em módulos com liberações verificáveis. Próximo passo: revisão do plano detalhado da etapa 1 antes da implementação.
