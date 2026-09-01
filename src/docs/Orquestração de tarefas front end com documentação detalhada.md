# Tarefa Frontend — spuripainel
### Documento de execução para o Codex (orquestrado e pré-testado pelo Claude)

---

## 0. Como usar este documento (leia antes de começar)

Este documento **não pede para você planejar nada** — todo o levantamento, a leitura do backend/documentação da API, as decisões de design e a validação (`tsc`, `eslint`, um teste funcional real) já foram feitos num clone isolado do repositório. Sua tarefa é **aplicar exatamente** os diffs abaixo, na ordem em que aparecem, e depois rodar o checklist de validação da Seção 4.

Regras gerais:
- Cada arquivo tem um bloco `diff` unificado (formato `git diff`). Aplique com `git apply` (colando o diff num arquivo `.patch` e rodando `git apply caminho.patch`) ou reproduza manualmente as linhas `-`/`+` — o resultado final tem que ser idêntico.
- **Não** faça nenhuma alteração além do que está descrito. Não renomeie variáveis, não "melhore" estilos, não reformate código ao redor. Se notar algo estranho no código existente que não faz parte desta tarefa, **não mexa** — apenas relate no final.
- Se um diff não aplicar limpo (contexto não bate porque o arquivo mudou desde que este documento foi gerado), pare, mostre o trecho conflitante e não tente adivinhar — sinalize para revisão humana.
- Todos os diffs abaixo foram gerados e validados a partir da branch `main` do repositório `https://github.com/fredypdp/spuripainel`.

Há duas tarefas independentes:
1. **Parte 1** — novo seletor opcional de "Sumário da aula" na página `/faltas/lancar`.
2. **Parte 2** — substituir todo `<select>` HTML nativo por `src/components/form/SearchableSelect.tsx` em toda a aplicação.

---

## 1. Parte 1 — Vincular Sumário à falta em `/faltas/lancar`

### 1.1 Requisito
Na página `/faltas/lancar`, ao configurar o contexto do lote de faltas (nível → curso → ano → turma → período → matéria), adicionar um seletor **opcional** de "Sumário da aula" que só aparece **depois que a matéria for selecionada**. Se um sumário for escolhido, todas as faltas lançadas nesse lote devem ser gravadas vinculadas a esse sumário.

### 1.2 O que já existe no backend (não precisa mudar nada no back — só consumir)
Conferido em `src/docs/Documentação da API.md`:
- `POST /academia/faltas-aluno` e `POST /academia/faltas-aluno/async` (o lote usado por esta tela) já aceitam um campo opcional `sumario_id` em cada item.
- Regra de validação do backend: se `sumario_id` for informado, o sumário precisa existir, pertencer à mesma academia e ter `materia_id`, `periodo` e `ano_academico` idênticos aos da falta — senão retorna `400`.
- `GET /academia/sumarios` aceita filtros `materia_id`, `periodo`, `ano_academico` e já retorna apenas sumários ativos.
- Esse mesmo padrão (buscar sumários compatíveis com `materia_id`+`periodo`+`ano_academico` e deixar o usuário escolher) **já existe e funciona** em `src/components/faltas/FaltasAcademia.tsx` (modal de corrigir falta) — usado como referência de implementação.
- `academiaService.listarSumarios(token, { materia_id, periodo, ano_academico })` já existe em `src/lib/api/services.ts` — não precisa criar nenhum método novo de API.

### 1.3 ⚠️ Achado crítico do pré-teste — leia antes de aplicar os diffs

A página `/faltas/lancar` **não usa o estado ao vivo da tela para montar o payload final**. O fluxo real é:

1. O usuário escolhe nível/curso/ano/turma/período/matéria em `SelecaoContextoFaltas.tsx` e clica em "Baixar modelo".
2. `faltasTemplate.ts` gera um `.xlsx` com uma aba **oculta** chamada `_meta`, que grava o contexto inteiro (matéria, período, ano acadêmico, etc.) como pares chave/valor dentro do próprio arquivo.
3. O usuário preenche a planilha e reenvia o arquivo.
4. `faltasParser.ts` **relê a aba `_meta` de dentro do arquivo enviado** para reconstruir o contexto (`resultado.contexto`) — é esse objeto, e não o estado da tela, que `LancamentoFaltasForm.tsx` usa para montar o payload de cada falta (`construirPayloadFalta`).

**Se o seletor de Sumário fosse adicionado só na tela (`SelecaoContextoFaltas.tsx`), ele seria puramente cosmético: o `sumario_id` nunca chegaria ao backend**, porque o payload real vem da releitura do Excel, não do estado em memória.

Por isso, esta tarefa mexe em **6 arquivos**, não só na tela: o `sumario_id`/`sumario_titulo` precisa ser gravado na aba `_meta` ao gerar o modelo (`faltasTemplate.ts`) **e** relido de volta ao analisar o upload (`faltasParser.ts`), além de ser incluído no payload final (`faltasPayload.ts`) e no tipo do contexto (`faltasTypes.ts`).

Isso já foi implementado e testado: rodei um script Node que gera o modelo com um sumário selecionado, salva o `.xlsx`, relê o arquivo do zero (simulando o upload) e confirma que `sumario_id`/`sumario_titulo` sobrevivem ao ciclo completo — em ambos os cenários (com sumário escolhido e sem nenhum escolhido). Os dois passaram.

### 1.4 Diffs a aplicar, nesta ordem

#### Arquivo 1/6 — `src/app/(painel)/faltas/lancar/faltasTypes.ts`
Adiciona os dois novos campos opcionais ao tipo de contexto.

```diff
diff --git a/src/app/(painel)/faltas/lancar/faltasTypes.ts b/src/app/(painel)/faltas/lancar/faltasTypes.ts
index c1fde04..0da23db 100644
--- a/src/app/(painel)/faltas/lancar/faltasTypes.ts
+++ b/src/app/(painel)/faltas/lancar/faltasTypes.ts
@@ -1,4 +1,4 @@
-export interface ContextoModeloFaltas { codigoAcademia:string; nomeAcademia:string; nivel:'fundamental'|'medio'|'superior'; cursoId?:string; cursoNome?:string; anoAcademico:string; anoAcademicoLabel:string; codigoTurma:string; turmaLabel?:string; periodo:string; periodoLabel:string; materiaId:string; materiaNome:string; versaoModelo:string; }
+export interface ContextoModeloFaltas { codigoAcademia:string; nomeAcademia:string; nivel:'fundamental'|'medio'|'superior'; cursoId?:string; cursoNome?:string; anoAcademico:string; anoAcademicoLabel:string; codigoTurma:string; turmaLabel?:string; periodo:string; periodoLabel:string; materiaId:string; materiaNome:string; versaoModelo:string; sumarioId?:string; sumarioTitulo?:string; }
 export interface FaltaBulkRow { linha:number; nome:string; codigoEstudante:string; dataTexto:string; dataIso?:string; dataErro?:string; quantidadeTexto:string; quantidade?:number; }
 export interface ErroValidacao { linha:number; coluna:string; campo:string; valor:string; mensagem:string; }
 export interface ResultadoAnaliseFaltas { contexto: ContextoModeloFaltas | null; linhas: FaltaBulkRow[]; totalLinhasIgnoradas:number; erros:ErroValidacao[]; totalLinhas:number; }
```

#### Arquivo 2/6 — `src/app/(painel)/faltas/lancar/faltasPayload.ts`
Inclui `sumario_id` no payload de cada falta, só quando presente no contexto.

```diff
diff --git a/src/app/(painel)/faltas/lancar/faltasPayload.ts b/src/app/(painel)/faltas/lancar/faltasPayload.ts
index c6a4fdc..64ded4c 100644
--- a/src/app/(painel)/faltas/lancar/faltasPayload.ts
+++ b/src/app/(painel)/faltas/lancar/faltasPayload.ts
@@ -1,3 +1,3 @@
 import type { RegistrarFaltasRequest } from '@/types/api';
 import type { ContextoModeloFaltas, FaltaBulkRow } from './faltasTypes';
-export function construirPayloadFalta(linha: FaltaBulkRow, contexto: ContextoModeloFaltas): RegistrarFaltasRequest { return { codigo_estudante: linha.codigoEstudante.trim(), data: linha.dataIso as any, materia_disciplinar_id: contexto.materiaId, periodo: contexto.periodo as RegistrarFaltasRequest['periodo'], quantidade: linha.quantidade as number }; }
+export function construirPayloadFalta(linha: FaltaBulkRow, contexto: ContextoModeloFaltas): RegistrarFaltasRequest { return { codigo_estudante: linha.codigoEstudante.trim(), data: linha.dataIso as any, materia_disciplinar_id: contexto.materiaId, periodo: contexto.periodo as RegistrarFaltasRequest['periodo'], quantidade: linha.quantidade as number, ...(contexto.sumarioId ? { sumario_id: contexto.sumarioId } : {}) }; }
```

#### Arquivo 3/6 — `src/app/(painel)/faltas/lancar/faltasTemplate.ts`
Grava `sumario_id`/`sumario_titulo` na aba oculta `_meta` do Excel gerado.

