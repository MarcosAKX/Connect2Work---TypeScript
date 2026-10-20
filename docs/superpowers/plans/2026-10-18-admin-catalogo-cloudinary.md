# Unidades, salas e Cloudinary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execução na pasta atual, conforme preferência do usuário. Não executar commit/push/deploy.

**Goal:** conectar a gestão administrativa de unidades e salas ao MySQL, incluindo comodidades e galeria com arquivos no Cloudinary, preservando os dados existentes.

**Architecture:** manter controller → serviço → contrato de repositório → MySQL no backend e View/ViewModel/gateway no frontend. Um contrato de armazenamento encapsula o Cloudinary; o MySQL guarda chaves e metadados, sem BLOB/base64. Controlar falhas entre os dois serviços por registro persistido de uploads e limpeza idempotente.

**Tech Stack:** Node 24, NestJS 11, TypeScript estrito, mysql2/promise, SDK oficial Cloudinary e Sharp para decodificação/reprocessamento, React/Vitest. Selecionar versões compatíveis e registrar no lockfile após conferir os requisitos oficiais; não atualizar dependências sem relação com a tarefa.

**Spec:** docs/superpowers/specs/2026-10-18-administracao-mysql-design.md — segurança comum e etapa 2. Etapa 1 de usuários já entregue. Este plano não reimplementa usuários nem libera as etapas 3–5.

## Global Constraints

- Ler os cinco documentos obrigatórios da raiz antes de código; preservar alterações locais e arquivos já staged pelo usuário.
- TypeScript estrito, sem any, @ts-ignore ou casts para esconder erros.
- Somente admin cria/edita/exclui catálogo. Cliente/secretaria mantêm apenas a leitura que já possuem, sem endpoints de escrita ou upload.
- Sessão real, 15 minutos de inatividade e máximo 4 horas; leituras não renovam atividade. Revalidar sessão, usuário ativo e papel dentro da transação depois de aguardar locks.
- Origin permitido e X-C2W-Request: 1 em toda escrita. Exceção multipart somente na rota de imagens; manter JSON de 8 KiB nas demais.
- Fotos JPEG/PNG/WebP, até 5 MiB por arquivo e 6 fotos por sala. Uma foto por unidade. Nada de SVG, fetch de URL arbitrária ou base64 no banco.
- Segredos Cloudinary somente no backend/.env; nenhum VITE_ e nenhum segredo em DTO, log, screenshot ou auditoria.
- Arquivos existentes no Cloudinary não pertencentes a esta integração não serão alterados. Testes reais usam exclusivamente namespace e IDs de fixture próprios.
- Excluir unidade com salas ou sala com agendamentos retorna 409. Não apagar registros dependentes para contornar a restrição.
- Serviços empresariais, tarefas, agendamentos, dashboard, plano de horas e backup permanecem fora desta entrega.

## Review Focus

1. MySQL falha depois do envio ao Cloudinary: preservar foto anterior e registrar recurso órfão para limpeza (tarefas 1/3/5).
2. Duas edições reordenam a mesma galeria: uma deve receber 409, sem perda de fotos ou violação temporária da chave sala/posição (tarefa 2).
3. Pedido recebe public_id/ID de upload de outro proprietário ou outra sala: negar vínculo e exclusão (tarefas 2/3).
4. Resposta de upload/gravação chega depois de trocar unidade ou fechar formulário: não aplicar no formulário novo; permitir coleta do upload abandonado (tarefa 4).
5. Cloudinary recebe a operação mas a resposta se perde: reconciliar pela chave gerada antes da chamada, sem apagar imagem ainda vinculada nem declarar sucesso incerto (tarefas 1/3/5).

## Contratos e persistência

Preservar tabelas unidades, salas, comodidades, sala_comodidades e imagens_salas. Chaves novas do Cloudinary serão public_id sem URL; versões/formato/tamanho ficam no registro de arquivo. Unidades e salas retornam version opaca baseada em atualizado_em com microssegundos; updates/deletes exigem expectedVersion do registro mostrado no formulário/modal.

Adicionar por migração comentada 004_arquivos_imagens.sql somente uma tabela técnica arquivos_imagens, com UUID, proprietário, operação UUID, chave_temporaria e chave_publica únicas ASCII, estado, versão Cloudinary, formato, tamanho, largura/altura, criado_em, expira_em e timestamps de processamento/retentativa. Estados fechados: preparando, temporario, publicando, disponivel, vinculado, removendo, removido. FK proprietário → usuarios RESTRICT. Nenhum arquivo binário ou segredo nessa tabela.

