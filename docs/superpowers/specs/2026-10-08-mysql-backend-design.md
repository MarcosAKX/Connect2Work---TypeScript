# MySQL e backend — proposta para revisão

## Estado e objetivo

MySQL foi escolhido pelo usuário em 08/10/2026. Esta proposta define a primeira etapa: banco MySQL verificável e API própria como única fronteira de acesso da aplicação aos dados, com POO, preservando as telas e os contratos atuais. Não constitui implementação ou implantação. NestJS/TypeScript é a proposta para a API própria. O usuário confirmou que o foco atual é o banco e o acesso seguro pela API; qualquer API externa de pagamento, cobrança real ou webhook financeiro fica para etapa posterior. O provedor de identidade ainda precisa ser definido antes de habilitar endpoints privados.

## Arquitetura proposta

Frontend: páginas/componentes como View, hooks como ViewModel, contratos e adaptadores HTTP para comunicação. Backend: controllers HTTP, serviços de aplicação, objetos de domínio e repositórios MySQL. MVVM permanece na apresentação; a API utiliza separação por responsabilidades. Classes Reserva, PeriodoReserva e PlanoDeHoras protegem regras; contratos de repositórios permitem implementação SQL e testes.

Pastas propostas: backend/src/domain, application, infrastructure e api; database/mysql/migrations e database/mysql/seeds. Frontend permanece em src. Scripts e dependências do backend terão configuração própria. O mock permanece ativo até haver autenticação e endpoints homologados.

## Primeira etapa

Modelo relacional, migrations versionadas, ambiente MySQL de desenvolvimento, validação de integridade, catálogo de demonstração, fundação da API NestJS e documentação. A API inicial terá configuração validada, conexão parametrizada ao banco e endpoints de saúde/prontidão sem detalhes internos. Endpoints de negócio privados permanecerão indisponíveis até autenticação e autorização reais estarem implementadas e testadas. Sem API de pagamento, cobrança, webhooks financeiros, importação automática do mock ou conexão das telas nesta etapa. Docker é uma opção de execução local, sujeita à disponibilidade; servidor MySQL já instalado também pode ser usado. Não haverá reset de banco existente sem identificação explícita do ambiente descartável.

## API própria e fronteira de acesso

O navegador envia solicitações HTTPS à nossa API; a API valida identidade, permissões e dados, executa os casos de uso e acessa MySQL pelos repositórios. O navegador não recebe endereço de conexão SQL, credenciais nem capacidade de executar consultas livres. Nenhum endpoint genérico aceitará SQL, nome de tabela ou filtros arbitrários. DTOs retornam somente campos autorizados. CORS restringe origens de navegador, mas não substitui autenticação, autorização ou isolamento de rede do banco. Erros externos são genéricos; diagnósticos internos não registram segredos.

Em desenvolvimento local, MySQL deve ficar limitado a loopback ou rede interna de containers. Em hospedagem, usar rede privada/regras de firewall, TLS nas conexões quando necessário e conta runtime com privilégios mínimos. A exposição HTTP da API é intencional; cada endpoint será autorizado independentemente dos guards do frontend. Um resultado positivo no health check não comprova segurança de implantação.

## Modelo proposto

- roles: códigos client, admin e secretaria, únicos.
- users: identidade interna, nome, contatos, active, role_id e timestamps. Senhas/tokens não fazem parte desta tabela nesta etapa. Integração de identidade será definida antes dos endpoints privados.
- units: nome, endereço, coordenadas opcionais, descrição e referência de imagem.
- rooms: unit_id, nome, capacidade e preço por hora.
- amenities: catálogo de comodidades com nome único normalizado.
- room_amenities: chave composta room_id + amenity_id.
- room_images: room_id, caminho/URL, posição e indicação de capa.
- business_services: tipo único, descrição, imagem, visibilidade e ordem.
- service_features: service_id, categoria primary/secondary, texto e ordem.
- hours_plans: user_id único, enabled, balance, total e datas de renovação.
- bookings: user_id, room_id, início/fim, estado administrativo, valor acordado, horas aplicadas, cancelamento e check-in.
- hours_plan_transactions: usuário, reserva opcional, tipo, horas com sinal, saldo resultante, motivo e responsável.
- tasks: título, descrição, estado, prioridade, prazo, autor e responsável opcional.
- audit_logs: responsável opcional, ação, entidade, identificador, instante e metadados sem segredos.

Pagamentos online terão modelo próprio em etapa posterior: tentativas de pagamento, recebimentos/estornos, eventos do provedor e idempotência. Não equiparar valor da reserva a receita recebida. Pagamento manual existente precisa ser preservado e distinguido de confirmação por provedor na integração.

## Relações e compatibilidade

