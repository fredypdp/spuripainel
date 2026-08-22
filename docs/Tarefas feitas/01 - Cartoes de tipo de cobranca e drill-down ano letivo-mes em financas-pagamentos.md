---
criado: 2026-08-22 00:00
origem: Pedido do usuário (Spuri), orquestrado por Claude (Anthropic) em sandbox com Node 22, tsc, ESLint e `next build` reais
status: feito
prioridade: alta
depende_de:
  - "spuri-backend: tarefa 59 (já mesclada em origin/main) — pendencias_sem_cobranca e filtros turma_id/curso_id/ano_academico/ano_letivo em GET /financeiro/cobrancas"
  - "spuri-backend: tarefa 60 (entregue no mesmo lote deste documento) — filtro mes em GET /financeiro/cobrancas"
---

# Cartões de tipo de cobrança + drill-down ano letivo/mês em /financas/pagamentos

## 0. Leia isto primeiro

**Dependência de backend obrigatória.** Esta tarefa só funciona corretamente depois que a tarefa 60 do
`spuri-backend` (filtro `mes` em `GET /financeiro/cobrancas`) estiver aplicada — sem ela, o parâmetro `mes`
que este documento adiciona ao cliente HTTP simplesmente não tem efeito nenhum no servidor (a chamada
funciona, mas devolve o ano letivo inteiro em vez de só o mês selecionado). A tarefa 59 (pendências sem
cobrança + os outros quatro filtros de escopo) já está mesclada em `origin/main` do `spuri-backend` — isso
foi confirmado antes deste documento ser escrito.

**O que já foi validado por Claude antes de este documento ser escrito**, num sandbox com Node 22 real
(não apenas lido/inferido):

1. `npm install` — dependências já instaladas e funcionando.
2. `npx tsc --noEmit` — o projeto inteiro (não só os arquivos tocados) compila limpo, tanto ANTES quanto
   DEPOIS das mudanças descritas abaixo.
3. `npx eslint` nos três arquivos tocados — limpo.
4. `npm run build` (`next build`, Turbopack) — o projeto inteiro builda com sucesso, incluindo a página
   `/financas/pagamentos` pré-renderizada estaticamente (`○ /financas/pagamentos` na saída do build).
   Observação sobre esse build: o sandbox onde Claude testou não tem acesso a `fonts.googleapis.com` (rede
   restrita), então o build real precisou de um stub temporário só para a fonte `Outfit` em
   `src/app/layout.tsx` — **revertido antes de fechar o diff final**, não faz parte desta tarefa e não deve
   ser replicado. Isso não tem nenhuma relação com o código desta tarefa; é só uma limitação de rede do
   sandbox de validação. Se o seu ambiente (Codex) também não tiver acesso a `fonts.googleapis.com`, o
   mesmo erro vai aparecer em QUALQUER build deste repositório, não só nesta tarefa — não é algo para
   corrigir aqui.

Trate o desenho abaixo (diffs exatos + conteúdo completo do componente reescrito) como já correto e
testado, não como uma proposta a reavaliar.

---

## 1. Prompt recomendado para executar esta tarefa

Aplique exatamente os diffs descritos na seção 4 e substitua o arquivo `FinanceiroPagamentosPainel.tsx` pelo
conteúdo completo da seção 5, sem alterar o desenho (nomes de função, estrutura de telas, nomes de campo).
Depois de aplicar, confirme `npx tsc --noEmit`, `npx eslint` nos arquivos tocados e `npm run build` limpos,
confirme com `git status --short` que só os arquivos listados na seção 7 foram alterados, e gere a
documentação de tarefa concluída, movendo este arquivo para uma pasta `docs/Tarefas feitas/` (criando-a se
não existir) com `status: feito`.

---

## 2. Contexto

`/financas/pagamentos` (`FinanceiroPagamentosPainel.tsx`) hoje escolhe o tipo de cobrança (Mensalidade /
Matrícula / Outros) por um `<SearchableSelect>` comum, e lista as cobranças correspondentes numa tabela
paginada — sem nenhuma noção de ano letivo ou mês, e sem mostrar as pendências de mensalidade que nunca
tiveram nenhuma cobrança criada (o `spuri-backend` só passou a expor isso na tarefa 59; o frontend ainda não
usa).

