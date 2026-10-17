# Login e sessões — Connect2Work

Data: 2026-10-11
Estado: desenho para revisão; implementação ainda não iniciada.

## Objetivo e decisões aprovadas

Substituir o login demonstrativo pela autenticação na API/MySQL, preservando POO por camadas no backend e View/ViewModel no frontend. A sessão expira após 15 minutos sem atividade ou, independentemente da atividade, após 4 horas desde o login. Não oferecer “lembrar de mim”. Verificação de e-mail e integração de pagamento ficam para etapas posteriores.

## Organização

Controllers recebem HTTP e entregam DTOs públicos. Services coordenam autenticação, sessão e regras. Contratos de repositories isolam persistência; implementações MySQL usam parâmetros. Classes de segurança encapsulam Argon2id, geração de tokens e hashing. Um relógio substituível permite testar expiração sem esperar minutos.

O frontend usa gateways pelos contratos existentes. AuthContext coordena o estado da autenticação; hooks coordenam ações e páginas apresentam a interface. ProtectedRoute e a proteção administrativa aguardam a restauração inicial antes de decidir redirecionamentos. AppShell permanece nas telas autenticadas.

## Banco e segredo de sessão

Uma migração separada criará `sessoes`, sem recriar as 14 tabelas existentes: id UUID, usuario_id, token_hash BINARY(32) único, criado_em, ultima_atividade_em, expira_em e revogado_em opcional. A FK aponta para usuarios; exclusão fica restrita. Datas usam UTC e precisão de microssegundos, com índices para token, usuário e expiração. Checks impedem expiração anterior à criação e atividade anterior à criação.

A API gera 32 bytes aleatórios criptograficamente seguros, codifica em base64url e envia o token apenas no cookie. O banco recebe SHA-256 do token; nunca o token original. Senhas continuam armazenadas exclusivamente como hash Argon2id. Respostas usam lista explícita de campos públicos e não incluem hashes, senha, token ou detalhes internos do banco.

A migração será executada pelo usuário administrativo no Workbench, com explicação de cada comando. A aplicação continua usando c2w_api, sem CREATE/DROP e sem credenciais administrativas.

## Cookie e validação

Cookie de sessão HttpOnly, SameSite=Strict, Path=/, sem Domain, Max-Age ou Expires no login. Secure é obrigatório em HTTPS; HTTP é permitido somente no desenvolvimento local explicitamente configurado. A configuração deve impedir habilitar autenticação de produção com cookie inseguro. Fechar o navegador não substitui os limites aplicados no servidor.

Cada operação autenticada verifica token, revogação, expiração e usuário ativo. O perfil vem do banco, nunca de campos enviados pelo navegador. Expiração ocorre quando agora é igual ou superior ao limite de inatividade ou absoluto. A expiração absoluta não é prorrogada. Validação e atualização de atividade devem ser atômicas para não reativar sessão expirada; operações concorrentes com logout precisam respeitar revogação.

Cada login cria um token novo. Uma sessão anterior apresentada no mesmo navegador será revogada ao trocar a sessão. Outros dispositivos não serão desconectados automaticamente nesta etapa.

## Endpoints

- POST /auth/login: e-mail e senha; responde com usuário público e cookie.
- GET /auth/session: restaura/consulta sessão, sem renovar atividade; responde com usuário público e horários de expiração, ou 401.
- POST /auth/activity: registra atividade real em sessão ainda válida e retorna os horários atualizados.
- POST /auth/logout: revoga a sessão apresentada e remove o cookie; é idempotente.
- POST /auth/register: mantém o cadastro existente e passa a compartilhar a proteção HTTP aplicável.

