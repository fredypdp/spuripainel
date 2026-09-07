---
criado: 06-09-2026
origem: Fredy + Claude (orquestração)
status: pronto para execução
depende_de: Tarefa backend "87 — Serviços Extras: disponibilidade por curso + anos combinados" (spuri-backend) — precisa estar mergeada e implantada antes desta, porque o formulário novo já envia `cursos_disponiveis` no payload.
---

# Tarefa — Serviços Extras: reestruturação de rotas, sub-tela de criação e seleção de cursos (Frontend)

## Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito neste documento (rotas, sidebar, guards, tipos, componentes), na ordem das seções. Não replaneje nem redesenhe nada do que já está decidido — as decisões de design da seção 2 são definitivas. Onde o documento fornece o conteúdo completo de um arquivo, substitua o arquivo inteiro por esse conteúdo. Onde fornece um par "Localizar/Substituir", aplique só essa mudança pontual. Ao final, rode `npm run build` (ou `next build`) e `npx tsc --noEmit`, corrija qualquer erro de tipo/compilação, e confira o checklist da seção 8.

## 1. Contexto

Esta tarefa depende da tarefa de backend que adiciona `cursos_disponiveis` ao `ServicoExtra` (formato `"<curso_id>|<ano_academico>"`, combinável com `anos_academicos_disponiveis`). **Confirme que essa tarefa de backend já foi implantada em produção/no ambiente que este frontend consome antes de começar** — o formulário novo desta tarefa envia esse campo no `POST`/`PUT` de `/academia/servicos-extras`.

Três pedidos, todos dentro do módulo de Serviços Extras + `/administradores`:

1. **Reestruturação de rotas.** As duas páginas de gestão de Serviços Extras (hoje em `/gerenciamento/servicos-extras` e `/gerenciamento/servicos-extras-solicitacoes`) saem do escopo de `/gerenciamento` e passam a viver dentro do escopo próprio `/servicos-extras`, que já existe (usado hoje por `/servicos-extras` — catálogo do estudante — e `/servicos-extras/minhas-inscricoes`):
   - `/gerenciamento/servicos-extras` → `/servicos-extras/gerenciar-servicos`
   - `/gerenciamento/servicos-extras-solicitacoes` → `/servicos-extras/inscricoes`
2. **Correção de cor de fonte no tema escuro** em todos os componentes de Serviços Extras e em `/administradores`. Confirmei a causa: o `body` global não define uma cor de texto padrão (`src/app/globals.css`/`layout.tsx` não têm um `color`/`dark:text-*` base), então qualquer elemento sem classe de cor explícita herda o preto padrão do navegador — invisível ou quase invisível sobre os fundos escuros (`dark:bg-gray-900`/`dark:bg-gray-800`) usados no resto do app.
3. **Criação de serviço em sub-tela, não modal**, com seleção de anos por botões (mesmo padrão de `MateriaPainel.tsx`) e seleção de cursos combinável com anos fundamentais soltos.

## 2. Decisões de design já tomadas (não repensar)

1. **Só os dois componentes de arquivos afetados por completo:** `ServicosExtrasPainel.tsx` é reescrito por inteiro (seção 5) — a mudança de modal para sub-tela toca praticamente todo o arquivo, então um "localizar/substituir" pontual seria mais frágil que substituir o arquivo inteiro. Os outros três componentes (`ServicosExtrasCatalogoPainel.tsx`, `MinhasInscricoesServicoExtraPainel.tsx`, `ServicosExtrasSolicitacoesPainel.tsx`) e `administradores/PageContent.tsx` só precisam de correção de cor — aplique como patches pontuais (seção 6), não reescreva esses quatro por inteiro.
2. **Paleta de referência**, já usada consistentemente no resto do app (`CursosPainel.tsx`, `MateriaPainel.tsx`, tabelas de `auditoria`/`solicitacoes`): texto principal `text-gray-800 dark:text-white/90`; texto secundário `text-gray-600 dark:text-gray-300`; texto auxiliar/rótulo `text-gray-500 dark:text-gray-400`; borda de card/tabela `border-gray-200 dark:border-gray-700`; ação de link `text-brand-600 dark:text-brand-400`; status positivo `text-green-600 dark:text-green-400`. Use exatamente essas combinações — não invente uma paleta nova.
3. **Anos fundamentais disponíveis vêm da configuração real da academia**, não de um range fixo "1 a 9": `user?.academia?.anos_academicos` (mesmo campo e mesmo filtro que `MateriaPainel.tsx` usa: `.filter(a => a.endsWith("_ano_fundamental"))`), rotulados com a mesma lista `ANOS_FUNDAMENTAL` ("1ª Classe".."9ª Classe") já usada em `MateriaPainel.tsx`/`TurmasPainel.tsx`.
4. **Sem a exclusão do "4º Ano Médio"**: `MateriaPainel.tsx` remove `4_ano_medio` das opções ao criar matérias do tipo médio (`curso.anos_academicos.filter(v => v !== "4_ano_medio")`) — é uma regra específica de matérias (ligada a avaliação final/pendências), não de Serviços Extras. **Não replique essa exclusão aqui**: todos os anos de `curso.anos_academicos` ficam disponíveis para seleção num serviço extra.
5. **Cursos elegíveis para seleção**: `listaCursos.filter(c => c.status === "ativo")` — mesmo filtro usado em `MateriaPainel.tsx`/`CursosPainel.tsx` para popular seletores de curso.
6. **Compatibilidade com serviços já criados antes desta funcionalidade**: um serviço existente pode ter entradas `_ano_medio`/`_ano_superior` soltas em `anos_academicos_disponiveis` (sem curso associado — formato antigo, ainda válido no backend). Ao editar esse serviço, essas entradas são preservadas como "anos legados" numa seção própria, com a opção de removê-las individualmente — **não** tente adivinhar a qual curso pertencem nem convertê-las automaticamente para `cursos_disponiveis`.
7. **"Tudo desmarcado" continua significando "disponível para todos"** — mesmo comportamento que o campo de texto livre tinha hoje, só que agora expresso via nenhum ano/curso selecionado nos botões.
8. **Nomes de arquivo/rota**: os dois `page.tsx` novos só re-exportam os componentes já existentes (`ServicosExtrasPainel`, `ServicosExtrasSolicitacoesPainel`) — não renomeie os componentes em si, só o caminho da rota que os expõe.

