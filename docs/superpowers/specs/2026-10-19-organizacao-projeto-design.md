# Organização compacta do Connect2Work — proposta para revisão

Status: proposta revisada a partir da preferência do usuário; nenhuma movimentação ou consolidação de código executada.

## Resultado desejado

Reduzir fragmentação e facilitar que outra pessoa encontre e entenda uma funcionalidade. Evitar tanto dezenas de pequenos arquivos sem responsabilidade independente quanto arquivos gigantes que concentram o sistema inteiro. Nesta etapa, por orientação do usuário, organização e legibilidade são os critérios principais: não impor MVVM nem criar divisões apenas para atender a um padrão. Preservar interface, URLs, segurança, dados e integrações; não reescrever a arquitetura como efeito colateral da arrumação.

## Diagnóstico concreto

- `src/pages` mistura telas públicas, cliente e admin; `src/hooks` reúne hooks e testes de diversas áreas.
- `useAdminUnits` é consumido em produção somente por `useAdminUnitsPage`; o mesmo ocorre entre `useAdminRooms` e `useAdminRoomsPage`. Esses pares são candidatos a consolidação se isso tornar o fluxo mais fácil de ler, preservando versões, proteção de respostas atrasadas, paginação e estados dos modais.
- Existem componentes pequenos de uso único. Alguns podem permanecer junto da tela ou num arquivo coeso de diálogos, sem exigir um arquivo para cada trecho de interface.
- Formulários com validação, uploads e ciclo de vida próprios têm responsabilidade suficiente para permanecer separados.
- O mock `local-storage.ts` tem aproximadamente 956 linhas não vazias. Ele exemplifica por que juntar indiscriminadamente todas as responsabilidades não resolve a clareza.
- README e documentos misturam orientações atuais e etapas históricas, dificultando identificar o que realmente está conectado ao MySQL.

## Alternativas e recomendação

1. Somente criar subpastas nas camadas: melhora listas, mas mantém a fragmentação e a necessidade de saltar entre diretórios.
2. **Agrupamento compacto por funcionalidade — recomendado:** reunir telas e arquivos exclusivos da mesma área e consolidar divisões sem benefício claro. Manter componentes realmente compartilhados separados. No backend, conservar a separação existente quando ela ajudar a leitura; não iniciar uma migração arquitetural nesta etapa.
3. Unificar cada funcionalidade inteira em um único arquivo: menos arquivos, mas mistura interface, estado e acesso aos dados. Não atende ao objetivo de manutenção.

## Exemplo de estrutura

```text
src/
  app/                    # rotas e composição existentes
  features/
    unidades/
      UnitsPage.tsx       # consulta do cliente
      AdminUnitsPage.tsx  # gestão administrativa
      useAdminUnits.ts    # lógica da tela, se justificar arquivo próprio
      UnitFormDialog.tsx  # formulário com responsabilidade própria
      ...testes e arquivos realmente necessários
    salas/
    autenticacao/
    ...demais funcionalidades
  components/             # apenas interface compartilhada entre áreas
  services/
    contracts.ts          # ponto de entrada preservado
    http/                 # chamadas reais à API
    mock/                 # demonstração explicitamente separada
    create-app-services.ts
    index.ts
  types/
  utils/
  assets/

backend/src/
  controllers/
  services/
  repositories/
  dto/
  config/
  database/
  security/
  storage/
```

O exemplo indica responsabilidades, não uma meta obrigatória de quantidade de arquivos. Não criar pastas vazias para funcionalidades futuras. Não trocar todos os nomes dos arquivos ao mesmo tempo que eles são movidos. Testes de frontend podem acompanhar a funcionalidade em `features`, sem retornar para `pages`.

## Critério para manter ou juntar um arquivo

### Regras para uma organização previsível

- Arquivo usado exclusivamente por uma funcionalidade fica em `features/<area>`, inclusive seus componentes e testes. Tela, formulário e lógica continuam distinguíveis pelos nomes e responsabilidades; estar na mesma pasta não autoriza misturá-los.
- `components` recebe somente interface compartilhada entre funcionalidades. Não extrair algo para essa pasta só porque poderá ser reutilizado no futuro.
- `services/http` contém adaptadores da API; `services/mock` contém demonstração. A escolha entre eles acontece na composição, sem acesso direto ao banco/armazenamento pelos componentes e sem fallback silencioso para mock quando a API falha.
- `state` recebe estado global real, como sessão/tema. Estado exclusivo da tela fica na funcionalidade. `utils` recebe funções puras reutilizadas; uma função exclusiva fica perto de quem a usa.
- Cada rota aponta para uma página identificável da funcionalidade; não criar uma página intermediária que apenas reexporta outra para manter a antiga árvore.
- Consolidar pares de lógica da mesma tela quando a navegação entre arquivos não trouxer benefício. Manter separado o que é reutilizado ou complexo. Não impor um número máximo de arquivos ou linhas como critério único.
- Contratos e tipos compartilhados continuam com pontos de entrada claros. O tamanho atual de `contracts.ts` não justifica fragmentá-lo automaticamente; dividir apenas diante de responsabilidades e dependências que realmente exijam isso.
- Uma regra ou validação tem uma fonte de verdade no respectivo ambiente. Verificações do frontend melhoram a interação; o backend continua sendo a autoridade para segurança e integridade.
- README traz execução e navegação; FEATURES informa status real/mock/pendente; PROJECT_STRUCTURE descreve responsabilidades. O histórico não deve contradizer as instruções atuais nem ser repetido nos três documentos.
- O guia localiza cada recurso por um exemplo completo: página, ações, gateway, endpoint, serviço e tabelas. Nomes consistentes e esse mapa são mais importantes que uma árvore com muitos diretórios.