`/financas/configuracoes` (`FinanceiroConfiguracoesPainel.tsx`) já usa um padrão de navegação por cartões em
vez de `<select>`: um menu inicial com `SubtelaCard`/`SubtelasMenu` (grade de cartões clicáveis) que abre uma
subtela (`SubtelaPanel`, com botão "Voltar", sem pop-up/modal). Esse padrão — e os componentes reutilizáveis
que o implementam, em `financeiroShared.tsx` — é o que esta tarefa estende para `/financas/pagamentos`, indo
um passo além: um drill-down de 3 níveis (tipo → ano letivo → mês) só para Mensalidade/Propina, já que é a
única origem de cobrança com o conceito de "ano letivo" e "mês do período escolar".

### O que muda, exatamente

1. O `<select>` de "Tipo de cobrança" vira 3 cartões clicáveis (mesmo componente `SubtelasMenu` de
   `/financas/configuracoes`): **Mensalidade/Propina**, **Taxa de matrícula**, **Outros**.
2. Clicar em **Mensalidade/Propina** abre uma subtela com um cartão por ano letivo que a academia já teve
   (fonte: `academiaService.listarAnosLetivosLista`, a mesma já usada em
   `FinanceiroConfiguracoesPainel.tsx`).
3. Selecionar um ano letivo abre outra subtela com um cartão por mês do período escolar **fixo do
   sistema** — do mês de início do tipo de ano letivo (escolar → setembro; superior → outubro) até julho —
   nomeados "[Mês] de [ano]", respeitando a regra de que os primeiros meses (set-dez) são do ano civil que
   abre o ano letivo e os últimos (jan-jul) são do ano civil seguinte. Exemplo do pedido original: ano letivo
   `2025_2026` → "Setembro de 2025" ... "Dezembro de 2025", "Janeiro de 2026" ... "Julho de 2026".
4. Selecionar um mês mostra, finalmente, a lista de cobranças daquele ano letivo + mês, em **todos os
   estados** (o filtro de estado que já existia continua disponível, agora só para refinar dentro do
   mês) — e, abaixo da tabela, as pendências sem cobrança daquele mês específico (novo, via
   `pendencias_sem_cobranca` da tarefa 59/60 do backend).
5. Clicar em **Taxa de matrícula** ou **Outros** vai direto para a listagem (mesmo passo 4, sem os passos
   2-3, e sem a seção de pendências — essa só existe para mensalidade).

---

## 3. Decisões de design já tomadas

**#1 — Meses fixos calculados no cliente, sem chamada de API extra.** A regra "setembro/outubro até julho"
já existe, **duplicada de forma independente**, em dois lugares do backend: `mesesAnoLetivo()` em
`internal/finance/mensalidade.go` e `periodoLetivoEscolar`/`periodoLetivoSuperior` em
`internal/handlers/ano_letivo_helpers.go` — ambos hardcoded, não configuráveis por academia. Por isso o
frontend replica a mesma regra como uma função pura (`mesesDoAnoLetivo`), sem precisar de nenhum endpoint
novo: só precisa saber o `tipo` (`'escolar' | 'superior'`) do ano letivo selecionado, que já vem em cada
entrada de `academiaService.listarAnosLetivosLista()` — confirmado no backend
(`internal/projections/academia_projection.go`, campo `Tipo string \`json:"tipo"\`` sem `omitempty`, sempre
populado e validado como exatamente `"escolar"` ou `"superior"` na escrita).

**#2 — Pendências em tabela separada, não misturadas com `CobrancasTable`.** Uma pendência sem cobrança
(`MensalidadeMesView`) não tem `id` de cobrança real, nem status AppyPay, nem faz sentido ter os botões "Ver
detalhes"/"Cancelar" (não há nada ainda para ver ou cancelar). Por isso ela é renderizada numa tabela nova e
simples (`PendenciasSemCobrancaTable`, definida dentro do próprio arquivo, sem alterar `financeiroShared.tsx`
— nenhum outro painel precisa dela ainda), abaixo da tabela de cobranças, só quando `origem === "mensalidade"`.
Mesma filosofia que o backend já usa (pendências num campo JSON separado, não misturadas no array de
cobranças).