## 3. Fora de escopo (não implementar)

- Qualquer alteração em `/administradores` além de cor de fonte (nenhuma mudança de rota, layout ou funcionalidade nessa página).
- Filtrar o catálogo do estudante (`ServicosExtrasCatalogoPainel.tsx`) para esconder serviços aos quais o estudante não é elegível — isso é decisão de produto separada; o backend já aplica a elegibilidade de verdade no momento da solicitação (`403` se não elegível), então o catálogo pode continuar listando todos os serviços ativos como hoje. Só corrija a cor nesse componente.
- Alterar o texto/lógica de exibição de `anos_academicos_disponiveis` no catálogo do estudante (`s.anos_academicos_disponiveis.join(", ")`) para também descrever `cursos_disponiveis` — é uma melhoria de produto válida, mas não foi pedida; só corrija a cor da linha.
- Renomear os componentes `ServicosExtrasPainel`/`ServicosExtrasSolicitacoesPainel` ou os arquivos onde vivem — só as rotas (`page.tsx`) que os expõem mudam de caminho.
- Alterar o middleware/verificação de guard em si (`RouteGuard.tsx`) — só os dados em `route-guards.ts` (seção 4.3).
- Sincronizar a cópia de `Documentação da API.md` deste repositório (`src/docs/Documentação da API.md`) com o novo campo `cursos_disponiveis` — pode ser feito como último passo opcional (seção 8), não bloqueia o checklist de aceite.

## 4. Reestruturação de rotas

### 4.1 Novas páginas

Crie `src/app/(painel)/servicos-extras/gerenciar-servicos/page.tsx`:
```tsx
import type { Metadata } from "next";
import ServicosExtrasPainel from "@/components/paineis/ServicosExtrasPainel";
export const metadata: Metadata = { title: "Gerenciar Serviços Extras" };
export default function Page() { return <ServicosExtrasPainel />; }
```

Crie `src/app/(painel)/servicos-extras/inscricoes/page.tsx`:
```tsx
import type { Metadata } from "next";
import ServicosExtrasSolicitacoesPainel from "@/components/paineis/ServicosExtrasSolicitacoesPainel";
export const metadata: Metadata = { title: "Inscrições em Serviços Extras" };
export default function Page() { return <ServicosExtrasSolicitacoesPainel />; }
```

### 4.2 Remover as páginas antigas

Delete os arquivos e, se ficarem vazias, as pastas:
- `src/app/(painel)/gerenciamento/servicos-extras/page.tsx`
- `src/app/(painel)/gerenciamento/servicos-extras-solicitacoes/page.tsx`

### 4.3 `src/lib/route-guards.ts`

**Localizar:**
```
  {
    path: '/gerenciamento/turmas',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/gerenciamento',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
```
**Substituir por:**
```
  {
    path: '/gerenciamento/turmas',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/gerenciamento',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },

  // ==========================================
  // ROTAS PARA ACADEMIA — Serviços Extras (gestão)
  // Movidas de /gerenciamento/servicos-extras* — antes sem entrada própria
  // aqui (caíam no fallback "qualquer usuário autenticado"), agora
  // explicitamente restritas a 'academia', como o resto da gestão.
  // ==========================================
  {
    path: '/servicos-extras/gerenciar-servicos',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/servicos-extras/inscricoes',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
```

*(As rotas `/servicos-extras` e `/servicos-extras/minhas-inscricoes` — catálogo/inscrições do estudante — também não têm entrada própria em `ROUTE_PERMISSIONS` hoje, ficando abertas a qualquer autenticado pelo mesmo fallback. Isso é pré-existente e está fora do escopo desta tarefa — não mexa nessas duas.)*

### 4.4 `src/layout/AppSidebar.tsx`

**Localizar:**
```
      { name: "Turmas",               path: "/gerenciamento/turmas"               },
      { name: "Serviços Extras", path: "/gerenciamento/servicos-extras" },
      { name: "Solicitações de Serviços Extras", path: "/gerenciamento/servicos-extras-solicitacoes" },
    ],
  },
```
**Substituir por:**
```
      { name: "Turmas",               path: "/gerenciamento/turmas"               },
    ],
  },
```

