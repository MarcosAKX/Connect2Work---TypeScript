# Agendamento com MySQL — especificação

> Planejamento pendente ou parcialmente implementado; não comprova entrega.
> Estrutura vigente: `PROJECT_STRUCTURE.md`, na raiz do projeto.

Data: 18/10/2026. Projeto: connect2work-app. Estado: especificação aprovada pelo usuário; plano de implementação em preparação, ainda sem código desta etapa.

## Objetivo e decisões do usuário

Conectar a tela existente de Agendamento ao backend e ao MySQL, mantendo MVVM, POO por camadas e o sistema visual atual. O usuário escolheu explicitamente salvar uma reserva pendente que já bloqueia o horário. Pagamentos serão integrados depois. As salas cadastradas poderão ser editadas pelo painel quando o CRUD administrativo for integrado; essa edição continua fora desta etapa.

Critério de sucesso: um cliente autenticado escolhe sala, dia e intervalo, recebe o valor calculado pelo servidor e registra uma reserva pendente. Tentativas simultâneas com períodos sobrepostos nunca geram duas reservas aceitas para a mesma sala.

## Escopo e comportamento

- Usar os dados reais de unidade, sala e comodidades já integrados.
- Consultar disponibilidade apenas da sala e do dia escolhidos. Nunca disponibilizar a lista de agendamentos de outros clientes nem seus identificadores, nomes ou contatos.
- Preservar os intervalos de uma hora, entre 08:00 e 21:00, em qualquer dia selecionável atualmente. Não introduzir uma política nova de finais de semana ou antecedência mínima nesta etapa.
- Datas e horários comerciais seguem America/Sao_Paulo, independentemente do fuso do dispositivo. Persistir os instantes em UTC e validar dias reais, início futuro, limites de funcionamento e fim maior que início no servidor.
- Bloquear intervalos de reservas pendentes e confirmadas; reservas canceladas não bloqueiam. Intervalos adjacentes são permitidos: 09:00–10:00 e 10:00–11:00.
- Criar com situacao=pendente, situacao_pagamento=pendente e horas_do_plano=0, sempre definidos no backend. O usuário da reserva vem da sessão.
- Uma reserva pendente não terá expiração automática nesta etapa. Ela bloqueia o período até ser cancelada ou até o período terminar. Confirmação/cancelamento pela administração serão etapas posteriores. Não apresentar esse comportamento como integração pronta para produção.
- Não debitar plano de horas nem simular pagamento. No modo real, mostrar o preço integral da sala e não oferecer Confirmar com Plano enquanto o consumo do plano não estiver integrado.
- O botão de confirmação no modo real passa a solicitar o agendamento, sem navegar ao checkout demonstrativo. Após o sucesso, a própria tela apresenta protocolo, sala, data, período, valor e situação pendente, com orientação de aguardar confirmação. Não usar a página Pagamento confirmado.
- Meus Agendamentos e o painel administrativo continuam para as etapas seguintes. Não habilitar suas rotas demonstrativas para contas reais.
- Imagens permanecem com o comportamento já existente. Não implementar upload, gateway de pagamento, e-mail ou edição administrativa nesta entrega.

## Alternativas e decisão técnica

1. **Transação com bloqueio da linha da sala — recomendada.** Reutiliza a tabela salas como ponto de serialização, sem alterar a estrutura do banco. Todas as futuras gravações de agendamentos precisarão seguir esse mesmo protocolo.
2. **Tabela de ocupação por faixa horária com chave única.** Torna a exclusão mútua explícita no schema, mas exige nova tabela e manutenção das faixas na criação, alteração e cancelamento. Não é necessária para o volume e o escopo atuais.

Adotar a primeira alternativa. Uma consulta de disponibilidade no navegador serve apenas para orientar a escolha; nunca substitui a verificação dentro da transação.

## Backend e persistência

Manter Controller → Service → contrato Repository → Repository MySQL. Adicionar um objeto de domínio para período de agendamento e cálculo em centavos, isolando validações temporais e monetárias da camada HTTP. Reaproveitar autenticação, CookieSessao, Relogio e comConexaoLimitada.