**#3 — Ordenação dos anos letivos: mais recente primeiro.** `anos_letivos_lista` não vem garantidamente
ordenado do jeito que a UI quer (é gravado em ordem de ativação, cronológica crescente); o componente
ordena decrescente (`b.ano_letivo.localeCompare(a.ano_letivo)`) porque o caso de uso mais comum é consultar
o ano letivo atual ou o mais recente, não um ano letivo antigo.

**#4 — O filtro de estado continua existindo, só muda de lugar.** Ele não fazia parte do pedido de troca
"select → cartões" (que era só sobre o tipo de cobrança) — continua um `<SearchableSelect>` normal, agora
dentro da subtela de listagem final, não mais lado a lado com o (removido) select de tipo.

**#5 — Nenhuma mudança em `financeiroShared.tsx`.** Todos os componentes reutilizados (`SubtelaCard`,
`SubtelasMenu`, `SubtelaPanel`, `CobrancasTable`, `EmptyState`, `LoadingState`, `PaginacaoSetas`,
`SubtelaDetalheCobranca`, `formatAnoLetivo`, `money`) já existiam prontos, exatamente com a forma necessária
— nada precisou ser alterado ou estendido lá.

---

## 4. Diffs exatos — `src/types/api.ts` e `src/lib/api/services.ts`

### 4.1 — `src/types/api.ts`

**Localizar:**

```ts
export interface ListarCobrancasParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
  estado?: string[];
  tipo?: FinanceiroOrigemCobranca[];
  limit?: number;
  offset?: number;
}

export interface ListarCobrancasResponse {
  cobrancas: CobrancaResumo[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
}
```

**Substituir por:**

```ts
export interface ListarCobrancasParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
  estado?: string[];
  tipo?: FinanceiroOrigemCobranca[];
  /** Restringe a cobranças de mensalidade vinculadas a esta turma (tarefa 59/60 do backend). */
  turma_id?: string;
  /** Restringe a cobranças de mensalidade vinculadas a este curso. */
  curso_id?: string;
  /** Restringe a cobranças de mensalidade deste ano/classe (ex.: "7_ano_fundamental"). */
  ano_academico?: string;
  /** Restringe a cobranças de mensalidade deste ano letivo (ex.: "2026_2027"). */
  ano_letivo?: string;
  /** Restringe a um mês de calendário (1-12) — só tem efeito combinado com pelo menos um dos quatro filtros acima. */
  mes?: number;
  limit?: number;
  offset?: number;
}

export interface ListarCobrancasResponse {
  cobrancas: CobrancaResumo[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
  /**
   * Meses de mensalidade em estado "pendente" que NUNCA tiveram nenhuma
   * tentativa de cobrança — por isso não aparecem em `cobrancas` (que só
   * lista tentativas de cobrança já feitas, com sucesso ou não). Só vem
   * preenchido quando a consulta usa pelo menos um dos filtros de escopo
   * (turma_id, curso_id, ano_academico ou ano_letivo); do contrário fica
   * ausente. Ver GET /financeiro/cobrancas.
   */
  pendencias_sem_cobranca?: MensalidadeMesView[];
}
```

(`MensalidadeMesView` já existe no mesmo arquivo, definida antes de `ListarCobrancasParams` — não precisa de
nenhum import novo.)

### 4.2 — `src/lib/api/services.ts`

**Localizar** (dentro de `financeiroService.listarCobrancas`):

```ts
  listarCobrancas: (params: ListarCobrancasParams, token?: string) => {
    const qs = new URLSearchParams();
    if (params.contexto_tipo) qs.set('contexto_tipo', params.contexto_tipo);
    if (params.codigo_academia) qs.set('codigo_academia', params.codigo_academia);
    params.estado?.forEach((e) => qs.append('estado', e));
    params.tipo?.forEach((t) => qs.append('tipo', t));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    return api.get<ListarCobrancasResponse>(`/financeiro/cobrancas${qs.toString() ? `?${qs.toString()}` : ''}`, { token: token || tokenStorage.get() || undefined });
  },
```