Login normaliza o e-mail. Por decisão explícita do usuário, senhas recebidas com mais de 128 unidades de código UTF-16 serão truncadas aos primeiros 128, de forma consistente no cadastro e no login, antes de gerar ou verificar o hash. O mínimo continua sendo 6; espaços continuam proibidos e devem ser validados no valor recebido antes do truncamento. O campo mantém maxLength=128. A futura redefinição de senha deverá seguir a mesma regra. Caracteres depois do limite não participam da autenticação. Não aplicar trim à senha. Credenciais incorretas, conta inexistente, inativa ou sem hash recebem a mesma mensagem “Senha incorreta”. Verificação com hash fictício reduz diferenças de tempo para contas inexistentes. Limitar tentativas e trabalho Argon2 simultâneo; limites em memória são adequados ao processo local único, devendo ser substituídos por controle compartilhado antes de múltiplas instâncias.

## Proteção HTTP

Operações que alteram estado exigem JSON, corpo limitado, Origin pertencente à lista explícita de origens do frontend e cabeçalho próprio do gateway. Não liberar CORS com origem curinga ou refletir origens arbitrárias. Rejeitar tipos de corpo e campos inesperados. Aplicar no-store e não registrar corpos, cookies, senhas ou tokens. Erros internos recebem resposta genérica. Testes e utilitários HTTP devem enviar os mesmos cabeçalhos exigidos do frontend.

Cookies HttpOnly ajudam a evitar leitura do token por JavaScript, mas não impedem que código malicioso execute ações no navegador. A proteção de origem não substitui validação, autorização ou prevenção de XSS.

## Atividade e frontend

O gateway HTTP envia cookies com requisições na mesma origem; nenhum token vai para localStorage ou sessionStorage. Restauração da página consulta a sessão de forma assíncrona. Estado inicial distingue “verificando”, “autenticado” e “não autenticado”. Falhas de verificação bloqueiam acesso e permitem tentar novamente, sem recorrer ao login mock.

Eventos de interação na página visível disparam atualização de atividade limitada a uma requisição por minuto, com envio ao retomar interação quando necessário. Não usar heartbeat incondicional: uma aba parada ou em segundo plano não deve manter a sessão viva. Timers e consulta ao retornar à aba refletem expiração na interface; o servidor continua sendo a autoridade. Respostas 401 de sessão encerram o estado autenticado no frontend.

Um único modo de autenticação real deve selecionar cadastro, login, restauração e logout conjuntamente. Login Google e recuperação de senha ainda não implementados na API não podem autenticar por fallback demonstrativo. Catálogo e demais gateways ainda são mock: esta etapa não torna reservas, administração e outros módulos integrados ao MySQL. Operações demonstrativas que alterem dados não devem ser apresentadas como operações reais disponíveis em modo de autenticação real; precisam ficar bloqueadas até a migração correspondente. A proteção visual das rotas não substitui autorização nos futuros endpoints de negócio.

## Validação e entrega por etapas

1. Preparar e explicar a migração; confirmar sua aplicação sem destruir dados.
2. Implementar e validar login/sessões no backend.
3. Integrar frontend, restauração, atividade e logout; informar conclusão desta etapa.

Testar truncamento consistente no cadastro e no login (incluindo entradas de 130 caracteres, diferenças no sufixo descartado e espaços), limites exatos de 15 minutos e 4 horas, atividade sem prolongar prazo absoluto, revogação, usuário inativo, credenciais incorretas, cookie ausente/malformado, restauração e logout. Testar rejeição de origem/cabeçalhos/corpo indevidos, DTO sem segredos e persistência apenas do hash do token. Testes reais usam somente registros fictícios próprios e limpam seus dados. Executar typecheck, test e build do frontend e testes/build do backend; distinguir falhas anteriores das introduzidas.

## Limites do escopo

Sem integração de pagamento, envio de e-mail, OAuth, recuperação de senha, implantação pública ou migração dos demais módulos nesta etapa. Não prometer ausência absoluta de vazamentos: validar controles concretos. Publicação exigirá HTTPS e revisão de configuração, armazenamento, permissões, logs e infraestrutura.

## Referências

- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html