### Disponibilidade

GET /salas/:salaId/disponibilidade?data=AAAA-MM-DD, autenticado. Retornar sala, data, fuso comercial, horário atual do servidor, preço por hora e faixas de uma hora com indicação de disponibilidade. Não retornar objetos Booking de terceiros. UUID malformado/data inválida: 400; sala inexistente: 404; sessão inválida: 401; indisponibilidade de infraestrutura: 503 genérico. Não renovar sessão com GET.

### Criação

POST /agendamentos, permitido para perfil client ativo. Corpo estrito: requestId (UUID v4), roomId, date e timeSlot. Rejeitar campos extras; não aceitar usuário, valor, status, pagamento ou horas de plano enviados pelo cliente. RequestId será o ID da reserva, permitindo repetir uma tentativa de resultado incerto sem criar outra reserva.

Dentro de uma única conexão/transação:

1. Configurar UTC e isolamento READ COMMITTED para a transação; iniciar BEGIN.
2. Revalidar e bloquear a linha do usuário, conferindo ativo e perfil client.
3. Consultar requestId. Se já existir para esse usuário e o mesmo pedido, devolver o registro existente. Se pertencer a outra conta ou representar outro pedido, rejeitar genericamente com 409, sem expor o registro.
4. Buscar e bloquear a linha da sala com SELECT ... FOR UPDATE, obtendo a unidade e o preço atual.
5. Validar novamente o início futuro após eventual espera pelo bloqueio. Calcular o valor em centavos inteiros no servidor, respeitando a capacidade de DECIMAL(12,2); converter para o formato público somente na resposta.
6. Procurar conflitos não cancelados com inicio_em < fim_solicitado AND fim_em > inicio_solicitado. READ COMMITTED garante uma leitura atual após a obtenção do bloqueio da sala, inclusive quando outra transação acabou de inserir a primeira reserva.
7. Em conflito, ROLLBACK e 409. Caso contrário, inserir os valores determinados pelo servidor, registrar auditoria sem dados sensíveis e confirmar COMMIT. A auditoria participa da mesma transação.

Responder 201 para criação ou 200 para repetição idempotente. O DTO é somente da própria reserva; na criação, inclui preço final, situação e pagamento pendentes. Na repetição, conserva a situação real do registro existente: uma reserva posteriormente cancelada não pode ser apresentada como nova reserva pendente. Em falha de rede após COMMIT, o frontend mantém requestId para uma tentativa explícita de reconciliação. Uma resposta perdida não significa que o banco não gravou.

Todas as consultas são parametrizadas. Usar os prazos e descarte de conexão existentes; não devolver conexão com operação pendente ao pool. Conflitos de negócio são diferenciados de timeout/deadlock, que não devem ser apresentados como sucesso. Não alterar índices, tabelas, grants nem dados já cadastrados nesta etapa.

## Segurança e contratos