**Substituir por:**

```ts
  listarCobrancas: (params: ListarCobrancasParams, token?: string) => {
    const qs = new URLSearchParams();
    if (params.contexto_tipo) qs.set('contexto_tipo', params.contexto_tipo);
    if (params.codigo_academia) qs.set('codigo_academia', params.codigo_academia);
    params.estado?.forEach((e) => qs.append('estado', e));
    params.tipo?.forEach((t) => qs.append('tipo', t));
    if (params.turma_id) qs.set('turma_id', params.turma_id);
    if (params.curso_id) qs.set('curso_id', params.curso_id);
    if (params.ano_academico) qs.set('ano_academico', params.ano_academico);
    if (params.ano_letivo) qs.set('ano_letivo', params.ano_letivo);
    if (params.mes != null) qs.set('mes', String(params.mes));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    return api.get<ListarCobrancasResponse>(`/financeiro/cobrancas${qs.toString() ? `?${qs.toString()}` : ''}`, { token: token || tokenStorage.get() || undefined });
  },
```

Esta tarefa **não** mexe em `ListarCobrancasEstudanteParams` nem em `consultarCobrancasEstudante` — só a
rota agregada (`/financeiro/cobrancas`) é usada por `/financas/pagamentos`; a rota por estudante
(`/financeiro/cobrancas/estudante/:codigo`) é usada por outra tela (`EstudantePagamentosPainel.tsx`), fora do
escopo deste pedido.

---

## 5. Arquivo a substituir por completo — `src/components/paineis/FinanceiroPagamentosPainel.tsx`

Substitua o conteúdo inteiro do arquivo pelo abaixo (é uma reescrita completa; não faça merge parcial com o
conteúdo atual):

```tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  PaginacaoSetas,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  SubtelasMenu,
  formatAnoLetivo,
  money,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroOrigemCobranca, MensalidadeMesView } from "@/types/api";

const PAGE_SIZE = 30;

const ESTADO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

/** Nomes reais dos meses em pt-AO — mesmo padrão de MES_NOME_OPCOES em FinanceiroConfiguracoesPainel.tsx. */
const NOME_MES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1))
);
function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type MesDoAnoLetivo = { mes: number; ano: number; label: string };

/**
 * Meses fixos do sistema de um ano letivo, dado o tipo da academia
 * (escolar ou superior) — mesma regra de mesesAnoLetivo() no backend
 * (internal/finance/mensalidade.go) e de periodoLetivoEscolar/
 * periodoLetivoSuperior (internal/handlers/ano_letivo_helpers.go):
 * escolar começa em setembro, superior em outubro; os dois terminam em
 * julho — sempre do ano civil ANTERIOR (setembro/outubro) ao ano civil
 * SEGUINTE (janeiro-julho) dentro do mesmo ano letivo. Não é configurável
 * por academia: é a mesma regra para todas, por isso não depende de
 * nenhuma chamada extra à API além de saber o tipo do ano letivo
 * selecionado.
 */
function mesesDoAnoLetivo(anoLetivo: string, tipo: "escolar" | "superior"): MesDoAnoLetivo[] {
  const anoInicio = Number(anoLetivo.slice(0, 4));
  const anoFim = anoInicio + 1;
  const mesInicio = tipo === "superior" ? 10 : 9;
  const meses: MesDoAnoLetivo[] = [];
  for (let m = mesInicio; m <= 12; m++) meses.push({ mes: m, ano: anoInicio, label: `${capitalizar(NOME_MES[m - 1])} de ${anoInicio}` });
  for (let m = 1; m <= 7; m++) meses.push({ mes: m, ano: anoFim, label: `${capitalizar(NOME_MES[m - 1])} de ${anoFim}` });
  return meses;
}

/**
 * Tabela de pendências de mensalidade sem cobrança — estudantes que devem
 * aquele mês mas nunca geraram (nem tentaram gerar) nenhuma cobrança para
 * ele. Não reaproveita CobrancasTable porque uma pendência não é uma
 * cobrança: não tem id real, nem status AppyPay, nem ação de "ver
 * detalhes"/"cancelar" (não há nada ainda para ver ou cancelar). Sempre em
 * estado "pendente" — o próprio backend só devolve entradas pendentes aqui
 * (ver finance.PendenciasSemCobranca).
 */
function PendenciasSemCobrancaTable({ pendencias }: { pendencias: MensalidadeMesView[] }) {
  if (pendencias.length === 0) return null;
  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center gap-2">
        <Icon icon="mdi:alert-circle-outline" width={18} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Pendências sem cobrança ({pendencias.length})
        </h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Estudantes que devem este mês mas ainda não geraram (nem tentaram gerar) nenhuma cobrança — por isso não aparecem na tabela de cobranças acima.
      </p>
      <div className="overflow-x-auto">
        <Table className="w-full text-left">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {["Estudante", "Valor", ""].map((h) => (
                <TableCell key={h || "estado"} isHeader className="px-3 py-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {pendencias.map((p) => (
              <TableRow key={`${p.codigo_estudante}-${p.ano_letivo}-${p.mes}`}>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{p.codigo_estudante}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{money(p.valor)}</TableCell>
                <TableCell className="px-3 py-2">
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Pendente — sem cobrança criada
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type Tela = "menu" | "mensalidade-ano" | "mensalidade-mes" | "lista";

/**
 * Painel de pagamentos para academia e admin (FPP).
 *
 * Dividido em subtelas a partir de um menu de cartões (mesmo padrão de
 * FinanceiroConfiguracoesPainel — nada de <select> para escolher o tipo de
 * cobrança): Mensalidade/Propina abre um drill-down adicional de ano
 * letivo → mês antes de chegar na listagem; Taxa de matrícula e Outros vão
 * direto para a listagem, sem esse passo extra (uma cobrança de matrícula
 * ou avulsa não tem o conceito de "mês do ano letivo").
 *
 * A listagem final sempre mostra TODOS os estados (Pago/Pendente/Falhado/
 * Cancelado) — o filtro de estado que já existia continua disponível para
 * quem quiser restringir mais. Para Mensalidade, a listagem também traz,
 * abaixo da tabela de cobranças, as pendências sem cobrança daquele mês
 * específico (ver PendenciasSemCobrancaTable) — o motivo de existir o
 * drill-down por ano letivo/mês: sem um mês específico selecionado, o
 * backend não computa pendências (evita varredura de toda a academia sem
 * limite) e a paginação da tabela de cobranças não seria confiável.
 *
 * Admin (FPP): ainda não existe tipo de cobrança específico para o Spuri,
 * então a tela mostra apenas um aviso "indisponível no momento" — igual a
 * antes desta tarefa.
 */
export default function FinanceiroPagamentosPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [tela, setTela] = useState<Tela>("menu");
  const [origem, setOrigem] = useState<FinanceiroOrigemCobranca | null>(null);
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState<string | null>(null);
  const [tipoAnoLetivoSelecionado, setTipoAnoLetivoSelecionado] = useState<"escolar" | "superior" | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesDoAnoLetivo | null>(null);
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [alert, setAlert] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<CobrancaResumo | null>(null);

  const [anosLetivos, setAnosLetivos] = useState<{ ano_letivo: string; tipo: "escolar" | "superior" }[]>([]);
  const [anosLetivosCarregando, setAnosLetivosCarregando] = useState(false);
  const [anosLetivosErro, setAnosLetivosErro] = useState<string | null>(null);

  const list = useApi(financeiroService.listarCobrancas);
  const cancelApi = useApi(financeiroService.cancelarCobranca);

  useEffect(() => {
    if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia);
  }, [user?.academia?.codigo_academia]);

  // Anos letivos que a academia já teve — carregado uma vez, reaproveitado
  // sempre que o cartão "Mensalidade / Propina" é aberto. Mesma fonte já
  // usada em FinanceiroConfiguracoesPainel (DefinirInicioCobrancaForm).
  useEffect(() => {
    if (!codigoAcademia) return;
    setAnosLetivosCarregando(true);
    setAnosLetivosErro(null);
    academiaService
      .listarAnosLetivosLista({ codigo_academia: codigoAcademia })
      .then((r) => {
        const lista = (r?.anos_letivos_lista ?? [])
          .map((a) => ({ ano_letivo: a.ano_letivo, tipo: (a.tipo ?? a.type) as "escolar" | "superior" | undefined }))
          .filter((a): a is { ano_letivo: string; tipo: "escolar" | "superior" } => !!a.ano_letivo && (a.tipo === "escolar" || a.tipo === "superior"))
          .sort((a, b) => b.ano_letivo.localeCompare(a.ano_letivo));
        setAnosLetivos(lista);
      })
      .catch((e) => setAnosLetivosErro(formatApiError(e, "Não foi possível carregar os anos letivos.")))
      .finally(() => setAnosLetivosCarregando(false));
  }, [codigoAcademia]);

  const parametros = useMemo(
    () => ({
      contexto_tipo: "academia" as const,
      codigo_academia: codigoAcademia || undefined,
      limit: PAGE_SIZE,
      offset: (pagina - 1) * PAGE_SIZE,
      tipo: origem ? [origem] : undefined,
      estado: estado ? [estado] : undefined,
      ano_letivo: origem === "mensalidade" && anoLetivoSelecionado ? anoLetivoSelecionado : undefined,
      mes: origem === "mensalidade" && mesSelecionado ? mesSelecionado.mes : undefined,
    }),
    [codigoAcademia, origem, estado, pagina, anoLetivoSelecionado, mesSelecionado]
  );

  const carregar = useCallback(() => {
    if (!codigoAcademia || tela !== "lista") return Promise.resolve();
    return list.execute(parametros).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar as cobranças.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoAcademia, tela, parametros]);

  useEffect(() => {
    if (!loading && isAcademia) void carregar();
  }, [loading, isAcademia, carregar]);

  const abrirLista = (o: FinanceiroOrigemCobranca) => {
    setAlert(null);
    setOrigem(o);
    setEstado("");
    setPagina(1);
    if (o !== "mensalidade") {
      setAnoLetivoSelecionado(null);
      setTipoAnoLetivoSelecionado(null);
      setMesSelecionado(null);
    }
    setTela(o === "mensalidade" ? "mensalidade-ano" : "lista");
  };

  const selecionarAnoLetivo = (anoLetivo: string, tipo: "escolar" | "superior") => {
    setAnoLetivoSelecionado(anoLetivo);
    setTipoAnoLetivoSelecionado(tipo);
    setMesSelecionado(null);
    setTela("mensalidade-mes");
  };

  const selecionarMes = (m: MesDoAnoLetivo) => {
    setMesSelecionado(m);
    setEstado("");
    setPagina(1);
    setTela("lista");
  };

  if (loading) return <LoadingState label="Carregando pagamentos..." />;

  if (!isAcademia && !isFpp) {
    return (
      <UnauthorizedAccess
        requiredTypes={["Admin FPP", "Academia"]}
        message="O módulo financeiro é exclusivo de administradores com papel FPP e de academias."
      />
    );
  }

  if (isFpp) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ainda não existe um tipo de cobrança específico para o Spuri — indisponível no momento.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (selecionada) {
    return (
      <SubtelaDetalheCobranca
        cobranca={selecionada}
        onVoltar={() => setSelecionada(null)}
        mostrarDadosEstudante
      />
    );
  }

  if (tela === "menu") {
    return (
      <div className="space-y-6">
        {alert && <Alert variant="error" title="Finanças" message={alert} />}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-4 flex items-start gap-3">
            <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Escolha o tipo de cobrança para consultar.</p>
            </div>
          </div>
          <SubtelasMenu
            opcoes={[
              { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Mensalidade / Propina", descricao: "Consultar por ano letivo e mês.", onClick: () => abrirLista("mensalidade") },
              { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Todas as cobranças de matrícula, em todos os estados.", onClick: () => abrirLista("matricula") },
              { id: "avulsa", icon: "mdi:cash-multiple", label: "Outros", descricao: "Cobranças avulsas, em todos os estados.", onClick: () => abrirLista("avulsa") },
            ]}
          />
        </section>
      </div>
    );
  }

  if (tela === "mensalidade-ano") {
    return (
      <SubtelaPanel title="Mensalidade / Propina — selecione o ano letivo" icon="mdi:calendar-month-outline" onVoltar={() => setTela("menu")}>
        {anosLetivosCarregando ? (
          <LoadingState label="Carregando anos letivos..." />
        ) : anosLetivosErro ? (
          <Alert variant="error" title="Finanças" message={anosLetivosErro} />
        ) : anosLetivos.length === 0 ? (
          <EmptyState title="Nenhum ano letivo encontrado." description="Esta academia ainda não teve nenhum ano letivo definido." />
        ) : (
          <SubtelasMenu
            opcoes={anosLetivos.map((a) => ({
              id: a.ano_letivo,
              icon: "mdi:calendar-blank-outline",
              label: formatAnoLetivo(a.ano_letivo),
              descricao: a.tipo === "superior" ? "Ano letivo de ensino superior" : "Ano letivo escolar",
              onClick: () => selecionarAnoLetivo(a.ano_letivo, a.tipo),
            }))}
          />
        )}
      </SubtelaPanel>
    );
  }

  if (tela === "mensalidade-mes" && anoLetivoSelecionado && tipoAnoLetivoSelecionado) {
    const meses = mesesDoAnoLetivo(anoLetivoSelecionado, tipoAnoLetivoSelecionado);
    return (
      <SubtelaPanel title={`Mensalidade / Propina — ${formatAnoLetivo(anoLetivoSelecionado)} — selecione o mês`} icon="mdi:calendar-month-outline" onVoltar={() => setTela("mensalidade-ano")}>
        <SubtelasMenu
          opcoes={meses.map((m) => ({
            id: `${m.ano}-${m.mes}`,
            icon: "mdi:calendar-today-outline",
            label: m.label,
            descricao: "Ver cobranças e pendências deste mês.",
            onClick: () => selecionarMes(m),
          }))}
        />
      </SubtelaPanel>
    );
  }

  const totalGeral = list.data?.total_geral ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalGeral / PAGE_SIZE));
  const cobrancas = list.data?.cobrancas ?? [];
  const pendencias = list.data?.pendencias_sem_cobranca ?? [];

  const tituloLista =
    origem === "mensalidade" && anoLetivoSelecionado && mesSelecionado
      ? `Mensalidade / Propina — ${mesSelecionado.label}`
      : origem === "matricula"
      ? "Taxa de matrícula"
      : "Outros";
  const iconeLista = origem === "mensalidade" ? "mdi:calendar-month-outline" : origem === "matricula" ? "mdi:school-outline" : "mdi:cash-multiple";
  const voltarLista = () => (origem === "mensalidade" ? setTela("mensalidade-mes") : setTela("menu"));

  return (
    <SubtelaPanel title={tituloLista} icon={iconeLista} onVoltar={voltarLista}>
      {alert && <Alert variant="error" title="Finanças" message={alert} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchableSelect
          value={estado}
          options={ESTADO_OPCOES}
          onChange={(v) => {
            setEstado(v);
            setPagina(1);
          }}
          placeholder="Estado do pagamento"
          isSearchable={false}
          isClearable={false}
          inputId="pagamentos-estado"
          name="pagamentos-estado"
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <LoadingState label="Carregando pagamentos..." />
        ) : cobrancas.length > 0 ? (
          <CobrancasTable
            rows={cobrancas}
            onOpen={setSelecionada}
            onCancelar={async (cobranca, motivo) => {
              await cancelApi.execute(cobranca.id, motivo);
              await carregar();
            }}
          />
        ) : (
          <EmptyState title="Nenhuma cobrança encontrada." description="Ajuste os filtros ou aguarde novas cobranças serem criadas." />
        )}
      </div>

      <div className="mt-4">
        <PaginacaoSetas
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          total={totalGeral}
          porPagina={PAGE_SIZE}
          onChange={setPagina}
        />
      </div>

      {origem === "mensalidade" && <PendenciasSemCobrancaTable pendencias={pendencias} />}
    </SubtelaPanel>
  );
}
```