A tabela é o registro durável para reinício da API, uploads abandonados e remoções pendentes. O schema será apresentado ao usuário em SQL comentado; executar DDL somente após aplicação pelo operador com conta administrativa, sem dar ALTER/CREATE a c2w_api. Não recriar a base nem alterar arquivos históricos de instalação. Em banco sem migração, falhar fechado apenas no módulo novo com resposta genérica; autenticação/usuários existentes continuam disponíveis.

HTTP administrativo:
- GET /admin/unidades?page=1&pageSize=50&search= → página com unidade, contagem real de salas e versão; máximo 100 por página.
- GET /admin/salas?page=1&pageSize=50&search=&unitId= → página agregada com unidade, comodidades, imagens ordenadas e versão.
- GET /admin/unidades/opcoes?search= → resumo de unidades limitado a 100; a seleção por busca não depende de baixar todas as salas.
- POST /admin/unidades e PATCH /admin/unidades/:id: name/address/description?/latitude?/longitude?/imageId (UUID ou null), requestId no POST e expectedVersion no PATCH.
- POST /admin/salas e PATCH /admin/salas/:id: unitId/name/capacity/pricePerHour/amenities/imageIds ordenados, requestId no POST e expectedVersion no PATCH. Até 30 comodidades de 100 caracteres; remover duplicatas conforme collation do banco.
- DELETE /admin/unidades/:id e /admin/salas/:id com expectedVersion no JSON; nega exclusão se houver vínculos restritos.
- POST /admin/imagens: multipart com um campo file, tamanho total de até 5 MiB + 16 KiB de overhead; retorna somente {id,expiresAt}, sem public_id fornecido pelo cliente. Frontend mantém preview local; arquivo ainda não aparece no catálogo.
- Sem endpoint de remoção arbitrária por public_id. A remoção vem da alteração/exclusão da entidade, com rechecagem de referências no banco.
- GETs de catálogo já integrados continuam compatíveis e passam a incluir imageUrls ordenados. Falha do Cloudinary não pode impedir leitura de nomes/preços/IDs da sala.

Preços são valores decimais com até 2 casas, >= 0 e <= 9999999999.99, tratados em centavos durante validação; não arredondar excesso silenciosamente. Capacidade inteira 1–65535. Nome 1–150, endereço 1–500, descrição até 5000. Coordenadas finitas em pares e faixas existentes; omissão dos dois campos na edição significa limpar ambos. Datas do banco em UTC.

POST usa requestId UUID como ID da entidade, para tornar repetição identificável. Se o ID já existe, retornar o registro somente quando ator/autoria e conteúdo normalizado correspondem à mesma criação registrada; caso contrário 409. Não usar nome como chave de idempotência. Auditoria com source/requestId permite a comparação, sem gravar arquivos ou segredos. Não repetir POST automaticamente no frontend após falha de rede.

### Task 1: migração técnica e adaptador de armazenamento

**Files:** criar database/mysql/migrations/004_arquivos_imagens.sql; backend/src/storage/armazenamento-imagens.ts, cloudinary-imagens.ts; backend/src/config/cloudinary-environment.ts; backend/src/repositories/contracts/repositorio-arquivos-imagens.ts; atualizar backend/package.json/package-lock.json e exemplo de configuração sem valores. Testes backend/test/cloudinary-imagens.spec.ts e arquivos-imagens.spec.ts.

**Interfaces:** ArmazenamentoImagens.enviarTemporaria(chave:string,conteudo:Buffer):Promise<MetadadosImagem>; publicar(chaveTemporaria:string,chavePublica:string):Promise<MetadadosImagem>; consultar(chave:string,tipo:'authenticated'|'upload'):Promise<MetadadosImagem|null>; remover(chave:string,tipo):Promise<void>; url(chave:string,version:string,tamanho:'card'|'galeria'):string. MetadadosImagem contém chave/version/formato/bytes/largura/altura. Nenhum método aceita URL remota.