```diff
diff --git a/src/app/(painel)/faltas/lancar/faltasTemplate.ts b/src/app/(painel)/faltas/lancar/faltasTemplate.ts
index 8adfff3..e344c8c 100644
--- a/src/app/(painel)/faltas/lancar/faltasTemplate.ts
+++ b/src/app/(painel)/faltas/lancar/faltasTemplate.ts
@@ -3,4 +3,4 @@ import type { ContextoModeloFaltas } from './faltasTypes';
 export const COLUNAS_FALTAS=['Nome do Estudante','Código do Estudante','Data da Falta','Quantidade'];
 function slugify(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
 export function gerarNomeArquivoModeloFaltas(contexto:ContextoModeloFaltas){return `modelo-lancamento-faltas-${slugify(contexto.codigoTurma)}-${slugify(contexto.periodoLabel||contexto.periodo)}.xlsx`;}
-export function gerarModeloExcelFaltas(contexto:ContextoModeloFaltas, estudantes:{nome:string;codigo_estudante:string}[]):void{const wb=XLSX.utils.book_new(); const inst=[['Modelo de Lançamento de Faltas — Spuri'],[],['Academia',contexto.nomeAcademia],['Turma',contexto.turmaLabel||contexto.codigoTurma],['Curso',contexto.cursoNome||''],['Ano Acadêmico',contexto.anoAcademicoLabel],['Período',contexto.periodoLabel],['Matéria',contexto.materiaNome],['Gerado em',new Date().toLocaleString('pt-PT')],[],['Instruções'],['1. Preencha Data da Falta (DD/MM/AAAA) e Quantidade na folha "Faltas".'],['2. Não altere cabeçalhos, nomes de colunas, nem o nome/ordem das folhas.'],['3. Linhas sem data e quantidade são ignoradas.'],['4. Há 20 linhas extras para repetir estudantes em datas diferentes.']]; const wi=XLSX.utils.aoa_to_sheet(inst); wi['!cols']=[{wch:34},{wch:64}]; XLSX.utils.book_append_sheet(wb,wi,'Instruções'); const base=[...estudantes].sort((a,b)=>a.nome.localeCompare(b.nome,'pt',{sensitivity:'base'})).map(e=>[e.nome,e.codigo_estudante,'','']); const rows=[COLUNAS_FALTAS,...base,...Array.from({length:20},()=>['','','',''])]; const ws:any=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=[{wch:30},{wch:22},{wch:18},{wch:14}]; COLUNAS_FALTAS.forEach((h,c)=>{const a=XLSX.utils.encode_cell({r:0,c});ws[a]={...(ws[a]||{t:'s',v:h}),s:{fill:{patternType:'solid',fgColor:{rgb:'ABDBE3'}},font:{bold:true,color:{rgb:'000000'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}}};}); ws['!rows']=[{hpt:30}]; ws['!autofilter']={ref:'A1:D1'}; for(let r=1;r<rows.length;r++) for(let c=0;c<4;c++){const a=XLSX.utils.encode_cell({r,c}); ws[a]={...(ws[a]||{t:'s',v:''}),z:'@'};} XLSX.utils.book_append_sheet(wb,ws,'Faltas'); const meta=[['chave','valor'],['versao_modelo',contexto.versaoModelo],['codigo_academia',contexto.codigoAcademia],['nome_academia',contexto.nomeAcademia||''],['nivel',contexto.nivel],['curso_id',contexto.cursoId||''],['curso_nome',contexto.cursoNome||''],['ano_academico',contexto.anoAcademico],['ano_academico_label',contexto.anoAcademicoLabel],['codigo_turma',contexto.codigoTurma],['turma_label',contexto.turmaLabel||''],['periodo',contexto.periodo],['periodo_label',contexto.periodoLabel],['materia_disciplinar_id',contexto.materiaId],['materia_nome',contexto.materiaNome],['gerado_em',new Date().toISOString()]]; XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(meta),'_meta'); const idx=wb.SheetNames.indexOf('_meta'); (wb as any).Workbook={Sheets:wb.SheetNames.map((_,i)=>i===idx?{Hidden:1}:{})}; XLSX.writeFile(wb,gerarNomeArquivoModeloFaltas(contexto));}
+export function gerarModeloExcelFaltas(contexto:ContextoModeloFaltas, estudantes:{nome:string;codigo_estudante:string}[]):void{const wb=XLSX.utils.book_new(); const inst=[['Modelo de Lançamento de Faltas — Spuri'],[],['Academia',contexto.nomeAcademia],['Turma',contexto.turmaLabel||contexto.codigoTurma],['Curso',contexto.cursoNome||''],['Ano Acadêmico',contexto.anoAcademicoLabel],['Período',contexto.periodoLabel],['Matéria',contexto.materiaNome],['Gerado em',new Date().toLocaleString('pt-PT')],[],['Instruções'],['1. Preencha Data da Falta (DD/MM/AAAA) e Quantidade na folha "Faltas".'],['2. Não altere cabeçalhos, nomes de colunas, nem o nome/ordem das folhas.'],['3. Linhas sem data e quantidade são ignoradas.'],['4. Há 20 linhas extras para repetir estudantes em datas diferentes.']]; const wi=XLSX.utils.aoa_to_sheet(inst); wi['!cols']=[{wch:34},{wch:64}]; XLSX.utils.book_append_sheet(wb,wi,'Instruções'); const base=[...estudantes].sort((a,b)=>a.nome.localeCompare(b.nome,'pt',{sensitivity:'base'})).map(e=>[e.nome,e.codigo_estudante,'','']); const rows=[COLUNAS_FALTAS,...base,...Array.from({length:20},()=>['','','',''])]; const ws:any=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=[{wch:30},{wch:22},{wch:18},{wch:14}]; COLUNAS_FALTAS.forEach((h,c)=>{const a=XLSX.utils.encode_cell({r:0,c});ws[a]={...(ws[a]||{t:'s',v:h}),s:{fill:{patternType:'solid',fgColor:{rgb:'ABDBE3'}},font:{bold:true,color:{rgb:'000000'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}}};}); ws['!rows']=[{hpt:30}]; ws['!autofilter']={ref:'A1:D1'}; for(let r=1;r<rows.length;r++) for(let c=0;c<4;c++){const a=XLSX.utils.encode_cell({r,c}); ws[a]={...(ws[a]||{t:'s',v:''}),z:'@'};} XLSX.utils.book_append_sheet(wb,ws,'Faltas'); const meta=[['chave','valor'],['versao_modelo',contexto.versaoModelo],['codigo_academia',contexto.codigoAcademia],['nome_academia',contexto.nomeAcademia||''],['nivel',contexto.nivel],['curso_id',contexto.cursoId||''],['curso_nome',contexto.cursoNome||''],['ano_academico',contexto.anoAcademico],['ano_academico_label',contexto.anoAcademicoLabel],['codigo_turma',contexto.codigoTurma],['turma_label',contexto.turmaLabel||''],['periodo',contexto.periodo],['periodo_label',contexto.periodoLabel],['materia_disciplinar_id',contexto.materiaId],['materia_nome',contexto.materiaNome],['sumario_id',contexto.sumarioId||''],['sumario_titulo',contexto.sumarioTitulo||''],['gerado_em',new Date().toISOString()]]; XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(meta),'_meta'); const idx=wb.SheetNames.indexOf('_meta'); (wb as any).Workbook={Sheets:wb.SheetNames.map((_,i)=>i===idx?{Hidden:1}:{})}; XLSX.writeFile(wb,gerarNomeArquivoModeloFaltas(contexto));}
```

#### Arquivo 4/6 — `src/app/(painel)/faltas/lancar/faltasParser.ts`
Relê `sumario_id`/`sumario_titulo` da aba `_meta` ao analisar o arquivo enviado.

```diff
diff --git a/src/app/(painel)/faltas/lancar/faltasParser.ts b/src/app/(painel)/faltas/lancar/faltasParser.ts
index 2449cfa..4e216ce 100644
--- a/src/app/(painel)/faltas/lancar/faltasParser.ts
+++ b/src/app/(painel)/faltas/lancar/faltasParser.ts
@@ -3,6 +3,6 @@ import type { Turma, EstudanteDetalhado } from '@/types/api';
 import type { ContextoModeloFaltas, ResultadoAnaliseFaltas, ErroValidacao, FaltaBulkRow } from './faltasTypes';
 function txt(ws:any,r:number,c:number){const cell=ws[XLSX.utils.encode_cell({r,c})]; return cell?.v===undefined||cell?.v===null?'':String(cell.v).trim();}
 function data(ws:any,r:number,c:number){const cell=ws[XLSX.utils.encode_cell({r,c})]; if(!cell||cell.v===undefined||cell.v===null||cell.v==='')return{texto:''}; if(cell.t==='n'&&typeof cell.v==='number'){const p=(XLSX as any).SSF?.parse_date_code?.(cell.v); if(p?.y&&p?.m&&p?.d){const dd=String(p.d).padStart(2,'0'),mm=String(p.m).padStart(2,'0'); return{texto:`${dd}/${mm}/${p.y}`,iso:`${p.y}-${mm}-${dd}`};}} const texto=String(cell.v).trim(); const m=texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(!m)return{texto,erro:`Formato inválido ("${texto}"). Escreva a data como texto no formato DD/MM/AAAA — por exemplo 15/05/2010.`}; const [,dd,mm,yyyy]=m; const d=new Date(Number(yyyy),Number(mm)-1,Number(dd)); if(d.getFullYear()!==Number(yyyy)||d.getMonth()!==Number(mm)-1||d.getDate()!==Number(dd))return{texto,erro:`Data inválida ("${texto}"). Confirme o dia, o mês e o ano.`}; return{texto,iso:`${yyyy}-${mm}-${dd}`};}
-function lerCtx(wb:any):ContextoModeloFaltas|null{const ws=wb.Sheets?.['_meta']; if(!ws)return null; const rows=XLSX.utils.sheet_to_json(ws,{header:1}) as any[][]; const m:Record<string,string>={}; rows.slice(1).forEach(l=>{if(l?.[0])m[String(l[0])]=l[1]!==undefined?String(l[1]):''}); if(!m.codigo_academia||!m.nivel||!m.codigo_turma||!m.periodo||!m.materia_disciplinar_id)return null; return {codigoAcademia:m.codigo_academia,nomeAcademia:m.nome_academia||'',nivel:m.nivel as any,cursoId:m.curso_id||undefined,cursoNome:m.curso_nome||undefined,anoAcademico:m.ano_academico,anoAcademicoLabel:m.ano_academico_label||m.ano_academico,codigoTurma:m.codigo_turma,turmaLabel:m.turma_label||undefined,periodo:m.periodo,periodoLabel:m.periodo_label||m.periodo,materiaId:m.materia_disciplinar_id,materiaNome:m.materia_nome||m.materia_disciplinar_id,versaoModelo:m.versao_modelo||'1'};}
+function lerCtx(wb:any):ContextoModeloFaltas|null{const ws=wb.Sheets?.['_meta']; if(!ws)return null; const rows=XLSX.utils.sheet_to_json(ws,{header:1}) as any[][]; const m:Record<string,string>={}; rows.slice(1).forEach(l=>{if(l?.[0])m[String(l[0])]=l[1]!==undefined?String(l[1]):''}); if(!m.codigo_academia||!m.nivel||!m.codigo_turma||!m.periodo||!m.materia_disciplinar_id)return null; return {codigoAcademia:m.codigo_academia,nomeAcademia:m.nome_academia||'',nivel:m.nivel as any,cursoId:m.curso_id||undefined,cursoNome:m.curso_nome||undefined,anoAcademico:m.ano_academico,anoAcademicoLabel:m.ano_academico_label||m.ano_academico,codigoTurma:m.codigo_turma,turmaLabel:m.turma_label||undefined,periodo:m.periodo,periodoLabel:m.periodo_label||m.periodo,materiaId:m.materia_disciplinar_id,materiaNome:m.materia_nome||m.materia_disciplinar_id,versaoModelo:m.versao_modelo||'1',sumarioId:m.sumario_id||undefined,sumarioTitulo:m.sumario_titulo||undefined};}
 function geral(file:string,msg:string):ResultadoAnaliseFaltas{return{contexto:null,linhas:[],totalLinhasIgnoradas:0,erros:[{linha:0,coluna:'-',campo:'Ficheiro',valor:file,mensagem:msg}],totalLinhas:0};}
 export async function analisarPlanilhaFaltas(file:File,codigoAcademiaAtual?:string,turmasAtivas:Turma[]=[],estudantesAtuais:EstudanteDetalhado[]=[]):Promise<ResultadoAnaliseFaltas>{let wb:any; try{wb=XLSX.read(await file.arrayBuffer(),{type:'array'});}catch{return geral(file.name,'Não foi possível abrir este ficheiro. Confirme que é um Excel (.xlsx) exportado pelo Spuri.');} const contexto=lerCtx(wb); if(!contexto)return geral(file.name,'Este ficheiro não foi reconhecido como um modelo do Spuri para lançamento de faltas. Baixe um novo modelo.'); if(codigoAcademiaAtual&&contexto.codigoAcademia!==codigoAcademiaAtual)return geral(file.name,'Este modelo pertence a outra academia. Baixe um novo modelo nesta academia.'); if(!turmasAtivas.some(t=>t.codigo_turma===contexto.codigoTurma))return geral(file.name,`A turma deste modelo (${contexto.codigoTurma}) não existe mais ou foi desativada. Baixe um novo modelo para uma turma ativa.`); const ws=wb.Sheets?.['Faltas']; if(!ws)return geral(file.name,'A folha "Faltas" não foi encontrada.'); const range=XLSX.utils.decode_range(ws['!ref']||'A1:D1'); const erros:ErroValidacao[]=[]; const linhas:FaltaBulkRow[]=[]; let totalLinhasIgnoradas=0; const codigosValidos=new Set(estudantesAtuais.map(e=>String(e.codigo_estudante).trim().toLowerCase()).filter(Boolean)); for(let r=1;r<=range.e.r;r++){const nome=txt(ws,r,0), codigo=txt(ws,r,1), dt=data(ws,r,2), qtdTxt=txt(ws,r,3); if(!nome&&!codigo&&!dt.texto&&!qtdTxt)continue; if((nome||codigo)&&!dt.texto&&!qtdTxt){totalLinhasIgnoradas++; continue;} const linha:FaltaBulkRow={linha:r+1,nome,codigoEstudante:codigo,dataTexto:dt.texto,dataIso:dt.iso,dataErro:dt.erro,quantidadeTexto:qtdTxt}; if(!codigo)erros.push({linha:r+1,coluna:'B',campo:'Código do Estudante',valor:codigo,mensagem:'O código do estudante é obrigatório quando a falta é preenchida.'}); if(!dt.texto)erros.push({linha:r+1,coluna:'C',campo:'Data da Falta',valor:'',mensagem:'Informe a data da falta.'}); else if(dt.erro)erros.push({linha:r+1,coluna:'C',campo:'Data da Falta',valor:dt.texto,mensagem:dt.erro}); if(!qtdTxt)erros.push({linha:r+1,coluna:'D',campo:'Quantidade',valor:'',mensagem:'Informe a quantidade de faltas.'}); else {const q=Number(qtdTxt); if(!Number.isInteger(q)||q<1)erros.push({linha:r+1,coluna:'D',campo:'Quantidade',valor:qtdTxt,mensagem:'A quantidade deve ser um número inteiro maior ou igual a 1.'}); else linha.quantidade=q;} if(codigo&&codigosValidos.size>0&&!codigosValidos.has(codigo.toLowerCase()))erros.push({linha:r+1,coluna:'B',campo:'Código do Estudante',valor:codigo,mensagem:'Este código de estudante não pertence (ou não pertence mais) à turma selecionada.'}); linhas.push(linha);} return{contexto,linhas,totalLinhasIgnoradas,erros,totalLinhas:linhas.length};}
```