---

## 6. Ordem de execução recomendada

1. `src/types/api.ts` — diff da seção 4.1.
2. `src/lib/api/services.ts` — diff da seção 4.2.
3. `src/components/paineis/FinanceiroPagamentosPainel.tsx` — substituir pelo conteúdo completo da seção 5.
4. Rodar a checklist da seção 7.

---

## 7. Checklist de aceitação

1. **TypeScript limpo:** `npx tsc --noEmit` sem nenhuma saída de erro.
2. **ESLint limpo:** `npx eslint src/components/paineis/FinanceiroPagamentosPainel.tsx src/types/api.ts src/lib/api/services.ts` sem nenhuma saída.
3. **Build de produção:** `npm run build` termina com sucesso, com `○ /financas/pagamentos` (ou `● /financas/pagamentos`, dependendo da versão do Next) aparecendo na tabela de rotas da saída, sem erro. Se o seu ambiente não tiver acesso a `fonts.googleapis.com`, o build vai falhar por causa da fonte `Outfit` em `src/app/layout.tsx` — isso **não é um problema desta tarefa** (ver seção 0); nesse caso, valide só com os itens 1 e 2 e registre a limitação de rede na documentação final, sem tentar "corrigir" `layout.tsx`.
4. **Diff final** — `git status --short` deve mostrar exatamente estes três arquivos modificados (`M`), e
   nenhum arquivo novo, nenhum lockfile (`package-lock.json`/`yarn.lock`) alterado:
   - `src/types/api.ts`
   - `src/lib/api/services.ts`
   - `src/components/paineis/FinanceiroPagamentosPainel.tsx`

