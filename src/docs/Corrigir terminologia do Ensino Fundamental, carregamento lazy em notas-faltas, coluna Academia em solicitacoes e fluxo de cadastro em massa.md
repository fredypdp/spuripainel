---
criado: 2026-08-16 00:00
origem: solicitação do usuário
status: feito
---

# Corrigir terminologia do Ensino Fundamental, carregamento lazy em `/notas`/`/faltas`, coluna "Academia" em `/solicitacoes` e fluxo de cadastro em massa de estudantes (feito)

> Documento preparado pelo Claude (orquestrador) após investigação completa e **já validada** do
> repositório `spuripainel` (frontend Next.js). Todas as mudanças abaixo já foram aplicadas,
> testadas e confirmadas num clone local: `npx tsc --noEmit` **sem erros** e `npx eslint` **sem
> erros nem warnings** nos 20 arquivos alterados. `npm run build` só falha por uma restrição de
> rede do sandbox de investigação (bloqueio a `fonts.googleapis.com`, usado pelo `next/font`) —
> isso é **completamente independente** do código e não deve acontecer no ambiente do Codex.
>
> **As decisões de design já foram tomadas — não é necessário (nem desejável) reinterpretar o
> problema.** Para cada arquivo, aplique exatamente o bloco "Antes" → "Depois" indicado usando
> substituição de texto exata (o texto "Antes" é único no arquivo, conferido um a um). Não
> mexa em nenhum outro trecho desses arquivos além do indicado.

## Prompt recomendado para executar a atualização

No repositório `spuripainel`, aplique as substituições de texto exatas listadas nas Seções 1 a
4 deste documento, arquivo por arquivo. Todas as mudanças são de **texto de exibição** (strings
visíveis ao usuário) ou de pequenos ajustes de lógica de carregamento/composição de tela — nenhum
tipo, contrato de API, campo de banco de dados ou nome de variável interna (`n_ano_fundamental`,
`ano_escolar_fundamental`, `nivel_escolar`, etc.) é alterado. Depois de aplicar todas as
substituições, rode `npx tsc --noEmit` e `npx eslint .` (ou os scripts equivalentes do projeto)
e confirme que não há nenhum erro novo. Em seguida, rode `npm run build`; se ele falhar
especificamente por não conseguir buscar a fonte `Outfit` em `fonts.googleapis.com`, isso é uma
restrição de rede do ambiente e não um erro de código — ignore esse erro específico, mas trate
qualquer outro erro de build como bloqueante. Ao final, delete o arquivo
`src/docs/Tarefa para o Codex — Correções em notas, faltas e terminologia Ensino Fundamental.md`
(Seção 6 explica o porquê) e siga o "Procedimento de conclusão" no final deste documento.

---

## Contexto

### Por que esta terminologia

O backend (`spuri-backend`) já implementou, na tarefa concluída
`docs/Tarefas feitas/36 - Adaptar terminologia do Ensino Fundamental para Angola.md`, uma
tradução do termo genérico brasileiro "Ensino Fundamental" para a terminologia real usada em
Angola, através de `internal/utils/terminologia_angola.go`. As três regras (confirmadas lendo o
código-fonte do backend) são:

1. **Citação genérica** ao nível fundamental (sem apontar um ano específico) → **"Ensino
   Primário e Iº Ciclo"**.
2. **Citação a um ano específico** (ex.: `5_ano_fundamental`) → **"5ª Classe"** (padrão geral:
   `"{número}ª Classe"`).
3. **Citação a um contexto misto** (escola/academia que abrange do fundamental ao médio) →
   **"Ensino Primário ao Médio"**.
4. Valores técnicos usados como *valor* de um campo (nunca aparecem soltos numa frase para o
   usuário) permanecem inalterados: `n_ano_fundamental`, `nivel_escolar`, `status_escolar_*`, etc.

O frontend já implementava a Regra 2 corretamente na maior parte dos lugares (funções
`labelNivel`/`getAnoLabel` já retornavam `"Nª Classe"`), mas ainda tinha muitos resquícios da
terminologia antiga para a Regra 1 (citação genérica), normalmente como `"Ensino Fundamental
(1ª-9ª Classe)"` ou simplesmente `"Fundamental"`. Este documento troca **todos** esses resquícios
pela Regra 1 oficial, e um caso de Regra 3 (`Details.tsx`, ver Seção 1.9).

**Nenhuma lógica de código muda por causa da terminologia** — `n_ano_fundamental`,
`ano_escolar_fundamental`, `nivel_escolar === 'fundamental'`, nomes de variáveis e chaves de
`Record<...>` continuam exatamente como estão. Só o texto que aparece na tela muda.

### Decisões de design tomadas (para o Codex não precisar decidir nada)

- **Sem módulo de terminologia compartilhado.** O código já duplica esta lógica de tradução em
  ~7 arquivos independentes (cada `labelNivel`/`getAnoLabel` local). Isso é proposital — por
  exemplo, `massaHelpers.ts` já tem o comentário "Mantido isolado do fluxo de cadastro singular
  para evitar acoplamento entre os dois". Este documento segue o mesmo padrão: cada arquivo
  recebe a string oficial diretamente, sem criar um novo arquivo de constantes compartilhado
  entre páginas não relacionadas.