- [ ] Escrever testes para configuração incompleta, erro sanitizado, chave fora do namespace, remoção repetida not-found, URL somente HTTPS com transformação fechada e falha de resposta após envio. Executar backend test e observar falha por recurso ausente.
- [ ] Instalar dependências oficiais somente depois da revisão do plano. Enviar por stream com public_id gerado pela API, resource_type=image, overwrite=false e tipo authenticated para temporários. Publicar usando rename com to_type=upload e nova chave, conforme documentação oficial, sem sobrescrever recurso existente.
- [ ] Usar prefixo connect2work/{ambiente}/temporarios e /catalogo, UUIDs gerados no servidor e versão retornada pelo provedor. Guardar a intenção no MySQL antes de enviar; reconciliar tanto chave temporária quanto pública após timeout/reinício. Não considerar ausência antes do término da chamada como prova de que ela nunca será aplicada.
- [ ] Entregar migração comentada e instruções para aplicação no Workbench. Conferir estrutura por consultas de metadados, sem executar DDL pela conta da API. Não fazer upload real antes da tabela estar aplicada.
- [ ] Rodar testes unitários; validar conexão de leitura usando ping, sem listar ou modificar arquivos pessoais existentes.

### Task 2: CRUD administrativo de catálogo no MySQL

**Files:** criar backend/src/dto/catalogo-administrativo.dto.ts; repositories/contracts/repositorio-catalogo-administrativo.ts; repositories/mysql/repositorio-catalogo-administrativo-mysql.ts; services/servico-catalogo-administrativo.ts; controllers/catalogo-administrativo.controller.ts. Ampliar AdministracaoModule/main/composição. Testes backend/test/catalogo-administrativo.spec.ts e check-catalogo-administrativo.ts.

**Interfaces:** serviço listarUnidades/listarSalas/opcoesUnidades/criarUnidade/atualizarUnidade/excluirUnidade/criarSala/atualizarSala/excluirSala. Entradas HTTP unknown; repositório recebe ator interno, operação validada e versões, nunca o corpo cru. Listagens retornam {items,total,page,pageSize}; dados de opção não expõem metadados internos de uploads.

- [ ] Testar primeiro 401/403, payload extra, coordenada isolada, limites, preço negativo/3 casas, versão antiga e tentativa de referência de outra sala. Observar falhas antes de implementar.
- [ ] Implementar transações com auditoria atômica, locks ordenados e revalidação da sessão. Reaproveitar protocolo administrativo da etapa 1 por helper com responsabilidade clara, cobrindo sua extração por regressões; não copiar o protocolo em vários repositórios.
- [ ] Impedir exclusões com vínculos; impedir mudança de unidade de sala com qualquer agendamento. Testar criação de sala simultânea à exclusão de unidade: integridade referencial deve vencer, sem exclusão em cascata de dados de negócio.
- [ ] Reconciliar comodidades por unicidade do nome do MySQL. Ao reordenar galeria, validar todas as imagens primeiro e substituir posições/vínculos na mesma transação, sem violar a unicidade intermediária de sala/posição.
- [ ] Marcar arquivos recém-vinculados como vinculados e removidos da galeria como removendo na mesma transação, depois de confirmar que não têm outra referência em unidades/salas/serviços. Arquivo novo temporário deve pertencer ao ator; arquivo já vinculado somente pode permanecer na mesma entidade. Não aceitar transferência entre entidades por UUID conhecido.
- [ ] Rodar testes HTTP/MySQL com fixtures próprias: CRUD, vínculos restritos, auditoria falhando, idempotência de POST e duas versões concorrentes. Limpar somente IDs de fixture. Nenhum arquivo externo é necessário nesta tarefa.

### Task 3: upload validado e ciclo de vida Cloudinary

**Files:** criar backend/src/services/servico-imagens.ts, security/processador-imagem.ts, controllers/imagens.controller.ts, repositories/mysql/repositorio-arquivos-imagens-mysql.ts, services/limpeza-imagens.ts e check-cloudinary-imagens.ts. Testes backend/test/imagens.spec.ts e limpeza-imagens.spec.ts; modificar protecao-http.ts apenas para a exceção de upload protegida.

**Interfaces:** ProcessadorImagem.processar(bytes:Buffer):Promise<{conteudo:Buffer;largura:number;altura:number}>; ServicoImagens.enviar(token,arquivo):Promise<{id:string;expiresAt:string}>; prepararVinculo(ator,ids):Promise<metadados[]>; LimpezaImagens.executarLote(limite:number):Promise<void>. Repositório controla estados com compare-and-set e leases para evitar dois workers removendo/publicando o mesmo arquivo.