#### Arquivo 5/6 — `src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx`
O seletor em si: aparece só depois que `materiaId` é escolhido, busca sumários compatíveis, e limpa a seleção sempre que a matéria muda.

```diff
diff --git a/src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx b/src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx
index f91c2a0..72b13ca 100644
--- a/src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx
+++ b/src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx
@@ -7,7 +7,7 @@ import SearchableSelect from '@/components/form/SearchableSelect';
 import Label from '@/components/form/Label';
 import Button from '@/components/ui/button/Button';
 import Icon from '@/components/ui/Icon';
-import type { Curso, Turma, EstudanteDetalhado } from '@/types/api';
+import type { Curso, Turma, EstudanteDetalhado, Sumario } from '@/types/api';
 import {
   ANOS_FUNDAMENTAL_LIST,
   isAnoMedioValue,
@@ -44,6 +44,8 @@ export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContext
   const [materias, setMaterias] = useState<any[]>([]);
   const [estudantes, setEstudantes] = useState<EstudanteDetalhado[]>([]);
   const [loadingEstudantes, setLoadingEstudantes] = useState(false);
+  const [sumarios, setSumarios] = useState<Sumario[]>([]);
+  const [loadingSumarios, setLoadingSumarios] = useState(false);
 
   const isSuperior = user?.academia?.nivel === 'superior';
   const nivelEscolar = user?.academia?.nivel_escolar ?? 'fundamental';
@@ -60,6 +62,7 @@ export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContext
   const [codigoTurma, setCodigoTurma] = useState('');
   const [periodo, setPeriodo] = useState('');
   const [materiaId, setMateriaId] = useState('');
+  const [sumarioId, setSumarioId] = useState('');
 
   useEffect(() => {
     academiaService.listarTurmas(token).then((r: any) => setTurmas((r?.turmas ?? []).filter((t: Turma) => t.status === 'ativo')));
@@ -106,6 +109,25 @@ export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContext
     setMateriaId('');
   }, [codigoTurma, periodo]);
 
+  useEffect(() => {
+    // O sumário é opcional e depende diretamente da matéria (além do período
+    // e ano académico, já fixados antes da matéria poder ser escolhida), por
+    // isso é buscado novamente — e o vínculo anterior é limpo — sempre que a
+    // matéria muda.
+    setSumarioId('');
+    if (!materiaId) {
+      setSumarios([]);
+      return;
+    }
+    setLoadingSumarios(true);
+    academiaService
+      .listarSumarios(token, { materia_id: materiaId, periodo, ano_academico: anoAcademico })
+      .then((r: any) => setSumarios(r?.sumarios ?? []))
+      .catch(() => setSumarios([]))
+      .finally(() => setLoadingSumarios(false));
+    // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [materiaId]);
+
   useEffect(() => {
     if (!codigoTurma) {
       setEstudantes([]);
@@ -161,6 +183,7 @@ export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContext
     if (!podeBaixar || !nivel || !user?.academia) return;
 
     const materiaSelecionada = materiasCompativeis.find((m: any) => m.id === materiaId);
+    const sumarioSelecionado = sumarios.find((s) => s.id === sumarioId);
 
     const contexto: ContextoModeloFaltas = {
       codigoAcademia: user.academia.codigo_academia,
@@ -177,6 +200,8 @@ export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContext
       materiaId,
       materiaNome: materiaSelecionada?.nome || materiaId,
       versaoModelo: '1',
+      sumarioId: sumarioId || undefined,
+      sumarioTitulo: sumarioSelecionado?.sumario_titulo,
     };
 
     gerarModeloExcelFaltas(contexto, estudantes.map((e) => ({ nome: e.nome, codigo_estudante: e.codigo_estudante })));
@@ -290,6 +315,29 @@ export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContext
             />
           </div>
         )}
+
+        {materiaId && (
+          <div>
+            <Label>Sumário da aula (opcional)</Label>
+            <SearchableSelect
+              value={sumarioId}
+              options={sumarios.map((s) => ({ value: s.id, label: s.sumario_titulo }))}
+              onChange={(v) => setSumarioId(v || '')}
+              placeholder={
+                loadingSumarios
+                  ? 'A carregar sumários...'
+                  : sumarios.length
+                    ? 'Nenhum (sem vínculo)'
+                    : 'Nenhum sumário cadastrado para esta matéria/período/ano'
+              }
+              isClearable
+              isDisabled={loadingSumarios || sumarios.length === 0}
+            />
+            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
+              Se escolhido, todas as faltas deste lote serão vinculadas a este sumário de aula.
+            </p>
+          </div>
+        )}
       </div>
 
       <div className="mt-5">
```

#### Arquivo 6/6 — `src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx`
Ajuste cosmético (não obrigatório para a funcionalidade, mas recomendado): mostra o título do sumário vinculado no aviso "Modelo baixado para...".

```diff
diff --git a/src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx b/src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx
index 9c2802b..8fd9e50 100644
--- a/src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx
+++ b/src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx
@@ -150,6 +150,7 @@ export default function LancamentoFaltasForm() {
           <strong>
             Turma {contextoBaixado.turmaLabel ?? contextoBaixado.codigoTurma} — {contextoBaixado.periodoLabel} —{' '}
             {contextoBaixado.materiaNome}
+            {contextoBaixado.sumarioTitulo ? ` — Sumário: ${contextoBaixado.sumarioTitulo}` : ''}
           </strong>
           . Preencha e envie o ficheiro logo abaixo.
         </div>
```

### 1.5 Teste manual sugerido (depois de aplicar)
1. Abrir `/faltas/lancar`, escolher nível → curso (se aplicável) → ano → turma → período → matéria.
2. Confirmar que o seletor "Sumário da aula (opcional)" só aparece **depois** que a matéria é escolhida, e que muda de opções (ou fica vazio) se a matéria for trocada.
3. Escolher um sumário, clicar em "Baixar Modelo de Excel", preencher a planilha com pelo menos uma falta e reenviar.
4. Confirmar visualmente que o resumo exibido depois do upload não quebra e que a confirmação do lote funciona normalmente.
5. (Opcional, mais rigoroso) Abrir a devtools/Network ao confirmar o lote e verificar que os itens enviados a `POST /academia/faltas-aluno/async` contêm `sumario_id` quando um sumário foi escolhido, e não contêm essa chave quando nenhum foi escolhido.
6. Repetir o fluxo sem escolher nenhum sumário e confirmar que tudo continua funcionando exatamente como antes (comportamento 100% opcional/retrocompatível).

---

## 2. Parte 2 — Substituir `<select>` nativo por `SearchableSelect` em toda a aplicação

### 2.1 Regra de conversão (siga mecanicamente — vale também para qualquer select novo que apareça no futuro)

1. **Toda `<option value="X">Label</option>` do select original vira um item `{ value: "X", label: "Label" }` dentro do array `options` do `SearchableSelect` — inclusive quando `X` é uma string vazia (`""`) representando "Todos", "Nenhum", "Regra raiz", "Sem limite", etc.** Não mova esse item para a prop `placeholder`. Num `<select>` nativo essa opção nunca some da lista, mesmo depois de escolher outra — se ela virasse só um `placeholder`, o usuário perderia a capacidade de voltar a selecioná-la a partir da lista. Isso já foi conferido caso a caso nos diffs abaixo.
2. Use a prop `placeholder` **apenas** quando o `<select>` original não tinha nenhuma `<option value="">`reaproveitável (ou seja, quando não havia opção "vazia" nenhuma na lista original) — nesses casos o `SearchableSelect` já mostra automaticamente um texto acinzentado até haver uma seleção real, sem precisar de nenhuma option extra.
3. `disabled={condição}` no select nativo → `isDisabled={condição}` no `SearchableSelect`.
4. `className="..."` no `<select>` nativo é descartado (`SearchableSelect` não aceita `className`). Se o layout dependia dessas classes (ex.: `w-full`, `min-w-0 flex-1`, espaçamento `mt-1`), mova para um `<div>` que envolve o `SearchableSelect` — os diffs abaixo já fazem isso onde necessário.
5. `isClearable`: use `false` sempre que a lista já contiver uma opção "vazia" reaproveitável (regra 1) — não precisa de botão "×" para isso, já que a opção "Todos"/"Nenhum" está sempre na lista. Use `true` apenas quando não havia opção vazia no original e faz sentido permitir voltar ao estado "nada selecionado" (é o caso do novo seletor de Sumário da Parte 1, que não é uma conversão de select nativo, é um seletor novo).
6. Sempre importar: `import SearchableSelect from "@/components/form/SearchableSelect";` (ajuste o caminho relativo apenas se o arquivo não usar alias `@/`).
7. `key`/`value`/`onChange` continuam funcionando da mesma forma — `SearchableSelect.onChange` recebe o `value` da opção escolhida diretamente (não um `ChangeEvent`), então troque `e => setX(e.target.value)` por `v => setX(v || "")` (ou o fallback apropriado ao tipo do estado).
8. Não altere nenhum outro comportamento, texto, ordem de campos ou estilo além do estritamente necessário para essa troca de componente.

### 2.2 Duas exclusões deste refactor — **decisão pendente**, ver Seção 5

Dois arquivos com `<select>` nativo **não foram convertidos** e ficaram de fora do escopo abaixo. O motivo está detalhado na Seção 5 ("Perguntas em aberto") — não trave a execução por causa deles, apenas não os toque nesta tarefa:

- `src/components/form/group-input/PhoneInput.tsx`
- `src/app/(painel)/testes/PageContent.tsx`