**Localizar:**
```
    subItems: [
      { name: "Catálogo", path: "/servicos-extras" },
      { name: "Minhas Inscrições", path: "/servicos-extras/minhas-inscricoes" },
    ],
  },
```
**Substituir por:**
```
    subItems: [
      { name: "Catálogo", path: "/servicos-extras" },
      { name: "Minhas Inscrições", path: "/servicos-extras/minhas-inscricoes" },
      { name: "Gerenciar Serviços", path: "/servicos-extras/gerenciar-servicos" },
      { name: "Inscrições", path: "/servicos-extras/inscricoes" },
    ],
  },
```

**Localizar:**
```
        // Estudantes: "Cadastrar" só para academia
        if (item.name === "Estudantes" && item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) =>
                sub.path !== "/estudantes/cadastrar" || user?.tipo === "academia",
            ),
          };
        }

        return item;
```
**Substituir por:**
```
        // Estudantes: "Cadastrar" só para academia
        if (item.name === "Estudantes" && item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) =>
                sub.path !== "/estudantes/cadastrar" || user?.tipo === "academia",
            ),
          };
        }

        // Serviços Extras: "Gerenciar Serviços" e "Inscrições" só para academia
        if (item.name === "Serviços Extras" && item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) =>
                !["/servicos-extras/gerenciar-servicos", "/servicos-extras/inscricoes"].includes(sub.path) ||
                user?.tipo === "academia",
            ),
          };
        }

        return item;
```

### 4.5 `src/types/api.ts` — novo campo `cursos_disponiveis`

**Localizar:**
```
  anos_academicos_disponiveis: string[]; documento_obrigatorio: boolean;
  documento_instrucoes?: string; detalhes_personalizados: Record<string, unknown>;
  ativo: boolean; created_at: string; updated_at: string;
}
```
**Substituir por:**
```
  anos_academicos_disponiveis: string[]; cursos_disponiveis: string[]; documento_obrigatorio: boolean;
  documento_instrucoes?: string; detalhes_personalizados: Record<string, unknown>;
  ativo: boolean; created_at: string; updated_at: string;
}
```

**Localizar:**
```
  anos_academicos_disponiveis?: string[]; documento_obrigatorio?: boolean;
  documento_instrucoes?: string; detalhes_personalizados?: Record<string, unknown>;
}
```
**Substituir por:**
```
  anos_academicos_disponiveis?: string[]; cursos_disponiveis?: string[]; documento_obrigatorio?: boolean;
  documento_instrucoes?: string; detalhes_personalizados?: Record<string, unknown>;
}
```

## 5. `ServicosExtrasPainel.tsx` — reescrever por inteiro

Substitua todo o conteúdo de `src/components/paineis/ServicosExtrasPainel.tsx` por:

```tsx
"use client";
import { useEffect, useState } from "react";
import { academiaService, useApi, tokenStorage } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { getCookie } from "@/lib/utils/cookies";
import type { Curso, MetodoPagamentoServico, MeuPerfilResponse, ServicoExtra, ServicoExtraPayload, TipoCobrancaServico } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";

const ANOS_FUNDAMENTAL = [
  { value: "1_ano_fundamental", label: "1ª Classe" },
  { value: "2_ano_fundamental", label: "2ª Classe" },
  { value: "3_ano_fundamental", label: "3ª Classe" },
  { value: "4_ano_fundamental", label: "4ª Classe" },
  { value: "5_ano_fundamental", label: "5ª Classe" },
  { value: "6_ano_fundamental", label: "6ª Classe" },
  { value: "7_ano_fundamental", label: "7ª Classe" },
  { value: "8_ano_fundamental", label: "8ª Classe" },
  { value: "9_ano_fundamental", label: "9ª Classe" },
];

const pagamentos: MetodoPagamentoServico[] = ["GPO", "REF", "GPO_QR"];

type CursoSelecionado = { curso_id: string; anos: string[] };
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

const valor = (f: Form): ServicoExtraPayload => {
  const p: ServicoExtraPayload = {
    nome: f.nome.trim(), descricao: f.descricao || undefined, categoria: f.categoria || undefined,
    pago: f.pago, tem_taxa_inscricao: f.taxa,
    anos_academicos_disponiveis: [...f.anosFundamentais, ...f.anosLegado],
    cursos_disponiveis: f.cursos.flatMap((c) => c.anos.map((a) => `${c.curso_id}|${a}`)),
    documento_obrigatorio: f.documento,
    documento_instrucoes: f.documento ? f.instrucoes || undefined : undefined,
  };
  if (f.pago) Object.assign(p, { preco: Number(f.preco), tipo_cobranca: f.tipo, metodos_pagamento: f.metodos });
  if (f.taxa) Object.assign(p, { valor_taxa_inscricao: Number(f.valorTaxa), metodos_pagamento_taxa_inscricao: f.metodosTaxa });
  return p;
};

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const getUserFromCookie = (): MeuPerfilResponse | null => {
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
};

function Pagamentos({ value, onChange, label }: { value: MetodoPagamentoServico[]; onChange: (x: MetodoPagamentoServico[]) => void; label: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <div className="flex gap-4">
        {pagamentos.map((m) => <Checkbox key={m} label={m} checked={value.includes(m)} onChange={(ok) => onChange(ok ? [...value, m] : value.filter((x) => x !== m))} />)}
      </div>
    </div>
  );
}

function AnoBotoes({ anos, selecionados, onChange }: { anos: { value: string; label: string }[]; selecionados: string[]; onChange: (anos: string[]) => void }) {
  const toggle = (v: string) => onChange(selecionados.includes(v) ? selecionados.filter((x) => x !== v) : [...selecionados, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {anos.map((a) => (
        <button
          key={a.value}
          type="button"
          onClick={() => toggle(a.value)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            selecionados.includes(a.value)
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function ServicosExtrasPainel() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const lista = useApi(academiaService.listarServicosExtras);
  const criar = useApi(academiaService.criarServicoExtra);
  const atualizar = useApi(academiaService.atualizarServicoExtra);
  const desativar = useApi(academiaService.desativarServicoExtra);
  const reativar = useApi(academiaService.reativarServicoExtra);
  const cursosApi = useApi(academiaService.listarCursos);

  const [view, setView] = useState<"lista" | "form">("lista");
  const [edicao, setEdicao] = useState<ServicoExtra | null>(null);
  const [form, setForm] = useState<Form>(vazio);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning"; message: string } | null>(null);

  useEffect(() => {
    lista.execute();
    cursosApi.execute(tokenStorage.get() ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (x: Partial<Form>) => setForm((p) => ({ ...p, ...x }));

  const listaCursos: Curso[] = (cursosApi.data?.cursos ?? []).filter((c) => c.status === "ativo");
  const nivel = user?.academia?.nivel;
  const nivelEscolar = user?.academia?.nivel_escolar;
  const temFundamental = nivel === "escola" && (nivelEscolar === "fundamental" || nivelEscolar === "misto");
  const temCursos = nivel === "superior" || (nivel === "escola" && (nivelEscolar === "medio" || nivelEscolar === "misto"));
  const anosFundamentaisDisponiveis = ANOS_FUNDAMENTAL.filter((a) => (user?.academia?.anos_academicos ?? []).includes(a.value));

  const toggleCurso = (cursoId: string, incluir: boolean) => {
    set({ cursos: incluir ? [...form.cursos, { curso_id: cursoId, anos: [] }] : form.cursos.filter((c) => c.curso_id !== cursoId) });
  };
  const setAnosDoCurso = (cursoId: string, anos: string[]) => {
    set({ cursos: form.cursos.map((c) => (c.curso_id === cursoId ? { ...c, anos } : c)) });
  };
  const removerAnoLegado = (ano: string) => set({ anosLegado: form.anosLegado.filter((a) => a !== ano) });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return setAlert({ variant: "error", message: "O nome é obrigatório." });
    if (form.pago && (!form.preco || !form.metodos.length)) return setAlert({ variant: "error", message: "Informe preço e métodos de pagamento." });
    if (form.taxa && (!form.valorTaxa || !form.metodosTaxa.length)) return setAlert({ variant: "error", message: "Informe valor e métodos da taxa." });
    try {
      const atual = valor(form);
      if (edicao) {
        const original = valor(paraForm(edicao));
        const parcial = Object.fromEntries(Object.entries(atual).filter(([k, v]) => !igual(v, original[k as keyof ServicoExtraPayload]))) as ServicoExtraPayload;
        await atualizar.execute(edicao.id, parcial);
      } else {
        await criar.execute(atual);
      }
      setAlert({ variant: "success", message: "Serviço salvo com sucesso." });
      setView("lista");
      lista.execute();
    } catch (e) {
      setAlert({ variant: "error", message: formatApiError(e, "Não foi possível salvar o serviço.") });
    }
  };

  const abrir = (s?: ServicoExtra) => { setEdicao(s ?? null); setForm(s ? paraForm(s) : vazio); setView("form"); };
  const cancelar = () => { setView("lista"); setEdicao(null); setForm(vazio); };

  const toggle = async (s: ServicoExtra) => {
    if (!window.confirm(`Deseja ${s.ativo ? "desativar" : "reativar"} este serviço?`)) return;
    try { await (s.ativo ? desativar : reativar).execute(s.id); lista.execute(); }
    catch (e) { setAlert({ variant: "error", message: formatApiError(e, "Não foi possível alterar o status.") }); }
  };

  const credencial = alert?.message.toLowerCase().includes("credenciais") || alert?.message.toLowerCase().includes("appypay");

  const descreverDisponibilidade = (s: ServicoExtra) => {
    const partes: string[] = [];
    if (s.anos_academicos_disponiveis.length) partes.push(s.anos_academicos_disponiveis.join(", "));
    if (s.cursos_disponiveis?.length) {
      partes.push(
        s.cursos_disponiveis
          .map((item) => {
            const [cursoId, ano] = item.split("|");
            const curso = listaCursos.find((c) => c.id === cursoId);
            return `${curso?.nome ?? "curso removido"} · ${ano ?? ""}`;
          })
          .join(", "),
      );
    }
    return partes.length ? partes.join(" · ") : "Todos";
  };

  if (view === "form") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={cancelar} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
            ← Voltar
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{edicao ? "Editar Serviço" : "Novo Serviço"}</h1>
        </div>
        {alert && (
          <Alert
            variant={alert.variant}
            title="Serviços extras"
            message={(<>{alert.message} {credencial && <a className="font-medium underline" href="/financas/credenciais">Configurar credenciais</a>}</>) as any}
          />
        )}
        <form className="max-w-3xl space-y-5" onSubmit={salvar}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Nome" />
            <Input value={form.categoria} onChange={(e) => set({ categoria: e.target.value })} placeholder="Categoria" />
          </div>
          <TextArea value={form.descricao} onChange={(descricao) => set({ descricao })} placeholder="Descrição" />

          <Checkbox label="Serviço pago" checked={form.pago} onChange={(pago) => set({ pago })} />
          {form.pago && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Input type="number" value={form.preco} onChange={(e) => set({ preco: e.target.value })} placeholder="Preço" />
              <select
                className="h-11 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={form.tipo}
                onChange={(e) => set({ tipo: e.target.value as TipoCobrancaServico })}
              >
                <option value="unico">Único</option>
                <option value="mensal">Mensal</option>
              </select>
              <Pagamentos label="Métodos de pagamento" value={form.metodos} onChange={(metodos) => set({ metodos })} />
            </div>
          )}

          <Checkbox label="Tem taxa de inscrição" checked={form.taxa} onChange={(taxa) => set({ taxa })} />
          {form.taxa && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <Input type="number" value={form.valorTaxa} onChange={(e) => set({ valorTaxa: e.target.value })} placeholder="Valor da taxa" />
              <Pagamentos label="Métodos da taxa" value={form.metodosTaxa} onChange={(metodosTaxa) => set({ metodosTaxa })} />
            </div>
          )}

          <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponibilidade</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Deixe tudo desmarcado para disponibilizar o serviço para todos os estudantes da academia.</p>

            {temFundamental && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Anos do ensino fundamental</p>
                <AnoBotoes anos={anosFundamentaisDisponiveis} selecionados={form.anosFundamentais} onChange={(anosFundamentais) => set({ anosFundamentais })} />
              </div>
            )}

            {temCursos && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cursos</p>
                {listaCursos.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum curso cadastrado ainda.</p>}
                {listaCursos.map((curso) => {
                  const selecionado = form.cursos.find((c) => c.curso_id === curso.id);
                  const anosDoCurso = curso.anos_academicos.map((v) => ({
                    value: v,
                    label: v.replace(/^(\d+)_ano_(.+)$/, (_, n, tipo) => `${n}º Ano ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
                  }));
                  return (
                    <div key={curso.id} className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <Checkbox label={curso.nome} checked={!!selecionado} onChange={(incluir) => toggleCurso(curso.id, incluir)} />
                      {selecionado && <AnoBotoes anos={anosDoCurso} selecionados={selecionado.anos} onChange={(anos) => setAnosDoCurso(curso.id, anos)} />}
                    </div>
                  );
                })}
              </div>
            )}

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

          <Checkbox label="Exige documento anexado na inscrição" checked={form.documento} onChange={(documento) => set({ documento })} />
          {form.documento && <TextArea value={form.instrucoes} onChange={(instrucoes) => set({ instrucoes })} placeholder="Instruções do documento" />}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={cancelar}>Cancelar</Button>
            <Button disabled={criar.loading || atualizar.loading}>{edicao ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Serviços Extras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie os serviços adicionais da academia.</p>
        </div>
        <Button onClick={() => abrir()}>Novo Serviço</Button>
      </div>
      {alert && (
        <Alert
          variant={alert.variant}
          title="Serviços extras"
          message={(<>{alert.message} {credencial && <a className="font-medium underline" href="/financas/credenciais">Configurar credenciais</a>}</>) as any}
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["Nome", "Categoria", "Pago", "Taxa de Inscrição", "Disponibilidade", "Status", "Ações"].map((x) => (
                <th className="p-3 text-left text-gray-500 dark:text-gray-400" key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.data?.servicos_extras.map((s) => (
              <tr className="border-t border-gray-200 dark:border-gray-700" key={s.id}>
                <td className="p-3 font-medium text-gray-800 dark:text-white/90">{s.nome}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{s.categoria || "-"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{s.pago ? `Sim (${s.preco})` : "Não"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{s.tem_taxa_inscricao ? `Sim (${s.valor_taxa_inscricao})` : "Não"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{descreverDisponibilidade(s)}</td>
                <td className="p-3">
                  <span className={s.ativo ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>{s.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <button className="mr-3 text-brand-600 dark:text-brand-400" onClick={() => abrir(s)}>Editar</button>
                  <button className="text-brand-600 dark:text-brand-400" onClick={() => toggle(s)}>{s.ativo ? "Desativar" : "Reativar"}</button>
                </td>
              </tr>
            ))}
            {!lista.loading && !lista.data?.servicos_extras.length && (
              <tr>
                <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={7}>Nenhum serviço cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Notas sobre esta reescrita, para quem for revisar o diff:
- `Modal` deixou de ser importado — a criação/edição agora é a própria tela (`view === "form"`), sem overlay.
- `anos: string` (campo de texto livre) virou `anosFundamentais: string[]` + `cursos: CursoSelecionado[]` + `anosLegado: string[]` — o restante da lógica de `salvar`/diff parcial em edição (`igual`, `Object.fromEntries`) é preservado do arquivo original.
- A coluna "Anos Acadêmicos" da tabela virou "Disponibilidade" e agora também resume `cursos_disponiveis` (resolvendo o nome do curso a partir de `listaCursos`, com fallback "curso removido" se o curso tiver sido deletado depois).

## 6. Correção de cor — patches pontuais

### 6.1 `src/components/paineis/ServicosExtrasCatalogoPainel.tsx`

Cada par abaixo é uma troca de string exata (o arquivo é uma única linha densa — não reformate o resto da linha, só troque exatamente o trecho indicado).

1. **Localizar:** `<h1 className="text-2xl font-semibold">Catálogo de Serviços Extras</h1>`
   **Substituir por:** `<h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Catálogo de Serviços Extras</h1>`

2. **Localizar:** `<p className="text-sm text-gray-500">Serviços disponíveis na sua academia.</p>`
   **Substituir por:** `<p className="text-sm text-gray-500 dark:text-gray-400">Serviços disponíveis na sua academia.</p>`

3. **Localizar:** `<article key={s.id} className="space-y-3 rounded-xl border p-5">`
   **Substituir por:** `<article key={s.id} className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-gray-700">`

4. **Localizar:** `<h2 className="font-semibold">{s.nome}</h2>`
   **Substituir por:** `<h2 className="font-semibold text-gray-800 dark:text-white/90">{s.nome}</h2>`

5. **Localizar:** `{s.categoria&&<p className="text-xs text-gray-500">{s.categoria}</p>}`
   **Substituir por:** `{s.categoria&&<p className="text-xs text-gray-500 dark:text-gray-400">{s.categoria}</p>}`

6. **Localizar:** `{s.descricao&&<p>{s.descricao}</p>}`
   **Substituir por:** `{s.descricao&&<p className="text-sm text-gray-600 dark:text-gray-300">{s.descricao}</p>}`

7. **Localizar:** `<p>{!s.pago?"Gratuito":\`${s.preco} Kz${s.tipo_cobranca==="mensal"?"/mês":" (pagamento único)"}\`}</p>`
   **Substituir por:** `<p className="text-sm text-gray-700 dark:text-gray-300">{!s.pago?"Gratuito":\`${s.preco} Kz${s.tipo_cobranca==="mensal"?"/mês":" (pagamento único)"}\`}</p>`

8. **Localizar:** `{s.tem_taxa_inscricao&&<p>Taxa de inscrição: {s.valor_taxa_inscricao} Kz</p>}`
   **Substituir por:** `{s.tem_taxa_inscricao&&<p className="text-sm text-gray-700 dark:text-gray-300">Taxa de inscrição: {s.valor_taxa_inscricao} Kz</p>}`

9. **Localizar:** `<p className="text-sm">{s.anos_academicos_disponiveis.length?s.anos_academicos_disponiveis.join(", "):"Disponível para todos os anos"}</p>`
   **Substituir por:** `<p className="text-sm text-gray-600 dark:text-gray-400">{s.anos_academicos_disponiveis.length?s.anos_academicos_disponiveis.join(", "):"Disponível para todos os anos"}</p>`

10. **Localizar:** `<span className="text-sm font-medium text-brand-600">{status[i.status]}</span>`
    **Substituir por:** `<span className="text-sm font-medium text-brand-600 dark:text-brand-400">{status[i.status]}</span>`

11. **Localizar:** `<h2 className="text-lg font-semibold">Solicitar {selecionado?.nome}</h2>`
    **Substituir por:** `<h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Solicitar {selecionado?.nome}</h2>`

12. **Localizar:** `{selecionado?.documento_obrigatorio&&<p className="text-sm">Documento obrigatório. {selecionado.documento_instrucoes}</p>}`
    **Substituir por:** `{selecionado?.documento_obrigatorio&&<p className="text-sm text-gray-600 dark:text-gray-300">Documento obrigatório. {selecionado.documento_instrucoes}</p>}`

13. **Localizar:** `<p className="text-sm">Envie um PDF {selecionado?.documento_obrigatorio?"obrigatório":"opcional"}.</p>`
    **Substituir por:** `<p className="text-sm text-gray-600 dark:text-gray-300">Envie um PDF {selecionado?.documento_obrigatorio?"obrigatório":"opcional"}.</p>`

### 6.2 `src/components/paineis/MinhasInscricoesServicoExtraPainel.tsx`

1. **Localizar:** `<h1 className="text-2xl font-semibold">Minhas Inscrições em Serviços Extras</h1>`
   **Substituir por:** `<h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Minhas Inscrições em Serviços Extras</h1>`

2. **Localizar:** `<article key={i.id} className="space-y-3 rounded-xl border p-5">`
   **Substituir por:** `<article key={i.id} className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-gray-700">`

3. **Localizar:** `<h2 className="font-semibold">{s?.nome??"Serviço extra"}</h2>`
   **Substituir por:** `<h2 className="font-semibold text-gray-800 dark:text-white/90">{s?.nome??"Serviço extra"}</h2>`

4. **Localizar:** `<p>Status: <b>{i.status}</b></p>`
   **Substituir por:** `<p className="text-sm text-gray-700 dark:text-gray-300">Status: <b>{i.status}</b></p>`

5. **Localizar:** `{i.status==="pendente"&&<p>Aguardando aprovação da academia.</p>}`
   **Substituir por:** `{i.status==="pendente"&&<p className="text-sm text-gray-600 dark:text-gray-300">Aguardando aprovação da academia.</p>}`

6. **Localizar:** `<p>Taxa de inscrição: {i.valor_taxa_inscricao} Kz</p>`
   **Substituir por:** `<p className="text-sm text-gray-700 dark:text-gray-300">Taxa de inscrição: {i.valor_taxa_inscricao} Kz</p>`

7. **Localizar:** `<p>Inscrição ativa.</p>`
   **Substituir por:** `<p className="text-sm text-gray-700 dark:text-gray-300">Inscrição ativa.</p>`

8. **Localizar:** `<p>{p.tipo_lancamento} · {p.valor} Kz · {p.estado} {p.mes&&\`(${p.mes}/${p.ano})\`}</p>`
   **Substituir por:** `<p className="text-sm text-gray-700 dark:text-gray-300">{p.tipo_lancamento} · {p.valor} Kz · {p.estado} {p.mes&&\`(${p.mes}/${p.ano})\`}</p>`

9. **Localizar:** `{i.status==="reprovada"&&<p>Motivo: {i.motivo_reprovacao}</p>}`
   **Substituir por:** `{i.status==="reprovada"&&<p className="text-sm text-gray-600 dark:text-gray-300">Motivo: {i.motivo_reprovacao}</p>}`

10. **Localizar:** `{["cancelada","cancelada_antes_da_vinculacao"].includes(i.status)&&<p>Motivo: {i.motivo_cancelamento||"Não informado"}. Cancelada por: {i.cancelada_por||"Não informado"}.</p>}`
    **Substituir por:** `{["cancelada","cancelada_antes_da_vinculacao"].includes(i.status)&&<p className="text-sm text-gray-600 dark:text-gray-300">Motivo: {i.motivo_cancelamento||"Não informado"}. Cancelada por: {i.cancelada_por||"Não informado"}.</p>}`

11. **Localizar:** `{!items.length&&<p className="rounded-xl border p-6 text-gray-500">Nenhuma inscrição encontrada.</p>}`
    **Substituir por:** `{!items.length&&<p className="rounded-xl border border-gray-200 p-6 text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhuma inscrição encontrada.</p>}`

### 6.3 `src/components/paineis/ServicosExtrasSolicitacoesPainel.tsx`

1. **Localizar:** `<h1 className="text-2xl font-semibold">Solicitações de Serviços Extras</h1>`
   **Substituir por:** `<h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Solicitações de Serviços Extras</h1>`

2. **Localizar:** `<p className="text-sm text-gray-500">Revise inscrições e cobranças dos estudantes.</p>`
   **Substituir por:** `<p className="text-sm text-gray-500 dark:text-gray-400">Revise inscrições e cobranças dos estudantes.</p>`

3. **Localizar:** `{loading?<p>Carregando...</p>:items.length===0?`
   **Substituir por:** `{loading?<p className="text-sm text-gray-600 dark:text-gray-300">Carregando...</p>:items.length===0?`

4. **Localizar:** `<p className="rounded-xl border p-6 text-gray-500">Nenhuma solicitação encontrada.</p>`
   **Substituir por:** `<p className="rounded-xl border border-gray-200 p-6 text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhuma solicitação encontrada.</p>`

5. **Localizar:** `<h2 className="font-semibold">{s?.nome??"Serviço não encontrado"}</h2>`
   **Substituir por:** `<h2 className="font-semibold text-gray-800 dark:text-white/90">{s?.nome??"Serviço não encontrado"}</h2>`

6. **Localizar:** `<p className="text-sm text-gray-500">Estudante: {x.codigo_estudante}</p>`
   **Substituir por:** `<p className="text-sm text-gray-500 dark:text-gray-400">Estudante: {x.codigo_estudante}</p>`

7. **Localizar:** `<p className="text-xs text-gray-500">Solicitada em {new Date(x.created_at).toLocaleString("pt-PT")}</p>`
   **Substituir por:** `<p className="text-xs text-gray-500 dark:text-gray-400">Solicitada em {new Date(x.created_at).toLocaleString("pt-PT")}</p>`

8. **Localizar:** `<span>Taxa pendente: {x.valor_taxa_inscricao}</span>`
   **Substituir por:** `<span className="text-sm text-gray-700 dark:text-gray-300">Taxa pendente: {x.valor_taxa_inscricao}</span>`

9. **Localizar:** `<span>{p.tipo_lancamento} {p.ano&&\`— ${p.mes}/${p.ano}\`} · {p.valor} · {p.estado}</span>`
   **Substituir por:** `<span className="text-gray-700 dark:text-gray-300">{p.tipo_lancamento} {p.ano&&\`— ${p.mes}/${p.ano}\`} · {p.valor} · {p.estado}</span>`

### 6.4 `src/app/(painel)/administradores/PageContent.tsx`

1. **Localizar:** `{["Nome","Email","Role","Status","Telefone","Ações"].map(h=><th key={h} className="px-5 py-3 font-medium text-gray-500">{h}</th>)}`
   **Substituir por:** `{["Nome","Email","Role","Status","Telefone","Ações"].map(h=><th key={h} className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">{h}</th>)}`

2. **Localizar:** `<td className="px-5 py-4">{roleLabels[admin.role]}</td>`
   **Substituir por:** `<td className="px-5 py-4 text-gray-600 dark:text-gray-300">{roleLabels[admin.role]}</td>`

3. **Localizar:** `<td className="px-5 py-4">{admin.status}</td>`
   **Substituir por:** `<td className="px-5 py-4 text-gray-600 dark:text-gray-300">{admin.status}</td>`

4. **Localizar:** `<td className="px-5 py-4">{admin.telefone || "—"}</td>`
   **Substituir por:** `<td className="px-5 py-4 text-gray-600 dark:text-gray-300">{admin.telefone || "—"}</td>`

5. **Localizar:** `<td className="px-5 py-8 text-center text-gray-500" colSpan={6}>Nenhum administrador encontrado.</td>`
   **Substituir por:** `<td className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={6}>Nenhum administrador encontrado.</td>`

6. **Localizar (3 inputs idênticos no formulário de criação — nome, email, senha):** cada ocorrência de
   `className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]"`
   **Substituir por:** `className="w-full rounded-lg border px-4 py-3 text-sm text-gray-800 dark:bg-white/[0.03] dark:text-white/90"`
   *(são 3 ocorrências idênticas desta classe — nos `<input>` de nome, email e senha do formulário "Criar administrador". Se sua ferramenta de edição exigir correspondência única, aplique a mesma troca de classe nas 3, uma por vez, incluindo um trecho maior ao redor de cada `<input>` para diferenciá-las: `value={formCriar.nome}`, `value={formCriar.email}`, `value={formCriar.senha}` respectivamente.)*

7. **Localizar:** `<textarea className="w-full resize-none rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" rows={4} value={motivo} onChange={e=>setMotivo(e.target.value)} required />`
   **Substituir por:** `<textarea className="w-full resize-none rounded-lg border px-4 py-3 text-sm text-gray-800 dark:bg-white/[0.03] dark:text-white/90" rows={4} value={motivo} onChange={e=>setMotivo(e.target.value)} required />`

8. **Localizar (dentro de `handleCriar`'s form, `erroAcao`):** `{erroAcao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroAcao}</p>}`
   **Substituir por:** `{erroAcao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{erroAcao}</p>}`

9. **Localizar (dentro de `MotivoForm`, `erro`):** `{erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}`
   **Substituir por:** `{erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{erro}</p>}`

## 7. Verificação manual sugerida

Depois de aplicar tudo, alterne para o tema escuro e confira visualmente:
- `/servicos-extras/gerenciar-servicos`: tabela, sub-tela de criação (todas as seções, incluindo o `<select>` de tipo de cobrança e os botões de ano/curso) e os alerts.
- `/servicos-extras/inscricoes`, `/servicos-extras` (catálogo) e `/servicos-extras/minhas-inscricoes`.
- `/administradores`: tabela e os dois modais (criar administrador, motivo de desativar/deletar).
- Confirme que uma academia com `nivel_escolar: "misto"` vê **ambas** as seções (fundamental + cursos) na sub-tela de criação, e que uma academia `nivel_escolar: "fundamental"` só vê a seção fundamental (sem seção de cursos), e uma `nivel: "superior"` só vê a seção de cursos.
- Edite um serviço criado antes desta tarefa (se existir algum com anos soltos de médio/superior) e confirme que a seção "Anos configurados antes desta funcionalidade" aparece com os valores corretos e que removê-los individualmente funciona.

## 8. Checklist de aceite

- [ ] `/gerenciamento/servicos-extras` e `/gerenciamento/servicos-extras-solicitacoes` não existem mais; `/servicos-extras/gerenciar-servicos` e `/servicos-extras/inscricoes` funcionam e aparecem no menu lateral só para `tipo === "academia"`.
- [ ] `route-guards.ts` restringe as duas novas rotas a `academia`.
- [ ] Nenhum texto preto visível no tema escuro em Serviços Extras (todas as sub-rotas) nem em `/administradores`.
- [ ] Criar/editar serviço abre uma sub-tela (a lista desaparece, não fica um overlay por cima) — sem `Modal` no `ServicosExtrasPainel.tsx`.
- [ ] Seleção de anos fundamentais e de anos por curso é feita clicando em botões (mesmo visual de `MateriaPainel.tsx`), não digitando texto.
- [ ] Uma academia mista consegue selecionar anos fundamentais **e** anos de um curso médio no mesmo serviço, simultaneamente.
- [ ] Editar um serviço antigo com anos de médio/superior soltos preserva essas entradas como "legado", com opção de remover cada uma.
- [ ] `npx tsc --noEmit` e `npm run build` sem erros.

## Procedimento de conclusão

Ao terminar, rode `npx tsc --noEmit` e `npm run build`, corrija qualquer erro, e relate quais dos 4 arquivos de patch pontual (seção 6) tiveram alguma ocorrência que não bateu exatamente com o texto deste documento (o que pode acontecer se outra tarefa concorrente já tiver tocado o mesmo arquivo) — nesse caso, aplique a mesma mudança de cor manualmente no trecho equivalente, mantendo a paleta da seção 2.2, em vez de pular o arquivo. Como último passo opcional, se tiver tempo, atualize `src/docs/Documentação da API.md` (seções equivalentes às 20.1/20.2 do backend) para mencionar `cursos_disponiveis` — não bloqueia a conclusão da tarefa.
