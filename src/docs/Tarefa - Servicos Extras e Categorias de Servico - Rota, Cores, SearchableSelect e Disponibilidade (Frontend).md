---
criado: 08-09-2026
origem: Fredy + Claude (orquestração)
status: pronto para execução
tipo: frontend (spuripainel)
depende_de: nenhuma — o backend já implementa tudo que esta tarefa precisa (Tarefas 87 e 87b, spuri-backend). Verifiquei isso lendo o código-fonte atual do backend contra o commit `72358c7` (HEAD de `origin/main` no momento em que este documento foi escrito) — não é necessária nenhuma mudança nem deploy de backend para esta tarefa.
---

# Tarefa — Serviços Extras e Categorias de Serviço: rota, cores, SearchableSelect e Disponibilidade (Frontend)

### Documento de execução para o Codex (orquestrado e pré-testado pelo Claude)

## 0. Leia isto primeiro — o que já foi validado e limitações do seu ambiente

Sei que o seu ambiente (Codex) bloqueia `apt` (403) e não tem Docker nem `psql`. **Isso não afeta esta tarefa** — é 100% frontend (TypeScript/React/Next.js), não toca em nada de banco de dados nem precisa rodar o backend. Ainda assim, aqui está exatamente o que eu já validei no meu sandbox, para você não perder tempo revalidando o que já está confirmado:

- **`npx tsc --noEmit` (checagem de tipos completa do projeto): limpo, 0 erros.** Rodei duas vezes — uma vez no meu clone de trabalho, e uma segunda vez **de forma independente**, num clone novo e limpo feito na hora a partir do HEAD real e atual de `origin/main` (commit `84f0336`), com o patch da seção 10 aplicado do zero. As duas vezes deram 0 erros.
- **`npx eslint` nos arquivos alterados/criados: 0 erros.** Só aparecem 2 warnings de `react-hooks/exhaustive-deps` (padrão `useEffect(() => { recarregar() }, [])` sem os callbacks nas deps) — confirmei que **esses warnings já existiam antes desta tarefa**, no arquivo original sem nenhuma das minhas mudanças (testei com `git stash`). Não são regressão desta tarefa.
- **`git apply --check` do patch da seção 10 contra o HEAD real e atual do repositório: limpo.** Cloneu `spuripainel` do zero, sem nenhum dos meus arquivos de trabalho, e o patch aplicou sem nenhum conflito.
- **`npm run build` (Next.js/Turbopack): não completei, por um motivo que não tem relação com esta tarefa.** O build tenta baixar a fonte "Outfit" de `fonts.googleapis.com` (usada em `src/app/layout.tsx`, fora do escopo desta tarefa) e o proxy de rede do meu sandbox bloqueia esse host. Confirmei que **isso já acontece no repositório original, sem nenhuma das minhas mudanças** (mesmo teste com `git stash`) — não é algo que esta tarefa introduziu. Se o seu ambiente tiver saída de rede para `fonts.googleapis.com`, rode `npm run build` normalmente; se não tiver, esse erro específico de fonte não é motivo de preocupação, mas tente mesmo assim para pegar qualquer outro erro de build que o `tsc` isolado não pegaria (ex. problemas de Server/Client Component boundary).
- **Contrato de backend usado por esta tarefa (`anos_academicos_disponiveis`, `cursos_disponiveis`): li o código-fonte atual, função por função**, em `internal/domain/aggregates/servico_extra.go`, `internal/handlers/servico_extra_handlers.go` e `internal/projections/servico_extra_projection.go`, contra o commit `72358c7` de `spuri-backend` (HEAD atual de `origin/main`). Está tudo implementado exatamente como a Tarefa 87 e a Tarefa 87b descrevem (`docs/Tarefas feitas/87...md` e `87b...md` nesse repositório) — ver seção 9 para o resumo do que importa para o frontend.
- Também confirmei que nenhuma mudança recente e concorrente em nenhum dos dois repositórios (`spuripainel` até `84f0336`, `spuri-backend` até `72358c7`) toca em nenhum dos arquivos que esta tarefa altera — o patch da seção 10 não tem risco de conflito com trabalho concorrente.

## 1. Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito neste documento, na ordem das seções. Não replaneje nem redesenhe nada do que já está decidido — as decisões da seção 3 são definitivas. Ao final, rode `npx tsc --noEmit` e `npm run lint`, corrija qualquer erro, tente `npm run build` (ver observação sobre `fonts.googleapis.com` na seção 0), e preencha o checklist da seção 12.

## 2. Contexto — os 4 pedidos de Fredy e o que investiguei

**1. Rota.** `/categorias-servico` hoje vive em `src/app/(painel)/gerenciamento/categorias-servico/page.tsx`, fora do escopo de Serviços Extras. Fredy quer `/servicos-extras/categorias-servico`.

**2. Cores erradas.** Investiguei a causa raiz: `body` (`src/app/globals.css`) não define nenhuma cor de texto padrão, e o tema escuro (`dark:bg-gray-900`, em `src/app/layout.tsx`) só troca o fundo — nunca a cor do texto. Qualquer elemento sem `dark:text-*` explícito herda a cor padrão do navegador (preta) e fica ilegível sobre fundo escuro. `ServicosExtrasPainel.tsx` tem vários títulos **sem cor nenhuma**, nem clara nem escura; `CategoriasServicoPainel.tsx` tem cor clara mas sem `dark:`.