- [ ] Testar primeiro JPEG/PNG/WebP válidos, SVG disfarçado, conteúdo corrompido, animação, limite de bytes, imagem de mais de 20 megapixels, sessão expirada e MIME falso. Limitar processamento simultâneo a 2 e upload a 10 arquivos/min por admin; rejeitar antes de trabalho caro quando sem permissão ou capacidade.
- [ ] Multipart processa um arquivo por requisição e rejeita campos inesperados; JSON das demais rotas continua limitado a 8 KiB. Não confiar no nome enviado, não criar caminhos a partir dele e não aceitar URLs para o servidor buscar.
- [ ] Decodificar/reprocessar com Sharp para WebP até 1600px no maior lado, orientação aplicada e metadados removidos. Buffer original e saída limitados a 5 MiB. Frontend pode otimizar preview, mas a validação oficial é do servidor.
- [ ] Upload temporário expira em 24 horas e não tem URL pública no DTO. Publicação via rename acontece fora de locks SQL antes do vínculo final; o catálogo só retorna URLs depois do commit. Documentar que as fotos publicadas são públicas, e não um recurso para documentos privados.
- [ ] Falha na publicação não modifica os vínculos antigos. Falha SQL após publicação marca/recupera o arquivo novo para coleta; a imagem anterior permanece. Não prometer transação distribuída entre MySQL e Cloudinary.
- [ ] Worker local executa lotes de até 20 por minuto, com exclusão mútua/lease no banco, grace de 24h e retentativas com backoff. Antes de remover, consultar novamente todos os vínculos dentro de protocolo que impeça relink concorrente. Um upload expirado/em remoção não pode ser vinculado. Se a chamada remota estiver incerta, manter intenção e reconciliar; nunca apagar só por memória de processo.
- [ ] Check real envia imagem sintética de fixture, publica, consulta e remove apenas esse recurso gerado pelo teste; validar imagem entregue. Não usar fotos pessoais como fixture. Falhas externas mantêm rastreio suficiente para limpeza posterior, sem ocultar orfandade.

### Task 4: gateways, formulários e galeria nas telas

**Files:** criar src/services/catalogo-admin-http.ts, imagens-http.ts e respectivos testes; modificar contracts.ts, domain.ts, create-app-services.ts, local-storage.ts, useAdminUnits/useAdminRooms e seus Page hooks, useUnitForm/useRoomForm, componentes de formulário, unidades-http/salas-http e backend DTOs/leitores de catálogo. Atualizar src/utils/image-upload.ts e seus testes.

**Interfaces:** catalog gateway ganha leitura administrativa paginada e expectedVersion nas escritas; criar ImageGateway com upload(file:File):Promise<{id,expiresAt}>. Formulários mantêm estado de imagem separado em {id?,file?,previewUrl}; File não é colocado em entidade, localStorage ou JSON de domínio. Dados enviados à API usam IDs, e DTOs recebidos incluem URLs e IDs de imagem permitidos à edição da própria entidade.

- [ ] Escrever testes de gateway para cookies/CSRF, whitelist, FormData sem Content-Type manual, ordenação, timeout e 401. Escrever testes de ViewModel para respostas atrasadas, troca rápida de unidade, upload interrompido e versão do formulário antigo.
- [ ] Reutilizar o layout, preview e controles de ordem existentes. No modo HTTP remover a entrada de novas URLs externas, mantendo upload por arquivo e fotos legadas já vinculadas. Mock mantém comportamento de demonstração; nenhum File vai para armazenamento local.
- [ ] Upload só começa no salvamento do formulário; preservar IDs retornados em estado para não reenviar os mesmos arquivos quando apenas os metadados falharem. Se fechar/trocar formulário, ignorar resultados tardios, revogar object URLs locais e deixar o backend coletar uploads abandonados.
- [ ] Seleção máxima de 6 imagens e limite coerente de 5 MiB nos dois lados. Exibir erro por imagem, progresso de salvamento e impedir envio duplicado. Nenhum POST de catálogo tem retry automático depois de resposta incerta.
- [ ] Buscar unidades/salas no admin com paginação no servidor e DTO agregado; não fazer uma consulta de salas por unidade para montar a tabela. Formulário/modal preserva expectedVersion da abertura, inclusive exclusão.
- [ ] Galeria cliente usa imageUrls em ordem e fallback existente quando vazia. URLs vêm do adaptador Cloudinary; card usa tamanho fixo reduzido e galeria usa tamanho maior limitado, sem transformações arbitrárias fornecidas pelo navegador.
- [ ] Liberar somente /admin/unidades e /admin/salas quando os fluxos estiverem completos. Preservar /admin/usuarios; demais rotas continuam bloqueadas.