### 2.3 Diffs a aplicar

A ordem sugerida é: primeiro o wrapper genérico (resolve 3 telas de uma vez sem precisar tocá-las), depois os demais arquivos em qualquer ordem (são independentes entre si).

#### Arquivo 1/13 — `src/components/form/Select.tsx` (wrapper genérico)
Usado por `MatriculaPublicPage.tsx`, `EstudantePagamentosPainel.tsx` e `FinanceiroCredenciaisPainel.tsx`. Convertendo o wrapper por dentro, essas 3 telas ganham o `SearchableSelect` automaticamente — **não precisa mexer nesses 3 arquivos**, a assinatura pública de `Select` (props `options`, `placeholder`, `onChange`, `className`, `defaultValue`) foi mantida idêntica.

```diff
diff --git a/src/components/form/Select.tsx b/src/components/form/Select.tsx
index b32c839..bff7390 100644
--- a/src/components/form/Select.tsx
+++ b/src/components/form/Select.tsx
@@ -1,4 +1,5 @@
 import React, { useState } from "react";
+import SearchableSelect from "./SearchableSelect";
 
 interface Option {
   value: string;
@@ -23,41 +24,21 @@ const Select: React.FC<SelectProps> = ({
   // Manage the selected value
   const [selectedValue, setSelectedValue] = useState<string>(defaultValue);
 
-  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
-    const value = e.target.value;
+  const handleChange = (value: string) => {
     setSelectedValue(value);
     onChange(value); // Trigger parent handler
   };
 
   return (
-    <select
-      className={`h-11 w-full appearance-none rounded-lg border border-gray-300  px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
-        selectedValue
-          ? "text-gray-800 dark:text-white/90"
-          : "text-gray-400 dark:text-gray-400"
-      } ${className}`}
-      value={selectedValue}
-      onChange={handleChange}
-    >
-      {/* Placeholder option */}
-      <option
-        value=""
-        disabled
-        className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
-      >
-        {placeholder}
-      </option>
-      {/* Map over options */}
-      {options.map((option) => (
-        <option
-          key={option.value}
-          value={option.value}
-          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
-        >
-          {option.label}
-        </option>
-      ))}
-    </select>
+    <div className={className}>
+      <SearchableSelect
+        value={selectedValue}
+        onChange={(value) => handleChange(value || "")}
+        options={options}
+        placeholder={placeholder}
+        isClearable={false}
+      />
+    </div>
   );
 };
 
```

#### Arquivo 2/13 — `src/app/(painel)/administradores/PageContent.tsx`
Select de "Role" ao criar administrador. Sem opção vazia no original — conversão direta.

```diff
diff --git a/src/app/(painel)/administradores/PageContent.tsx b/src/app/(painel)/administradores/PageContent.tsx
index 9f0634c..5447a45 100644
--- a/src/app/(painel)/administradores/PageContent.tsx
+++ b/src/app/(painel)/administradores/PageContent.tsx
@@ -4,6 +4,7 @@ import { useEffect, useMemo, useState } from "react";
 import PageBreadcrumb from "@/components/common/PageBreadCrumb";
 import Button from "@/components/ui/button/Button";
 import Label from "@/components/form/Label";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import { Modal } from "@/components/ui/modal";
 import { useModal } from "@/hooks/useModal";
 import { useUserCookie } from "@/hooks/useUserCookie";
@@ -66,7 +67,7 @@ export default function AdministradoresPageContent() {
     {(error || erroAcao || feedback) && <div className={`rounded-lg border p-4 text-sm ${erroAcao || error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"}`}>{erroAcao || error || feedback}</div>}
     <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="w-full overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-gray-100 dark:border-white/[0.05]"><tr>{["Nome","Email","Role","Status","Telefone","Ações"].map(h=><th key={h} className="px-5 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead><tbody>{admins.map((admin)=><tr key={admin.id} className="border-b border-gray-100 dark:border-white/[0.05]"><td className="px-5 py-4 text-gray-800 dark:text-white/90">{admin.nome}</td><td className="px-5 py-4 text-gray-600 dark:text-gray-300">{admin.email}</td><td className="px-5 py-4">{roleLabels[admin.role]}</td><td className="px-5 py-4">{admin.status}</td><td className="px-5 py-4">{admin.telefone || "—"}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{admin.status === "inativo" ? <Button size="sm" variant="outline" disabled={!canChangeStatus(admin) || ativar.loading} onClick={()=>handleAtivar(admin)}>Ativar</Button> : <Button size="sm" variant="outline" disabled={!canChangeStatus(admin) || desativar.loading} onClick={()=>abrirMotivo(admin,"desativar")}>Desativar</Button>}<Button size="sm" variant="danger" disabled={!canDelete(admin) || deletar.loading} onClick={()=>abrirMotivo(admin,"deletar")}>Deletar</Button>{!canDelete(admin) && <span className="text-xs text-gray-400">Sem permissão hierárquica</span>}</div></td></tr>)}{!loading && admins.length===0 && <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={6}>Nenhum administrador encontrado.</td></tr>}</tbody></table></div></div>
   </div>
-  <Modal isOpen={criarModal.isOpen} onClose={criarModal.closeModal} className="max-w-[560px] p-6 lg:p-10"><form onSubmit={handleCriar} className="space-y-4"><h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Criar administrador</h4><Label>Nome *</Label><input className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.nome} onChange={e=>setFormCriar({...formCriar,nome:e.target.value})} required/><Label>Email *</Label><input type="email" className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.email} onChange={e=>setFormCriar({...formCriar,email:e.target.value})} required/><Label>Role *</Label><select className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-gray-900" value={formCriar.role} onChange={e=>setFormCriar({...formCriar,role:e.target.value as AdminRole})}><option value="gerente">Gerente</option><option value="adm">Administrador</option>{currentRole === "fpp" && <option value="fpp">FPP</option>}</select><Label>Senha inicial</Label><input type="password" className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.senha} onChange={e=>setFormCriar({...formCriar,senha:e.target.value})}/>{erroAcao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroAcao}</p>}<div className="flex justify-end gap-3"><Button size="sm" variant="outline" onClick={criarModal.closeModal}>Cancelar</Button><Button size="sm" disabled={criar.loading}>{criar.loading?"Criando...":"Criar"}</Button></div></form></Modal>
+  <Modal isOpen={criarModal.isOpen} onClose={criarModal.closeModal} className="max-w-[560px] p-6 lg:p-10"><form onSubmit={handleCriar} className="space-y-4"><h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Criar administrador</h4><Label>Nome *</Label><input className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.nome} onChange={e=>setFormCriar({...formCriar,nome:e.target.value})} required/><Label>Email *</Label><input type="email" className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.email} onChange={e=>setFormCriar({...formCriar,email:e.target.value})} required/><Label>Role *</Label><SearchableSelect value={formCriar.role} options={[{ value: "gerente", label: "Gerente" }, { value: "adm", label: "Administrador" }, ...(currentRole === "fpp" ? [{ value: "fpp", label: "FPP" }] : [])]} onChange={v=>setFormCriar({...formCriar,role:(v || "gerente") as AdminRole})} isClearable={false} /><Label>Senha inicial</Label><input type="password" className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.senha} onChange={e=>setFormCriar({...formCriar,senha:e.target.value})}/>{erroAcao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroAcao}</p>}<div className="flex justify-end gap-3"><Button size="sm" variant="outline" onClick={criarModal.closeModal}>Cancelar</Button><Button size="sm" disabled={criar.loading}>{criar.loading?"Criando...":"Criar"}</Button></div></form></Modal>
   <Modal isOpen={desativarModal.isOpen} onClose={desativarModal.closeModal} className="max-w-[520px] p-6 lg:p-10"><MotivoForm titulo="Desativar administrador" admin={selecionado} motivo={motivo} setMotivo={setMotivo} erro={erroAcao} loading={desativar.loading} submitLabel="Desativar" onSubmit={handleDesativar} onCancel={desativarModal.closeModal}/></Modal>
   <Modal isOpen={deletarModal.isOpen} onClose={deletarModal.closeModal} className="max-w-[520px] p-6 lg:p-10"><MotivoForm titulo="Deletar administrador" admin={selecionado} motivo={motivo} setMotivo={setMotivo} erro={erroAcao} loading={deletar.loading} submitLabel="Deletar" danger onSubmit={handleDeletar} onCancel={deletarModal.closeModal}/></Modal>
   </div>;
```

#### Arquivo 3/13 — `src/app/(painel)/auditoria/PageContent.tsx`
Filtro de "Tipo". Está numa barra `flex flex-wrap` (não um bloco dedicado), por isso o `SearchableSelect` foi envolvido num `<div className="min-w-[200px]">` para garantir uma largura mínima sensata nesse layout.

```diff
diff --git a/src/app/(painel)/auditoria/PageContent.tsx b/src/app/(painel)/auditoria/PageContent.tsx
index 3ecef21..41ba99b 100644
--- a/src/app/(painel)/auditoria/PageContent.tsx
+++ b/src/app/(painel)/auditoria/PageContent.tsx
@@ -3,6 +3,7 @@
 import { useEffect, useMemo, useState } from "react";
 import PageBreadcrumb from "@/components/common/PageBreadCrumb";
 import Button from "@/components/ui/button/Button";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import { adminService, tokenStorage, useApi } from "@/lib/api";
 import type { AuditoriaDelecaoTipo } from "@/types/api";
 