---

## 8. Evidência de validação (já executada por Claude)

```
$ npx tsc --noEmit         # limpo, antes e depois das mudanças
$ npx eslint src/components/paineis/FinanceiroPagamentosPainel.tsx src/types/api.ts src/lib/api/services.ts
                            # limpo
$ npm run build             # sucesso; /financas/pagamentos pré-renderizada estaticamente
  Route (app)
  ...
  ├ ○ /financas/configuracoes
  ├ ○ /financas/credenciais
  ├ ○ /financas/pagamentos
  ...
$ git status --short
   M src/components/paineis/FinanceiroPagamentosPainel.tsx
   M src/lib/api/services.ts
   M src/types/api.ts
```

(A execução real de `npm run build` precisou do stub temporário de fonte descrito na seção 0, revertido
antes deste `git status --short` — reflete o diff final, não o estado intermediário do sandbox de validação.)

---

## 9. Comportamento esperado (para QA manual depois de aplicado)

- `/financas/pagamentos` abre no menu de 3 cartões (Mensalidade/Propina, Taxa de matrícula, Outros), sem
  nenhum `<select>` de tipo visível.
- Clicar em Mensalidade/Propina → cartões de ano letivo (só os que a academia já teve, mais recente
  primeiro).
- Clicar num ano letivo → cartões de mês, nomeados "[Mês] de [ano]", na ordem set→dez→jan→jul (ou out→dez→jan→jul
  para academia de ensino superior).
