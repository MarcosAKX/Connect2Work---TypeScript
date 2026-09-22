import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const out = 'C:/Users/Marcos/OneDrive/Desktop/connect2work-app/outputs/checklist-estagio';
// Ordem de execução proposta, não prazo contratado nem avaliação de conformidade final.
const tasks = [
['01','P0 Agora','Validar critérios com professor','A alinhar','—','Preparar perguntas e registrar respostas.','Validar sandbox financeiro, OO, 4 etapas e medições.','Critérios aceitos registrados por escrito.','Normas; RF05; RNF p.3'],
['02','P0 Agora','Definir regras ambíguas','A alinhar','01','Detalhar cenários e testes de cancelamento/inativação.','Decidir reservas futuras, cancelamento após início e pagamento tardio.','Regras aprovadas, incluindo fronteira de 24h e expiração.','RN01/RN02 p.4; RF02/03 p.1–2'],
['03','P0 Agora','Modelar banco MySQL','A fazer','01,02','Desenhar diagrama, chaves, índices e migrações.','Revisar entidades e aprovar modelo.','≥6 tabelas; 1:N unidade/sala; N:N sala/comodidade com associativa.','Normas do estágio'],
['04','P0 Agora','Definir backend orientado a objetos','A fazer','01,03','Propor classes, serviços, repositórios e contratos de API.','Confirmar linguagem/framework e critérios do orientador.','OO demonstrável; frontend mantém contratos e telas.','Normas do estágio'],
['05','P0 Agora','Preparar execução incremental','A fazer','04','Planejar migração e testes por módulo; preservar dados mock.','Guardar cópia atual e validar cada entrega.','Baseline testada; sem apagar dados; reversão definida por etapa.','Apoio técnico, não requisito isolado'],
['06','P1 Produção','Autenticação e sessões reais','Parcial no mock','04,05','Implementar login, hash seguro, sessão, logout e recuperação.','Disponibilizar ambiente e segredos fora do código.','Sem senha em texto puro; sessão inválida negada; login/logout testados.','Normas; RNF Segurança p.3'],
['07','P1 Produção','Autorizar perfis no servidor','Parcial no mock','06','Aplicar permissões e acesso ao próprio cadastro/reserva na API.','Aprovar matriz cliente/secretária/admin.','API nega acesso indevido mesmo sem interface; testes por perfil.','Normas; escopo p.1'],
['08','P1 Produção','Proteger API e ambiente','A fazer','06,07','Validar entradas, parametrizar SQL, limitar login e tratar erros.','Configurar domínio, HTTPS e segredos da hospedagem.','Sem segredos expostos; tentativas excessivas limitadas; API validada.','Apoio ao RNF Segurança p.3'],
['09','P1 Produção','Proteger documentos pessoais','A fazer','03,06','Definir criptografia em repouso e gestão de chaves.','Definir acesso, custódia e recuperação das chaves.','CPF e dados sensíveis protegidos no banco, logs e exportações.','RNF Segurança p.3'],
['10','P1 Produção','Completar cadastro de clientes','Parcial no mock','07,09','Adicionar CPF/CNPJ e profissão obrigatória em todos cadastros.','Revisar preenchimento e tratamento dos cadastros antigos.','Criar, consultar, editar e inativar; documento e profissão persistidos.','RF01 p.1'],
['11','P1 Produção','Garantir e-mail único no banco','Parcial no mock','03,10','Normalizar e-mail, criar restrição única e testes concorrentes.','Resolver eventuais duplicidades dos dados antigos.','Mesmo e-mail não cria duas contas; erro claro.','RF01 p.1; RN03 p.4'],
['12','P1 Produção','Inativar unidades','Parcial no mock','02,03,07','Adicionar status ativo, ação e filtro, preservando históricos.','Validar tratamento de reservas futuras vinculadas.','Unidade inativa não recebe novas reservas; histórico preservado.','RF02 p.1'],
['13','P1 Produção','Inativar salas e controlar disponibilidade','Parcial no mock','02,12','Adicionar status e regras de disponibilidade da sala.','Definir significados dos estados e reservas futuras.','Sala inativa/indisponível não aceita reserva, inclusive via API.','RF03 p.2'],
['14','P1 Produção','Migrar catálogo e galeria para backend','Parcial no mock','03,07,12,13','Implementar gateway da API, validação e armazenamento das fotos.','Escolher armazenamento e aprovar migração.','Código, vínculo, fotos e preço preservados; edição persiste no servidor.','RF02/03 p.1–2'],
['15','P1 Produção','Calcular frações de 30 minutos','Parcial no mock','02,14','Adaptar seleção/cálculo e repetir regra no backend.','Confirmar exemplos esperados e compatibilidade com planos.','Duração fracionada arredonda para cima em blocos de 30 min.','RN04 p.4'],
['16','P1 Produção','Impedir duplicidade com transações','Parcial no mock','03,14,15','Implementar locks e testar solicitações simultâneas.','Fornecer ambiente MySQL para testes.','Duas tentativas sobrepostas: só uma reserva/bloqueio aceito.','RF04 p.2; RNF Integridade p.3'],
['17','P1 Produção','Bloquear sala por dez minutos','A fazer','16','Criar reserva temporária, prazo e expiração no servidor.','Aprovar mensagens de expiração e retomada.','Ao pagar inicia bloqueio; sem pagamento em 10 min libera e cancela.','RF04 p.2; RN02 p.4'],
['18','P1 Produção','Sincronizar disponibilidade','Parcial no mock','16,17','Atualizar calendário por API e sincronização adequada.','Validar experiência em dois dispositivos.','Bloqueios/reservas aparecem para outros clientes; vencidos liberam.','RF06 p.2'],
['19','P1 Produção','Integrar PIX/cartão','A fazer','01,03,06,17','Integrar provedor e registrar método, valor, data e identificadores.','Escolher provedor, criar conta e credenciais de teste.','Transação vinculada à reserva; fluxo real em sandbox aprovado.','RF05 p.2'],
['20','P1 Produção','Confirmar pagamento automaticamente','A fazer','19','Validar webhook, idempotência e conciliar expiração/pagamento.','Aprovar política de pagamento tardio.','Evento duplicado não duplica reserva; assinatura validada; status correto.','RF05 p.2; RN02 p.4'],
['21','P1 Produção','Separar cancelamento de reembolso','Divergente','02,15,20','Ajustar regras e testes, incluindo estorno dos planos de horas.','Confirmar política ≥24h e tratamento após início.','<24h não reembolsa; cancelamento não é bloqueado só por essa janela.','RN01 p.4'],
['22','P1 Produção','Notificar confirmação, cancelamento e lembrete','Parcial no mock','17,20,21','Implementar notificações e destinatários; evitar duplicatas.','Escolher interface ou e-mail e antecedência do lembrete.','Cliente/admin recebem eventos corretos; e-mail não é obrigatório se interface atender.','RF07 p.2'],
['23','P2 Entrega','Relatório de clientes','A fazer','10,11','Implementar filtros por período/profissão e totalizadores.','Definir data usada no filtro e campos exibidos.','Totais conferem com banco; filtros combinados testados.','RF08 p.2'],
['24','P2 Entrega','Relatório de agendamentos master-detail','Parcial no mock','18,21','Criar relatório cliente/reservas com JOIN de sala e unidade.','Validar filtros e status de utilização.','Filtra unidade/sala/cliente; mostra mestre e detalhes; junção comprovada.','RF09 p.2; normas de relatórios'],
['25','P2 Entrega','Relatório financeiro','A fazer','20,21','Consolidar faturamento por método e período, com mascaramento.','Definir tratamento de estornos e acesso financeiro por perfil.','Totais conciliados com transações; sem cartão completo/CVV armazenado ou exibido.','RF10 p.2'],
['26','P1 Produção','Backup automático e restauração','Parcial no mock','03,08','Configurar backup diário, retenção e teste de recuperação.','Disponibilizar storage, acessos e orçamento da infraestrutura.','Backups diários, retenção ≥30 dias e restauração comprovada.','RNF Recuperação p.3'],
['27','P1 Produção','Fluxo de exclusão dos dados pessoais','A fazer','09,10,26','Implementar solicitação, controle de acesso e execução auditável.','Validar política de retenção/exclusão com responsável competente.','Fluxo demonstrado, incluindo impactos em históricos e backups.','RNF Segurança p.3'],
['28','P1 Produção','Hospedar e monitorar disponibilidade','A fazer','08,26','Apoiar deploy, health checks, alertas e métricas de uptime.','Contratar/autorizar infraestrutura e definir janela de avaliação.','Meta 24/7 e uptime ≥99,5% medidos; não garantidos só pelo código.','RNF Disponibilidade p.3'],
['29','P2 Entrega','Medir desempenho e otimizar bundle','A medir','18,28','Aplicar lazy loading e medir calendário/disponibilidade.','Aprovar ambiente, rede e volume de teste.','Consultas e calendário ≤2s em condições documentadas.','RNF Desempenho p.3; bundle é meio técnico'],
['30','P2 Entrega','Validar responsividade e mapa','A validar','14,18','Testar tamanhos, teclado e mapa real; corrigir problemas pontuais.','Conferir dispositivos disponíveis e resultados visuais.','Reserva funciona em celular/tablet/desktop; mapa carrega e interage.','RNF Responsividade p.3'],
['31','P2 Entrega','Validar quatro etapas e usabilidade','A medir','01,20,30','Mapear fluxo, preparar roteiro e analisar tempos dos testes.','Recrutar usuários sem treinamento e executar sessões.','≤4 telas/etapas; ≥90% reservam em <3 min na primeira utilização.','RNF Usabilidade p.3'],
['32','P2 Entrega','Revisar segurança e regressões','A validar','06–31','Testar perfis, concorrência, pagamentos e restauração; corrigir falhas.','Autorizar testes e revisar riscos com responsável técnico.','Evidências registradas; falhas críticas resolvidas antes de dados reais.','Escopo; RF04/05; RNF Segurança'],
['33','P2 Entrega','Organizar evidências acadêmicas','A fazer','01–32','Relacionar requisito, tela/API, teste, relatório e diagrama.','Validar entrega com professor e preparar apresentação.','RF01–RF10, RN01–RN04, RNFs e normas demonstrados.','Documento completo + normas'],
['34','Adiado','Descrição das salas','Adiado','Autorização do usuário','Implementar campo e testes se autorizado depois.','Decidir retomada ou obter aprovação formal da alteração do escopo.','Não contar RF03 como completo enquanto exigência estiver pendente.','RF03 p.2; adiado nesta conversa'],
];
const wb = Workbook.create();
const guide = wb.worksheets.add('Comece aqui');
const s = wb.worksheets.add('Checklist');
for (const sh of [guide,s]) { sh.showGridLines=false; sh.tabColor='#18212F'; }
guide.getRange('A2').values=[['Connect2Work — plano de implementação']];
guide.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#18212F'};
const notes=[
['Como usar','Comece pelos itens 01 e 02. Depois modele banco e backend. Implemente um item por vez, confira e só então avance.'],
['P0 Agora','Decisões e fundação. Não exige alterar o funcionamento das telas agora.'],
['P1 Produção','Bloqueadores antes de usar com clientes e dados reais. Seguir dependências; não fazer tudo ao mesmo tempo.'],
['P2 Entrega','Obrigatórios para comprovação acadêmica e qualidade. Não são opcionais.'],
['Descrição das salas','Adiada por sua decisão. Continua no PDF; não foi removida nem marcada como atendida.'],
['Estado inicial','Baseado na revisão do projeto com persistência local. Parcial no mock não equivale a requisito concluído em produção.'],
['Atualização','Na aba Checklist, edite Status e Evidência. Marque Concluído somente após implementar, testar e conferir o critério.'],
['Meu apoio','Posso planejar, programar, testar e documentar. Contas, credenciais, aprovações e testes com pessoas dependem de você.'],
['Limites','Sem promessa de risco zero, conformidade legal automática ou uptime garantido. Segurança final exige validação responsável.'],
['Prazos','Prioridade proposta, sem datas inventadas. Definiremos prazos após decisões e disponibilidade da equipe.'],
['Fonte principal','Documento de Requisitos de Estágio I assinado, 02/04/2026: RF p.1–2, RNF p.3, RN p.4.'],
['Fonte adicional','Normas essenciais fornecidas na conversa: OO, ≥6 tabelas, 1:N, N:N, autenticação/perfis, ≥3 relatórios e master-detail com junção.'],
['Escopo desta entrega','Checklist de planejamento. Nenhum código, dado, pagamento ou tela foi alterado.'],
];
guide.getRange('A4:B16').values=notes;
guide.getRange('A4:B16').format={font:{name:'Arial',size:11,color:'#18212F'},wrapText:true,verticalAlignment:'center'};
guide.getRange('A4:A16').format.font.bold=true;
guide.getRange('A1:A21').format.columnWidth=28;
guide.getRange('B1:B21').format.columnWidth=100;
guide.getRange('A4:B16').format.rowHeight=50;
guide.getRange('A5:B7').format.fill='#FFF3CC';
guide.getRange('A18').values=[['Itens planejados']];guide.getRange('B18').values=[[tasks.length]];
guide.getRange('A19').values=[['Itens concluídos']];
guide.getRange('B19').formulas=[[`=COUNTIFS(Checklist!D7:D${tasks.length+6},"Concluído")`]];
guide.getRange('A18:B19').format.font={name:'Arial',size:11,bold:true};
s.getRange('A2').values=[['Connect2Work — checklist por ordem sugerida']];
s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#18212F'};
s.getRange('A3').values=[['Filtre por prioridade ou status. Dependências indicam IDs. Evidência é campo livre para data, teste ou link.']];
s.getRange('A4').values=[['Base: PDF assinado de Estágio I (02/04/2026), normas da conversa e revisão do mock. Nenhum prazo foi presumido.']];
const headers=['ID','Prioridade','O que implementar','Status','Depende de','Como posso apoiar','O que depende de você','Critério de conclusão','Referência','Evidência / acompanhamento'];
s.getRange('A6:J6').values=[headers];
s.getRange(`A7:J${tasks.length+6}`).values=tasks.map(row=>[...row,'']);
s.tables.add(`A6:J${tasks.length+6}`,true,'ChecklistEstagio');
s.getRange(`A6:J${tasks.length+6}`).format={font:{name:'Arial',size:11,color:'#18212F'},wrapText:true,verticalAlignment:'top'};
s.getRange('A6:J6').format={fill:'#18212F',font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:34,verticalAlignment:'center',horizontalAlignment:'center'};
const widths=[7,18,35,20,14,44,44,49,27,30];
widths.forEach((width,i)=>s.getRangeByIndexes(0,i,tasks.length+6,1).format.columnWidth=width);
for(let i=0;i<tasks.length;i++) s.getRange(`A${i+7}:J${i+7}`).format.rowHeight=88;
s.getRange(`D7:D${tasks.length+6}`).format.fill='#FFF3CC';
s.getRange(`J7:J${tasks.length+6}`).format.fill='#FFF3CC';
s.getRange(`D7:D${tasks.length+6}`).dataValidation={rule:{type:'list',values:['A alinhar','A fazer','Parcial no mock','Divergente','A medir','A validar','Em andamento','Bloqueado','Concluído','Adiado']}};
s.getRange(`D7:D${tasks.length+6}`).conditionalFormats.add('containsText',{text:'Concluído',format:{fill:'#DCFCE7',font:{color:'#166534'}}});
s.freezePanes.freezeRows(6);
wb.recalculate();
// Verify count reacts to an edit, then restore the actual initial status.
s.getRange('D7').values=[['Concluído']];wb.recalculate();
if(guide.getRange('B19').values[0][0]!==1) throw new Error('Contagem de conclusão não atualizou');
s.getRange('D7').values=[['A alinhar']];wb.recalculate();
if(guide.getRange('B19').values[0][0]!==0) throw new Error('Status inicial não restaurado');
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},summary:'Verificação de fórmulas'})).ndjson);
await fs.mkdir(out,{recursive:true});
for(const [sheetName,range,file] of [['Comece aqui','A1:B19','guia'],['Checklist','A6:E11','checklist-inicio'],['Checklist','F6:J10','checklist-detalhe']]){
 const preview=await wb.render({sheetName,range,scale:1,format:'png'});
 await fs.writeFile(out+'/'+file+'.png',new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(out+'/Checklist_Connect2Work.xlsx');
console.log(JSON.stringify({items:tasks.length,concluidos:guide.getRange('B19').values,saved:out+'/Checklist_Connect2Work.xlsx'}));