- **Sufixo compacto "(Fund.)" → "(Primário)".** Em `AvaliacoesFinaisAcademia.tsx` e
  `AvaliacoesFinaisAdmin.tsx` existe um sufixo curto ao lado de um rótulo já resolvido (ex.: "1ª
  Classe (Fund.)"), no mesmo padrão de "(Médio)"/"(Sup.)". Como o rótulo oficial completo
  ("Ensino Primário e Iº Ciclo") não cabe nesse espaço, uso **"(Primário)"** — mantém o padrão
  visual dos irmãos "(Médio)"/"(Sup.)" sem repetir a palavra "Fundamental".
- **Filtro "Ano do Ensino Primário e Iº Ciclo" em vez de abreviar.** Em `/estudantes`, os rótulos
  de filtro ficam mais longos que os irmãos "Ano médio"/"Ano superior", mas uso o termo oficial
  por extenso — não inventei uma abreviação não autorizada pelo termo oficial do backend.
  `<label>` é `block`, portanto pode ocupar duas linhas sem quebrar o layout.
- **Verificação visual pendente na landing page.** Em `TrilhaAnimation.tsx`, o rótulo "Ensino
  Primário e Iº Ciclo" (26 caracteres) é bem mais longo que "Ensino Fundamental" (18) e os
  vizinhos "Universidade"/"Licenciatura" (~12). O texto está correto e o `<text>` do SVG não
  trunca automaticamente. **Depois de aplicar a mudança, verifique visualmente a landing page em
  mobile e desktop** para confirmar que o rótulo não se sobrepõe aos vizinhos; se sobrepuser,
  reduza especificamente o `fontSize` deste ponto (não mude o texto).

### O bug real por trás do problema relatado (item 4.1)

Ao investigar por que a tela "3. Revisão e confirmação" mostrava
`"Ensino Fundamental (1ª-9ª Classe) — 1_ano_fundamental — Turma T1C28"`, confirmei a causa raiz
lendo o código-fonte: a aba oculta `_meta` do Excel (gerada em `massaTemplate.ts`) **nunca
gravava o rótulo humano do ano acadêmico** (`ano_academico_label`), nem o nome da academia, nem
o rótulo da turma — só os códigos técnicos. Ao reenviar a planilha preenchida, `massaParser.ts`
reconstrói o "contexto" da tela de revisão **lendo essa mesma aba `_meta`**, e como o rótulo
nunca foi gravado, o código caía no valor técnico bruto (`mapa.ano_academico`) como se fosse o
rótulo. A composição do texto na tela (`labelNivel(contexto.nivel) + ... + contexto.anoAcademicoLabel
+ ... + Turma ${contexto.turmaLabel ?? contexto.codigoTurma}`) sempre esteve correta — o problema
inteiro era um dado ausente na aba `_meta`. A correção (Seções 4.5/4.8) grava os três rótulos
que faltavam nessa aba oculta e ajusta o parser para lê-los, com um `fallback` que recalcula o
rótulo do ano mesmo em arquivos baixados antes desta correção (retrocompatibilidade).

### Achado extra durante a auditoria de regras de negócio (item 4.4)

Comparando `massaParser.ts` com as regras reais do backend (`internal/utils/validation.go`),
encontrei uma divergência real: o regex de e-mail do frontend
(`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) é **mais permissivo** que o do backend
(`emailRegexV = ^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`). Além disso, o backend tem
uma segunda checagem (`sqlCharsRegex`) que **rejeita qualquer e-mail contendo apóstrofo (`'`),
ponto e vírgula (`;`) ou hífen (`-`)**, mesmo que o formato já esteja correto — é uma
particularidade real do backend (`ValidateEmail` em `internal/utils/validation.go`), não um erro
de leitura minha. Sem esta correção, um e-mail como `"joao-silva@exemplo.com"` passaria como
"Todos validados" na tela de revisão e só falharia silenciosamente depois, durante o
processamento assíncrono do lote — muito mais difícil de diagnosticar para a academia. A Seção
4.6 replica as duas checagens no frontend. As demais regras auditadas (telefone, BI, exigência de
telefone do encarregado para escolar/telefone do estudante para superior, exceção da Cédula na
1ª Classe) já estavam corretas e **não** foram alteradas — não invente nenhuma mudança adicional
nelas.

---

## Resumo executivo

| # | Área | Arquivos | O que muda |
|---|------|----------|------------|
| 1.1 | Terminologia — `/` | `TrilhaAnimation.tsx` | "Ensino Fundamental" → "Ensino Primário e Iº Ciclo" (5 ocorrências) |
| 1.2 | Terminologia — `/notas`, `/faltas` | `NotasAcademia.tsx`, `NotasAdmin.tsx`, `NotasEstudante.tsx`, `FaltasAcademia.tsx`, `FaltasAdmin.tsx` | Títulos, cabeçalhos, breadcrumbs e mensagens vazias; correção de bug em `labelAnoAcademico` |
| 1.3 | Terminologia — `/avaliacoes/avaliacoes-finais` | `AvaliacoesFinaisAcademia.tsx`, `AvaliacoesFinaisAdmin.tsx`, `AvaliacoesFinaisEstudante.tsx` | Idem + sufixo "(Fund.)" → "(Primário)" |
| 1.4 | Terminologia — `/estudantes` | `PageContent.tsx` | Filtros, título de seção, rótulo de contexto do estudante |
| 1.5 | Terminologia — `/configuracoes/anos-academicos` | `AcademiaSection.tsx` | Mensagens de erro e texto de ajuda |
| 1.6 | Terminologia — `/perfil` | `Details.tsx` | Badges de status + uso da Regra 3 (misto) |
| 1.7 | Terminologia — `/solicitacoes` | `PageContent.tsx` | Rótulo do dropdown "Tipo de ensino" |
| 1.8 | Terminologia — `/estudantes/cadastrar` | `massaHelpers.ts`, `CadastroSingularForm.tsx` | `labelNivel` genérico + texto da regra da Cédula |
| 2 | Carregamento lazy | `NotasAcademia.tsx`, `NotasAdmin.tsx`, `FaltasAcademia.tsx`, `FaltasAdmin.tsx` | Remove fetch de todos os estudantes da academia na montagem; passa a ser sob demanda |
| 3 | Coluna "Academia" | `solicitacoes/PageContent.tsx` | Some da visão de academia, mantém para admin/estudante |
| 4.1/4.5/4.8 | Bug do "1_ano_fundamental" na revisão | `massaTemplate.ts`, `massaParser.ts`, `massaErrorExport.ts` | Aba `_meta` passa a gravar rótulos; parser lê com fallback |
| 4.2 | Nome dos arquivos-modelo | `massaTemplate.ts` | `modelo-cadastro-estudantes[-turma].xlsx` |
| 4.3 | "Nível" → "Turma" nas instruções | `massaTemplate.ts` | Condicional por `modoCadastro` |
| 4.4/4.6 | Auditoria de regras de negócio | `massaParser.ts` | Regex de e-mail alinhado ao backend |
| 4.7 | Aviso de tempo de processamento | `RelatorioValidacaoMassa.tsx`, `BatchProgressScreen.tsx` | Texto explícito "alguns minutos" |
| 4.9 | Texto do botão de erro | `RelatorioValidacaoMassa.tsx` | "Baixar apenas as linhas com erro" → "Baixar planilha apenas com os estudantes com erros" |

Total: **20 arquivos**, 118 linhas adicionadas / 76 removidas (`git diff --stat`). Nenhum arquivo
novo é criado, nenhum arquivo de código é removido (ver Seção 6 para o único arquivo de
**documentação** a remover).

---

## Seção 1 — Terminologia do Ensino Fundamental

Aplique as substituições abaixo exatamente como escritas. Em cada bloco, "Antes" é único no
arquivo (já conferido) — se ao aplicar você notar mais de uma ocorrência idêntica, pare e
avise, não adivinhe qual delas trocar.

### 1.1 `src/components/landing/TrilhaAnimation.tsx`

```diff
 const HORIZONTAL_WAYPOINTS: Point[] = [
   { x: 60, y: 140, label: "Matrícula" },
-  { x: 230, y: 60, label: "Ensino Fundamental" },
+  { x: 230, y: 60, label: "Ensino Primário e Iº Ciclo" },
   { x: 400, y: 140, label: "Ensino Médio" },
```

```diff
 const VERTICAL_WAYPOINTS: Point[] = [
   { x: 70, y: 70, label: "Matrícula" },
-  { x: 250, y: 190, label: "Ensino Fundamental" },
+  { x: 250, y: 190, label: "Ensino Primário e Iº Ciclo" },
   { x: 70, y: 310, label: "Ensino Médio" },
```

```diff
-      aria-label="Trilha do estudante: Matrícula, Ensino Fundamental, Ensino Médio, Universidade e Licenciatura, todos acompanhados na mesma plataforma"
+      aria-label="Trilha do estudante: Matrícula, Ensino Primário e Iº Ciclo, Ensino Médio, Universidade e Licenciatura, todos acompanhados na mesma plataforma"
```

```diff
       <p className="sr-only">
-        Percurso acompanhado pelo Spuri: Matrícula, Ensino Fundamental, Ensino Médio,
+        Percurso acompanhado pelo Spuri: Matrícula, Ensino Primário e Iº Ciclo, Ensino Médio,
         Universidade e Licenciatura.
       </p>
```

> ⚠️ Depois de aplicar, verifique visualmente a landing page (mobile e desktop) — ver "Decisões
> de design" acima. Não altere o texto se o layout quebrar; ajuste apenas o `fontSize` deste
> ponto específico, se necessário.

### 1.2 `src/components/notas/NotasAcademia.tsx`

```diff
 function labelAnoAcademico(ano: string) {
   const [numero, , nivel] = ano.split("_");
-  return `${numero}.º ${nivel === "fundamental" ? "Fundamental" : nivel === "medio" ? "Médio" : "Superior"}`;
+  if (nivel === "fundamental") return `${numero}ª Classe`;
+  return `${numero}.º ${nivel === "medio" ? "Médio" : "Superior"}`;
 }
```
*(Bug real: esta função gerava "5.º Fundamental" em vez de "5ª Classe" — usada em "Categorias
filtradas para {labelAnoAcademico(anoSelecionado)}.". Corrigido para seguir a Regra 2, igual às
outras funções `labelNivel` do mesmo arquivo.)*

```diff
-          <CardBtn icon="mdi:school"         title="Ensino Fundamental (1ª-9ª Classe)" subtitle="1ª a 9ª Classe"  onClick={() => setLayer({ mode: "fund", type: "anos" })} />
+          <CardBtn icon="mdi:school"         title="Ensino Primário e Iº Ciclo" subtitle="1ª a 9ª Classe"  onClick={() => setLayer({ mode: "fund", type: "anos" })} />
```

```diff
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
-          {anoLetivoSelecionado ? "Anos Académicos — Ensino Fundamental" : "Anos Letivos — Ensino Fundamental"}
+          {anoLetivoSelecionado ? "Anos Académicos — Ensino Primário e Iº Ciclo" : "Anos Letivos — Ensino Primário e Iº Ciclo"}
         </h2>
```

```diff
-                <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
+                <p className="text-sm">Nenhum nível do Ensino Primário e Iº Ciclo configurado nesta academia.</p>
```

```diff
-      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
+      const anosCrumb = { label: isMisto ? "Ensino Primário e Iº Ciclo" : "Anos", onClick: goAnos };
```

### 1.2 `src/components/notas/NotasAdmin.tsx`

```diff
-          <CardBtn icon="mdi:school"         title="Ensino Fundamental (1ª-9ª Classe)" subtitle="1ª a 9ª Classe"   onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
+          <CardBtn icon="mdi:school"         title="Ensino Primário e Iº Ciclo" subtitle="1ª a 9ª Classe"   onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
```

```diff
-          {anoLetivoSelecionado ? "Anos Académicos — Ensino Fundamental" : "Anos Letivos — Ensino Fundamental"}
+          {anoLetivoSelecionado ? "Anos Académicos — Ensino Primário e Iº Ciclo" : "Anos Letivos — Ensino Primário e Iº Ciclo"}
```

```diff
-                  <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
+                  <p className="text-sm">Nenhum nível do Ensino Primário e Iº Ciclo configurado nesta academia.</p>
```

```diff
-      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
+      const anosCrumb = { label: isMisto ? "Ensino Primário e Iº Ciclo" : "Anos", onClick: goAnos };
```

*(A remoção de `fetchEstudantes` neste mesmo bloco está descrita na Seção 2 — trate os dois
ajustes juntos ao editar este arquivo.)*

### 1.2 `src/components/notas/NotasEstudante.tsx`

```diff
-          <CardBtn icon="mdi:school" title="Ensino Fundamental (1ª-9ª Classe)" subtitle="Selecione a classe" onClick={() => navegar({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: "fundamental" })} />
+          <CardBtn icon="mdi:school" title="Ensino Primário e Iº Ciclo" subtitle="Selecione a classe" onClick={() => navegar({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: "fundamental" })} />
```

### 1.2 `src/components/faltas/FaltasAcademia.tsx`

```diff
-      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
+      const anosCrumb = { label: isMisto ? "Ensino Primário e Iº Ciclo" : "Anos", onClick: goAnos };
```

```diff
-            <CardBtn icon="mdi:school"         title="Ensino Fundamental (1ª-9ª Classe)" subtitle="1ª a 9ª Classe"  onClick={() => setLayer({ mode: "fund", type: "anos" })} />
+            <CardBtn icon="mdi:school"         title="Ensino Primário e Iº Ciclo" subtitle="1ª a 9ª Classe"  onClick={() => setLayer({ mode: "fund", type: "anos" })} />
```

```diff
-          {anoLetivoSelecionado ? "Anos Académicos — Ensino Fundamental" : "Anos Letivos — Ensino Fundamental"}
+          {anoLetivoSelecionado ? "Anos Académicos — Ensino Primário e Iº Ciclo" : "Anos Letivos — Ensino Primário e Iº Ciclo"}
```

```diff
-                <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
+                <p className="text-sm">Nenhum nível do Ensino Primário e Iº Ciclo configurado nesta academia.</p>
```

### 1.2 `src/components/faltas/FaltasAdmin.tsx`

```diff
-      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
+      const anosCrumb = { label: isMisto ? "Ensino Primário e Iº Ciclo" : "Anos", onClick: goAnos };
```

```diff
-          <CardBtn icon="mdi:school"         title="Ensino Fundamental (1ª-9ª Classe)" subtitle="1ª a 9ª Classe"   onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
+          <CardBtn icon="mdi:school"         title="Ensino Primário e Iº Ciclo" subtitle="1ª a 9ª Classe"   onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
```

```diff
-          {anoLetivoSelecionado ? "Anos Académicos — Ensino Fundamental" : "Anos Letivos — Ensino Fundamental"}
+          {anoLetivoSelecionado ? "Anos Académicos — Ensino Primário e Iº Ciclo" : "Anos Letivos — Ensino Primário e Iº Ciclo"}
```

```diff
-                  <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
+                  <p className="text-sm">Nenhum nível do Ensino Primário e Iº Ciclo configurado nesta academia.</p>
```

*(A remoção de `fetchEstudantes` neste mesmo bloco está descrita na Seção 2.)*

### 1.3 `src/components/avaliacoes/AvaliacoesFinaisAcademia.tsx`

```diff
 function labelNivel(v: string, withSuffix = false): string {
   const base = NIVEL_LABEL[v] ?? v.replace(/_/g, " ");
   if (!withSuffix) return base;
-  if (v.includes("fundamental")) return `${base} (Fund.)`;
+  if (v.includes("fundamental")) return `${base} (Primário)`;
   if (v.includes("medio")) return `${base} (Médio)`;
```

```diff
-          <CardBtn icon="mdi:school" title="Ensino Fundamental (1ª-9ª Classe)" subtitle="1ª a 9ª Classe"
+          <CardBtn icon="mdi:school" title="Ensino Primário e Iº Ciclo" subtitle="1ª a 9ª Classe"
             stats={{ approved: fundAvs.filter(a => a.aprovado).length, reprovated: fundAvs.filter(a => !a.aprovado).length, pending: 0 }}
```

```diff
-    const titulo = layer.destino === "fund" ? "Avaliações Finais — Fundamental" : (isSuperior ? "Avaliações Finais — Superior" : "Avaliações Finais — Médio");
+    const titulo = layer.destino === "fund" ? "Avaliações Finais — Ensino Primário e Iº Ciclo" : (isSuperior ? "Avaliações Finais — Superior" : "Avaliações Finais — Médio");
     return (
       <div className="space-y-6">
-        {isMisto && <Breadcrumb crumbs={[{ label: "Início", onClick: () => setLayer({ type: "choose" }) }, { label: layer.destino === "fund" ? "Ensino Fundamental" : "Ensino Médio" }]} />}
+        {isMisto && <Breadcrumb crumbs={[{ label: "Início", onClick: () => setLayer({ type: "choose" }) }, { label: layer.destino === "fund" ? "Ensino Primário e Iº Ciclo" : "Ensino Médio" }]} />}
```

```diff
-        <Breadcrumb crumbs={[...(isMisto ? [{ label: "Início", onClick: () => setLayer({ type: "choose" }) }] : []), { label: "Ano letivo", onClick: () => setLayer({ type: "anos_letivos", destino: "fund" }) }, { label: "Ensino Fundamental" }]} />
+        <Breadcrumb crumbs={[...(isMisto ? [{ label: "Início", onClick: () => setLayer({ type: "choose" }) }] : []), { label: "Ano letivo", onClick: () => setLayer({ type: "anos_letivos", destino: "fund" }) }, { label: "Ensino Primário e Iº Ciclo" }]} />
         <div className="flex items-start justify-between gap-3 flex-wrap">
           <div>
-            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais — Fundamental</h2>
+            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais — Ensino Primário e Iº Ciclo</h2>
```

```diff
-            <p className="text-sm text-gray-400">Nenhum ano acadêmico do ensino fundamental.</p>
+            <p className="text-sm text-gray-400">Nenhum ano acadêmico do Ensino Primário e Iº Ciclo.</p>
```

```diff
           { label: "Ano letivo", onClick: () => setLayer({ type: "anos_letivos", destino: "fund" }) },
-          { label: "Ensino Fundamental", onClick: () => setLayer({ type: "fund_overview" }) },
+          { label: "Ensino Primário e Iº Ciclo", onClick: () => setLayer({ type: "fund_overview" }) },
           { label: labelNivel(layer.nivel) },
```

```diff
           { label: "Ano letivo", onClick: () => setLayer({ type: "anos_letivos", destino: "fund" }) },
-          { label: "Fundamental", onClick: () => setLayer({ type: "fund_overview" }) },
+          { label: "Ensino Primário e Iº Ciclo", onClick: () => setLayer({ type: "fund_overview" }) },
           { label: labelNivel(layer.nivel), onClick: () => setLayer({ type: "fund_turmas", nivel: layer.nivel }) },
```

> ⚠️ Há **duas** ocorrências de `{ label: "Ensino Fundamental"...}`/`{ label: "Fundamental"...}`
> neste arquivo, em breadcrumbs diferentes (uma sem `onClick` de `fund_overview`, outra com). O
> bloco de código ao redor de cada trecho acima (incluído propositalmente) já diferencia qual é
> qual — confirme pelo contexto antes de aplicar.

### 1.3 `src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx`

```diff
 function labelNivel(v: string): string {
   const base = NIVEL_LABEL[v] ?? v.replace(/_/g, " ");
-  if (v.includes("fundamental")) return `${base} (Fund.)`;
+  if (v.includes("fundamental")) return `${base} (Primário)`;
   if (v.includes("medio"))       return `${base} (Médio)`;
```

```diff
   const tipoLabel: Record<TipoEnsino, string> = {
-    fundamental: "Ensino Fundamental (1ª-9ª Classe)", medio: "Ensino Médio", superior: "Ensino Superior",
+    fundamental: "Ensino Primário e Iº Ciclo", medio: "Ensino Médio", superior: "Ensino Superior",
   };
```

### 1.3 `src/components/avaliacoes/AvaliacoesFinaisEstudante.tsx`

```diff
   const cicloInfo: Record<TipoEnsino, { label: string; sub: string; icon: string }> = {
-    fundamental: { label: "Ensino Fundamental (1ª-9ª Classe)", sub: "1ª a 9ª Classe", icon: "mdi:school" },
+    fundamental: { label: "Ensino Primário e Iº Ciclo", sub: "1ª a 9ª Classe", icon: "mdi:school" },
     medio:       { label: "Ensino Médio",        sub: "1º ao 4º Médio",    icon: "mdi:book-education" },
```

### 1.4 `src/app/(painel)/estudantes/PageContent.tsx`

```diff
-                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano fundamental</label>
+                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano do Ensino Primário e Iº Ciclo</label>
```

```diff
-                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no fundamental</label>
+                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situação no Ensino Primário e Iº Ciclo</label>
```

```diff
-              <span className="font-bold text-gray-800 dark:text-white">Ensino Fundamental (1ª-9ª Classe)</span>
+              <span className="font-bold text-gray-800 dark:text-white">Ensino Primário e Iº Ciclo</span>
```

```diff
 function labelContextoEstudante(contexto: string): string {
-  if (contexto === 'fundamental') return 'Ensino Fundamental (1ª-9ª Classe)';
+  if (contexto === 'fundamental') return 'Ensino Primário e Iº Ciclo';
   if (contexto === 'medio') return 'Ensino Médio';
```
*(Esta função alimenta o cabeçalho da subtela de detalhes do estudante — a "subtela" citada no
pedido original.)*

### 1.5 `src/app/(painel)/configuracoes/AcademiaSection.tsx`

```diff
-    if (detail.code === "formato_invalido") return "Escolha apenas anos do 1º ao 9º ano fundamental.";
+    if (detail.code === "formato_invalido") return "Escolha apenas anos do Ensino Primário e Iº Ciclo (1ª a 9ª Classe).";
```

```diff
   if (detail?.field === "type" && detail.code === "nivel_incompativel") {
-    return "Esta opção está disponível apenas para escolas com ensino fundamental.";
+    return "Esta opção está disponível apenas para escolas com o Ensino Primário e Iº Ciclo.";
   }
```

```diff
                 <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
-                  Escolha quais anos do ensino fundamental a escola oferece para novas turmas e matrículas. Ao adicionar, os anos escolhidos entram na lista. Ao remover, os registros antigos continuam guardados, mas o ano deixa de aparecer para novas atividades.
+                  Escolha quais anos do Ensino Primário e Iº Ciclo a escola oferece para novas turmas e matrículas. Ao adicionar, os anos escolhidos entram na lista. Ao remover, os registros antigos continuam guardados, mas o ano deixa de aparecer para novas atividades.
                 </p>
```

### 1.6 `src/components/user-profile/Details.tsx`

```diff
   if (e.status_escolar_medio === 'em_andamento')         return { label: 'Ensino Médio',                 cor: 'purple'  };
-  if (e.status_escolar_fundamental === 'em_andamento')   return { label: 'Ensino Fundamental (1ª-9ª Classe)',           cor: 'blue'    };
+  if (e.status_escolar_fundamental === 'em_andamento')   return { label: 'Ensino Primário e Iº Ciclo',    cor: 'blue'    };
   if (e.status_superior === 'finalizado')                return { label: 'Superior (Finalizado)',        cor: 'green'   };
   if (e.status_escolar_medio === 'finalizado')           return { label: 'Médio (Finalizado)',           cor: 'green'   };
-  if (e.status_escolar_fundamental === 'finalizado')     return { label: '1ª-9ª Classe (Finalizado)',     cor: 'green'   };
+  if (e.status_escolar_fundamental === 'finalizado')     return { label: 'Ensino Primário e Iº Ciclo (Finalizado)', cor: 'green'   };
```

```diff
                     [
-                      { label: 'Fundamental (1ª-9ª Classe)', status: e.status_escolar_fundamental },
+                      { label: 'Ensino Primário e Iº Ciclo', status: e.status_escolar_fundamental },
                       { label: 'Médio',        status: e.status_escolar_medio       },
```

```diff
                     {ac.nivel_escolar === 'fundamental'
-                      ? 'Fundamental (1ª-9ª Classe)'
+                      ? 'Ensino Primário e Iº Ciclo'
                       : ac.nivel_escolar === 'medio'
                       ? 'Médio'
-                      : 'Fundamental (1ª-9ª Classe) e Médio'}
+                      : 'Ensino Primário ao Médio'}
```
*(Este último caso é o de uma academia mista — Regra 3 do backend, "Ensino Primário ao Médio",
não Regra 1. Não confunda os dois.)*

### 1.7 `src/app/(painel)/solicitacoes/PageContent.tsx`

```diff
 const tiposEnsino: { value: TipoEnsino | ""; label: string }[] = [
   { value: "", label: "Usar histórico" },
-  { value: "fundamental", label: "Fundamental" },
+  { value: "fundamental", label: "Ensino Primário e Iº Ciclo" },
   { value: "medio", label: "Médio" },
```

### 1.8 `src/app/(painel)/estudantes/cadastrar/massaHelpers.ts`

```diff
 export function labelNivel(nivel: NivelBulk): string {
   if (nivel === 'medio') return 'Ensino Médio';
   if (nivel === 'superior') return 'Ensino Superior';
-  return 'Ensino Fundamental (1ª-9ª Classe)';
+  return 'Ensino Primário e Iº Ciclo';
 }
```

### 1.8 `src/app/(painel)/estudantes/cadastrar/CadastroSingularForm.tsx`

```diff
                 <div className="col-span-1 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300 sm:col-span-2">
-                  O 1.º Ano Fundamental exige apenas a cédula do estudante como documento do estudante.
+                  A 1ª Classe exige apenas a cédula do estudante como documento do estudante.
                 </div>
```

---

## Seção 2 — Carregamento sob demanda em `/notas` e `/faltas`

**Problema:** as quatro telas abaixo carregavam a lista de **todos** os estudantes da academia
assim que a página abria (ou assim que o admin entrava numa academia), mesmo que o usuário nunca
chegasse a abrir uma turma. Isso gera uma requisição cara e desnecessária ao banco de dados toda
vez que a página é aberta.

**Solução:** os estudantes por turma já são carregados sob demanda quando a turma é aberta
(mecanismo `estudantesPorTurma`, já existente — não mexer). O carregamento da lista **completa**
da academia (usada apenas no dropdown pesquisável dos modais "Nova Nota"/"Nova Falta") passa a
acontecer só quando esses modais são abertos, com uma guarda (`if (!dataEstudantes)`) para não
repetir a requisição em aberturas seguintes do mesmo modal. Nas telas do admin, a lista completa
não é usada em nenhum outro lugar, então a chamada é simplesmente removida.

### 2.1 `src/components/notas/NotasAcademia.tsx`

```diff
   const { isOpen, openModal, closeModal } = useModal();
   const { isOpen: isCorrigirOpen, openModal: openCorrigirModal, closeModal: closeCorrigirModal } = useModal();
   const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);

+  // A lista completa de estudantes da academia só é necessária dentro do
+  // modal "Nova Nota"/"Categoria" (dropdown de estudante pesquisável). Por
+  // turma, os estudantes já são carregados sob demanda via
+  // estudantesPorTurma (ver useEffect mais abaixo). Por isso este fetch é
+  // disparado apenas ao abrir o modal, não na montagem da página.
+  function abrirModalNovaNota() {
+    if (!dataEstudantes) carregarEstudantes({ token });
+    openModal();
+  }
+
   // ─── carga inicial ──────────────────────────────────────────────────────────

   useEffect(() => {
     carregarTurmas(token);
     carregarCursos(token);
-    carregarEstudantes({ token });
     carregarMaterias(token);
```

```diff
             <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
-              {turmasAtivas.length} turma(s) ativa(s) · {estudantes.length} estudante(s) · {todasNotas.length} nota(s)
+              {turmasAtivas.length} turma(s) ativa(s){!loadingEstud && estudantes.length > 0 ? ` · ${estudantes.length} estudante(s)` : ""} · {todasNotas.length} nota(s)
             </p>
```

```diff
           {isSuperior && (
-            <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline" />} onClick={openModal}>
+            <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline" />} onClick={abrirModalNovaNota}>
               Categoria
             </Button>
           )}
-          <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={openModal}>
+          <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={abrirModalNovaNota}>
             Nova Nota
           </Button>
```

> Note que o contador "N estudante(s)" no cabeçalho só aparece depois que a lista é carregada
> (pelo modal ou por já ter sido carregada antes) — antes disso, o cabeçalho mostra só "N
> turma(s) ativa(s) · N nota(s)", sem travar em zero. Esse comportamento já existia de forma
> idêntica em `NotasAdmin.tsx` (`{!loadingEstud && estudantes.length > 0 && ...}`), então esta
> mudança só torna `NotasAcademia.tsx` consistente com o padrão já usado em `NotasAdmin.tsx`.

### 2.2 `src/components/notas/NotasAdmin.tsx`

```diff
     const cod = academia.codigo_academia;
     // Disparar todos os carregamentos sem bloquear
     fetchTurmas({ codigo_academia: cod, token });
     fetchCursos({ codigo_academia: cod, token });
     fetchMaterias({ codigo_academia: cod, token });
-    fetchEstudantes({ token, codigo_academia: cod });
     fetchAnosLetivos({ codigo_academia: cod, token });
     fetchAnoLetivo({ codigo_academia: cod, token });
```
*(Aqui a lista completa não é usada em nenhum modal — só nas tabelas já filtradas por turma via
`estudantesPorTurma`, e no contador do cabeçalho, que já tem a guarda `!loadingEstud &&
estudantes.length > 0` — nada mais precisa mudar neste arquivo além desta remoção.)*

### 2.3 `src/components/faltas/FaltasAcademia.tsx`

```diff
   const materias = useMemo(
     () => ((dataMaterias as any)?.materias ?? []).filter((m: any) => m.status === "ativo"),
     [dataMaterias]
   );

+  // A lista completa de estudantes da academia só é necessária dentro do
+  // modal "Nova Falta" (dropdown de estudante pesquisável). Por turma, os
+  // estudantes já são carregados sob demanda via estudantesPorTurma. Por
+  // isso este fetch é disparado apenas ao abrir o modal, não na montagem.
+  function abrirModalNovaFalta() {
+    if (!dataEstudantes) carregarEstudantes({ token });
+    openModal();
+  }
+
   // ─── carga inicial ──────────────────────────────────────────────────────────

   useEffect(() => {
     carregarTurmas(token);
     carregarCursos(token);
-    carregarEstudantes({ token });
     carregarMaterias(token);
```

```diff
             <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
-              {turmasAtivas.length} turma(s) ativa(s) · {estudantes.length} estudante(s) · {todasFaltas.length} registro(s)
+              {turmasAtivas.length} turma(s) ativa(s){!loadingEstud && estudantes.length > 0 ? ` · ${estudantes.length} estudante(s)` : ""} · {todasFaltas.length} registro(s)
             </p>
           )}
         </div>
-        <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={openModal}>
+        <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={abrirModalNovaFalta}>
           Nova Falta
         </Button>
```

### 2.4 `src/components/faltas/FaltasAdmin.tsx`

```diff
     const cod = academia.codigo_academia;
     fetchTurmas({ codigo_academia: cod, token });
     fetchCursos({ codigo_academia: cod, token });
     fetchMaterias({ codigo_academia: cod, token });
-    fetchEstudantes({ token, codigo_academia: cod });
     fetchAnosLetivos({ codigo_academia: cod, token });
     fetchAnoLetivo({ codigo_academia: cod, token });
   }
```

---

## Seção 3 — Remover coluna "Academia" em `/solicitacoes` na visão de academia

**Problema:** as duas tabelas da página (aba "edição" e as demais abas) sempre mostram uma
coluna "Academia" com o código/nome da própria academia — informação redundante para quem só
enxerga as próprias solicitações. Mantida para `isAdmin` (que vê solicitações de várias
academias) e para `isEstudante` (comportamento inalterado — não citado no pedido).

### 3.1 `src/app/(painel)/solicitacoes/PageContent.tsx` — tabela da aba "edição"

```diff
-                <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{["Código", "Campo", "Status", "Estudante", "Academia", "Valor solicitado", "Criada em", "Ações"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
+                <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{["Código", "Campo", "Status", "Estudante", ...(isAcademia ? [] : ["Academia"]), "Valor solicitado", "Criada em", "Ações"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
```

```diff
                     <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_estudante}</td>
-                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_academia}</td>
+                    {!isAcademia && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_academia}</td>}
                     <td className="max-w-xs px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.valor_solicitado}</td>
```

```diff
-                  {editItems.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma solicitação de edição encontrada.</td></tr>}
+                  {editItems.length === 0 && <tr><td colSpan={isAcademia ? 7 : 8} className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma solicitação de edição encontrada.</td></tr>}
```

### 3.2 `src/app/(painel)/solicitacoes/PageContent.tsx` — tabela das demais abas

```diff
-              <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{["Código", "Tipo", "Status", "Estudante", "Academia", "Motivo", "Criada em", "Ações"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
+              <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{["Código", "Tipo", "Status", "Estudante", ...(isAcademia ? [] : ["Academia"]), "Motivo", "Criada em", "Ações"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
```

```diff
                   <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.estudante_nome ?? item.codigo_estudante}</td>
-                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.academia_nome ?? item.codigo_academia}</td>
+                  {!isAcademia && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.academia_nome ?? item.codigo_academia}</td>}
                   <td className="max-w-xs px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.motivo}</td>
```

```diff
-                {itemsDaAba.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma solicitação encontrada.</td></tr>}
+                {itemsDaAba.length === 0 && <tr><td colSpan={isAcademia ? 7 : 8} className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma solicitação encontrada.</td></tr>}
```

> Não mexer no painel de detalhe de uma solicitação de edição aberta (`<Info label="Academia"
> value={editSelecionada.codigo_academia} />`) — o pedido original fala especificamente de
> **colunas em tabelas**, e esse é um card de detalhe, não uma tabela. Fora de escopo.

---

## Seção 4 — Fluxo de cadastro em massa de estudantes (`/estudantes/cadastrar`)

### 4.1/4.5/4.8 — Corrigir a causa raiz do vazamento de código técnico na revisão

`massaTemplate.ts`, `massaErrorExport.ts` e `massaParser.ts` trabalham juntos: os dois primeiros
**escrevem** a aba oculta `_meta` do Excel, o terceiro **lê** essa aba de volta quando o usuário
reenvia a planilha preenchida. Os três precisam ficar em sincronia — por isso as três mudanças
abaixo devem ser aplicadas juntas.

#### `src/app/(painel)/estudantes/cadastrar/massaTemplate.ts`

```diff
   // Folha oculta "_meta" — identificador do modelo
   const linhasMeta = [
     ['chave', 'valor'],
     ['versao_modelo', contexto.versaoModelo],
     ['codigo_academia', contexto.codigoAcademia],
+    ['nome_academia', contexto.nomeAcademia || ''],
     ['nivel', contexto.nivel],
     ['curso_id', contexto.cursoId || ''],
     ['curso_nome', contexto.cursoNome || ''],
     ['ano_academico', contexto.anoAcademico],
+    ['ano_academico_label', contexto.anoAcademicoLabel || ''],
     ['codigo_turma', contexto.codigoTurma || ''],
+    ['turma_label', contexto.turmaLabel || ''],
     ['modo_cadastro', contexto.modoCadastro || 'geral'],
     ['gerado_em', new Date().toISOString()],
   ];
```

#### `src/app/(painel)/estudantes/cadastrar/massaErrorExport.ts`

```diff
 function montarMetaLinhas(contexto: ContextoModelo) {
   return [
     ['chave', 'valor'],
     ['versao_modelo', contexto.versaoModelo || '1'],
     ['codigo_academia', contexto.codigoAcademia || ''],
+    ['nome_academia', contexto.nomeAcademia || ''],
     ['nivel', contexto.nivel || ''],
     ['curso_id', contexto.cursoId || ''],
     ['curso_nome', contexto.cursoNome || ''],
     ['ano_academico', contexto.anoAcademico || ''],
+    ['ano_academico_label', contexto.anoAcademicoLabel || ''],
     ['codigo_turma', contexto.codigoTurma || ''],
+    ['turma_label', contexto.turmaLabel || ''],
     ['modo_cadastro', contexto.modoCadastro || 'geral'],
     ['gerado_em', new Date().toISOString()],
   ];
 }
```
*(Esta função é usada pelas três exportações do arquivo — `baixarLinhasComErro`,
`baixarEstudantesComFalha` e `baixarRascunhoEstudantesPendentes` — corrigir aqui já cobre as
três.)*

#### `src/app/(painel)/estudantes/cadastrar/massaParser.ts`

```diff
 import * as XLSX from 'xlsx';
 import type { ContextoModelo, EstudanteBulkRow, ErroValidacao, ResultadoAnalise } from './massaTypes';
 import type { NivelBulk } from './massaHelpers';
+import { getAnoLabel } from './massaHelpers';
```

```diff
   return {
     codigoAcademia: mapa.codigo_academia,
-    nomeAcademia: '',
+    // Ficheiros gerados antes desta correção não têm "nome_academia" nem
+    // "turma_label" na folha _meta — por isso o formulário reconsulta a
+    // academia/turma atuais quando precisa exibir esses nomes (ver
+    // CadastroMassaForm.tsx). "ano_academico_label" sempre tem um valor
+    // correto aqui, calculado a partir do código, mesmo em ficheiros antigos.
+    nomeAcademia: mapa.nome_academia || '',
     nivel: mapa.nivel as NivelBulk,
     cursoId: mapa.curso_id || undefined,
     cursoNome: mapa.curso_nome || undefined,
     anoAcademico: mapa.ano_academico,
-    anoAcademicoLabel: mapa.ano_academico,
+    anoAcademicoLabel: mapa.ano_academico_label || getAnoLabel(mapa.ano_academico),
     versaoModelo: mapa.versao_modelo || '1',
     modoCadastro: mapa.modo_cadastro === 'turma' ? 'turma' : 'geral',
     codigoTurma: mapa.codigo_turma || undefined,
+    turmaLabel: mapa.turma_label || undefined,
   };
 }
```

> Esta era a causa raiz exata do texto `"Ensino Fundamental (1ª-9ª Classe) — 1_ano_fundamental —
> Turma T1C28"` relatado. A composição do texto na tela "3. Revisão e confirmação"
> (`RelatorioValidacaoMassa.tsx`, linha com `{labelNivel(contexto.nivel)}{...} —
> {contexto.anoAcademicoLabel}{...}`) **já estava correta** e não precisa de nenhuma mudança —
> ela só exibia o dado errado porque o dado (`anoAcademicoLabel`) chegava errado desde a leitura
> da planilha. Combinada com a correção de terminologia da Seção 1.8 (`labelNivel` retornando
> "Ensino Primário e Iº Ciclo"), a tela passa a mostrar corretamente algo como "Ensino Primário e
> Iº Ciclo — 1ª Classe — Turma T1C28".

### 4.2 — Nome dos arquivos-modelo simplificado

#### `src/app/(painel)/estudantes/cadastrar/massaTemplate.ts`

```diff
 export function gerarNomeArquivoModelo(contexto: ContextoModelo): string {
-  const partes = ['modelo-cadastro-estudantes', contexto.nivel];
-  if (contexto.cursoNome) partes.push(slugify(contexto.cursoNome));
-  partes.push(contexto.anoAcademico);
-  return `${partes.join('-')}.xlsx`;
+  if (contexto.modoCadastro === 'turma' && contexto.codigoTurma) {
+    return `modelo-cadastro-estudantes-${slugify(contexto.codigoTurma)}.xlsx`;
+  }
+  return 'modelo-cadastro-estudantes.xlsx';
 }
```

Resultado: `modelo-cadastro-estudantes-t1c28.xlsx` (modelo por turma) ou
`modelo-cadastro-estudantes.xlsx` (modelo geral, sem turma). A função `slugify` já existente no
arquivo (não mexer) cuida de deixar o código da turma seguro para nome de arquivo. A identificação
de qual turma/ano/curso o modelo representa continua 100% garantida pela aba oculta `_meta` (já
reforçada na Seção 4.1) — não pelo nome do arquivo, que é só para o usuário reconhecer o download
visualmente. Isso também resolve o pedido do item 4.5 ("modelos bem identificados pelos
indexadores ocultos") — a identificação nunca dependeu do nome do arquivo, e agora fica ainda
mais robusta.

> **Não altere** `baixarLinhasComErro`, `baixarEstudantesComFalha` nem
> `baixarRascunhoEstudantesPendentes` em `massaErrorExport.ts` — o nome desses arquivos
> (`erros-${nomeBase}.xlsx`, `falhas-${nomeBase}.xlsx`, `rascunho-${nomeBase}.xlsx`) usa o nome do
> arquivo **originalmente enviado pelo usuário** como base, e não é, tecnicamente, um "modelo" —
> é uma cópia para correção/reenvio. O pedido do item 4.2 fala especificamente do nome do
> **modelo** baixado (`gerarNomeArquivoModelo`). Fora de escopo mexer nesses outros nomes.

### 4.3 — "Nível" → "Turma" na folha de instruções

#### `src/app/(painel)/estudantes/cadastrar/massaTemplate.ts`

```diff
 function montarLinhasInstrucoes(contexto: ContextoModelo): (string | undefined)[][] {
   const linhas: (string | undefined)[][] = [
     ['Modelo de Cadastro em Massa de Estudantes — Spuri'],
     [],
     ['Academia', contexto.nomeAcademia],
-    ['Nível', labelNivel(contexto.nivel)],
   ];

+  if (contexto.modoCadastro === 'turma' && contexto.codigoTurma) {
+    linhas.push(['Turma', contexto.turmaLabel || contexto.codigoTurma]);
+  } else {
+    linhas.push(['Nível', labelNivel(contexto.nivel)]);
+  }
+
   if (contexto.cursoNome) linhas.push(['Curso', contexto.cursoNome]);
   linhas.push(['Ano Acadêmico', contexto.anoAcademicoLabel]);
```

**Decisão de design:** quando o modelo é gerado para uma turma específica (`modoCadastro ===
'turma'`), a linha "Nível" é substituída por "Turma" com o código/rótulo da turma ao lado —
exatamente como pedido. Quando o modelo é o "geral" (sem turma associada, `modoCadastro ===
'geral'`), não existe turma para mostrar, então a linha "Nível" é mantida como estava — o pedido
original ("colocar o código da turma ao lado") só faz sentido quando há, de fato, uma turma.

### 4.4/4.6 — Auditoria de regras de negócio: alinhar validação de e-mail ao backend

#### `src/app/(painel)/estudantes/cadastrar/massaParser.ts`

```diff
 const REGEX_BI = /^\d{9}[A-Za-z]{2}\d{3}$/;
-const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
+// Mesmo formato aceite pelo backend (internal/utils/validation.go: emailRegexV).
+const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
+// O backend rejeita e-mails com apóstrofo, ponto e vírgula ou hífen, mesmo
+// quando o formato é válido (internal/utils/validation.go: sqlCharsRegex).
+// Replicado aqui para não deixar passar na revisão algo que falharia depois.
+const REGEX_EMAIL_CARACTERES_BLOQUEADOS = /['\-;]|--/;
 const REGEX_NOME = /^[\p{L}\p{M} '’ʻ]+$/u;
```

```diff
   } else if (linha.email && !REGEX_EMAIL.test(linha.email)) {
     add('H', 'Email', linha.email, `O email "${linha.email}" não é válido. Exemplo: nome@exemplo.com`);
+  } else if (linha.email && REGEX_EMAIL_CARACTERES_BLOQUEADOS.test(linha.email)) {
+    add('H', 'Email', linha.email, 'O email não pode conter apóstrofo (\'), ponto e vírgula (;) ou hífen (-).');
   }
```

> Todas as demais regras já auditadas contra o backend (telefone — normalização e exigência
> condicional por nível; formato do BI; exceção de Cédula na 1ª Classe) já estavam corretas.
> **Não altere mais nada** na função `validarLinha` além do bloco acima.

### 4.7 — Avisar sobre o tempo de processamento

#### `src/app/(painel)/estudantes/cadastrar/RelatorioValidacaoMassa.tsx`

```diff
       {tudoValido && (
         <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 mb-4">
           Todos os dados foram validados com sucesso.{' '}
           {totalLotes > 1
             ? `Como são ${totalLinhas} estudantes, o sistema vai enviar automaticamente em ${totalLotes} grupos de até ${LIMITE_ESTUDANTES_POR_LOTE} estudantes cada.`
-            : 'Confirme abaixo para iniciar o cadastro em massa.'}
+            : 'Confirme abaixo para iniciar o cadastro em massa.'}{' '}
+          A integração destes estudantes na base de dados pode demorar alguns minutos — não é preciso permanecer nesta tela à espera.
         </div>
       )}
```

#### `src/app/(painel)/estudantes/cadastrar/BatchProgressScreen.tsx`

```diff
         <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
           {concluido
             ? 'Veja abaixo o resultado do cadastro.'
             : multiploLotes
-            ? `Os estudantes serão cadastrados em ${jobIds.length} grupos, automaticamente, para que tudo seja enviado com segurança. Isto pode demorar alguns instantes. `
-            : 'Isto pode demorar alguns instantes. '}
+            ? `Os estudantes serão cadastrados em ${jobIds.length} grupos, automaticamente, para que tudo seja enviado com segurança. A integração de cada estudante na base de dados pode demorar alguns minutos. `
+            : 'A integração dos estudantes na base de dados pode demorar alguns minutos. '}
           {!concluido && 'Pode navegar para outra página — ao voltar aqui, o progresso continua a ser mostrado.'}
         </p>
```

### 4.9 — Texto do botão de exportação de erros

#### `src/app/(painel)/estudantes/cadastrar/RelatorioValidacaoMassa.tsx`

```diff
             <Button
               size="sm"
               variant="outline"
               onClick={() => baixarLinhasComErro(contexto, linhas, errosPorLinhaLista, nomeArquivo)}
             >
-              Baixar apenas as linhas com erro
+              Baixar planilha apenas com os estudantes com erros
             </Button>
```

---

## Seção 5 — Validação já realizada (repita antes de concluir)

Já apliquei e validei todas as mudanças acima num clone local, nesta ordem, sem nenhum erro:

1. `npx tsc --noEmit -p tsconfig.json` → **0 erros** (baseline antes das mudanças também era 0
   erros, confirmando que nada pré-existente foi mascarado).
2. `npx eslint <cada um dos 20 arquivos>` → **0 erros, 0 warnings**.
3. `npm run build` → falha **apenas** por não conseguir buscar a fonte `Outfit` de
   `fonts.googleapis.com` (restrição de rede do sandbox de investigação, documentada e sem
   relação com o código). Nenhum outro erro de build.

**Repita os passos 1 e 2 no seu ambiente antes de dar a tarefa como concluída.** Se o passo 3
falhar por qualquer motivo *diferente* do acesso a `fonts.googleapis.com`, trate como bloqueante
e não conclua a tarefa sem investigar.

---

## Seção 6 — Arquivo a remover

Delete:

```
src/docs/Tarefa para o Codex — Correções em notas, faltas e terminologia Ensino Fundamental.md
```

**Motivo:** este documento antigo tratava parcialmente do mesmo tema, mas com decisões hoje
superadas — usava a convenção `"Ensino Fundamental (1ª-9ª Classe)"` (em vez da terminologia
oficial do backend) e instruía explicitamente a **não tocar** em `TrilhaAnimation.tsx` e no
carregamento de estudantes de `/notas`/`/faltas`, exatamente o oposto do que este documento pede
agora. Mantê-lo no repositório confundiria qualquer leitura futura. Nenhum outro arquivo de
código ou documentação precisa ser removido nesta tarefa.

---

## Fora de escopo (não tocar)

- Qualquer arquivo do repositório `spuri-backend` — nenhuma mudança de backend é necessária;
  todas as correções são de terminologia de exibição e de uso do frontend.
- `src/app/(painel)/testes/**` (painel de testes interno) — mantém a terminologia técnica antiga
  de propósito, não é uma tela voltada ao usuário final.
- Qualquer valor interno usado como identificador/chave: `n_ano_fundamental`,
  `ano_escolar_fundamental`, `nivel_escolar`, `status_escolar_fundamental`, `curso.type`, etc. —
  só o texto visível ao usuário muda, nunca o valor técnico.
- `massaTypes.ts` — a interface `ContextoModelo` já tinha todos os campos necessários
  (`nomeAcademia`, `anoAcademicoLabel`, `turmaLabel`); não precisa de nenhuma mudança.
- `massaDraft.ts` — não escreve nenhuma aba `_meta`, mecanismo de rascunho independente; fora do
  escopo desta correção.
- `SelecaoContextoMassa.tsx` — já monta o `ContextoModelo` corretamente (com rótulos corretos)
  no momento da geração do modelo; o bug estava apenas na leitura de volta (`massaParser.ts`),
  já corrigida.
- Regras de telefone, formato de BI e exceção de Cédula na 1ª Classe em `massaParser.ts` — já
  auditadas contra o backend e confirmadas corretas; não alterar.
- O painel de detalhe de uma solicitação individual em `/solicitacoes` (`<Info label="Academia"
  .../>`) — o pedido é sobre colunas de tabela, não sobre este card.
- Qualquer outra página do sistema não listada explicitamente nas Seções 1 a 4 deste documento.

---

## Critérios de aceitação

1. Buscar por `"Ensino Fundamental"` (com F maiúsculo, fora de comentários/valores técnicos) em
   `src/components/landing/`, `src/components/notas/`, `src/components/faltas/`,
   `src/components/avaliacoes/`, `src/app/(painel)/estudantes/`,
   `src/app/(painel)/configuracoes/`, `src/components/user-profile/`,
   `src/app/(painel)/solicitacoes/` e `src/app/(painel)/estudantes/cadastrar/` — **nenhuma
   ocorrência** deve restar como texto de exibição (comentários de código e valores como
   `"1_ano_fundamental"`, `nivel_escolar`, etc. não contam).
2. `/` (landing page): a animação da trilha mostra "Ensino Primário e Iº Ciclo" em vez de
   "Ensino Fundamental", sem sobreposição visual com os pontos vizinhos (verificado
   manualmente).
3. `/notas` e `/faltas` (role academia e admin): ao abrir a página, **nenhuma** requisição de
   estudantes de toda a academia é feita (confirmar na aba Network do navegador). Abrir uma
   turma continua mostrando os nomes dos estudantes corretamente. Abrir o modal "Nova
   Nota"/"Nova Falta" (role academia) dispara a busca e o dropdown "Selecione o estudante"
   continua pesquisável com todos os estudantes da academia.
4. `/solicitacoes`, role academia: as tabelas de "edição" e das demais abas não têm coluna
   "Academia". Role admin e role estudante: a coluna continua aparecendo normalmente.
5. `/estudantes/cadastrar`: gerar um modelo geral produz `modelo-cadastro-estudantes.xlsx`;
   gerar um modelo por turma produz `modelo-cadastro-estudantes-{turma}.xlsx`. A folha de
   instruções mostra "Turma" com o código da turma quando aplicável, ou "Nível" no modelo geral.
6. `/estudantes/cadastrar`: preencher um modelo por turma, reenviá-lo, e conferir que a tela "3.
   Revisão e confirmação" mostra o nível/ano/turma em texto legível (ex.: "Ensino Primário e Iº
   Ciclo — 1ª Classe — Turma T1C28"), **sem nenhum código técnico solto** (nada como
   "1_ano_fundamental").
7. `/estudantes/cadastrar`: um e-mail com hífen, apóstrofo ou ponto e vírgula (ex.:
   `"joao-silva@exemplo.com"`) é rejeitado na tela de revisão, com mensagem explicando o motivo.
8. `/estudantes/cadastrar`: o botão de exportação de erros mostra "Baixar planilha apenas com os
   estudantes com erros", e tanto a tela de revisão quanto a tela de progresso do envio avisam
   explicitamente que a integração "pode demorar alguns minutos".
9. `npx tsc --noEmit` e `npx eslint` sem nenhum erro novo introduzido por esta tarefa.
10. `src/docs/Tarefa para o Codex — Correções em notas, faltas e terminologia Ensino
    Fundamental.md` foi removido.

---

## Procedimento de conclusão

Ao finalizar a implementação:

1. Confirmar que todos os 10 critérios de aceitação acima foram verificados manualmente (não só
   pela compilação).
2. Atualizar o título interno deste documento para incluir "(feito)" no final do H1.
3. Alterar o front matter para `status: feito`.
4. Mover este arquivo para uma pasta de tarefas concluídas equivalente, caso o repositório
   `spuripainel` passe a adotar essa convenção (hoje o repositório ainda não tem uma pasta
   `docs/Tarefas feitas/` própria, ao contrário do `spuri-backend` — mesma observação já
   registrada no documento anterior de `/comunicacao`).