**3. Selects nativos.** Fredy chamou o componente de "SelectSearchable" — **esse componente não existe no repositório.** O componente padrão já usado em dezenas de arquivos do app é `SearchableSelect` (`@/components/form/SearchableSelect`) — inclusive já usado *no próprio* `ServicosExtrasPainel.tsx`, no select de categoria. Estou tratando o pedido como "trocar pelo `SearchableSelect`, que é o padrão real do app". Há exatamente **2** `<select>` nativos no arquivo (tipo de personalização, tipo de cobrança) — nenhum em `CategoriasServicoPainel.tsx`.

**4. Disponibilidade "perdida".** Achei a causa: existe um documento de tarefa anterior, `src/docs/Tarefa - Servicos Extras - Reestruturacao de Rotas, Sub-tela e Cursos (Frontend).md`, que planejava reconstruir a seleção de anos/cursos na seção "Disponibilidade" — mas essa parte nunca foi implementada de fato. A seção virou um texto fixo: `<p>Disponível para todos os estudantes.</p>`, sem nenhum controle. O backend já suporta tudo isso (`anos_academicos_disponiveis` + `cursos_disponiveis`, Tarefas 87/87b) e os tipos do frontend (`src/types/api.ts`) já têm os campos — só o formulário (`Form`, `paraForm`, `valor()`) os descarta completamente. **É um conserto 100% de frontend**, sem nenhuma mudança de backend (ver seção 9).

## 3. Decisões de design já tomadas (não repensar)

### 3.1 Rota

Move para `/servicos-extras/categorias-servico`, com guard restrito a `academia` (como as rotas irmãs `/servicos-extras/gerenciar-servicos` e `/servicos-extras/inscricoes`) — hoje a rota antiga não tinha nenhuma entrada própria em `route-guards.ts` e por isso caía no fallback "qualquer usuário autenticado pode acessar", o que nem devia ser o caso. Nenhuma das páginas dentro de `/servicos-extras/*` usa um layout de breadcrumb compartilhado (confirmei olhando `catalogo/page.tsx`, `inscricoes/page.tsx`, `minhas-inscricoes/page.tsx` — nenhuma tem `layout.tsx` próprio); a página nova segue o mesmo padrão simples das irmãs.

### 3.2 Cores — a decisão anti-regressão pedida por Fredy

Em vez de só trocar as classes Tailwind nos dois arquivos (o que resolveria o sintoma sem impedir que aconteça de novo na próxima tela), criei um pequeno componente de tipografia com a cor já resolvida para os dois temas: `src/components/ui/typography/Typography.tsx`, exportando `PageHeading`, `PageDescription`, `SectionTitle`, `SectionDescription` e `Section`. Cada um já embute o par claro/escuro correto — quem usa não tem como esquecer o `dark:`, porque a cor não é mais escrita à mão em cada tela.

A paleta usada não é inventada — é exatamente a que o resto do painel já usa (conferi em `CursosPainel.tsx`, `TurmasPainel.tsx` e `MateriaPainel.tsx`):

| Uso | Classes |
|---|---|
| Título de página (`h1`) | `text-2xl font-semibold text-gray-800 dark:text-white/90` |
| Descrição de página | `text-sm text-gray-500 dark:text-gray-400` |
| Título de seção/card | `text-sm font-medium text-gray-700 dark:text-gray-300` |
| Texto de apoio em seção | `text-xs text-gray-500 dark:text-gray-400` |
| Cabeçalho de tabela (`thead`) | `bg-gray-50 dark:bg-gray-800/70` |
| Célula de cabeçalho (`th`) | `font-medium text-gray-600 dark:text-gray-400` |
| Célula "principal" (nome/identificador) | `font-medium text-gray-900 dark:text-white` |
| Célula secundária | `text-gray-500 dark:text-gray-400` |
| Célula de corpo comum | `text-gray-700 dark:text-gray-300` |
| Link de ação (Editar/Salvar/etc.) | `text-brand-600 dark:text-brand-400` |

**Considerei e descartei** criar uma regra de ESLint automática para pegar `text-gray-*` sem `dark:` — o app constrói `className` dinamicamente com template strings e ternários em muitos lugares (inclusive nesta própria tarefa, nos botões de ano/curso da Disponibilidade), então uma regra confiável sem falsos positivos/negativos exigiria mais engenharia do que o problema justifica agora, e o Codex precisa "só executar" sem ter que julgar se um alerta de lint é real ou ruído. Os componentes de tipografia resolvem a causa raiz (cor escrita à mão) sem esse risco. Isto não é uma auditoria de cores no resto do app — só nos dois arquivos pedidos (ver seção 4).

### 3.3 SearchableSelect

Troca 1-para-1 dos 2 `<select>` nativos em `ServicosExtrasPainel.tsx` pelo `SearchableSelect` já padrão do app, com `isSearchable={false}` nos dois (listas curtas e fixas, busca não agrega nada) e `isClearable={false}` (sempre precisam ter um valor selecionado).

### 3.4 Disponibilidade