1:N explícito: units → rooms; rooms → room_images; users → bookings. N:N explícito: rooms ↔ amenities por room_amenities. users → hours_plans é 1:0..1. Contagem de salas é derivada. bookings não duplica unit_id; a unidade é obtida pela sala. Transferir sala com histórico para outra unidade será bloqueado, para preservar a interpretação histórica. Valor da reserva é fotografia do preço acordado; mudanças do catálogo não o recalculam.

O futuro adaptador converte início/fim para date/timeSlot e deriva upcoming/past pela hora do servidor; cancelamento é persistido. Dados adicionais necessários às telas serão retornados em DTOs específicos. UUIDs internos novos não autorizam operações; IDs seed legados exigem mapa em uma importação separada. Imagens binárias/base64 não serão armazenadas nas tabelas finais.

## Tipos, integridade e tempo

Baseline proposta: MySQL 8.4 com InnoDB e utf8mb4. IDs UUID em CHAR(36) com comparação ASCII binária; todas as FKs usam tipos idênticos. Dinheiro DECIMAL(12,2), horas DECIMAL(10,2), sem cálculo financeiro com ponto flutuante. DATETIME(6) representa instantes UTC por convenção explícita da aplicação/conexão; prazos e renovação civil usam DATE em America/Sao_Paulo.

PKs, FKs, UNIQUE, CHECK e índices devem impedir vínculos ausentes, associações repetidas, capacidade inválida, preço/saldo negativos e término anterior ou igual ao início. Exclusão de unidade com salas e sala com reservas será RESTRICT. Histórico financeiro não será apagado em cascata ao excluir conta; desativação é o fluxo normal. DELETE CASCADE fica restrito a dependências de apresentação quando a exclusão do mestre for permitida.

## Concorrência — implementação na etapa de reservas

CHECK não detecta sobreposição entre linhas. Toda operação que cria ou muda período/sala de reserva deve iniciar transação, bloquear a linha da sala com SELECT FOR UPDATE e consultar conflitos por leitura atual com bloqueio: início_existente < fim_novo e fim_existente > início_novo, excluindo cancelados. A linha da sala serializa operações inclusive quando ainda não há reservas. Reservas adjacentes são permitidas.

Consumo/estorno bloqueia também o plano, em ordem consistente de recursos, e grava reserva, saldo, movimento e auditoria na mesma transação. Retentativas limitadas de deadlock repetem a transação inteira. Testes usarão conexões distintas ao banco real. Escritas fora desse protocolo não têm a mesma garantia; usuários do banco e operações de manutenção serão limitados.

## Segurança

Browser acessa somente API. MySQL fica acessível à API e aos administradores autorizados em rede restrita. Conta de migrations separada da conta runtime; runtime não terá permissão de alterar schema. Credenciais somente no ambiente do backend, nunca em VITE_*, Git, respostas ou logs. Consultas parametrizadas. Autor/perfil vêm da sessão validada pelo servidor, não de actorId fornecido pelo navegador. Identidade, sessões e recuperação exigem projeto próprio antes de operações privadas.

## Relatórios futuros

1. Reservas por unidade/sala: master-detail com mestre unidade/sala e detalhes reservas/clientes; JOIN units, rooms, bookings e users; filtros por período e estado.
2. Ocupação por período: horas reservadas por unidade/sala, com cancelados separados.
3. Extrato de horas: usuário/plano como mestre e movimentações como detalhes, com LEFT JOIN da reserva quando existir.

Autorização e filtros serão aplicados na API. Receita só será relatada após definir e persistir recebimentos reais.

## Critérios de aceite da primeira etapa

- Aplicar migrations em banco novo de desenvolvimento e repetir em outro banco descartável.
- Verificar versão/schema, PKs, FKs, CHECKs, índices e as relações 1:N/N:N por consultas reais.
- Testar rejeição de vínculo inexistente, comodidade duplicada, preço/capacidade/saldo inválidos e período inválido.
- Seeds explícitos de demonstração, sem senhas nem credenciais reais.
- Evidenciar conta runtime sem privilégios DDL e ausência de credenciais no frontend.
- Inicialização da API falha com configuração inválida; prontidão confirma conexão real sem divulgar host, usuário ou schema.
- Endpoints privados não operam sem identidade validada; não confiar em role, userId ou actorId enviados pelo cliente.
- Não instalar SDK de pagamento nem configurar credenciais/webhooks de pagamento nesta etapa.
- npm run typecheck, npm run test e npm run build continuam passando.
- Se não houver MySQL executável, registrar schema como não validado e não afirmar conclusão.

## Documentação e legado

Consolidar PRODUCT, FEATURES, PROJECT_STRUCTURE, MOCK_DATABASE e MIGRATION para MySQL quando a implementação ocorrer. O schema Supabase atual será identificado como legado não ativo; não aplicar nem apagar histórico remoto desconhecido. Esta proposta substitui a direção tecnológica anterior, sem afirmar que banco ou API já foram implementados.

## Fontes técnicas

- https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
- https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html