- Clicar num mês → lista de cobranças daquele ano letivo + mês (todos os estados por padrão, filtro de
  estado disponível para refinar), com uma seção "Pendências sem cobrança" abaixo sempre que houver algum
  estudante que deve aquele mês e nunca tentou pagar.
- Clicar em Taxa de matrícula ou Outros → vai direto para a lista (todos os estados), sem seção de
  pendências.
- Botão "Voltar" em cada subtela leva ao nível anterior correto (lista de mensalidade volta para a seleção
  de mês, não direto para o menu).

---

## 10. Ao terminar

Gere a documentação de tarefa concluída (crie `docs/Tarefas feitas/` se ainda não existir neste repositório)
com o mesmo nome deste arquivo, `status: feito`, e um resumo do que foi validado.


---

## Conclusão da execução

Implementação concluída em 2026-08-22. Foram adicionados os filtros de escopo e mês ao contrato e cliente de cobranças, e a tela de pagamentos passou a oferecer cartões por tipo, drill-down de ano letivo e mês para mensalidades e a tabela de pendências sem cobrança.

Validações executadas:

- `npx tsc --noEmit`
- `npx eslint src/components/paineis/FinanceiroPagamentosPainel.tsx src/types/api.ts src/lib/api/services.ts`
- `npm run build`