- **Anos do fundamental** ficam soltos em `anos_academicos_disponiveis` (sem curso — este sistema não tem cursos para o fundamental). A lista de anos exibida vem da configuração real da academia (`user.academia.anos_academicos`, filtrado a `_ano_fundamental`) — não de uma faixa fixa 1-9.
- **Médio/Superior** só podem ser restringidos via `cursos_disponiveis`, no formato `"<curso_id>|<ano_academico>"`. **Não existe mais suporte a ano solto de médio/superior** — isso foi removido no backend pela Tarefa 87b (confirmei lendo `validarAnosAcademicosServicoExtra` no código atual: só aceita sufixo `_ano_fundamental`). Por isso a tela **não** tem (e não deve ter) uma seção de "anos legados" de médio/superior soltos — o design antigo do doc de rotas previa isso, mas ficou obsoleto depois da 87b.
- As duas listas são **combináveis no mesmo serviço** (uma academia mista pode marcar anos do fundamental E anos de um curso médio ao mesmo tempo).
- A tela permite adicionar anos de **múltiplos cursos diferentes** no mesmo serviço: um dropdown `SearchableSelect` escolhe "em qual curso estou adicionando anos agora", botões de ano aparecem para esse curso, e uma lista de chips abaixo mostra tudo que já foi selecionado (de qualquer curso), com botão de remover em cada chip — sem precisar reabrir o dropdown do curso original para editar/remover.
- Cursos elegíveis para o dropdown de adicionar: `status === "ativo"`. Cursos inativos referenciados numa seleção **já existente** (ao editar um serviço) continuam aparecendo na lista de chips (para poder remover), só não aparecem no dropdown para adicionar novos.
- **Os dois campos (`anos_academicos_disponiveis` e `cursos_disponiveis`) são sempre enviados no payload, mesmo vazios (`[]`)** — nunca omitidos. Isso é necessário porque o backend só atualiza (`PUT`) os campos que vierem presentes no corpo da requisição (mecanismo `informado`, em `servico_extra_handlers.go`); se o campo for omitido, uma restrição já salva nunca poderia ser apagada pela tela. "Nada selecionado" continua significando "disponível para todos os estudantes", exatamente como antes.

## 4. Fora de escopo (não implementar)

- Qualquer mudança em `spuri-backend` — já está tudo pronto lá (seção 9).
- Qualquer mudança em `ServicosExtrasCatalogoPainel.tsx`, `ServicosExtrasSolicitacoesPainel.tsx` ou `MinhasInscricoesServicoExtraPainel.tsx` (catálogo do estudante, inscrições, minhas inscrições) — não fazem parte dos 4 itens pedidos.
- Auditoria/correção de cores em qualquer outra tela do painel além de `CategoriasServicoPainel.tsx` e `ServicosExtrasPainel.tsx`.
- Trocar outros `<select>` nativos do app fora de `ServicosExtrasPainel.tsx` (não existem em `CategoriasServicoPainel.tsx`, e nenhum outro arquivo foi pedido).
- Regra de lint automática para cores (considerada e descartada — seção 3.2).
- Endpoint ou lógica nova de elegibilidade — o backend já aplica isso em `SolicitarServicoExtra` (seção 9); esta tarefa só faz a tela conseguir configurar os campos que o backend já lê.

## 5. Mover a rota `/categorias-servico` → `/servicos-extras/categorias-servico`

### 5.1 Criar `src/app/(painel)/servicos-extras/categorias-servico/page.tsx`

Arquivo novo, conteúdo completo:

```tsx
import type { Metadata } from "next";
import CategoriasServicoPainel from "@/components/paineis/CategoriasServicoPainel";
export const metadata: Metadata = { title: "Categorias de Serviço" };
export default function Page() { return <CategoriasServicoPainel />; }
```

### 5.2 Apagar a rota antiga

Apague o arquivo `src/app/(painel)/gerenciamento/categorias-servico/page.tsx` e, se a pasta `src/app/(painel)/gerenciamento/categorias-servico/` ficar vazia depois, apague a pasta também.

### 5.3 `src/lib/route-guards.ts` — adicionar guard da rota nova

**Localizar:**
```ts
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
**Substituir por:**
```ts
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
  {
    // Movida de /gerenciamento/categorias-servico — antes sem entrada
    // própria aqui (caía no fallback "qualquer usuário autenticado").
    path: '/servicos-extras/categorias-servico',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
```

### 5.4 `src/layout/AppSidebar.tsx` — mover o item de menu (3 alterações)

**Localizar:**
```tsx
      { name: "Turmas",               path: "/gerenciamento/turmas"               },
      { name: "Categorias de Serviço", path: "/gerenciamento/categorias-servico" },
    ],
```
**Substituir por:**
```tsx
      { name: "Turmas",               path: "/gerenciamento/turmas"               },
    ],
```

**Localizar:**
```tsx
      { name: "Gerenciar Serviços", path: "/servicos-extras/gerenciar-servicos" },
      { name: "Inscrições", path: "/servicos-extras/inscricoes" },
    ],
```
**Substituir por:**
```tsx
      { name: "Gerenciar Serviços", path: "/servicos-extras/gerenciar-servicos" },
      { name: "Inscrições", path: "/servicos-extras/inscricoes" },
      { name: "Categorias de Serviço", path: "/servicos-extras/categorias-servico" },
    ],
```

**Localizar:**
```tsx
          const academiaPaths = ["/servicos-extras/gerenciar-servicos", "/servicos-extras/inscricoes"];
```
**Substituir por:**
```tsx
          const academiaPaths = ["/servicos-extras/gerenciar-servicos", "/servicos-extras/inscricoes", "/servicos-extras/categorias-servico"];
```

### 5.5 `src/app/(painel)/gerenciamento/layout.tsx` — remover título órfão

**Localizar:**
```tsx
  "/gerenciamento/turmas": "Gerenciamento de Turmas",
  "/gerenciamento/categorias-servico": "Categorias de Serviço",
};
```
**Substituir por:**
```tsx
  "/gerenciamento/turmas": "Gerenciamento de Turmas",
};
```

## 6. Componente de tipografia com cor segura (a decisão da seção 3.2)

Arquivo novo, conteúdo completo:

**`src/components/ui/typography/Typography.tsx`**
```tsx
import type { ReactNode } from "react";

