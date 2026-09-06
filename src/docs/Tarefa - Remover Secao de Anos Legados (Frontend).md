---
criado: 06-09-2026
origem: Fredy + Claude (orquestração)
status: pronto para execução
depende_de: Tarefa "09b — Remover suporte legado de anos soltos de médio/superior em Serviços Extras" (spuri-backend) — o backend passa a rejeitar médio/superior soltos em anos_academicos_disponiveis, então o frontend não pode mais gerar isso.
---

# Tarefa — Remover seção de "anos legados" da sub-tela de Serviços Extras (Frontend)

## Prompt recomendado

> Aplique exatamente as mudanças descritas em `src/components/paineis/ServicosExtrasPainel.tsx`. Ao final, rode `npx tsc --noEmit` e `npm run build`, corrija qualquer erro, e confirme o checklist da seção 3.

## 1. Contexto

Fredy confirmou que não existe nenhum serviço extra cadastrado usando o formato antigo de ano solto de médio/superior — e o backend (Tarefa 09b) passou a rejeitar esse formato. A seção "Anos configurados antes desta funcionalidade" da sub-tela de criação/edição, o campo `anosLegado` do estado do formulário e a função `removerAnoLegado` ficaram sem propósito e devem ser removidos.

Conferi o arquivo atual antes de escrever isto — os trechos abaixo batem exatamente com o que está implementado.

## 2. `src/components/paineis/ServicosExtrasPainel.tsx`

### 2.1 Tipo `Form` e valor vazio

**Localizar:**
```tsx
type Form = {
  nome: string; descricao: string; categoria: string;
  pago: boolean; preco: string; tipo: TipoCobrancaServico; metodos: MetodoPagamentoServico[];
  taxa: boolean; valorTaxa: string; metodosTaxa: MetodoPagamentoServico[];
  anosFundamentais: string[];
  cursos: CursoSelecionado[];
  anosLegado: string[];
  documento: boolean; instrucoes: string;
};
const vazio: Form = { nome: "", descricao: "", categoria: "", pago: false, preco: "", tipo: "unico", metodos: [], taxa: false, valorTaxa: "", metodosTaxa: [], anosFundamentais: [], cursos: [], anosLegado: [], documento: false, instrucoes: "" };
```
**Substituir por:**
```tsx
type Form = {
  nome: string; descricao: string; categoria: string;
  pago: boolean; preco: string; tipo: TipoCobrancaServico; metodos: MetodoPagamentoServico[];
  taxa: boolean; valorTaxa: string; metodosTaxa: MetodoPagamentoServico[];
  anosFundamentais: string[];
  cursos: CursoSelecionado[];
  documento: boolean; instrucoes: string;
};
const vazio: Form = { nome: "", descricao: "", categoria: "", pago: false, preco: "", tipo: "unico", metodos: [], taxa: false, valorTaxa: "", metodosTaxa: [], anosFundamentais: [], cursos: [], documento: false, instrucoes: "" };
```

### 2.2 `paraForm`