### Como avaliar a entrega

Avaliar o piloto com tarefas práticas: encontrar o botão Salvar, localizar sua ação, identificar a chamada HTTP e encontrar a consulta SQL; conferir que cada responsabilidade tem localização previsível. Comparar antes/depois em quantidade de arquivos, saltos necessários entre arquivos, duplicação, testes, build e comportamento visual. Uma nota alta depende dessa evidência, não apenas da árvore proposta. Não prometer perfeição nem risco zero.

### Candidatos iniciais à consolidação

Após conferir os consumidores em produção, os pares `useAdminUnits.ts` + `useAdminUnitsPage.ts`, `useAdminRooms.ts` + `useAdminRoomsPage.ts`, `useAdminBusinessServices.ts` + `useAdminBusinessServicesPage.ts` e `useAdminHoursPlan.ts` + `useAdminHoursPlanPage.ts` são candidatos a um arquivo por área. Seus estados e ações são complementares; não são código duplicado a ser simplesmente apagado. Avaliar tamanho e legibilidade antes de concluir cada consolidação. Esses quatro pares permitiriam passar de oito para quatro arquivos, sem misturar áreas diferentes.

Não aplicar a mesma regra cegamente a agendamentos: `useAdminBookings.ts` também é consumido pelo Painel do Dia e exporta tipos utilizados por componentes operacionais. `useAdminTasks.ts` exporta uma consulta de atenção utilizada no AdminShell. Reutilização real justifica preservar limites; reduzir contagem não pode aumentar acoplamento ou o código carregado pela navegação.

Diálogos pequenos de confirmação e trechos exclusivamente visuais de uma única tela podem ser avaliados para colocação no arquivo dessa tela. Formulários com validação/upload, controles reutilizáveis e funções de autenticação/transação mantêm arquivos próprios quando isso preservar clareza e segurança.

Manter separado se ele possui responsabilidade clara, uso em mais de um fluxo, lógica complexa ou um limite importante de segurança/testabilidade. Juntar quando ele apenas repassa chamadas, coordena um único fluxo já dividido sem benefício, ou contém um trecho pequeno que fica mais compreensível ao lado da tela.

Não remover classes, contratos, validações, testes ou camadas apenas para reduzir a contagem. Uma classe necessária e um contrato de repositório têm papéis diferentes; continuam distinguíveis. Compartilhar componentes apenas quando há comportamento realmente comum, evitando componentes genéricos cheios de condições.

Número de arquivos não determina o peso carregado no navegador. Preservar lazy loading e verificar o build; não juntar rotas de maneira que passe a carregar todas as funcionalidades de uma vez. Preservar também a ordem dos imports CSS e os estilos existentes.

## Plano gradual de escopo

1. Corrigir documentação e criar um mapa curto de funcionalidades usando documentos existentes; separar instruções atuais do histórico sem apagar decisões.
2. Fazer um piloto em unidades: consolidar os dois hooks de administração, agrupar arquivos da área e avaliar confirmações pequenas de uso único. Manter o formulário e o gateway separados. Mostrar caminhos antigos/novos e comparar comportamento.
3. Aplicar o padrão a salas e autenticação, depois às demais áreas. Cada caso é avaliado por responsabilidade, não por uma regra de quantidade.
4. Separar adaptadores HTTP e mock e organizar somente os pontos necessários do backend. Classificar Supabase e SQL antigo após verificar conteúdo/referências; não apagar arquivos ou executar migrações por organização.

## Segurança da mudança e aceitação

- Trabalhar na pasta principal atual e preservar alterações do usuário, sem commit/push/deploy automático.
- Preservar URLs, AppShell/AdminShell, ProtectedRoute/AdminRoute, contratos HTTP, formato dos dados e regras do produto.
- Nenhuma alteração de banco, autenticação, Cloudinary ou funcionalidade é necessária para essa organização.
- Não gerar novas fachadas e arquivos de reexportação que apenas recriem a fragmentação anterior. Preservar pontos de entrada existentes quando consumidores ainda dependerem deles.
- Após cada lote com código: executar typecheck, testes e build no frontend e backend afetados; conferir visualmente os fluxos correspondentes.
- Verificar especificamente sessão, permissões, estados de erro, versão capturada na abertura do formulário, respostas atrasadas e galeria de imagens.
- Sucesso significa que uma pessoa consegue localizar uma funcionalidade, identificar sua tela, encontrar onde estão suas ações e acompanhar de onde vêm os dados. Redução de arquivos é um resultado esperado onde há fragmentação, não motivo para prejudicar essa compreensão. A quantidade de arquivos de cada área deve seguir sua complexidade real, sem uma lista obrigatória de camadas ou nomes de padrões.

Próximo passo: revisão desta proposta compacta. Após concordância, detalhar o plano do piloto em unidades antes de mover código.