### Task 5: verificação, limpeza e documentação

**Files:** documentação da raiz e backend/README.md/database/mysql/README.md; scripts de verificação; plano e ledger.

- [ ] Executar raiz npm run typecheck/test/build; backend typecheck/test/build, check:authentication, check:admin-usuarios, check:unidades, check:salas e os novos checks de catálogo/imagens. Usar banco local migrado e fixtures próprias; falhas nunca justificam apagar registros reais.
- [ ] Conferir no navegador criação/edição/exclusão de unidade/sala de teste, comodidades, seis fotos, reordenação, remoção, galeria cliente e restrições de exclusão. Conferir viewport de celular se a ferramenta permitir; registrar explicitamente qualquer limitação visual.
- [ ] Simular Cloudinary indisponível, falha SQL, queda depois da publicação e sessão expirada durante upload. A foto anterior deve continuar acessível e não pode aparecer confirmação falsa de salvamento.
- [ ] Revisão independente focada nos cinco riscos do Review Focus, com correção e regressões dos achados; declarar se revisão ficar parcial por indisponibilidade da ferramenta.
- [ ] Remover fixtures do MySQL e Cloudinary somente pelos IDs criados por estes testes. Manter recursos reais e evidências de erros de limpeza para retentativa, sem anunciar limpeza completa se não ocorreu.
- [ ] Atualizar documentos com estado efetivamente entregue, instruções da migração, namespaces e comando de limpeza. Não incluir credenciais. Entregar instruções curtas de teste; nenhuma publicação/merge automático.

## Revisão do plano

- [x] Escopo restringe-se a catálogo e imagens, preservando etapas anteriores.
- [x] Interfaces cobrem paginação, versão, upload, idempotência e coleta persistida.
- [x] Os cinco riscos possuem testes e compensações explícitas.
- [x] Mudança de schema prevista como SQL comentado para aplicação pelo operador; sem BLOB e sem permissões DDL novas na API.
- [ ] Revisão do usuário antes da implementação, conforme writing-plans. Método preservado: executar nesta sessão e pasta atual.

Referências oficiais conferidas em 18/10/2026: Cloudinary Node.js upload (https://cloudinary.com/documentation/node_image_and_video_upload), rename/destroy (https://cloudinary.com/documentation/image_upload_api_reference#rename_method), remoção e cache (https://cloudinary.com/documentation/delete_assets), Sharp constructor/limite de pixels (https://sharp.pixelplumbing.com/api-constructor/).

## Execução e revisão — 18/10/2026

Plano e execução nesta pasta aprovados pelo usuário. Migração 004 aplicada por ele sem erros. Entrega local concluída: unidades/salas/comodidades e galeria Cloudinary; demais módulos permanecem bloqueados conforme escopo.

Validação final: frontend 191 testes, backend46, typechecks e builds passaram. Checks reais auth/adminusuarios/unidades/salas/catalogo passaram; Cloudinary validou temporário privado, publicação, entrega e exclusão de arquivo sintético. Navegador confirmou uma unidade com foto e uma sala com seis fotos, reordenação, remoção e galeria cliente. Duas contas, unidade/sala e oito intenções/arquivos de teste foram removidos; base voltou a duas unidades e dez salas, zero arquivos_imagens. Revisão independente encontrou perda de referências legadas sem prévia e seleção limitada às primeiras100unidades; ambos corrigidos e cobertos por regressões. Sem pendência de severidade crítica/importante; viewport móvel não foi emulado pela ferramenta. Testes de falhas remotas usam simulação controlada; não houve interrupção de rede real após rename confirmado.

Decisões e custos: bookkeeping em PowerShell por compatibilidade Windows (custo: manutenção desse registro separada do script bash); gateways admin/imagens opcionais preservam mock (custo: contrato deve ser consolidado quando o mock for retirado); escrita do catálogo aguarda até120s para publicação das fotos (custo: espera maior em falhas externas). Registros locais de execução foram mantidos até o commit do usuário (custo: limpeza manual posterior); não foi feito commit, push, merge ou deploy. Nenhum achado menor foi adiado.