/**
 * Primitivos de texto com a cor já resolvida para os dois temas.
 *
 * Por que isto existe: `body` (src/app/globals.css) não define uma cor de
 * texto padrão, e o tema escuro só troca o fundo (`dark:bg-gray-900`, em
 * src/app/layout.tsx). Qualquer texto sem classe de cor explícita nos DOIS
 * temas herda o preto padrão do navegador e fica ilegível sobre fundo
 * escuro — foi exatamente isso que quebrou as telas de Serviços Extras.
 *
 * Use estes componentes em vez de escrever `text-gray-*` à mão em títulos e
 * textos de apoio de telas do painel. Eles já usam o mesmo par claro/escuro
 * do resto do app (CursosPainel.tsx, TurmasPainel.tsx, MateriaPainel.tsx).
 */

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
      {children}
    </h1>
  );
}

export function PageDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
    </p>
  );
}

export function SectionDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400">{children}</p>
  );
}

/** Card de seção com borda/padding padrão, usado nos formulários do painel. */
export function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 ${className}`.trim()}
    >
      {children}
    </section>
  );
}
```

## 7. `CategoriasServicoPainel.tsx` — cores corrigidas

Sem `<select>` nativo neste arquivo (nada a trocar no item 3 aqui). Substitua **todo o conteúdo** do arquivo por este:

```tsx
"use client";
import { useEffect, useState } from "react";
import { academiaService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { CategoriaServico } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import { PageHeading, PageDescription } from "@/components/ui/typography/Typography";

export default function CategoriasServicoPainel() {
  const lista = useApi(academiaService.listarCategoriasServico);
  const criar = useApi(academiaService.criarCategoriaServico);
  const atualizar = useApi(academiaService.atualizarCategoriaServico);
  const desativar = useApi(academiaService.desativarCategoriaServico);
  const reativar = useApi(academiaService.reativarCategoriaServico);

  const [nome, setNome] = useState("");
  const [edicao, setEdicao] = useState<CategoriaServico | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = () => lista.execute();
  useEffect(() => { recarregar() }, []);

  const tratar = async (fn: () => Promise<unknown>) => {
    try {
      setErro(null);
      await fn();
      recarregar();
    } catch (e) {
      setErro(formatApiError(e, "Não foi possível salvar a categoria."));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <PageHeading>Categorias de Serviço</PageHeading>
        <PageDescription>Organize os serviços extras da academia.</PageDescription>
      </div>

      {erro && <Alert variant="error" title="Categorias" message={erro} />}

      <form
        className="flex max-w-xl gap-2"
        onSubmit={e => {
          e.preventDefault();
          if (nome.trim()) tratar(async () => { await criar.execute({ nome: nome.trim() }); setNome(""); });
        }}
      >
        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da categoria" />
        <Button>Adicionar categoria</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.data?.categorias_servico.map(c => (
              <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium text-gray-900 dark:text-white">
                  {edicao?.id === c.id ? (
                    <div className="flex gap-2">
                      <Input value={texto} onChange={e => setTexto(e.target.value)} />
                      <button
                        className="text-brand-600 dark:text-brand-400"
                        onClick={() => tratar(async () => { await atualizar.execute(c.id, { nome: texto }); setEdicao(null); })}
                      >
                        Salvar
                      </button>
                      <button className="text-gray-500 dark:text-gray-400" onClick={() => setEdicao(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : c.nome}
                </td>
                <td className="p-3 text-gray-500 dark:text-gray-400">{c.ativo ? "Ativo" : "Inativo"}</td>
                <td className="p-3">
                  <button
                    className="mr-3 text-brand-600 dark:text-brand-400"
                    onClick={() => { setEdicao(c); setTexto(c.nome); }}
                  >
                    Editar
                  </button>
                  <button
                    className="text-brand-600 dark:text-brand-400"
                    onClick={() => tratar(() => (c.ativo ? desativar : reativar).execute(c.id))}
                  >
                    {c.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Nada de lógica/comportamento mudou aqui — só cores e a extração de `h1`/`p` para os componentes da seção 6.

## 8. `ServicosExtrasPainel.tsx` — cores + SearchableSelect + Disponibilidade reconstruída

Este arquivo concentra os itens 2, 3 e 4. Substitua **todo o conteúdo** do arquivo por este:

```tsx
"use client";
import { useEffect, useState } from "react";
import { academiaService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import type {
  DetalhePersonalizado,
  MetodoPagamentoServico,
  ServicoExtra,
  ServicoExtraPayload,
  TipoCobrancaServico,
  TipoDetalhePersonalizado,
} from "@/types/api";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";
import { PageHeading, PageDescription, Section, SectionTitle, SectionDescription } from "@/components/ui/typography/Typography";

const tipos: [TipoDetalhePersonalizado, string][] = [
  ["texto", "Texto"],
  ["numero", "Número"],
  ["booleano", "Sim / Não"],
  ["data", "Data"],
  ["hora", "Hora"],
  ["lista_texto", "Lista de textos"],
];
const pay: MetodoPagamentoServico[] = ["GPO", "REF", "GPO_QR"];

// Mesma lista/rótulos de src/components/paineis/MateriaPainel.tsx — mantenha
// os dois em sincronia se a numeração de anos do fundamental mudar.
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

const formatarAnoLabel = (ano: string) =>
  ano.replace(/^(\d+)_ano_(.+)$/, (_, n, tipo) =>
    tipo === "fundamental" ? `${n}ª Classe` : `${n}º Ano ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`
  );

const slugify = (r: string, ks: string[]) => {
  const b = r.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "campo";
  const c = /^[a-z]/.test(b) ? b : `campo_${b}`;
  let x = c, i = 2;
  while (ks.includes(x)) x = `${c}_${i++}`;
  return x;
};
const padrao = (t: TipoDetalhePersonalizado): DetalhePersonalizado["valor"] =>
  t === "numero" ? 0 : t === "booleano" ? false : t === "lista_texto" ? [] : "";

type Form = {
  nome: string; descricao: string; categoriaServicoId: string | null; pago: boolean; preco: string;
  tipo: TipoCobrancaServico; metodos: MetodoPagamentoServico[]; taxa: boolean; valorTaxa: string;
  metodosTaxa: MetodoPagamentoServico[]; anosAcademicos: string[]; cursosDisponiveis: string[];
  documento: boolean; instrucoes: string; detalhesPersonalizados: Record<string, DetalhePersonalizado>;
};
const vazio: Form = {
  nome: "", descricao: "", categoriaServicoId: null, pago: false, preco: "", tipo: "unico",
  metodos: [], taxa: false, valorTaxa: "", metodosTaxa: [], anosAcademicos: [], cursosDisponiveis: [],
  documento: false, instrucoes: "", detalhesPersonalizados: {},
};
const paraForm = (s: ServicoExtra): Form => ({
  ...vazio,
  nome: s.nome,
  descricao: s.descricao ?? "",
  categoriaServicoId: s.categoria_servico_id ?? null,
  pago: s.pago,
  preco: s.preco?.toString() ?? "",
  tipo: s.tipo_cobranca ?? "unico",
  metodos: s.metodos_pagamento,
  taxa: s.tem_taxa_inscricao,
  valorTaxa: s.valor_taxa_inscricao?.toString() ?? "",
  metodosTaxa: s.metodos_pagamento_taxa_inscricao,
  anosAcademicos: s.anos_academicos_disponiveis ?? [],
  cursosDisponiveis: s.cursos_disponiveis ?? [],
  documento: s.documento_obrigatorio,
  instrucoes: s.documento_instrucoes ?? "",
  detalhesPersonalizados: s.detalhes_personalizados ?? {},
});
const valor = (f: Form): ServicoExtraPayload => ({
  nome: f.nome.trim(),
  descricao: f.descricao || undefined,
  categoria_servico_id: f.categoriaServicoId,
  pago: f.pago,
  preco: f.pago ? Number(f.preco) : undefined,
  tipo_cobranca: f.pago ? f.tipo : undefined,
  metodos_pagamento: f.pago ? f.metodos : [],
  tem_taxa_inscricao: f.taxa,
  valor_taxa_inscricao: f.taxa ? Number(f.valorTaxa) : undefined,
  metodos_pagamento_taxa_inscricao: f.taxa ? f.metodosTaxa : [],
  // Sempre presentes (mesmo []): o backend só atualiza o que vier no JSON da
  // requisição (partial update). Se estes campos forem omitidos ao editar,
  // uma restrição de anos/cursos já salva nunca poderia ser removida pela
  // UI — precisam ir sempre, mesmo vazios, para "limpar tudo" funcionar.
  anos_academicos_disponiveis: f.anosAcademicos,
  cursos_disponiveis: f.cursosDisponiveis,
  documento_obrigatorio: f.documento,
  documento_instrucoes: f.documento ? f.instrucoes : undefined,
  detalhes_personalizados: f.detalhesPersonalizados,
});

function Builder({ value, onChange }: { value: Record<string, DetalhePersonalizado>; onChange: (v: Record<string, DetalhePersonalizado>) => void }) {
  const upd = (k: string, p: Partial<DetalhePersonalizado>) => onChange({ ...value, [k]: { ...value[k], ...p } });
  return (
    <div className="space-y-3">
      {Object.entries(value).map(([k, d]) => (
        <div key={k} className="grid gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_140px_1fr_auto] dark:bg-gray-800">
          <Input value={d.rotulo} onChange={e => upd(k, { rotulo: e.target.value })} placeholder="Rótulo" />
          <SearchableSelect
            value={d.tipo}
            onChange={v => {
              const tipo = (v || "texto") as TipoDetalhePersonalizado;
              upd(k, { tipo, valor: padrao(tipo) });
            }}
            options={tipos.map(([v, l]) => ({ value: v, label: l }))}
            isClearable={false}
            isSearchable={false}
          />
          {d.tipo === "booleano" ? (
            <Checkbox label={d.valor ? "Sim" : "Não"} checked={!!d.valor} onChange={v => upd(k, { valor: v })} />
          ) : d.tipo === "lista_texto" ? (
            <Input
              value={(d.valor as string[]).join(", ")}
              onChange={e => upd(k, { valor: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })}
              placeholder="Itens separados por vírgula"
            />
          ) : (
            <Input
              type={d.tipo === "numero" ? "number" : d.tipo === "data" ? "date" : d.tipo === "hora" ? "time" : "text"}
              value={String(d.valor)}
              onChange={e => upd(k, { valor: d.tipo === "numero" ? Number(e.target.value) : e.target.value })}
            />
          )}
          <button type="button" className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400" onClick={() => { const { [k]: _, ...r } = value; onChange(r); }}>✕</button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => { const k = slugify("novo_campo", Object.keys(value)); onChange({ ...value, [k]: { rotulo: "", tipo: "texto", valor: "" } }); }}>
        + Adicionar personalização
      </Button>
    </div>
  );
}

export default function ServicosExtrasPainel() {
  const lista = useApi(academiaService.listarServicosExtras);
  const cats = useApi(academiaService.listarCategoriasServico);
  const cursosApi = useApi(academiaService.listarCursos);
  const criar = useApi(academiaService.criarServicoExtra);
  const atualizar = useApi(academiaService.atualizarServicoExtra);
  const nova = useApi(academiaService.criarCategoriaServico);
  const { user } = useUserCookie();

  const [form, setForm] = useState(vazio);
  const [edit, setEdit] = useState<ServicoExtra | null>(null);
  const [view, setView] = useState<"lista" | "form">("lista");
  const [alert, setAlert] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [nomeCat, setNomeCat] = useState("");
  const [cursoSelecionado, setCursoSelecionado] = useState("");

  useEffect(() => { lista.execute(); cats.execute(); cursosApi.execute(); }, []);

  const set = (x: Partial<Form>) => setForm(p => ({ ...p, ...x }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !Object.values(form.detalhesPersonalizados).every(d => d.rotulo.trim())) {
      return setAlert("Informe o nome e o rótulo de todas as personalizações.");
    }
    try {
      edit ? await atualizar.execute(edit.id, valor(form)) : await criar.execute(valor(form));
      setView("lista");
      lista.execute();
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível salvar."));
    }
  };

  const options = (cats.data?.categorias_servico ?? []).filter(c => c.ativo || c.id === form.categoriaServicoId).map(c => ({ value: c.id, label: c.nome }));

  const todosCursos = cursosApi.data?.cursos ?? [];
  const cursosAtivos = todosCursos.filter(c => c.status === "ativo");
  const nomeCurso = (id: string) => todosCursos.find(c => c.id === id)?.nome ?? id;
  const cursoEmEdicao = cursosAtivos.find(c => c.id === cursoSelecionado);

  const anosFundamentalDisponiveis = user?.academia?.anos_academicos?.filter(a => a.endsWith("_ano_fundamental")) ?? [];
  const anosFundamentalOpcoes = ANOS_FUNDAMENTAL.filter(a => anosFundamentalDisponiveis.includes(a.value));

  const toggleAnoFundamental = (ano: string) => {
    set({ anosAcademicos: form.anosAcademicos.includes(ano) ? form.anosAcademicos.filter(v => v !== ano) : [...form.anosAcademicos, ano] });
  };
  const toggleCursoAno = (cursoId: string, ano: string) => {
    const chave = `${cursoId}|${ano}`;
    set({ cursosDisponiveis: form.cursosDisponiveis.includes(chave) ? form.cursosDisponiveis.filter(v => v !== chave) : [...form.cursosDisponiveis, chave] });
  };
  const removerCursoAno = (chave: string) => set({ cursosDisponiveis: form.cursosDisponiveis.filter(v => v !== chave) });

  const botaoAnoClasse = (ativo: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
      ativo
        ? "bg-brand-500 text-white border-brand-500"
        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"
    }`;

  if (view === "form") {
    return (
      <div className="space-y-5">
        <PageHeading>{edit ? "Editar Serviço" : "Novo Serviço"}</PageHeading>
        {alert && <Alert variant="error" title="Serviços extras" message={alert} />}
        <form className="max-w-3xl space-y-5" onSubmit={salvar}>
          <Section>
            <SectionTitle>Informações básicas</SectionTitle>
            <SectionDescription>Identifique e descreva o serviço.</SectionDescription>
            <Input value={form.nome} onChange={e => set({ nome: e.target.value })} placeholder="Nome" />
            <SearchableSelect options={options} value={form.categoriaServicoId} onChange={v => set({ categoriaServicoId: v || null })} placeholder="Categoria" isClearable />
            <button type="button" className="text-sm text-brand-600 dark:text-brand-400" onClick={() => setModal(true)}>+ Nova categoria</button>
            <TextArea value={form.descricao} onChange={descricao => set({ descricao })} placeholder="Descrição" />
          </Section>

          <Section>
            <Checkbox label="Serviço pago" checked={form.pago} onChange={pago => set({ pago })} />
            {form.pago && (
              <>
                <Input type="number" value={form.preco} onChange={e => set({ preco: e.target.value })} placeholder="Preço" />
                <SearchableSelect
                  value={form.tipo}
                  onChange={v => set({ tipo: (v || "unico") as TipoCobrancaServico })}
                  options={[{ value: "unico", label: "Único" }, { value: "mensal", label: "Mensal" }]}
                  isClearable={false}
                  isSearchable={false}
                />
              </>
            )}
          </Section>

          <Section>
            <Checkbox label="Tem taxa de inscrição" checked={form.taxa} onChange={taxa => set({ taxa })} />
            {form.taxa && <Input type="number" value={form.valorTaxa} onChange={e => set({ valorTaxa: e.target.value })} placeholder="Valor da taxa" />}
          </Section>

          <Section>
            <SectionTitle>Disponibilidade</SectionTitle>
            <SectionDescription>Escolha para quais anos/cursos este serviço fica disponível. Nada selecionado = disponível para todos os estudantes.</SectionDescription>

            {anosFundamentalOpcoes.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Ensino Primário e Iº Ciclo</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {anosFundamentalOpcoes.map(a => (
                    <button key={a.value} type="button" onClick={() => toggleAnoFundamental(a.value)} className={botaoAnoClasse(form.anosAcademicos.includes(a.value))}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cursosAtivos.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Cursos (Médio / Superior)</SectionTitle>
                <SearchableSelect
                  value={cursoSelecionado}
                  onChange={v => setCursoSelecionado(v || "")}
                  options={[{ value: "", label: "Selecione um curso para adicionar anos" }, ...cursosAtivos.map(c => ({ value: c.id, label: c.nome }))]}
                  isClearable={false}
                />
                {cursoEmEdicao && (
                  <div className="flex flex-wrap gap-2">
                    {cursoEmEdicao.anos_academicos.map(ano => (
                      <button key={ano} type="button" onClick={() => toggleCursoAno(cursoEmEdicao.id, ano)} className={botaoAnoClasse(form.cursosDisponiveis.includes(`${cursoEmEdicao.id}|${ano}`))}>
                        {formatarAnoLabel(ano)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.cursosDisponiveis.length > 0 && (
              <div className="space-y-1">
                <SectionDescription>Anos de curso selecionados:</SectionDescription>
                <div className="flex flex-wrap gap-2">
                  {form.cursosDisponiveis.map(chave => {
                    const [cursoId, ano] = chave.split("|");
                    return (
                      <span key={chave} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        {nomeCurso(cursoId)} · {formatarAnoLabel(ano)}
                        <button type="button" onClick={() => removerCursoAno(chave)} className="text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-white" title="Remover">✕</button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {anosFundamentalOpcoes.length === 0 && cursosAtivos.length === 0 && (
              <SectionDescription>Nenhum ano acadêmico ou curso configurado ainda — configure em Gerenciamento antes de restringir a disponibilidade.</SectionDescription>
            )}
          </Section>

          <Section>
            <Checkbox label="Exige documento anexado na inscrição" checked={form.documento} onChange={documento => set({ documento })} />
            {form.documento && <TextArea value={form.instrucoes} onChange={instrucoes => set({ instrucoes })} placeholder="Instruções" />}
          </Section>

          <Section>
            <SectionTitle>Personalização adicional</SectionTitle>
            <SectionDescription>Adicione informações específicas deste serviço.</SectionDescription>
            <Builder value={form.detalhesPersonalizados} onChange={detalhesPersonalizados => set({ detalhesPersonalizados })} />
          </Section>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setView("lista")}>Cancelar</Button>
            <Button>Salvar</Button>
          </div>
        </form>

        <Modal isOpen={modal} onClose={() => setModal(false)} className="max-w-md p-6">
          <Input value={nomeCat} onChange={e => setNomeCat(e.target.value)} placeholder="Nome da categoria" />
          <Button
            className="mt-3"
            onClick={async () => {
              try {
                const r = await nova.execute({ nome: nomeCat });
                if (r?.data) set({ categoriaServicoId: r.data.id });
                setModal(false);
                setNomeCat("");
                cats.execute();
              } catch (e) {
                setAlert(formatApiError(e, "Não foi possível criar a categoria."));
              }
            }}
          >
            Salvar categoria
          </Button>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <PageHeading>Serviços Extras</PageHeading>
          <PageDescription>Gerencie os serviços adicionais.</PageDescription>
        </div>
        <Button onClick={() => { setEdit(null); setForm(vazio); setCursoSelecionado(""); setView("form"); }}>Novo Serviço</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              {["Nome", "Categoria", "Personalizações", "Ações"].map(x => (
                <th key={x} className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.data?.servicos_extras.map(s => (
              <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium text-gray-900 dark:text-white">{s.nome}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{cats.data?.categorias_servico.find(c => c.id === s.categoria_servico_id)?.nome ?? "-"}</td>
                <td
                  className="p-3 text-gray-500 dark:text-gray-400"
                  title={Object.values(s.detalhes_personalizados ?? {}).map(d => `${d.rotulo}: ${Array.isArray(d.valor) ? d.valor.join(", ") : String(d.valor)}`).join("; ")}
                >
                  {Object.keys(s.detalhes_personalizados ?? {}).length} personalizações
                </td>
                <td className="p-3">
                  <button
                    className="text-brand-600 dark:text-brand-400"
                    onClick={() => { setEdit(s); setForm(paraForm(s)); setCursoSelecionado(""); setView("form"); }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**O que mudou e por quê, resumido:**
- Imports novos: `useUserCookie` (para ler os anos do fundamental configurados na academia) e `SearchableSelect`, `Section`/`SectionTitle`/`SectionDescription`/`PageHeading`/`PageDescription`.
- `Form`, `vazio`, `paraForm`, `valor()` ganharam `anosAcademicos`/`cursosDisponiveis` — sem isso, o formulário nunca lê nem grava as restrições existentes (a causa exata do item 4).
- Os dois `<select>` nativos (tipo de personalização, tipo de cobrança) viraram `SearchableSelect`.
- A seção "Disponibilidade" saiu de um parágrafo fixo para os controles descritos na seção 3.4.
- Todo `text-gray-*`/título sem `dark:` foi corrigido para a paleta da seção 3.2 (via os componentes da seção 6 ou classes explícitas com o par completo).
- Nada na lógica de pagamento, taxa, documento obrigatório ou personalização (`Builder`) mudou.

## 9. Contrato de backend usado nesta tarefa (referência — não implementar nada aqui)

Confirmei linha a linha, contra o commit `72358c7` de `spuri-backend` (`origin/main` atual):

- `ServicoExtra.AnosAcademicosDisponiveis []string` e `.CursosDisponiveis []string` já existem no aggregate (`internal/domain/aggregates/servico_extra.go`), em `Criar`, `Atualizar`, nos dois eventos e em `applyCriado`/`applyAtualizado`.
- `validarAnosAcademicosServicoExtra` (mesmo arquivo) **só aceita sufixo `_ano_fundamental`** desde a Tarefa 87b — é por isso que a UI da seção 3.4 não oferece mais médio/superior soltos.
- `validarCursosDisponiveisServicoExtra` (mesmo arquivo) valida só o formato de `cursos_disponiveis` (UUID + sufixo `_ano_medio`/`_ano_superior`).
- `validarPosseCursosDisponiveis` (`internal/handlers/servico_extra_handlers.go`) valida, para cada item, que o curso existe, pertence à mesma academia, não está `deletado`, que `curso.Type` bate com o sufixo do ano (`medio`/`superior`), e que o ano está em `curso.AnosAcademicos` — chamada tanto em `CriarServicoExtra` quanto em `AtualizarServicoExtra` (só quando o campo veio informado). É por isso que os botões de ano na seção 3.4 vêm exatamente de `curso.anos_academicos` — qualquer ano que a tela ofereça já é válido para o backend.
- `estudanteElegivelServicoExtra` (mesmo arquivo) é chamada em `SolicitarServicoExtra` e passa a **aplicar de fato** a elegibilidade quando o serviço tem alguma restrição — isso já está em produção no backend e não depende de nada desta tarefa.
- `PUT /academia/servicos-extras/:id` só atualiza os campos presentes no corpo da requisição (`informado[k] = true` para toda chave presente no JSON, mesmo com valor vazio) — é a razão da decisão da seção 3.4 de sempre enviar as duas listas, mesmo `[]`.
- Migration 121 (`cursos_disponiveis TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`) já está aplicada — validei isto numa sessão anterior desta mesma investigação, rodando as 130 migrations do repositório em ordem contra um PostgreSQL 16 real, sem erro.

Nenhum arquivo de `spuri-backend` precisa ser tocado por esta tarefa.

## 10. Patch mecânico (opcional, equivalente às seções 5–8)

Está anexo `fix-servicos-extras-categorias-rota-cores-searchableselect-disponibilidade-frontend.patch` — o `git diff` exato de tudo que as seções 5 a 8 descrevem, gerado a partir do mesmo código que está neste documento (não há risco de divergência entre os dois). Já validei que ele aplica limpo com:

```
git apply fix-servicos-extras-categorias-rota-cores-searchableselect-disponibilidade-frontend.patch
```

contra o commit `84f0336` (HEAD atual de `origin/main` no momento em que escrevi isto), num clone novo e independente. Se `main` tiver avançado e o patch não aplicar mais de forma limpa, ignore-o e siga as instruções "Localizar/Substituir por" das seções 5–8 (procure pelo conteúdo citado, não por número de linha).

## 11. O que já validei (Claude) × o que falta validar (Codex)

### 11.1 Já validado
- `npx tsc --noEmit`: 0 erros (duas vezes, incluindo num clone novo e independente com o patch aplicado do zero).
- `npx eslint` nos arquivos alterados/criados: 0 erros; os 2 warnings de `exhaustive-deps` são pré-existentes (confirmado com `git stash` no arquivo original).
- `git apply --check`: limpo contra o HEAD real e atual de `spuripainel` (`84f0336`).
- Nenhuma sobreposição entre esta tarefa e trabalho concorrente recente em nenhum dos dois repositórios.
- Contrato de backend (seção 9): lido função por função contra o HEAD real e atual de `spuri-backend` (`72358c7`).
- Migrations do backend (001–130, incluindo a 121 de `cursos_disponiveis`): aplicadas com sucesso contra PostgreSQL 16 real, numa sessão anterior desta mesma investigação.

### 11.2 Falta validar (Codex)
- `npm run build` completo (ver observação sobre `fonts.googleapis.com` na seção 0 — se o seu ambiente tiver rede para lá, deve passar; se não, o erro específico de fonte não é desta tarefa, mas confira se não aparece mais nada além disso).
- Teste manual/visual no navegador: logar como `academia`, abrir `/servicos-extras/categorias-servico` e `/servicos-extras/gerenciar-servicos`, alternar tema claro/escuro e confirmar que todo texto fica legível nos dois; criar um serviço novo marcando anos do fundamental **e** anos de um curso médio ao mesmo tempo, salvar, reabrir para editar e confirmar que a seleção persistiu; desmarcar tudo e salvar de novo, confirmar que a restrição foi de fato removida (não só na tela — reabrir e ver vazio).
- Se possível, confirmar no dashboard do Render/Vercel que o deploy do backend em produção já está no commit `72358c7` ou mais recente (esta tarefa assume que sim, mas não tenho acesso para confirmar deploy, só o código-fonte do repositório).

## 12. Checklist de aceite

- [ ] `/servicos-extras/categorias-servico` funciona e `/gerenciamento/categorias-servico` deixou de existir.
- [ ] Rota nova protegida por `academia` em `route-guards.ts`; item de menu movido em `AppSidebar.tsx` (3 alterações da seção 5.4); título órfão removido de `gerenciamento/layout.tsx`.
- [ ] `CategoriasServicoPainel.tsx` e `ServicosExtrasPainel.tsx` legíveis em tema claro e escuro (nenhum texto sem `dark:` correspondente).
- [ ] `src/components/ui/typography/Typography.tsx` criado e usado nos dois arquivos acima.
- [ ] Os 2 `<select>` nativos de `ServicosExtrasPainel.tsx` viraram `SearchableSelect`.
- [ ] Seção "Disponibilidade" permite marcar anos do fundamental e anos de curso (médio/superior) combinados, mostra os já selecionados e permite remover.
- [ ] `anos_academicos_disponiveis` e `cursos_disponiveis` sempre presentes no payload de criar/atualizar, mesmo vazios.
- [ ] `npx tsc --noEmit` sem erros.
- [ ] `npm run lint` sem erros novos (warnings pré-existentes de `exhaustive-deps` são aceitáveis).
- [ ] `npm run build` tentado e resultado documentado (sucesso, ou falha isolada de `fonts.googleapis.com` sem mais nada).

## Procedimento de conclusão

Ao terminar, rode `npx tsc --noEmit`, `npm run lint` e `npm run build`, corrija qualquer erro real (não relacionado a `fonts.googleapis.com`), preencha o checklist da seção 12, e relate o que passou e o que não pôde ser testado no seu ambiente (e por quê). Seguindo o padrão já usado neste repositório para tarefas concluídas, apague este arquivo e o `.patch` anexo de `src/docs/` depois de aplicados.