**Localizar:**
```tsx
const paraForm = (s: ServicoExtra): Form => {
  const anosFundamentais = s.anos_academicos_disponiveis.filter((a) => a.endsWith("_ano_fundamental"));
  const anosLegado = s.anos_academicos_disponiveis.filter((a) => !a.endsWith("_ano_fundamental"));
  const porCurso = new Map<string, string[]>();
  for (const item of s.cursos_disponiveis ?? []) {
    const [cursoId, ano] = item.split("|");
    if (!cursoId || !ano) continue;
    porCurso.set(cursoId, [...(porCurso.get(cursoId) ?? []), ano]);
  }
  return {
    nome: s.nome, descricao: s.descricao ?? "", categoria: s.categoria ?? "",
    pago: s.pago, preco: s.preco?.toString() ?? "", tipo: s.tipo_cobranca ?? "unico", metodos: s.metodos_pagamento,
    taxa: s.tem_taxa_inscricao, valorTaxa: s.valor_taxa_inscricao?.toString() ?? "", metodosTaxa: s.metodos_pagamento_taxa_inscricao,
    anosFundamentais, anosLegado,
    cursos: Array.from(porCurso.entries()).map(([curso_id, anos]) => ({ curso_id, anos })),
    documento: s.documento_obrigatorio, instrucoes: s.documento_instrucoes ?? "",
  };
};
```
**Substituir por:**
```tsx
const paraForm = (s: ServicoExtra): Form => {
  const porCurso = new Map<string, string[]>();
  for (const item of s.cursos_disponiveis ?? []) {
    const [cursoId, ano] = item.split("|");
    if (!cursoId || !ano) continue;
    porCurso.set(cursoId, [...(porCurso.get(cursoId) ?? []), ano]);
  }
  return {
    nome: s.nome, descricao: s.descricao ?? "", categoria: s.categoria ?? "",
    pago: s.pago, preco: s.preco?.toString() ?? "", tipo: s.tipo_cobranca ?? "unico", metodos: s.metodos_pagamento,
    taxa: s.tem_taxa_inscricao, valorTaxa: s.valor_taxa_inscricao?.toString() ?? "", metodosTaxa: s.metodos_pagamento_taxa_inscricao,
    anosFundamentais: s.anos_academicos_disponiveis,
    cursos: Array.from(porCurso.entries()).map(([curso_id, anos]) => ({ curso_id, anos })),
    documento: s.documento_obrigatorio, instrucoes: s.documento_instrucoes ?? "",
  };
};
```

*(`anosFundamentais` passa a ser `s.anos_academicos_disponiveis` direto, sem `.filter(...)` — o backend agora garante que esse campo só contém anos fundamentais, então o filtro ficou redundante.)*

### 2.3 `valor()` — montagem do payload

**Localizar:**
```tsx
    anos_academicos_disponiveis: [...f.anosFundamentais, ...f.anosLegado],
```
**Substituir por:**
```tsx
    anos_academicos_disponiveis: f.anosFundamentais,
```

### 2.4 Remover `removerAnoLegado`

**Localizar:**
```tsx
  const setAnosDoCurso = (cursoId: string, anos: string[]) => {
    set({ cursos: form.cursos.map((c) => (c.curso_id === cursoId ? { ...c, anos } : c)) });
  };
  const removerAnoLegado = (ano: string) => set({ anosLegado: form.anosLegado.filter((a) => a !== ano) });

  const salvar = async (e: React.FormEvent) => {
```
**Substituir por:**
```tsx
  const setAnosDoCurso = (cursoId: string, anos: string[]) => {
    set({ cursos: form.cursos.map((c) => (c.curso_id === cursoId ? { ...c, anos } : c)) });
  };

  const salvar = async (e: React.FormEvent) => {
```

### 2.5 Remover a seção "anos legados" da sub-tela

**Localizar:**
```tsx
            {form.anosLegado.length > 0 && (
              <div className="space-y-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Anos configurados antes desta funcionalidade, sem curso associado (continuam válidos para qualquer curso desta academia):
                </p>
                <div className="flex flex-wrap gap-2">
                  {form.anosLegado.map((ano) => (
                    <span key={ano} className="flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1 text-sm text-amber-800 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300">
                      {ano}
                      <button type="button" onClick={() => removerAnoLegado(ano)} className="text-amber-600 hover:text-amber-900 dark:text-amber-400">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
```
**Substituir por:**
```tsx
          </div>
```

## 3. Checklist de aceite

- [ ] `anosLegado`, `removerAnoLegado` e a seção "Anos configurados antes desta funcionalidade" não existem mais em `ServicosExtrasPainel.tsx`.
- [ ] Editar um serviço com anos fundamentais e/ou cursos ainda carrega o formulário corretamente.
- [ ] `npx tsc --noEmit` e `npm run build` sem erros.