@@ -22,7 +23,7 @@ export default function AuditoriaPageContent() {
   const totalPages = Math.max(1, Math.ceil(total / LIMIT));
   return <div><PageBreadcrumb pageTitle="Auditoria de Deleções" /><div className="space-y-6">
     <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
-      <select className="rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-white/[0.05] dark:bg-gray-900 dark:text-white" value={tipo} onChange={(e)=>{setTipo(e.target.value as AuditoriaDelecaoTipo | ""); setOffset(0);}}><option value="">Todos os tipos</option><option value="academia">Academias</option><option value="admin">Administradores</option><option value="estudante">Estudantes</option></select>
+      <div className="min-w-[200px]"><SearchableSelect value={tipo} options={[{ value: "", label: "Todos os tipos" }, { value: "academia", label: "Academias" }, { value: "admin", label: "Administradores" }, { value: "estudante", label: "Estudantes" }]} onChange={(v)=>{setTipo((v || "") as AuditoriaDelecaoTipo | ""); setOffset(0);}} isClearable={false} /></div>
       <Button size="sm" variant="outline" disabled={loading} onClick={()=>execute({ tipo, limit: LIMIT, offset, token: tokenStorage.get() || undefined }).catch(()=>undefined)}>{loading?"Carregando...":"Atualizar"}</Button>
       <span className="text-sm text-gray-500 dark:text-gray-400">{total} registro(s)</span>
     </div>
```

#### Arquivo 4/13 — `src/app/(painel)/configuracoes/AcademiaSection.tsx`
Select "De" (ano letivo). Preservado `inputId="al-de"` para manter a associação com o `<label htmlFor="al-de">` já existente.

```diff
diff --git a/src/app/(painel)/configuracoes/AcademiaSection.tsx b/src/app/(painel)/configuracoes/AcademiaSection.tsx
index dabe18e..9ad666a 100644
--- a/src/app/(painel)/configuracoes/AcademiaSection.tsx
+++ b/src/app/(painel)/configuracoes/AcademiaSection.tsx
@@ -7,6 +7,7 @@ import { useUserType } from "@/hooks/useRoutePermission";
 import { academiaService, adminService } from "@/lib/api/services";
 import { descreverJanelaFinalizacao, formatAnoLetivo, formatPeriodoAnoLetivo, type AnoLetivoTipo } from "@/types/api";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import PasswordSettingsCard from "./PasswordSettingsCard";
 import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
 import AvaliacaoFinalRulesSection from "./AvaliacaoFinalRulesSection";
@@ -377,22 +378,21 @@ export default function AcademiaSection({ section = "all" }: { section?: Academi
                 >
                   De
                 </label>
-                <select
-                  id="al-de"
+                <SearchableSelect
+                  inputId="al-de"
                   value={anoDe}
-                  onChange={(e) => setAnoDeOverride(e.target.value)}
-                  disabled={false}
-                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
-                >
-                  <option value="">Selecione</option>
-                  {opcoesAnoDe.map((ano) => (
-                    <option key={ano} value={String(ano)}>
-                      {ano}
-                      {anoDeOficial && String(ano) === anoDeOficial ? " (oficial do sistema)" : ""}
-                      {valorAtual.startsWith(`${ano}_`) ? " (actual)" : ""}
-                    </option>
-                  ))}
-                </select>
+                  onChange={(v) => setAnoDeOverride(v || "")}
+                  isClearable={false}
+                  options={[
+                    { value: "", label: "Selecione" },
+                    ...opcoesAnoDe.map((ano) => ({
+                      value: String(ano),
+                      label: `${ano}${anoDeOficial && String(ano) === anoDeOficial ? " (oficial do sistema)" : ""}${
+                        valorAtual.startsWith(`${ano}_`) ? " (actual)" : ""
+                      }`,
+                    })),
+                  ]}
+                />
               </div>
 
               {/* Até — calculado automaticamente */}
```

#### Arquivo 5/13 — `src/app/(painel)/configuracoes/AdminSection.tsx`
Select "De" (ano letivo, versão admin). Lista grande de anos (1900 até o ano atual) — é exatamente o tipo de select que mais se beneficia da busca do `SearchableSelect`.

```diff
diff --git a/src/app/(painel)/configuracoes/AdminSection.tsx b/src/app/(painel)/configuracoes/AdminSection.tsx
index 10558c8..6d3b29b 100644
--- a/src/app/(painel)/configuracoes/AdminSection.tsx
+++ b/src/app/(painel)/configuracoes/AdminSection.tsx
@@ -6,6 +6,7 @@ import { useApi } from "@/hooks/useApi";
 import { adminService } from "@/lib/api/services";
 import { pollJob } from "@/lib/api/job-service";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import { descreverJanelaFinalizacao, formatAnoLetivo, formatPeriodoAnoLetivo, type AnoLetivoTipo } from "@/types/api";
 import PasswordSettingsCard from "./PasswordSettingsCard";
 
@@ -696,9 +697,15 @@ export function GlobalAcademicYearCard({ isFPP }: { isFPP: boolean }) {
                       <form onSubmit={(event) => handleSubmit(event, type)} className="mt-4 space-y-3">
                         <div className="grid grid-cols-3 gap-3">
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">De
-                            <select value={anoDe} onChange={(e) => setAnoDe(e.target.value)} disabled={!isFPP || loading} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
-                              {opcoesAnoDe.map((ano) => <option key={ano} value={String(ano)}>{ano}</option>)}
-                            </select>
+                            <div className="mt-1">
+                              <SearchableSelect
+                                value={anoDe}
+                                onChange={(v) => setAnoDe(v || "")}
+                                isDisabled={!isFPP || loading}
+                                isClearable={false}
+                                options={opcoesAnoDe.map((ano) => ({ value: String(ano), label: String(ano) }))}
+                              />
+                            </div>
                           </label>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Até
                             <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">{anoAte}</div>
```

#### Arquivo 6/13 — `src/app/(painel)/configuracoes/AvaliacaoFinalRulesSection.tsx`
4 selects no formulário de regra de avaliação final: Dependência, Nota despertadora, Categoria da nota (rascunho da fórmula) e Período (rascunho da fórmula).

```diff
diff --git a/src/app/(painel)/configuracoes/AvaliacaoFinalRulesSection.tsx b/src/app/(painel)/configuracoes/AvaliacaoFinalRulesSection.tsx
index 5fae385..6191fe1 100644
--- a/src/app/(painel)/configuracoes/AvaliacaoFinalRulesSection.tsx
+++ b/src/app/(painel)/configuracoes/AvaliacaoFinalRulesSection.tsx
@@ -5,6 +5,7 @@ import { academiaService } from "@/lib/api/services";
 import { useApi } from "@/hooks/useApi";
 import { useUserType } from "@/hooks/useRoutePermission";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
 import type { CategoriaNotaItem, CriarRegraAvaliacaoFinalRequest, RegraAvaliacaoFinal, TipoEnsino } from "@/types/api";
 
@@ -181,8 +182,8 @@ export default function AvaliacaoFinalRulesSection() {
       <div><p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Regras ativas</p>{loading ? <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" /> : regras.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhuma regra configurada.</div> : <div className="space-y-2">{regras.map((r) => <div key={r.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{r.type}</span><span className="text-sm font-semibold text-gray-800 dark:text-white">{r.nome}</span><span className="text-sm text-gray-400">{labelTipo(r.nivel)}</span><button type="button" disabled={deletando} onClick={async () => { if (window.confirm("Inativar esta regra? As dependentes em cadeia também podem ser afetadas.")) { await deletarRegra(r.id); await listarRegras(); } }} className="ml-auto rounded-full border border-red-200 px-2 py-0.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/20">Inativar</button></div><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{formatEscopoRegra(r)} · mínimo {r.nota_minima_aprovacao} · categorias extraídas: {r.categorias_envolvidas.join(", ")}</p><p className="mt-1 text-sm text-gray-400">{labelFormula(r.formula)}{r.aplica_se_reprovado_em_type ? ` · depende de reprovação em ${r.aplica_se_reprovado_em_type}` : " · regra raiz"}</p></div>)}</div>}</div>
       <form onSubmit={submit} className="space-y-4">
         <h3 className="text-base font-semibold text-gray-800 dark:text-white">Criar nova regra de avaliação final</h3>
-        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">1. Identificação da regra</p><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"><span className="block text-sm font-medium text-gray-500">Tipo de academia</span>{labelTipo(tipoSelecionado)}</div><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Nome da regra<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Avaliação final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Tipo de regra (código)<input value={type} onChange={(e) => setType(e.target.value.replace(/[^A-Za-z0-9_ ]/g, ""))} placeholder="Ex.: avaliacao_final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Nota mínima de aprovação<input type="number" min={1} value={notaMinima} onChange={(e) => setNotaMinima(e.target.value)} placeholder="Ex.: 10" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Limite de matérias pendentes<input type="number" min={0} value={limitePendentes} onChange={(e) => setLimitePendentes(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label></div><label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Descrição<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Explique quando essa será aplicada" rows={2} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Dependência<p className="mt-1 text-sm font-normal leading-relaxed text-gray-500 dark:text-gray-400">Use a dependência para ligar uma tentativa à anterior. Regras dependentes não enviam nota despertadora.</p><select value={dependencia} onChange={(e) => setDependencia(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Regra raiz (primeira avaliação)</option>{regras.filter(r => r.nivel === tipoSelecionado).map(r => <option key={r.id} value={r.type}>Só aplicar se reprovar em {r.type}</option>)}</select></label>{!dependencia && <label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Nota despertadora<select value={notaDespertadora} onChange={(e) => setNotaDespertadora(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Sem disparo por categoria</option>{categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}</div>
-        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="text-sm font-semibold text-gray-800 dark:text-white">2. Fórmula guiada</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monte a conta passo a passo, adicionando uma nota ou número e depois escolhendo a operação desejada. O sistema extrai automaticamente as categorias usadas na fórmula e calcula a nota final assim que todas as notas necessárias forem lançadas.</p><div className="mt-3 rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">{formula || "A fórmula aparecerá aqui conforme você adicionar notas, números e operações."}</div>{precisaValor ? <div className="mt-3 space-y-3"><div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Categoria da nota<select value={draftCategoria} onChange={(e) => setDraftCategoria(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">{categoriasDisponiveis.length === 0 ? "Nenhuma categoria configurada para o escopo" : "Categoria da nota"}</option>{categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Período<select value={draftPeriodo} onChange={(e) => setDraftPeriodo(e.target.value)} disabled={tipoSelecionado === "superior" || periodosFormula.length === 0} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">{tipoSelecionado === "superior" ? "Inferido pela matéria" : "Período"}</option>{periodosFormula.map(p => <option key={p} value={p}>{labelPeriodo(p)}</option>)}</select></label><button type="button" onClick={addRef} disabled={!draftCategoria || (tipoSelecionado !== "superior" && !draftPeriodo)} className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-3 text-sm font-medium text-white disabled:opacity-50">Adicionar nota</button></div><div className="grid items-end gap-2 sm:grid-cols-[1fr_auto]"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Número constante<input type="number" min={0} step="0.01" value={draftConstante} onChange={(e) => setDraftConstante(e.target.value)} placeholder="Número constante" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><button type="button" onClick={addConstante} disabled={!draftConstante} className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Adicionar número</button></div></div> : <div className="mt-3 flex flex-wrap gap-2">{["+", "-", "*", "/"].map(op => <button type="button" key={op} onClick={() => setFormulaItems((prev) => [...prev, { kind: "op", op: op as "+" | "-" | "*" | "/" }])} className="h-10 w-10 rounded-lg bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{op}</button>)}</div>}<div className="mt-3 flex gap-2"><button type="button" onClick={() => setFormulaItems((prev) => prev.slice(0, -1))} className="text-sm font-medium text-gray-500 hover:text-gray-700">Desfazer último item</button><button type="button" onClick={() => setFormulaItems([])} className="text-sm font-medium text-red-500 hover:text-red-600">Limpar fórmula</button></div></div>
+        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">1. Identificação da regra</p><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"><span className="block text-sm font-medium text-gray-500">Tipo de academia</span>{labelTipo(tipoSelecionado)}</div><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Nome da regra<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Avaliação final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Tipo de regra (código)<input value={type} onChange={(e) => setType(e.target.value.replace(/[^A-Za-z0-9_ ]/g, ""))} placeholder="Ex.: avaliacao_final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Nota mínima de aprovação<input type="number" min={1} value={notaMinima} onChange={(e) => setNotaMinima(e.target.value)} placeholder="Ex.: 10" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Limite de matérias pendentes<input type="number" min={0} value={limitePendentes} onChange={(e) => setLimitePendentes(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label></div><label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Descrição<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Explique quando essa será aplicada" rows={2} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Dependência<p className="mt-1 text-sm font-normal leading-relaxed text-gray-500 dark:text-gray-400">Use a dependência para ligar uma tentativa à anterior. Regras dependentes não enviam nota despertadora.</p><div className="mt-1"><SearchableSelect value={dependencia} onChange={(v) => setDependencia(v || "")} isClearable={false} options={[{ value: "", label: "Regra raiz (primeira avaliação)" }, ...regras.filter(r => r.nivel === tipoSelecionado).map(r => ({ value: r.type, label: `Só aplicar se reprovar em ${r.type}` }))]} /></div></label>{!dependencia && <label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Nota despertadora<div className="mt-1"><SearchableSelect value={notaDespertadora} onChange={(v) => setNotaDespertadora(v || "")} isClearable={false} options={[{ value: "", label: "Sem disparo por categoria" }, ...categoriasDisponiveis.map(c => ({ value: c, label: c }))]} /></div></label>}</div>
+        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="text-sm font-semibold text-gray-800 dark:text-white">2. Fórmula guiada</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monte a conta passo a passo, adicionando uma nota ou número e depois escolhendo a operação desejada. O sistema extrai automaticamente as categorias usadas na fórmula e calcula a nota final assim que todas as notas necessárias forem lançadas.</p><div className="mt-3 rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">{formula || "A fórmula aparecerá aqui conforme você adicionar notas, números e operações."}</div>{precisaValor ? <div className="mt-3 space-y-3"><div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Categoria da nota<div className="mt-1"><SearchableSelect value={draftCategoria} onChange={(v) => setDraftCategoria(v || "")} isClearable={false} options={[{ value: "", label: categoriasDisponiveis.length === 0 ? "Nenhuma categoria configurada para o escopo" : "Categoria da nota" }, ...categoriasDisponiveis.map(c => ({ value: c, label: c }))]} /></div></label><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Período<div className="mt-1"><SearchableSelect value={draftPeriodo} onChange={(v) => setDraftPeriodo(v || "")} isClearable={false} isDisabled={tipoSelecionado === "superior" || periodosFormula.length === 0} options={[{ value: "", label: tipoSelecionado === "superior" ? "Inferido pela matéria" : "Período" }, ...periodosFormula.map(p => ({ value: p, label: labelPeriodo(p) }))]} /></div></label><button type="button" onClick={addRef} disabled={!draftCategoria || (tipoSelecionado !== "superior" && !draftPeriodo)} className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-3 text-sm font-medium text-white disabled:opacity-50">Adicionar nota</button></div><div className="grid items-end gap-2 sm:grid-cols-[1fr_auto]"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Número constante<input type="number" min={0} step="0.01" value={draftConstante} onChange={(e) => setDraftConstante(e.target.value)} placeholder="Número constante" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><button type="button" onClick={addConstante} disabled={!draftConstante} className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Adicionar número</button></div></div> : <div className="mt-3 flex flex-wrap gap-2">{["+", "-", "*", "/"].map(op => <button type="button" key={op} onClick={() => setFormulaItems((prev) => [...prev, { kind: "op", op: op as "+" | "-" | "*" | "/" }])} className="h-10 w-10 rounded-lg bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{op}</button>)}</div>}<div className="mt-3 flex gap-2"><button type="button" onClick={() => setFormulaItems((prev) => prev.slice(0, -1))} className="text-sm font-medium text-gray-500 hover:text-gray-700">Desfazer último item</button><button type="button" onClick={() => setFormulaItems([])} className="text-sm font-medium text-red-500 hover:text-red-600">Limpar fórmula</button></div></div>
         <button type="submit" disabled={criando || !canSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{criando ? "A criar..." : "Criar regra"}</button>{(error || sucesso) && <p className={`text-sm ${sucesso ? "text-green-600" : "text-red-600"}`}>{sucesso || error}</p>}
       </form>
     </div>
```

#### Arquivo 7/13 — `src/app/(painel)/estudantes/PageContent.tsx`
12 selects de filtro (Género, Turno, Ano do Ensino Primário, Ano Médio, Ano Superior, Curso, Documentos, Vínculo de turma, Situação geral, Situação no Ensino Primário, Situação no Médio, Situação no Superior). Todos seguem o mesmo padrão simples.

```diff
diff --git a/src/app/(painel)/estudantes/PageContent.tsx b/src/app/(painel)/estudantes/PageContent.tsx
index 45954b3..d6c5b6c 100644
--- a/src/app/(painel)/estudantes/PageContent.tsx
+++ b/src/app/(painel)/estudantes/PageContent.tsx
@@ -174,10 +174,8 @@ function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, c
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Género</label>
-              <select value={filtros.genero} onChange={e => setFiltros({ ...filtros, genero: e.target.value })}
-                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                <option value="">Todos</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option>
-              </select>
+              <SearchableSelect value={filtros.genero} onChange={v => setFiltros({ ...filtros, genero: v || '' })} isClearable={false}
+                options={[{ value: '', label: 'Todos' }, { value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }]} />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Idade mínima</label>
@@ -193,10 +191,8 @@ function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, c
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turno</label>
-              <select value={filtros.turno} onChange={e => setFiltros({ ...filtros, turno: e.target.value })}
-                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                <option value="">Todos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option>
-              </select>
+              <SearchableSelect value={filtros.turno} onChange={v => setFiltros({ ...filtros, turno: v || '' })} isClearable={false}
+                options={[{ value: '', label: 'Todos' }, { value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' }]} />
             </div>
             {isAdmin && (
               <div>
@@ -209,31 +205,22 @@ function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, c
             {visibilidade.anoFundamental && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano do Ensino Primário e Iº Ciclo</label>
-                <select value={filtros.anoFundamental} onChange={e => setFiltros({ ...filtros, anoFundamental: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option>
-                  {ANOS_FUNDAMENTAL_LIST.map(ano => <option key={ano.value} value={ano.value}>{ano.label}</option>)}
-                </select>
+                <SearchableSelect value={filtros.anoFundamental} onChange={v => setFiltros({ ...filtros, anoFundamental: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, ...ANOS_FUNDAMENTAL_LIST]} />
               </div>
             )}
             {visibilidade.anoMedio && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano médio</label>
-                <select value={filtros.anoMedio} onChange={e => setFiltros({ ...filtros, anoMedio: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option>
-                  {ANOS_MEDIO_LIST.map(ano => <option key={ano.value} value={ano.value}>{ano.label}</option>)}
-                </select>
+                <SearchableSelect value={filtros.anoMedio} onChange={v => setFiltros({ ...filtros, anoMedio: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, ...ANOS_MEDIO_LIST]} />
               </div>
             )}
             {visibilidade.anoSuperior && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano superior</label>
-                <select value={filtros.anoSuperior} onChange={e => setFiltros({ ...filtros, anoSuperior: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option>
-                  {ANOS_SUPERIOR_LIST.map(ano => <option key={ano.value} value={ano.value}>{ano.label}</option>)}
-                </select>
+                <SearchableSelect value={filtros.anoSuperior} onChange={v => setFiltros({ ...filtros, anoSuperior: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, ...ANOS_SUPERIOR_LIST]} />
               </div>
             )}
             {visibilidade.semestreAtual && (
@@ -252,11 +239,8 @@ function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, c
                     placeholder="Código do curso. Para vários, separe por vírgula"
                     className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
                 ) : (
-                  <select value={filtros.cursoId} onChange={e => setFiltros({ ...filtros, cursoId: e.target.value })}
-                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                    <option value="">Todos</option>
-                    {cursosFiltrados.map(curso => <option key={curso.id} value={curso.id}>{curso.nome} ({curso.type === 'medio' ? 'Médio' : 'Superior'})</option>)}
-                  </select>
+                  <SearchableSelect value={filtros.cursoId} onChange={v => setFiltros({ ...filtros, cursoId: v || '' })} isClearable={false}
+                    options={[{ value: '', label: 'Todos' }, ...cursosFiltrados.map(curso => ({ value: curso.id, label: `${curso.nome} (${curso.type === 'medio' ? 'Médio' : 'Superior'})` }))]} />
                 )}
               </div>
             )}
@@ -268,52 +252,40 @@ function FiltrosPanel({ filtros, setFiltros, isAdmin, onAplicar, visibilidade, c
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Documentos</label>
-              <select value={filtros.statusDocumentos} onChange={e => setFiltros({ ...filtros, statusDocumentos: e.target.value })}
-                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                <option value="">Todos</option><option value="pendente_documentos">Pendentes</option>
-              </select>
+              <SearchableSelect value={filtros.statusDocumentos} onChange={v => setFiltros({ ...filtros, statusDocumentos: v || '' })} isClearable={false}
+                options={[{ value: '', label: 'Todos' }, { value: 'pendente_documentos', label: 'Pendentes' }]} />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vínculo de turma</label>
-              <select value={filtros.comTurma} onChange={e => setFiltros({ ...filtros, comTurma: e.target.value })}
-                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                <option value="">Todos</option><option value="true">Com turma</option><option value="false">Sem turma</option>
-              </select>
+              <SearchableSelect value={filtros.comTurma} onChange={v => setFiltros({ ...filtros, comTurma: v || '' })} isClearable={false}
+                options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Com turma' }, { value: 'false', label: 'Sem turma' }]} />
             </div>
             {isAdmin && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação geral</label>
-                <select value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option><option value="ativo">Ativo</option><option value="pendente_documentos">Pendência de documentos</option><option value="inativo">Inativo</option><option value="finalizado">Finalizado</option>
-                </select>
+                <SearchableSelect value={filtros.status} onChange={v => setFiltros({ ...filtros, status: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, { value: 'ativo', label: 'Ativo' }, { value: 'pendente_documentos', label: 'Pendência de documentos' }, { value: 'inativo', label: 'Inativo' }, { value: 'finalizado', label: 'Finalizado' }]} />
               </div>
             )}
             {visibilidade.statusFundamental && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no Ensino Primário e Iº Ciclo</label>
-                <select value={filtros.statusFundamental} onChange={e => setFiltros({ ...filtros, statusFundamental: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option><option value="inativo">Inativo</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option>
-                </select>
+                <SearchableSelect value={filtros.statusFundamental} onChange={v => setFiltros({ ...filtros, statusFundamental: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, { value: 'inativo', label: 'Inativo' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'finalizado', label: 'Finalizado' }]} />
               </div>
             )}
             {visibilidade.statusMedio && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no médio</label>
-                <select value={filtros.statusMedio} onChange={e => setFiltros({ ...filtros, statusMedio: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option><option value="inativo">Inativo</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option>
-                </select>
+                <SearchableSelect value={filtros.statusMedio} onChange={v => setFiltros({ ...filtros, statusMedio: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, { value: 'inativo', label: 'Inativo' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'finalizado', label: 'Finalizado' }]} />
               </div>
             )}
             {visibilidade.statusSuperior && (
               <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no superior</label>
-                <select value={filtros.statusSuperior} onChange={e => setFiltros({ ...filtros, statusSuperior: e.target.value })}
-                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
-                  <option value="">Todos</option><option value="inativo">Inativo</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option>
-                </select>
+                <SearchableSelect value={filtros.statusSuperior} onChange={v => setFiltros({ ...filtros, statusSuperior: v || '' })} isClearable={false}
+                  options={[{ value: '', label: 'Todos' }, { value: 'inativo', label: 'Inativo' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'finalizado', label: 'Finalizado' }]} />
               </div>
             )}
           </div>
```

#### Arquivo 8/13 — `src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx`
2 selects: `AnoLetivoSelector` (componente reutilizável) e o filtro de "Tipo de ensino". Ambos ficam numa barra `flex`, por isso envolvidos num `<div className="min-w-[160px]">`.

```diff
diff --git a/src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx b/src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx
index ff7d580..2d8c6da 100644
--- a/src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx
+++ b/src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx
@@ -9,6 +9,7 @@ import type {
 } from "@/types/api";
 import { Provincias } from "@/types/api";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 
 
 const ITEMS_POR_PAGINA = 50;
@@ -103,16 +104,14 @@ function AnoLetivoSelector({
     <div className="flex items-center gap-2">
       <Icon icon="mdi:calendar-school" width={16} className="text-gray-400 flex-shrink-0" />
       <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
-      <select
-        value={anoSelecionado}
-        onChange={e => onChange(e.target.value)}
-        className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
-      >
-        <option value="">Todos os anos</option>
-        {anosDisponiveis.map(al => (
-          <option key={al} value={al}>{al.replace("_", "/")}</option>
-        ))}
-      </select>
+      <div className="min-w-[160px]">
+        <SearchableSelect
+          value={anoSelecionado}
+          onChange={v => onChange(v || "")}
+          isClearable={false}
+          options={[{ value: "", label: "Todos os anos" }, ...anosDisponiveis.map(al => ({ value: al, label: al.replace("_", "/") }))]}
+        />
+      </div>
     </div>
   );
 }
@@ -310,14 +309,14 @@ function AcademiaDetalhe({
         {tiposEnsino.length > 1 && (
           <div className="flex items-center gap-2">
             <Icon icon="mdi:filter-outline" width={16} className="text-gray-400" />
-            <select
-              value={tipoSel}
-              onChange={e => setTipoSel(e.target.value as TipoEnsino | "")}
-              className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
-            >
-              <option value="">Todos os tipos</option>
-              {tiposEnsino.map(t => <option key={t} value={t}>{tipoLabel[t]}</option>)}
-            </select>
+            <div className="min-w-[160px]">
+              <SearchableSelect
+                value={tipoSel}
+                onChange={v => setTipoSel((v || "") as TipoEnsino | "")}
+                isClearable={false}
+                options={[{ value: "", label: "Todos os tipos" }, ...tiposEnsino.map(t => ({ value: t, label: tipoLabel[t] }))]}
+              />
+            </div>
           </div>
         )}
       </div>
```

#### Arquivo 9/13 — `src/components/faltas/FaltasAcademia.tsx`
Select de "Sumário de aula" dentro do modal de corrigir falta (`ModalCorrigirFalta`). Atenção: a opção vazia só existe condicionalmente (`{!falta.sumario_id && <option value="">...}`) — isso foi preservado exatamente, incluindo o texto que muda entre "Carregando sumários..." e "Nenhum sumário" conforme `loadingSumarios`.

```diff
diff --git a/src/components/faltas/FaltasAcademia.tsx b/src/components/faltas/FaltasAcademia.tsx
index 629bf0e..0296aa3 100644
--- a/src/components/faltas/FaltasAcademia.tsx
+++ b/src/components/faltas/FaltasAcademia.tsx
@@ -13,6 +13,7 @@ import Alert from "@/components/ui/alert/Alert";
 import Button from "@/components/ui/button/Button";
 import { Modal } from "@/components/ui/modal";
 import Label from "@/components/form/Label";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import Input from "@/components/form/input/InputField";
 import { useModal } from "@/hooks/useModal";
 import { Dropdown } from "primereact/dropdown";
@@ -315,7 +316,7 @@ function ModalCorrigirFalta({ falta, isOpen, onClose, onConfirm, onDesvincular }
         {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
         <div><Label>Quantidade (1–100) *</Label><Input type="number" min="1" max="100" value={quantidade} onChange={e => setQuantidade(e.target.value)} /></div>
         <div><Label>Observação</Label><Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" /></div>
-        <div><Label>Sumário de aula</Label><div className="flex gap-2"><select value={sumarioId} onChange={e => setSumarioId(e.target.value)} disabled={loadingSumarios || desvinculando} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white">{!falta.sumario_id && <option value="">{loadingSumarios ? "Carregando sumários..." : "Nenhum sumário"}</option>}{sumarios.map(sumario => <option key={sumario.id} value={sumario.id}>{sumario.sumario_titulo}</option>)}</select>{falta.sumario_id && <Button type="button" size="sm" variant="outline" onClick={handleDesvincular} disabled={desvinculando}>{desvinculando ? "Desvinculando..." : "Desvincular"}</Button>}</div></div>
+        <div><Label>Sumário de aula</Label><div className="flex gap-2"><div className="min-w-0 flex-1"><SearchableSelect value={sumarioId} onChange={v => setSumarioId(v || "")} isDisabled={loadingSumarios || desvinculando} isClearable={false} options={[...(!falta.sumario_id ? [{ value: "", label: loadingSumarios ? "Carregando sumários..." : "Nenhum sumário" }] : []), ...sumarios.map(sumario => ({ value: sumario.id, label: sumario.sumario_titulo }))]} /></div>{falta.sumario_id && <Button type="button" size="sm" variant="outline" onClick={handleDesvincular} disabled={desvinculando}>{desvinculando ? "Desvinculando..." : "Desvincular"}</Button>}</div></div>
         <div><Label>Motivo da correção *</Label><Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explique o motivo" /></div>
         <div className="flex gap-3 justify-end"><Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button><Button disabled={loading}>{loading ? "Corrigindo..." : "Corrigir"}</Button></div>
       </form>
```

#### Arquivo 10/13 — `src/components/paineis/CursosPainel.tsx`
Select "Modelo do curso" (Liceu/Técnico). Sem opção vazia no original.

```diff
diff --git a/src/components/paineis/CursosPainel.tsx b/src/components/paineis/CursosPainel.tsx
index 8cac746..802d2fd 100644
--- a/src/components/paineis/CursosPainel.tsx
+++ b/src/components/paineis/CursosPainel.tsx
@@ -5,6 +5,7 @@ import { formatApiError } from "@/lib/api/client";
 import type { Curso, MeuPerfilResponse } from "@/types/api";
 import Button from "@/components/ui/button/Button";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import Alert from "@/components/ui/alert/Alert";
 import Checkbox from "@/components/form/input/Checkbox";
 import { Modal } from "@/components/ui/modal";
@@ -305,14 +306,15 @@ export default function CursosPainel() {
             {!isSuperior && !editingCurso && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo do curso *</label>
-                <select
+                <SearchableSelect
                   value={formData.modelo}
-                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value as CursoFormData["modelo"] })}
-                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
-                >
-                  <option value="liceu">Liceu</option>
-                  <option value="tecnico">Técnico</option>
-                </select>
+                  onChange={(v) => setFormData({ ...formData, modelo: (v || "liceu") as CursoFormData["modelo"] })}
+                  isClearable={false}
+                  options={[
+                    { value: "liceu", label: "Liceu" },
+                    { value: "tecnico", label: "Técnico" },
+                  ]}
+                />
                 <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                   Esta escolha define automaticamente os anos do curso. Você não precisa informar códigos ou configurar anos manualmente.
                 </p>
```

#### Arquivo 11/13 — `src/components/paineis/MateriaPainel.tsx`
5 selects no formulário de matéria: Tipo, Curso, Período/semestre, Limite para conclusão da pendência (2 ocorrências em contextos diferentes do formulário).

```diff
diff --git a/src/components/paineis/MateriaPainel.tsx b/src/components/paineis/MateriaPainel.tsx
index 3cfef98..a0f0509 100644
--- a/src/components/paineis/MateriaPainel.tsx
+++ b/src/components/paineis/MateriaPainel.tsx
@@ -4,6 +4,7 @@ import { useApi, academiaService, tokenStorage } from "@/lib/api";
 import { formatApiError } from "@/lib/api/client";
 import { AnoFundamental, AnoMedio, AnoSuperior, CriarMateriaRequest, Materia, MateriaType } from "@/types/api";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import Alert from "@/components/ui/alert/Alert";
 import Button from "@/components/ui/button/Button";
 import Checkbox from "@/components/form/input/Checkbox";
@@ -617,19 +618,28 @@ export default function MateriaPainel() {
                 {!editingMateria && isAcademiaMista() && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
-                    <select value={formData.type} onChange={e => handleTypeChange(e.target.value as MateriaType)} disabled={isTipoDisabled()} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50">
-                      <option value="fundamental">Ensino Primário e Iº Ciclo</option><option value="medio">Médio</option>
-                    </select>
+                    <SearchableSelect
+                      value={formData.type}
+                      onChange={(v) => handleTypeChange((v || "fundamental") as MateriaType)}
+                      isDisabled={isTipoDisabled()}
+                      isClearable={false}
+                      options={[
+                        { value: "fundamental", label: "Ensino Primário e Iº Ciclo" },
+                        { value: "medio", label: "Médio" },
+                      ]}
+                    />
                   </div>
                 )}
                 {formData.type === "superior" && <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"><p className="text-xs text-amber-700 dark:text-amber-300">⚠️ Matérias superiores exigem o período no cadastro; ele deve pertencer aos períodos do curso e não é editado depois.</p></div>}
                 {formData.type !== "fundamental" && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso *</label>
-                    <select value={formData.curso_id ?? ""} onChange={e => setFormData({ ...formData, curso_id: e.target.value || undefined, anos_academicos: [], periodo: undefined, pendencia_nivel_conclusao: undefined })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
-                      <option value="">Selecione um curso</option>
-                      {getCursosByType().map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
-                    </select>
+                    <SearchableSelect
+                      value={formData.curso_id ?? ""}
+                      onChange={(v) => setFormData({ ...formData, curso_id: v || undefined, anos_academicos: [], periodo: undefined, pendencia_nivel_conclusao: undefined })}
+                      isClearable={false}
+                      options={[{ value: "", label: "Selecione um curso" }, ...getCursosByType().map(c => ({ value: c.id, label: c.nome }))]}
+                    />
                   </div>
                 )}
                 <div>
@@ -650,10 +660,12 @@ export default function MateriaPainel() {
                 {!editingMateria && formData.type === "superior" && formData.curso_id && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período/semestre *</label>
-                    <select value={formData.periodo ?? ""} onChange={e => setFormData({ ...formData, periodo: e.target.value || undefined })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
-                      <option value="">Selecione o período</option>
-                      {getPeriodosDisponiveis().map(p => <option key={p} value={p}>{formatarPeriodoLabel(p)}</option>)}
-                    </select>
+                    <SearchableSelect
+                      value={formData.periodo ?? ""}
+                      onChange={(v) => setFormData({ ...formData, periodo: v || undefined })}
+                      isClearable={false}
+                      options={[{ value: "", label: "Selecione o período" }, ...getPeriodosDisponiveis().map(p => ({ value: p, label: formatarPeriodoLabel(p) }))]}
+                    />
                   </div>
                 )}
                 {!editingMateria && formData.type === "superior" && formData.curso_id && (
@@ -664,10 +676,14 @@ export default function MateriaPainel() {
                     </label>
                     {formData.pendencia_permitida && (
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limite para conclusão da pendência
-                        <select value={formData.pendencia_nivel_conclusao ?? ""} onChange={e => setFormData({ ...formData, pendencia_nivel_conclusao: e.target.value || undefined })} className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
-                          <option value="">Sem limite explícito</option>
-                          {getPendenciaNiveisDisponiveis().map(n => <option key={n} value={n}>{n.includes("semestre") ? formatarPeriodoLabel(n) : formatarSecaoLabel(n)}</option>)}
-                        </select>
+                        <div className="mt-1">
+                          <SearchableSelect
+                            value={formData.pendencia_nivel_conclusao ?? ""}
+                            onChange={(v) => setFormData({ ...formData, pendencia_nivel_conclusao: v || undefined })}
+                            isClearable={false}
+                            options={[{ value: "", label: "Sem limite explícito" }, ...getPendenciaNiveisDisponiveis().map(n => ({ value: n, label: n.includes("semestre") ? formatarPeriodoLabel(n) : formatarSecaoLabel(n) }))]}
+                          />
+                        </div>
                       </label>
                     )}
                   </div>
@@ -681,10 +697,14 @@ export default function MateriaPainel() {
                 </label>
                 {formData.pendencia_permitida && (
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Até qual semestre
-                    <select value={formData.pendencia_nivel_conclusao ?? ""} onChange={e => setFormData({ ...formData, pendencia_nivel_conclusao: e.target.value || undefined })} className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
-                      <option value="">Sem limite definido</option>
-                      {getPendenciaNiveisDisponiveis().map(n => <option key={n} value={n}>{formatarPeriodoLabel(n)}</option>)}
-                    </select>
+                    <div className="mt-1">
+                      <SearchableSelect
+                        value={formData.pendencia_nivel_conclusao ?? ""}
+                        onChange={(v) => setFormData({ ...formData, pendencia_nivel_conclusao: v || undefined })}
+                        isClearable={false}
+                        options={[{ value: "", label: "Sem limite definido" }, ...getPendenciaNiveisDisponiveis().map(n => ({ value: n, label: formatarPeriodoLabel(n) }))]}
+                      />
+                    </div>
                   </label>
                 )}
               </div>
```

#### Arquivo 12/13 — `src/components/paineis/SumarioPainel.tsx`
3 selects no formulário de sumário: Matéria, Período, Ano académico.

```diff
diff --git a/src/components/paineis/SumarioPainel.tsx b/src/components/paineis/SumarioPainel.tsx
index 3c49c4a..68ff6aa 100644
--- a/src/components/paineis/SumarioPainel.tsx
+++ b/src/components/paineis/SumarioPainel.tsx
@@ -8,6 +8,7 @@ import { getCookie } from "@/lib/utils/cookies";
 import Alert from "@/components/ui/alert/Alert";
 import Button from "@/components/ui/button/Button";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import { Modal } from "@/components/ui/modal";
 
 const PERIODOS_ESCOLARES: { value: Periodo; label: string }[] = [
@@ -136,9 +137,9 @@ export default function SumarioPainel() {
           <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label><input value={form.sumario_titulo} onChange={e => setForm({ ...form, sumario_titulo: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Ex: Equações do 1º grau" /></div>
           <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label><textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={3} placeholder="Opcional" /></div>
           {!editing && <>
-            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matéria *</label><select value={form.materia_id} onChange={e => selecionarMateria(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Selecione uma matéria</option>{materias.filter(m => m.status === "ativo").map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
-            {materiaSelecionada && <><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Período *</label>{materiaSelecionada.type === "superior" ? <input readOnly value={formatarPeriodo(materiaSelecionada.periodo ?? "")} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" /> : <select value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Selecione o período</option>{PERIODOS_ESCOLARES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>}</div>
-            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Ano académico *</label><select value={form.ano_academico} onChange={e => setForm({ ...form, ano_academico: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Selecione o ano</option>{(materiaSelecionada.anos_academicos ?? []).map(ano => <option key={ano} value={ano}>{formatarAno(ano)}</option>)}</select></div></>}
+            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matéria *</label><SearchableSelect value={form.materia_id} onChange={v => selecionarMateria(v || "")} isClearable={false} options={[{ value: "", label: "Selecione uma matéria" }, ...materias.filter(m => m.status === "ativo").map(m => ({ value: m.id, label: m.nome }))]} /></div>
+            {materiaSelecionada && <><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Período *</label>{materiaSelecionada.type === "superior" ? <input readOnly value={formatarPeriodo(materiaSelecionada.periodo ?? "")} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" /> : <SearchableSelect value={form.periodo} onChange={v => setForm({ ...form, periodo: v || "" })} isClearable={false} options={[{ value: "", label: "Selecione o período" }, ...PERIODOS_ESCOLARES]} />}</div>
+            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Ano académico *</label><SearchableSelect value={form.ano_academico} onChange={v => setForm({ ...form, ano_academico: v || "" })} isClearable={false} options={[{ value: "", label: "Selecione o ano" }, ...(materiaSelecionada.anos_academicos ?? []).map(ano => ({ value: ano, label: formatarAno(ano) }))]} /></div></>}
           </>}
           {editing && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">Matéria, período e ano académico não podem ser alterados. Para mudá-los, delete este sumário e crie outro.</p>}
           <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancelar</Button><Button disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar sumário"}</Button></div>
```

#### Arquivo 13/13 — `src/components/paineis/TurmasPainel.tsx`
3 selects no formulário de turma: Nível de ensino, Curso, Nível/Ano.

```diff
diff --git a/src/components/paineis/TurmasPainel.tsx b/src/components/paineis/TurmasPainel.tsx
index a1e1014..ca78191 100644
--- a/src/components/paineis/TurmasPainel.tsx
+++ b/src/components/paineis/TurmasPainel.tsx
@@ -5,6 +5,7 @@ import { formatApiError } from "@/lib/api/client";
 import type { Curso, MeuPerfilResponse, Turma, EstudanteDetalhado } from "@/types/api";
 import Button from "@/components/ui/button/Button";
 import Icon from "@/components/ui/Icon";
+import SearchableSelect from "@/components/form/SearchableSelect";
 import Alert from "@/components/ui/alert/Alert";
 import Checkbox from "@/components/form/input/Checkbox";
 import { Modal } from "@/components/ui/modal";
@@ -566,27 +567,39 @@ export default function TurmasPainel() {
         {isMisto && (
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível de ensino *</label>
-            <select value={formTipo} onChange={e => { const tipo = e.target.value as "fundamental" | "curso"; setFormTipo(tipo); setFormData({ ...formData, curso_id: undefined, nivel: "" }); }} disabled={!!editingTurma} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50">
-              <option value="fundamental">Ensino Primário e Iº Ciclo</option>
-              <option value="curso">Ensino Médio</option>
-            </select>
+            <SearchableSelect
+              value={formTipo}
+              onChange={v => { const tipo = (v || "fundamental") as "fundamental" | "curso"; setFormTipo(tipo); setFormData({ ...formData, curso_id: undefined, nivel: "" }); }}
+              isDisabled={!!editingTurma}
+              isClearable={false}
+              options={[
+                { value: "fundamental", label: "Ensino Primário e Iº Ciclo" },
+                { value: "curso", label: "Ensino Médio" },
+              ]}
+            />
           </div>
         )}
         {turmaUsaCurso && (
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso *</label>
-            <select value={formData.curso_id ?? ""} onChange={e => setFormData({ ...formData, curso_id: e.target.value || undefined, nivel: "" })} disabled={!!editingTurma} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50">
-              <option value="">Selecione um curso</option>
-              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
-            </select>
+            <SearchableSelect
+              value={formData.curso_id ?? ""}
+              onChange={v => setFormData({ ...formData, curso_id: v || undefined, nivel: "" })}
+              isDisabled={!!editingTurma}
+              isClearable={false}
+              options={[{ value: "", label: "Selecione um curso" }, ...cursos.map(c => ({ value: c.id, label: c.nome }))]}
+            />
           </div>
         )}
         <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível / Ano *</label>
-          <select value={formData.nivel} onChange={e => setFormData({ ...formData, nivel: e.target.value })} disabled={turmaUsaCurso && !formData.curso_id} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50">
-            <option value="">Selecione o ano</option>
-            {getNivelOptions(formData.curso_id).map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
-          </select>
+          <SearchableSelect
+            value={formData.nivel}
+            onChange={v => setFormData({ ...formData, nivel: v || "" })}
+            isDisabled={turmaUsaCurso && !formData.curso_id}
+            isClearable={false}
+            options={[{ value: "", label: "Selecione o ano" }, ...getNivelOptions(formData.curso_id).map(a => ({ value: a.value, label: a.label }))]}
+          />
         </div>
         <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turno *</label>
```

---

## 3. Validação já feita neste documento (metodologia)

Antes de escrever este documento, todas as mudanças acima foram aplicadas e testadas num clone isolado do repositório:

- `npm install` (803 pacotes, sem erros).
- `npx tsc --noEmit` rodado depois de **cada** arquivo alterado — sempre 0 erros, do início ao fim (não só no final).
- `npx eslint` nos arquivos alterados — 0 erros.
- Para a Parte 1: escrito e executado um script Node isolado que chama diretamente `gerarModeloExcelFaltas` + `analisarPlanilhaFaltas` (as mesmas funções usadas pela tela) para gerar um `.xlsx` com um sumário escolhido, reler esse arquivo do zero simulando o upload, e confirmar que `sumario_id`/`sumario_titulo` sobrevivem ao ciclo completo — testado com sumário escolhido e sem sumário escolhido, os dois passaram.
- `npm run build` (Next.js/Turbopack) foi tentado mas **falhou por bloqueio de rede do ambiente de teste para `fonts.googleapis.com`** (usado por `next/font/google` em `layout.tsx`, arquivo não relacionado a nenhuma destas mudanças) — não relacionado ao código alterado. Rode `npm run build` no ambiente real como parte do checklist abaixo para confirmar.

## 4. Checklist final que o Codex deve rodar depois de aplicar todos os diffs

1. `npm install` (caso o lockfile não tenha mudado, pode pular).
2. `npx tsc --noEmit -p tsconfig.json` → precisa dar 0 erros.
3. `npx eslint <lista dos 19 arquivos alterados>` → precisa dar 0 erros.
4. `npm run build` → precisa compilar com sucesso.
5. Rodar `grep -rn "<select" src --include="*.tsx"` — o resultado esperado é **apenas**:
   - `src/components/paineis/FinanceiroPagamentosPainel.tsx` (comentário, não é JSX real)
   - `src/components/paineis/financeiroShared.tsx` (comentário, não é JSX real)
   - `src/components/form/group-input/PhoneInput.tsx` (excluído, ver Seção 5)
   - `src/app/(painel)/testes/PageContent.tsx` (excluído, ver Seção 5)

   Se aparecer qualquer `<select` fora dessa lista, algum arquivo não foi convertido — revisar.
6. Testar manualmente a Parte 1 seguindo os passos da Seção 1.5.
7. Dar uma passada visual rápida em cada tela alterada da Parte 2 (a lista de 13 arquivos da Seção 2.3) para confirmar que os selects renderizam, abrem, filtram por digitação e submetem o valor certo — o `SearchableSelect` já é usado em produção em outras telas do mesmo app, então o visual/comportamento deve ser consistente com o que já existe (ex.: os selects de `SelecaoContextoFaltas.tsx`).

## 5. Perguntas em aberto (não travam a execução, mas precisam de uma decisão de @fredypdp depois)

1. **`src/components/form/group-input/PhoneInput.tsx`** (e `InputGroup.tsx`, que é quem o usa) tem 2 selects nativos, mas nenhum dos dois arquivos é importado por nenhuma rota real do app — são sobra do template original (TailAdmin) usado como base do projeto. Não convertidos nesta tarefa. Se preferir, posso apagar os dois arquivos como faxina, ou convertê-los mesmo estando sem uso — mas não faz sentido gastar esforço num componente de telefone com bandeira de país que ninguém usa sem antes confirmar isso.
2. **`src/app/(painel)/testes/PageContent.tsx`** é uma página de QA interna (tema escuro, ferramenta de debug) com 2691 linhas, que usa um helper local `Sel` (por volta da linha 2020) reaproveitado dezenas de vezes ao longo do arquivo com `<option>` cru como filhos. Convertê-lo exigiria reescrever individualmente cada uma dessas chamadas (não é uma troca mecânica de um componente só). Dado que é uma ferramenta interna de debug e não a interface de produção usada pela academia, sugiro tratar isso como uma tarefa separada e deliberada (com foco e tempo próprios) em vez de incluir de forma apressada dentro deste refactor. Avise se quiser que eu prepare essa tarefa à parte.