- Estender a proteção de Origin, JSON e X-C2W-Request às mutações da API, incluindo POST /agendamentos; atualmente ela cobre apenas /auth/*. Cobrir variações de caixa e barra final em testes.
- Limitar criação a 10 tentativas por conta por minuto e consultas de disponibilidade a 60 por conta por minuto, com estruturas de controle limitadas e limpeza. Os limites são de uma instância, coerentes com a API local atual; escalabilidade distribuída é trabalho futuro de implantação.
- Não confiar em proprietário/total/status do frontend. Sessão e perfil devem ser validados antes do acesso ao domínio e o usuário revalidado na transação.
- Não habilitar BookingGateway.getAll para clientes reais. Adicionar um contrato específico de disponibilidade por sala/dia; preservar o mock por meio do mesmo contrato, sem consultar MySQL diretamente na View ou no ViewModel.
- A criação real deve enviar apenas os quatro campos autorizados. Manter requestId estável ao repetir a mesma solicitação e gerar outro quando o usuário iniciar uma nova seleção. Não gravar credenciais ou token em storage.
- Manter mensagens genéricas para falhas internas e mensagens claras para horário ocupado, sessão encerrada e tentativa excessiva. Não registrar corpo, cookies ou credenciais em logs.

## Frontend e apresentação

Reaproveitar BookingPage, useBooking, BookingCalendar, BookingTimeSlots e BookingSummary. No modo HTTP, substituir getAll por consulta específica de disponibilidade e retirar o uso do checkout mock. Preservar o comportamento demonstrativo quando o modo mock estiver explicitamente ativo.

- Calendário e referências a hoje usam o fuso comercial e o instante informado pelo servidor; o servidor repete as validações na gravação.
- Antes de carregar disponibilidade, não habilitar horários nem a confirmação. Tratar carregamento, erro com nova tentativa, ausência de sala e dia sem horários livres.
- Ao mudar sala ou data, limpar a seleção e descartar respostas antigas, evitando mistura de períodos e de reservas.
- Exibir valor como estimativa até a confirmação; após criar, mostrar o total efetivamente calculado pelo servidor, sem afirmar que houve cobrança.
- Após 409 por conflito, atualizar disponibilidade, limpar o intervalo e orientar outra escolha. Não reenviar automaticamente uma reserva com outro horário.
- Sucesso mostra protocolo e pendência na própria tela; botões permitem voltar às salas ou iniciar outra escolha. Nenhuma navegação para pagamento concluído.
- Habilitar somente /agendamento no conjunto atual de rotas reais. Meus Agendamentos, checkout e administração permanecem bloqueados.

## Verificação obrigatória

Testes de domínio: datas impossíveis, fuso comercial em dispositivos com fuso diferente, virada de dia, início passado, 08:00/21:00, duração e cálculo monetário, intervalos adjacentes e sobrepostos.

Testes HTTP: sessão ausente/expirada, client ativo, perfil indevido, usuário desativado, corpo extra, tentativa de forjar valor/status/proprietário, CSRF, limites, erros sanitizados e ausência de dados de terceiros na disponibilidade.

Integração MySQL com fixtures próprias e limpeza: duas criações concorrentes sobrepostas na mesma sala (exatamente uma aceita), períodos adjacentes aceitos, salas distintas independentes, conflito de uma reserva pendente, cancelada liberando período, repetição idempotente sem duplicação, falha revertendo auditoria e reserva juntas e nenhum débito de plano.

Frontend: carregamento, erro/retry, troca de sala/data com resposta atrasada, conflito após seleção, requestId estável em retry, sucesso pendente e bloqueio do checkout demonstrativo. Revisão visual do fluxo existente em desktop e celular.

Antes de concluir: npm run typecheck, npm run test e npm run build na raiz; testes/build do backend; validação HTTP/MySQL real; atualização dos documentos da raiz. Preservar alterações em andamento do usuário. Não publicar nem executar commit/push nesta entrega.


## Entrega em 21/10/2026

Consulta de disponibilidade e solicitação do cliente integradas. Domínio e
infraestrutura comercial reutilizados da etapa administrativa; módulo do cliente
adicionado como dependência opcional final, preservando os argumentos existentes.
Sem nova migration. Estado confirmado: 236 testes frontend, 57 backend,
typechecks/builds e check:agendamentos no MySQL aprovados. Revisão independente
teve dois achados importantes, reproduzidos e corrigidos: resposta de visita
anterior A→B→A e recibo de replay passado. Teste no navegador com fixtures próprias:
criação pendente, recibo desktop/celular e bloqueio da faixa, adjacente livre,
logout e limpeza. A captura longa do formulário móvel falhou; o recibo móvel
foi capturado e o tamanho do navegador restaurado.

O roteiro acima é o planejamento histórico, não afirma que commits foram feitos.
Nenhum commit/push/deploy ou dado do usuário foi alterado pela validação. Meus
Agendamentos, cancelamento do cliente, checkout e consumo de plano continuam
etapas separadas. Cancelamento/confirmação pelo admin já existem na etapa administrativa.
