---
criado: 2026-08-18
origem: Claude (orquestrador) — a pedido de Fredy Luís, Fundador e CEO da Spuri
status: pendente
tarefa: Correção das páginas /financas/* (credenciais, configurações, pagamentos)
---

# Correção das páginas `/financas/*`

## Prompt recomendado para o Codex

> Execute exatamente o que está descrito neste documento, arquivo por arquivo, na ordem em que aparecem. Não planeje nada, não invente nenhum campo, nome de função ou rota além dos que estão escritos aqui — tudo já foi decidido e validado (build, `go vet`, `gofmt`, testes de integração reais com PostgreSQL no lado do backend; `tsc --noEmit`, `eslint` e `next build` no lado do frontend). Onde o documento manda **substituir o arquivo inteiro**, apague o conteúdo atual e cole exatamente o bloco de código fornecido — não tente mesclar com o que já existe. Onde o documento dá um bloco "SUBSTITUIR" com texto antes/depois, localize o texto exato (`old_str`) no arquivo atual e troque apenas por aquele trecho (`new_str|`) — se o texto antigo não bater 100% com o que está no arquivo, pare e reporte a diferença em vez de adivinhar. Ao final, rode as validações da seção "Procedimento de conclusão" e cole o resultado bruto do terminal na resposta.

---

## Contexto

As três páginas `/financas/credenciais`, `/financas/configuracoes` e `/financas/pagamentos` têm formulários e listagens que **não correspondem ao que a API do backend (`spuri-backend`) realmente espera ou já suporta**. Esta tarefa foi orquestrada lendo o código-fonte real dos dois repositórios (`spuri-backend` e `spuripainel`), rodando `go build`/`go vet`/`gofmt`/testes de integração reais com PostgreSQL 16 no backend, e `tsc --noEmit`/`eslint`/`next build` no frontend — **nenhuma mudança abaixo é especulativa**.

Descobertas centrais que orientam as correções:

1. **Credenciais AppyPay**: o backend (`finance.CredentialInput`) não tem — e nunca teve — campos `webhook_secret` nem `webhook_header_name`. O segredo do webhook é gerado automaticamente pelo servidor (`crypto/rand`, 15 caracteres) na primeira configuração da credencial, e só é devolvido em texto plano uma única vez (na resposta do `POST` de criação) ou via os endpoints dedicados `GET/POST .../webhook-secret`. O nome do cabeçalho é sempre a constante fixa `X-Spuri-Webhook-Secret` — nunca configurável. O formulário atual do frontend pede ao usuário para digitar esses dois campos, que são simplesmente ignorados pelo backend.
2. **`ano_academico` é string, não número**: em `MensalidadeConfiguracaoInput`, `MatriculaConfiguracaoInput` e `MensalidadeMesView`, o backend sempre tratou `ano_academico` como string no formato `"N_ano_fundamental"` / `"N_ano_medio"` / `"N_ano_superior"` (o mesmo formato de `AcademiaDetalhada.anos_academicos` e `Curso.anos_academicos`). O tipo TypeScript declarava `number`, e o formulário atual envia um número — isso quebra a requisição.
3. **Nível médio exige `curso_id`, e nível médio/superior exigem `ano_academico` validado contra o curso**: `finance.validateConfiguracaoMensalidade`/`validateConfiguracaoMatricula` só dispensam `curso_id` para `nivel=fundamental`. O formulário atual só pedia curso para `nivel=superior` e nunca enviava `ano_academico` nesse caso — ou seja, configurar propina/matrícula para **médio e superior estava quebrado** antes desta tarefa.
4. **`ano_letivo` tem formato fixo `AAAA_AAAA`** (ex.: `"2026_2027"`), validado por `anoLetivoValido` no backend. Não é um campo livre para o usuário inventar — a academia já tem seus anos letivos reais, disponíveis via `GET /academia/ano-letivo` (atual) e `GET /academia/anos-letivos-lista` (histórico), já expostos no frontend como `academiaService.getAnoLetivo` e `academiaService.listarAnosLetivosLista`.
5. **`/financeiro/cobrancas/estudante/:codigo` não tinha filtro por tipo de cobrança** — só por estado. Isso é necessário para o requisito 3.3 (estudante filtrar por tipo). É uma pequena extensão de backend, isolada e validada com teste de integração real (seção 4 abaixo).
6. **Nenhuma outra mudança de backend é necessária.** Toda a correção de credenciais, configurações e paginação de pagamentos é 100% frontend.

---

## Resumo executivo

| # | Arquivo | Ação | Repositório |
|---|---|---|---|
| 1 | `src/types/api.ts` | Editar (blocos precisos) | spuripainel |
| 2 | `src/lib/api/services.ts` | Editar (blocos precisos) | spuripainel |
| 3 | `src/components/paineis/financeiroShared.tsx` | **Criar** (arquivo novo) | spuripainel |
| 4 | `src/components/paineis/FinanceiroCredenciaisPainel.tsx` | Substituir arquivo inteiro | spuripainel |
| 5 | `src/components/paineis/FinanceiroConfiguracoesPainel.tsx` | Substituir arquivo inteiro | spuripainel |
| 6 | `src/components/paineis/AnularReativarObrigacoesForm.tsx` | Substituir arquivo inteiro | spuripainel |
| 7 | `src/components/paineis/FinanceiroPagamentosPainel.tsx` | Substituir arquivo inteiro | spuripainel |
| 8 | `src/components/paineis/EstudantePagamentosPainel.tsx` | Substituir arquivo inteiro | spuripainel |
| 9 | `src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx` | Editar (1 linha) | spuripainel |
| 10 | `internal/finance/appypay.go` | Editar (blocos precisos) | spuri-backend |
| 11 | `internal/handlers/financeiro_handlers.go` | Editar (1 linha) | spuri-backend |
| 12 | `internal/finance/cobrancas_estudante_integration_test.go` | Editar (blocos precisos) | spuri-backend |

**Nenhum arquivo deve ser removido/apagado.** Nenhuma migração de banco é necessária (nenhuma tabela/coluna nova).

---

## Seção 1 — `spuripainel/src/types/api.ts` (editar)

**Objetivo:** alinhar os tipos de credencial (remover campos de webhook inexistentes no backend, adicionar tipos da resposta de criação e dos endpoints de segredo do webhook) e corrigir `ano_academico` de `number` para `string` em três interfaces.

Localize cada bloco `old_str` abaixo (deve aparecer **exatamente uma vez** no arquivo) e substitua pelo `new_str` correspondente, na ordem apresentada.

### 1.1 — Bloco de tipos de credencial

SUBSTITUIR:
```ts
/** Corpo de POST /financeiro/appypay/credenciais e PUT /financeiro/appypay/credenciais/:id. */
export interface CriarFinanceiroCredencialRequest {
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
  webhook_secret?: string;
  webhook_header_name?: string;
}

/** PUT é substituição completa — mesmo formato do POST. */
export type AtualizarFinanceiroCredencialRequest = CriarFinanceiroCredencialRequest;

export interface ListarFinanceiroCredenciaisParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
}

export type ListarFinanceiroCredenciaisResponse = FinanceiroCredencial[];
```

POR:
```ts
/**
 * Corpo de POST /financeiro/appypay/credenciais e PUT
 * /financeiro/appypay/credenciais/:id.
 *
 * O backend (finance.CredentialInput) NÃO tem — e nunca teve — campos de
 * webhook aqui: o segredo é gerado automaticamente pelo servidor
 * (crypto/rand, 15 caracteres) na primeira configuração da credencial, e o
 * nome do cabeçalho é uma constante fixa (X-Spuri-Webhook-Secret,
 * finance.WebhookHeaderName) — nunca configurável. Ver
 * FinanceiroCredencialCriada, ConsultarSegredoWebhookResponse e
 * RotacionarSegredoWebhookResponse abaixo para como o segredo é obtido.
 */
export interface CriarFinanceiroCredencialRequest {
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
}

/** PUT é substituição completa — mesmo formato do POST. */
export type AtualizarFinanceiroCredencialRequest = CriarFinanceiroCredencialRequest;

export interface ListarFinanceiroCredenciaisParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
}

export type ListarFinanceiroCredenciaisResponse = FinanceiroCredencial[];

/**
 * Resposta exclusiva de POST /financeiro/appypay/credenciais
 * (CredencialAppyPayCriada no backend). webhook_secret só vem preenchido
 * quando esta é a PRIMEIRA vez que a credencial recebe um segredo de
 * webhook — é a única oportunidade em que o valor em texto plano aparece
 * "de graça" numa resposta, fora do GET .../webhook-secret dedicado. Numa
 * atualização (PUT) de credencial já existente, webhook_secret nunca vem
 * preenchido; use ConsultarSegredoWebhookResponse para recuperá-lo depois.
 */
export interface FinanceiroCredencialCriada extends FinanceiroCredencial {
  webhook_secret?: string;
}

/**
 * Resposta de GET .../webhook-secret e de POST
 * .../webhook-secret/rotacionar. webhook_header_name é sempre
 * "X-Spuri-Webhook-Secret" (constante fixa do servidor).
 */
export interface ConsultarSegredoWebhookResponse {
  webhook_secret: string;
  webhook_header_name: string;
}

export type RotacionarSegredoWebhookResponse = ConsultarSegredoWebhookResponse;
```

### 1.2 — `MensalidadeConfiguracaoInput.ano_academico`

SUBSTITUIR:
```ts
export interface MensalidadeConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  ano_academico?: number;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: 6 | 7;
  metodos_pagamento: FinanceiroMetodoPagamento[];
}
```

POR:
```ts
export interface MensalidadeConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  /**
   * Formato "N_ano_fundamental" | "N_ano_medio" (ex.: "6_ano_fundamental")
   * — o mesmo formato de AcademiaDetalhada.anos_academicos e
   * Curso.anos_academicos. NUNCA um número solto: o backend
   * (finance.MensalidadeConfiguracaoInput) sempre tratou este campo como
   * string; o tipo `number` aqui era um bug que quebrava a requisição.
   */
  ano_academico?: string;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: 6 | 7;
  metodos_pagamento: FinanceiroMetodoPagamento[];
}
```

### 1.3 — `MensalidadeMesView.ano_academico`

SUBSTITUIR:
```ts
  nivel: FinanceiroNivel;
  ano_academico?: number;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: number;
  estado: FinanceiroEstadoMensalidade;
```

POR:
```ts
  nivel: FinanceiroNivel;
  /** Formato "N_ano_fundamental" | "N_ano_medio" — ver MensalidadeConfiguracaoInput.ano_academico. */
  ano_academico?: string;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: number;
  estado: FinanceiroEstadoMensalidade;
```

### 1.4 — `ListarCobrancasEstudanteParams` (novo filtro `tipo`)

SUBSTITUIR:
```ts
export interface ListarCobrancasEstudanteParams {
  estado?: string[];
  limit?: number;
  offset?: number;
}
```

POR:
```ts
export interface ListarCobrancasEstudanteParams {
  estado?: string[];
  /** Filtro por tipo de cobrança — mesmo filtro que ListarCobrancasParams já oferece à academia/admin (tarefa 49). */
  tipo?: FinanceiroOrigemCobranca[];
  limit?: number;
  offset?: number;
}
```

### 1.5 — `MatriculaConfiguracaoInput.ano_academico`

SUBSTITUIR:
```ts
export interface MatriculaConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  ano_academico?: number;
  curso_id?: string;
  valor: number;
  metodos_pagamento: FinanceiroMetodoPagamento[];
}
```

POR:
```ts
export interface MatriculaConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  /** Formato "N_ano_fundamental" | "N_ano_medio" — ver MensalidadeConfiguracaoInput.ano_academico. */
  ano_academico?: string;
  curso_id?: string;
  valor: number;
  metodos_pagamento: FinanceiroMetodoPagamento[];
}
```

**Validação já feita por Claude:** `grep` confirmou que `ano_academico` (nas três interfaces acima) só é lido/gravado nos arquivos desta própria tarefa — nenhum outro arquivo do frontend depende do tipo `number` anterior. `tsc --noEmit` rodado depois desta mudança (e de todas as outras deste documento) terminou **sem nenhum erro** em todo o projeto.

---

## Seção 2 — `spuripainel/src/lib/api/services.ts` (editar)

**Objetivo:** corrigir o tipo de resposta de `criarCredencial`, adicionar `consultarSegredoWebhook`/`rotacionarSegredoWebhook`, e repassar o novo filtro `tipo` em `consultarCobrancasEstudante`.

### 2.1 — Import de tipos

SUBSTITUIR:
```ts
  FinanceiroCredencial,
  CriarFinanceiroCredencialRequest,
  AtualizarFinanceiroCredencialRequest,
  ListarFinanceiroCredenciaisParams,
```

POR:
```ts
  FinanceiroCredencial,
  FinanceiroCredencialCriada,
  CriarFinanceiroCredencialRequest,
  AtualizarFinanceiroCredencialRequest,
  ConsultarSegredoWebhookResponse,
  RotacionarSegredoWebhookResponse,
  ListarFinanceiroCredenciaisParams,
```

### 2.2 — `criarCredencial`/`atualizarCredencial` + novos métodos de segredo do webhook

SUBSTITUIR:
```ts
  criarCredencial: (data: CriarFinanceiroCredencialRequest, token?: string) =>
    api.post<FinanceiroCredencial, CriarFinanceiroCredencialRequest>(
      '/financeiro/appypay/credenciais',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCredencial: (id: string, data: AtualizarFinanceiroCredencialRequest, token?: string) =>
    api.put<FinanceiroCredencial, AtualizarFinanceiroCredencialRequest>(
      `/financeiro/appypay/credenciais/${id}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
```

POR:
```ts
  /** Resposta traz webhook_secret preenchido só na primeira configuração da credencial — ver FinanceiroCredencialCriada. */
  criarCredencial: (data: CriarFinanceiroCredencialRequest, token?: string) =>
    api.post<FinanceiroCredencialCriada, CriarFinanceiroCredencialRequest>(
      '/financeiro/appypay/credenciais',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCredencial: (id: string, data: AtualizarFinanceiroCredencialRequest, token?: string) =>
    api.put<FinanceiroCredencial, AtualizarFinanceiroCredencialRequest>(
      `/financeiro/appypay/credenciais/${id}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET .../webhook-secret — devolve o segredo de webhook atual em texto plano (só dono do contexto). */
  consultarSegredoWebhook: (id: string, token?: string) =>
    api.get<ConsultarSegredoWebhookResponse>(
      `/financeiro/appypay/credenciais/${encodeURIComponent(id)}/webhook-secret`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** POST .../webhook-secret/rotacionar — gera um novo segredo, invalidando o anterior imediatamente. */
  rotacionarSegredoWebhook: (id: string, token?: string) =>
    api.post<RotacionarSegredoWebhookResponse, undefined>(
      `/financeiro/appypay/credenciais/${encodeURIComponent(id)}/webhook-secret/rotacionar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),
```

### 2.3 — `consultarCobrancasEstudante` (repassar `tipo`)

SUBSTITUIR:
```ts
  consultarCobrancasEstudante: (codigoEstudante: string, params?: ListarCobrancasEstudanteParams, token?: string) => {
    const qs = new URLSearchParams();
    params?.estado?.forEach((e) => qs.append('estado', e));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    return api.get<ListarCobrancasResponse>(`/financeiro/cobrancas/estudante/${encodeURIComponent(codigoEstudante)}${qs.toString() ? `?${qs.toString()}` : ''}`, { token: token || tokenStorage.get() || undefined });
  },
```

POR:
```ts
  consultarCobrancasEstudante: (codigoEstudante: string, params?: ListarCobrancasEstudanteParams, token?: string) => {
    const qs = new URLSearchParams();
    params?.estado?.forEach((e) => qs.append('estado', e));
    params?.tipo?.forEach((t) => qs.append('tipo', t));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    return api.get<ListarCobrancasResponse>(`/financeiro/cobrancas/estudante/${encodeURIComponent(codigoEstudante)}${qs.toString() ? `?${qs.toString()}` : ''}`, { token: token || tokenStorage.get() || undefined });
  },
```

---

## Seção 3 — `spuripainel/src/components/paineis/financeiroShared.tsx` (CRIAR arquivo novo)

**Objetivo:** utilitários e componentes compartilhados entre os três painéis financeiros (formatação de dinheiro/data, badge de estado, QR, estados de carregamento/vazio, paginação por botões numerados — mesmo padrão visual de `/estudantes` — tabela única de cobranças com botão "Ver detalhes" explícito, e a subtela de detalhes da cobrança com dados do estudante vinculado).

**Por que um arquivo novo:** `money`, `Qr` e `badge" viviam dentro de `FinanceiroPagamentosPainel.tsx` e eram importados por `EstudantePagamentosPainel.tsx` **e por `MatriculaPublicPage.tsx`** (uma página pública de matrícula, fora do escopo desta tarefa). Extrair para um arquivo próprio evita que a reestruturação de `FinanceiroPagamentosPainel.tsx` quebre essa página pública, e evita duplicar a mesma lógica em dois painéis (ver Seção 9 para o ajuste de import necessário em `MatriculaPublicPage.tsx`).

CRIAR com o conteúdo exato abaixo:

```tsx
"use client";
import { useEffect, useState } from "react";
import { consultasService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { CobrancaResumo, EstudanteDetalhado, FinanceiroOrigemCobranca } from "@/types/api";

/**
 * Utilitários e componentes partilhados pelas telas de pagamentos
 * (FinanceiroPagamentosPainel, EstudantePagamentosPainel e
 * MatriculaPublicPage). Extraído da tarefa 49: antes, `money` e `Qr`
 * viviam dentro de FinanceiroPagamentosPainel.tsx e eram importados por
 * essas outras páginas — misturando um utilitário genérico com a lógica
 * específica do painel de pagamentos de academia/admin.
 */

export const money = (v: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(v);

export const dt = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d);
};

/** "Avulsa" no backend passou a ser apresentada como "Outros" no frontend (pedido do produto). */
export const origemLabel: Record<FinanceiroOrigemCobranca, string> = {
  matricula: "Matrícula",
  mensalidade: "Mensalidade",
  avulsa: "Outros",
};

export function StatusBadge({ status }: { status: string }) {
  const x = status.toLowerCase();
  const cls = x.includes("success") || x.includes("pago")
    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    : x.includes("pend")
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    : x.includes("fail") || x.includes("falh")
    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    : x.includes("cancel")
    ? "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{status}</span>;
}

export function Qr({ value }: { value?: string }) {
  if (!value) return null;
  return value.startsWith("data:image") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={value} alt="QR Code" className="max-h-64 rounded border p-2" />
  ) : (
    <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{value}</pre>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/[0.08]">
      <Icon icon="mdi:credit-card-off-outline" width={32} className="mx-auto text-gray-400" />
      <p className="mt-2 font-medium text-gray-800 dark:text-white/90">{title}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

/**
 * Paginação por botões numerados. Mesmo padrão visual e de comportamento
 * do componente PaginacaoSetas usado em /estudantes (PageContent.tsx) —
 * replicado aqui (e não importado de lá) porque aquele componente não é
 * exportado e /estudantes está fora do escopo desta tarefa.
 */
export function PaginacaoSetas({ paginaAtual, totalPaginas, total, porPagina, onChange }: {
  paginaAtual: number; totalPaginas: number; total: number; porPagina: number; onChange: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, total);
  const getPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPaginas <= 7) { for (let i = 1; i <= totalPaginas; i++) pages.push(i); }
    else if (paginaAtual <= 4) { for (let i = 1; i <= 5; i++) pages.push(i); pages.push("..."); pages.push(totalPaginas); }
    else if (paginaAtual >= totalPaginas - 3) { pages.push(1); pages.push("..."); for (let i = totalPaginas - 4; i <= totalPaginas; i++) pages.push(i); }
    else { pages.push(1); pages.push("..."); for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) pages.push(i); pages.push("..."); pages.push(totalPaginas); }
    return pages;
  };
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{inicio}–{fim} de {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(paginaAtual - 1)} disabled={paginaAtual === 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {getPages().map((p, i) => p === "..." ? (
          <span key={`e${i}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)}
            className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${paginaAtual === p ? "bg-brand-500 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]"}`}>{p}</button>
        ))}
        <button onClick={() => onChange(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Pág. {paginaAtual}/{totalPaginas}</p>
    </div>
  );
}

/**
 * Tabela única de cobranças, com botão "Ver detalhes" explícito por linha
 * (antes o detalhe só abria clicando na linha inteira, sem afordância
 * visível — pedido do produto: cada cobrança deve ter o seu "ver
 * detalhes").
 */
export function CobrancasTable({ rows, onOpen }: { rows: CobrancaResumo[]; onOpen: (r: CobrancaResumo) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-left">
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            {["Tipo", "Descrição", "Estudante", "Valor", "Método", "Estado", "Atualizado em", ""].map((h) => (
              <TableCell key={h || "acoes"} isHeader className="px-3 py-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{origemLabel[r.origem] ?? r.origem}</TableCell>
              <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.descricao || "—"}</TableCell>
              <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.codigo_estudante || "—"}</TableCell>
              <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{money(r.valor)}</TableCell>
              <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.metodo_pagamento || "—"}</TableCell>
              <TableCell className="px-3 py-2"><StatusBadge status={r.status} /></TableCell>
              <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{dt(r.atualizado_em)}</TableCell>
              <TableCell className="px-3 py-2">
                <Button size="sm" variant="outline" onClick={() => onOpen(r)}>Ver detalhes</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Subtela (modal) de detalhes de uma cobrança.
 *
 * - Usa os dados já carregados na linha da tabela (CobrancaResumo) em vez
 *   de buscar a cobrança de novo no servidor — evita uma requisição
 *   redundante a cada "ver detalhes" (a listagem já trouxe tudo que a
 *   cobrança tem).
 * - Quando a cobrança está vinculada a um estudante (codigo_estudante) e
 *   mostrarDadosEstudante=true, busca e exibe também os dados desse
 *   estudante. GET /consultar-estudante/:codigo só é permitido para
 *   academia/admin — por isso EstudantePagamentosPainel usa
 *   mostrarDadosEstudante={false} (o estudante já sabe quem é).
 * - onCancelar, quando fornecido, mostra o botão "Cancelar cobrança"
 *   (ação restrita a academia/admin).
 */
export function CobrancaDetalhesModal({ cobranca, onClose, mostrarDadosEstudante = false, onCancelar }: {
  cobranca: CobrancaResumo | null;
  onClose: () => void;
  mostrarDadosEstudante?: boolean;
  onCancelar?: (cobranca: CobrancaResumo, motivo?: string) => Promise<void>;
}) {
  const [estudante, setEstudante] = useState<EstudanteDetalhado | null>(null);
  const [erroEstudante, setErroEstudante] = useState<string | null>(null);
  const [carregandoEstudante, setCarregandoEstudante] = useState(false);
  const [erroCancelar, setErroCancelar] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const codigoEstudante = cobranca?.codigo_estudante;

  useEffect(() => {
    setEstudante(null);
    setErroEstudante(null);
    setErroCancelar(null);
    if (!cobranca || !mostrarDadosEstudante || !codigoEstudante) return;
    setCarregandoEstudante(true);
    consultasService.estudante(codigoEstudante)
      .then((r) => setEstudante(r?.estudante ?? null))
      .catch((e) => setErroEstudante(formatApiError(e, "Não foi possível carregar os dados do estudante.")))
      .finally(() => setCarregandoEstudante(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobranca?.id, mostrarDadosEstudante, codigoEstudante]);

  if (!cobranca) return null;

  const cancelavel = onCancelar && !["success", "pago", "cancelado", "cancelled", "failed", "falhado"].includes(cobranca.status.toLowerCase());

  return (
    <Modal isOpen={!!cobranca} onClose={onClose} className="max-w-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Detalhe da cobrança</h3>
      <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><b>Tipo:</b> {origemLabel[cobranca.origem] ?? cobranca.origem}</p>
        <p><b>Descrição:</b> {cobranca.descricao || "—"}</p>
        <p><b>Valor:</b> {money(cobranca.valor)} {cobranca.moeda ? `(${cobranca.moeda})` : ""}</p>
        <p><b>Método de pagamento:</b> {cobranca.metodo_pagamento || "—"}</p>
        <p><b>Estado:</b> <StatusBadge status={cobranca.status} /></p>
        <p><b>Referência AppyPay:</b> {cobranca.provider_charge_id || "—"}</p>
        <p><b>Transação:</b> {cobranca.merchant_transaction_id}</p>
        <p><b>Atualizado em:</b> {dt(cobranca.atualizado_em)}</p>
        {cobranca.codigo_solicitacao && <p><b>Solicitação de matrícula:</b> {cobranca.codigo_solicitacao}</p>}

        {codigoEstudante && (
          <div className="mt-4 rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
            <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">Estudante vinculado</p>
            {!mostrarDadosEstudante ? (
              <p><b>Código:</b> {codigoEstudante}</p>
            ) : carregandoEstudante ? (
              <p className="text-gray-500 dark:text-gray-400">Carregando dados do estudante...</p>
            ) : erroEstudante ? (
              <p className="text-red-600 dark:text-red-400">{erroEstudante}</p>
            ) : estudante ? (
              <div className="space-y-1">
                <p><b>Nome:</b> {estudante.nome}</p>
                <p><b>Código:</b> {estudante.codigo_estudante}</p>
                {estudante.telefone && <p><b>Telefone:</b> {estudante.telefone}</p>}
                {estudante.email && <p><b>Email:</b> {estudante.email}</p>}
                {estudante.status && <p><b>Status:</b> {estudante.status}</p>}
              </div>
            ) : (
              <p><b>Código:</b> {codigoEstudante}</p>
            )}
          </div>
        )}

        {erroCancelar && <p className="text-red-600 dark:text-red-400">{erroCancelar}</p>}
        {cancelavel && (
          <Button
            size="sm"
            variant="outline"
            disabled={cancelando}
            startIcon={<Icon icon="mdi:close-circle-outline" width={16} />}
            onClick={async () => {
              setErroCancelar(null);
              setCancelando(true);
              try {
                await onCancelar!(cobranca, window.prompt("Motivo do cancelamento (opcional)") || undefined);
                onClose();
              } catch (e) {
                setErroCancelar(formatApiError(e, "Não foi possível cancelar a cobrança."));
              } finally {
                setCancelando(false);
              }
            }}
          >
            Cancelar cobrança
          </Button>
        )}
      </div>
    </Modal>
  );
}
```

---

## Seção 4 — `spuripainel/src/components/paineis/FinanceiroCredenciaisPainel.tsx` (substituir arquivo inteiro)

**Objetivo (item 1 do pedido):**
- Remove os campos `webhook_secret`/`webhook_header_name` do formulário — o backend nunca os aceitou (Seção de contexto, item 1).
- Adiciona validação (com prefixo obrigatório `GPO_`/`REF_`) que o backend já exige mas o frontend não checava nem explicava.
- Mostra o segredo do webhook gerado automaticamente **uma única vez**, logo após a criação da credencial (com botão de copiar e aviso de que não será mostrado de novo por inteiro).
- Adiciona uma coluna "Segredo do webhook" na tabela, com ações "Consultar segredo" e "Rotacionar" (usando os dois endpoints novos).
- **Corrige o requisito 1.1:** o erro de envio do formulário agora aparece **dentro do card do formulário** (logo abaixo do título, acima dos campos), não mais no topo da página — é ali que o usuário está olhando quando o erro acontece. Erros de carregamento da listagem continuam no topo da lista, que é onde a ação de carregar foi disparada.

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import type {
  AcademiaDetalhada,
  CriarFinanceiroCredencialRequest,
  FinanceiroContextoTipo,
  FinanceiroCredencial,
  ListarFinanceiroCredenciaisParams,
} from "@/types/api";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

type AlertState = { variant: "success" | "error" | "warning" | "info"; message: string } | null;
type ContextFilter = "todas" | "spuri" | "academia";
type FormErrors = Partial<Record<keyof CredencialFormData | "contexto", string>>;

/**
 * Campos de credencial que o formulário coleta. NÃO inclui webhook_secret
 * nem webhook_header_name: o backend (finance.CredentialInput) nunca teve
 * esses campos no corpo da requisição — o segredo é gerado automaticamente
 * pelo servidor na primeira configuração da credencial, e o nome do
 * cabeçalho é a constante fixa "X-Spuri-Webhook-Secret"
 * (finance.WebhookHeaderName), nunca configurável. Ver
 * WebhookSecretPanel abaixo para consultar/rotacionar o segredo depois.
 */
type CredencialFormData = {
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
};

const EMPTY_FORM: CredencialFormData = {
  client_id: "",
  client_secret: "",
  gpo_payment_method: "",
  ref_payment_method: "",
};

const WEBHOOK_HEADER_NAME = "X-Spuri-Webhook-Secret";

function LoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        Carregando credenciais...
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getErrorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 403) return "Você não tem permissão para configurar credenciais deste contexto.";
    if (err.status === 409) return "Já existe uma operação em andamento para esta credencial, tente novamente em instantes.";
    if (err.status === 503) return "Não foi possível confirmar com a AppyPay agora. Tente novamente mais tarde.";
  }
  return formatApiError(err, "Não foi possível salvar a credencial.");
}

function contextParams(filter: ContextFilter, codigoAcademia: string): ListarFinanceiroCredenciaisParams | undefined {
  if (filter === "spuri") return { contexto_tipo: "spuri" };
  if (filter === "academia" && codigoAcademia) return { contexto_tipo: "academia", codigo_academia: codigoAcademia };
  return undefined;
}

export default function FinanceiroCredenciaisPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [alert, setAlert] = useState<AlertState>(null);
  const [contextFilter, setContextFilter] = useState<ContextFilter>("todas");
  const [codigoAcademia, setCodigoAcademia] = useState("");
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceiroCredencial | null>(null);
  const [formData, setFormData] = useState<CredencialFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  // Erro/sucesso do próprio formulário — renderizado DENTRO do card do
  // formulário (não no topo da página), para que o usuário veja o erro
  // exatamente onde ele foi disparado.
  const [formAlert, setFormAlert] = useState<AlertState>(null);
  const [showClientSecret, setShowClientSecret] = useState(false);
  // Segredo do webhook devolvido UMA VEZ pelo backend, na criação da
  // credencial (finance.CredencialAppyPayCriada.WebhookSecret). Some
  // depois de fechado — para vê-lo de novo, use "Consultar segredo" na
  // linha da tabela (WebhookSecretPanel).
  const [novoWebhookSecret, setNovoWebhookSecret] = useState<string | null>(null);

  const { execute: listarCredenciais, data: credenciais, loading: listando } = useApi(financeiroService.listarCredenciais);
  const { execute: criarCredencial, loading: criando } = useApi(financeiroService.criarCredencial);
  const { execute: atualizarCredencial, loading: atualizando } = useApi(financeiroService.atualizarCredencial);
  const { execute: listarAcademias, loading: listandoAcademias } = useApi(consultasService.listarAcademias);

  const saving = criando || atualizando;

  const academiaOptions = useMemo(() => academias.map((academia) => ({
    value: academia.codigo_academia,
    label: `${academia.nome} (${academia.codigo_academia})`,
  })), [academias]);

  const activeParams = useCallback((): ListarFinanceiroCredenciaisParams | undefined => {
    if (isAcademia) return undefined;
    return contextParams(contextFilter, codigoAcademia);
  }, [codigoAcademia, contextFilter, isAcademia]);

  const carregarCredenciais = useCallback(async () => {
    if (!isAcademia && !isFpp) return;
    if (isFpp && contextFilter === "academia" && !codigoAcademia) return;
    try {
      await listarCredenciais(activeParams());
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar as credenciais.") });
    }
  }, [activeParams, codigoAcademia, contextFilter, isAcademia, isFpp, listarCredenciais]);

  useEffect(() => {
    if (!isFpp) return;
    listarAcademias({ status: "ativo" })
      .then((response) => setAcademias(response?.academias ?? []))
      .catch((err) => setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar as academias.") }));
  }, [isFpp, listarAcademias]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading) void carregarCredenciais();
  }, [carregarCredenciais, loading]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormAlert(null);
    setShowClientSecret(false);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    resetForm();
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (credencial: FinanceiroCredencial) => {
    setEditing(credencial);
    resetForm();
    setFormOpen(true);
  };

  const resolveContext = (): { contexto_tipo: FinanceiroContextoTipo; codigo_academia?: string } | null => {
    if (isAcademia) return { contexto_tipo: "academia", codigo_academia: user?.academia?.codigo_academia };
    if (editing) return { contexto_tipo: editing.contexto_tipo, codigo_academia: editing.codigo_academia };
    if (contextFilter === "spuri") return { contexto_tipo: "spuri" };
    if (contextFilter === "academia" && codigoAcademia) return { contexto_tipo: "academia", codigo_academia: codigoAcademia };
    return null;
  };

  const validate = () => {
    const errors: FormErrors = {};
    const required: (keyof CredencialFormData)[] = ["client_id", "client_secret", "gpo_payment_method", "ref_payment_method"];
    required.forEach((field) => {
      if (!formData[field].trim()) errors[field] = "Campo obrigatório.";
    });
    // A API da AppyPay exige que os identificadores dos métodos de
    // pagamento comecem com o prefixo do método (validação espelhada de
    // finance.ConfigureCredential no backend).
    if (formData.gpo_payment_method.trim() && !formData.gpo_payment_method.trim().startsWith("GPO_")) {
      errors.gpo_payment_method = 'Deve começar com "GPO_" (ex.: GPO_12345).';
    }
    if (formData.ref_payment_method.trim() && !formData.ref_payment_method.trim().startsWith("REF_")) {
      errors.ref_payment_method = 'Deve começar com "REF_" (ex.: REF_12345).';
    }
    if (!resolveContext()) errors.contexto = "Selecione um contexto antes de salvar.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setFormAlert(null);
    if (!validate()) return;
    const context = resolveContext();
    if (!context) return;
    const payload: CriarFinanceiroCredencialRequest = {
      ...context,
      client_id: formData.client_id.trim(),
      client_secret: formData.client_secret.trim(),
      gpo_payment_method: formData.gpo_payment_method.trim(),
      ref_payment_method: formData.ref_payment_method.trim(),
    };

    try {
      if (editing) {
        await atualizarCredencial(editing.id, payload);
        setAlert({ variant: "success", message: "Credencial atualizada com sucesso." });
        closeForm();
      } else {
        const criada = await criarCredencial(payload);
        setAlert({ variant: "success", message: "Credencial configurada com sucesso." });
        closeForm();
        if (criada?.webhook_secret) setNovoWebhookSecret(criada.webhook_secret);
      }
      await carregarCredenciais();
    } catch (err) {
      // Erro do envio: fica DENTRO do formulário (que continua aberto),
      // e não no topo da página — é ali que o usuário está olhando.
      setFormAlert({ variant: "error", message: getErrorMessage(err) });
    }
  };

  if (loading) return <LoadingState />;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} />;

  const rows = credenciais ?? [];
  const canCreate = isAcademia || contextFilter === "spuri" || (contextFilter === "academia" && !!codigoAcademia);

  return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Atenção"} message={alert.message} />}

      {novoWebhookSecret && (
        <NovoWebhookSecretAlert
          segredo={novoWebhookSecret}
          onFechar={() => setNovoWebhookSecret(null)}
        />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Credenciais AppyPay</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Utilize as suas credenciais de uso da API da AppyPay para configurar o seu módulo de finanças</p>
          </div>
          <Button size="sm" onClick={openCreate} disabled={!canCreate} startIcon={<Icon icon="mdi:plus" width={16} />}>Configurar credenciais</Button>
        </div>

        {isFpp && (
          <div className="mt-5 grid gap-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03] lg:grid-cols-[260px_1fr]">
            <div>
              <Label>Contexto</Label>
              <Select
                key={contextFilter}
                defaultValue={contextFilter}
                options={[{ value: "todas", label: "Todas" }, { value: "spuri", label: "Spuri (Global)" }, { value: "academia", label: "Academia" }]}
                onChange={(value) => { setContextFilter(value as ContextFilter); setCodigoAcademia(""); }}
              />
            </div>
            {contextFilter === "academia" && (
              <div>
                <Label>Academia</Label>
                <SearchableSelect value={codigoAcademia} options={academiaOptions} onChange={setCodigoAcademia} placeholder={listandoAcademias ? "Carregando academias..." : "Selecione uma academia"} isDisabled={listandoAcademias} isClearable />
              </div>
            )}
          </div>
        )}
      </div>

      <AdesaoAppyPayInfo />

      {!formOpen && <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {listando ? <LoadingState /> : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Icon icon="mdi:credit-card-remove-outline" width={44} className="text-gray-400" />
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Nenhuma credencial configurada.</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Salve as credenciais para habilitar as próximas operações financeiras.</p>
            </div>
            <Button size="sm" onClick={openCreate} disabled={!canCreate}>Configurar credenciais</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]"><TableRow>{["Contexto", "Ambiente", "Client ID", "Método GPO", "Método REF", "Segredo do webhook", "Atualizado em", "Ações"].map((h) => <TableCell key={h} isHeader className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow></TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rows.map((credencial) => (
                  <TableRow key={credencial.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{credencial.contexto_tipo === "spuri" ? "Spuri" : `Academia ${credencial.codigo_academia ?? ""}`}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm"><span className={credencial.ambiente === "production" ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300" : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}>{credencial.ambiente}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.client_id_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.gpo_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.ref_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><WebhookSecretPanel credencialId={credencial.id} /></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(credencial.updated_at)}</TableCell>
                    <TableCell className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => openEdit(credencial)}>Editar</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>}

      {formOpen && (
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] lg:p-8">
          <Button variant="outline" size="sm" onClick={closeForm} disabled={saving} startIcon={<Icon icon="mdi:arrow-left" width={16} />}>Voltar</Button>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{editing ? "Atualizar credencial" : "Configurar credenciais"}</h3>
            {formErrors.contexto && <p className="mt-1 text-xs text-error-500">{formErrors.contexto}</p>}
          </div>
          {/* Erro/sucesso do envio deste formulário — visível aqui dentro, não no topo da página. */}
          {formAlert && <Alert variant={formAlert.variant} title={formAlert.variant === "success" ? "Sucesso" : "Não foi possível salvar"} message={formAlert.message} />}
          {editing && <Alert variant="warning" title="Rotação completa" message="Por segurança, a AppyPay não devolve os valores atuais dos campos sensíveis. Preencha novamente todos os campos abaixo para atualizar esta credencial — os valores mascarados atuais continuam visíveis na tabela até a atualização ser concluída. O segredo do webhook NÃO muda ao editar; use 'Rotacionar' na tabela se precisar de um novo." />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client ID *"><Input value={formData.client_id} onChange={(e) => setFormData((p) => ({ ...p, client_id: e.target.value }))} error={!!formErrors.client_id} hint={formErrors.client_id} /></Field>
            <PasswordField label="Client Secret *" value={formData.client_secret} show={showClientSecret} onToggle={() => setShowClientSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, client_secret: value }))} error={formErrors.client_secret} />
            <Field label="ID Método de pagamento GPO *"><Input value={formData.gpo_payment_method} onChange={(e) => setFormData((p) => ({ ...p, gpo_payment_method: e.target.value }))} error={!!formErrors.gpo_payment_method} hint={formErrors.gpo_payment_method ?? 'Identificador do método GPO configurado na AppyPay. Deve começar com "GPO_".'} /></Field>
            <Field label="ID Método de pagamento REF *"><Input value={formData.ref_payment_method} onChange={(e) => setFormData((p) => ({ ...p, ref_payment_method: e.target.value }))} error={!!formErrors.ref_payment_method} hint={formErrors.ref_payment_method ?? 'Identificador do método REF configurado na AppyPay. Deve começar com "REF_".'} /></Field>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
            <p className="font-medium text-gray-800 dark:text-white/90">Sobre o webhook</p>
            <p className="mt-1">
              Não é preciso configurar segredo nem cabeçalho de webhook aqui: o Spuri gera automaticamente um segredo
              único{editing ? "" : ", exibido uma única vez logo após salvar"} e sempre envia o cabeçalho fixo{" "}
              <code className="rounded bg-gray-200 px-1 py-0.5 text-xs dark:bg-gray-700">{WEBHOOK_HEADER_NAME}</code>.
              Configure este mesmo nome de cabeçalho no painel da AppyPay. Para ver ou trocar o segredo depois, use as ações
              na coluna &quot;Segredo do webhook&quot; da tabela.
            </p>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" size="sm" onClick={closeForm} disabled={saving}>Cancelar</Button><Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></div>
        </div>
      )}
    </div>
  );
}

/** Alerta que exibe (uma única vez) o segredo de webhook devolvido pela criação da credencial. */
function NovoWebhookSecretAlert({ segredo, onFechar }: { segredo: string; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
      <div className="flex items-start gap-3">
        <Icon icon="mdi:key-alert-outline" width={22} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Segredo do webhook gerado</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Copie e configure isto no painel da AppyPay agora — por segurança, este valor não será mostrado por
            inteiro novamente (só via &quot;Consultar segredo&quot;, que exige confirmação).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-3 py-1.5 text-sm dark:bg-gray-900 dark:text-white/90">{segredo}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard?.writeText(segredo).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
            >
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Cabeçalho: {WEBHOOK_HEADER_NAME}</span>
          </div>
        </div>
        <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Fechar">
          <Icon icon="mdi:close" width={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Ações de consulta e rotação do segredo de webhook de uma credencial já
 * existente (GET/POST .../webhook-secret). O erro de cada ação aparece
 * aqui mesmo, dentro da célula da tabela — não no topo da página.
 */
function WebhookSecretPanel({ credencialId }: { credencialId: string }) {
  const consultar = useApi(financeiroService.consultarSegredoWebhook);
  const rotacionar = useApi(financeiroService.rotacionarSegredoWebhook);
  const [segredo, setSegredo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleConsultar = async () => {
    setErro(null);
    try {
      const r = await consultar.execute(credencialId);
      setSegredo(r?.webhook_secret ?? null);
    } catch (e) {
      setErro(formatApiError(e, "Não foi possível consultar o segredo."));
    }
  };

  const handleRotacionar = async () => {
    if (!window.confirm("Isto invalida o segredo atual imediatamente. A AppyPay precisará ser reconfigurada com o novo valor. Continuar?")) return;
    setErro(null);
    try {
      const r = await rotacionar.execute(credencialId);
      setSegredo(r?.webhook_secret ?? null);
    } catch (e) {
      setErro(formatApiError(e, "Não foi possível rotacionar o segredo."));
    }
  };

  if (segredo) {
    return (
      <div className="space-y-1">
        <code className="block max-w-[180px] truncate rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">{segredo}</code>
        <button type="button" className="text-xs text-brand-600 hover:underline dark:text-brand-300" onClick={() => setSegredo(null)}>Ocultar</button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={consultar.loading} onClick={handleConsultar}>Consultar segredo</Button>
        <Button size="sm" variant="outline" disabled={rotacionar.loading} onClick={handleRotacionar}>Rotacionar</Button>
      </div>
      {erro && <p className="text-xs text-error-500">{erro}</p>}
    </div>
  );
}

function AdesaoAppyPayInfo() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3">
        <Icon icon="mdi:bank-outline" width={22} className="mt-0.5 shrink-0 text-brand-500" />
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Antes de configurar as credenciais</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Para ter acesso ao módulo de finanças e fazer cobranças e receber pagamentos dos estudantes, é necessário aderir aos serviços de Gateway de Pagamento Online junto ao seu banco.
          </p>
        </div>
      </div>
      <details className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">Nota para Adesão ao Serviço (enviada pela AppyPay)</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-500 dark:text-gray-400">
          <li>É necessário ter uma conta bancária empresarial em um dos bancos angolanos.</li>
          <li>O processo de adesão começa no seu banco comercial: dirija-se ao seu banco e solicite os formulários de adesão aos métodos de pagamento que deseja utilizar (Multicaixa Express e/ou Referência).</li>
          <li>Informe ao banco que vai trabalhar com a AppyPay como seu facilitador tecnológico.</li>
          <li>A AppyPay tem parceria com o BAI (GPO), BCS e Standard Bank (GPO e REF) — se selecionar um destes bancos, não terá de pagar as comissões da AppyPay (0,4% por cobrança, com comissão mínima de 50 Kz por cobrança), nem assinar o contrato com a AppyPay.</li>
        </ol>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function PasswordField({ label, value, show, error, onToggle, onChange }: { label: string; value: string; show: boolean; error?: string; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} error={!!error} hint={error} className="pr-11" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={show ? "Ocultar segredo" : "Mostrar segredo"}>
          <Icon icon={show ? "mdi:eye-off-outline" : "mdi:eye-outline"} width={20} />
        </button>
      </div>
    </div>
  );
}
```

---

## Seção 5 — `spuripainel/src/components/paineis/FinanceiroConfiguracoesPainel.tsx` (substituir arquivo inteiro)

**Objetivo (item 2 do pedido), mapeado ponto a ponto:**

- **2.1** — Títulos (`<h2>`) agora usam `text-gray-800 dark:text-white/90` (antes não tinham nenhuma cor específica para o modo escuro, ficando ilegíveis). Todos os selects passam a ser `SearchableSelect` (nível, mês de encerramento, mês de início, ano/classe, curso, ano letivo). O checkbox de métodos de pagamento passa a usar o componente `Checkbox` (`src/components/form/input/Checkbox.tsx`) em vez de `<input type="checkbox">" nativo.
- **2.2** — Campo de valor (`Input type="number"`) ganha `min="0.01"` e validação obrigatória antes do envio: se o valor não for maior que zero, o campo mostra erro inline e o envio é bloqueado (`validarValorEAno`).
- **2.3.1** — O select de "Mês início" em Ações excecionais mostrava "Mês 1", "Mês 2"... Agora usa `Intl.DateTimeFormat("pt-AO",{month:"long"})` para mostrar o nome real do mês (Janeiro, Fevereiro...). O select "Mês de encerramento" (Junho/Julho) já estava correto e não foi alterado na essência, só migrado para SearchableSelect.
- **2.4** — Corrigido o problema real por trás dos "seletores de ano acadêmico errados": o backend (`finance.validateConfiguracaoMensalidade`/`validateConfiguracaoMatricula`) só dispensa `curso_id` quando `nivel=fundamental`; para médio **e** superior, exige `curso_id` **e** `ano_academico` validado contra os anos do curso — mas o formulário anterior só pedia curso para "superior" e nunca enviava `ano_academico` para "superior" nenhuma vez. Ou seja: **configurar propina/matrícula para médio e superior estava quebrado antes desta correção.** Agora: para `fundamental`, um SearchableSelect de ano/classe vem de `user.academia.anos_academicos` (rótulos "1ª Classe", "2ª Classe"...); para `medio`/`superior`, aparece primeiro um SearchableSelect de curso (filtrado por `curso.type === nivel`, já carregado de `academiaService.listarCursos`) e, depois de escolhido, um segundo SearchableSelect com os anos daquele curso específico (`curso.anos_academicos`).
- **2.5** — "Ano letivo" em Ações excecionais deixou de ser um `Input` de texto livre. Agora é um SearchableSelect alimentado pelos anos letivos reais da academia (`academiaService.getAnoLetivo` + `academiaService.listarAnosLetivosLista`), pré-selecionando o ano letivo vigente.
- **2.6** — Demais ajustes visuais/de consistência identificados durante a leitura do código (agrupados abaixo em "O que mais foi ajustado").
- **2.7** — A seção "Ações excecionais" inteira (antes só a parte de anular/reativar obrigações; a parte de "definir início de cobrança" ficava visível para admin também) agora só aparece para `isAcademia`. Consistente com o backend, que já bloqueia (403) anular/reativar obrigações para quem não é do tipo `academia`.
- **2.8** — Visão de admin (FPP): a página não tem hoje nenhuma configuração financeira que pertença ao administrador — não existe seletor de academias, nem formulários de mensalidade/matrícula; mostra apenas um aviso "indisponível no momento" (mesmo padrão do item 3.2 de pagamentos, onde também não existe ainda cobrança própria do Spuri). Visão de academia: mostra só o que é dela, sem nenhum seletor de academia (a academia já é a autenticada pelo cookie de sessão).

**O que mais foi ajustado (parte do item 2.6):** o componente `InfoBox` (regras financeiras) foi reescrito para descrever com precisão o comportamento real de versionamento (cada configuração salva cria uma nova versão vigente a partir de agora, sem apagar histórico) e o comportamento de matrícula gratuita quando não há configuração para a combinação nível/ano/curso — extraído da leitura de `finance/mensalidade.go`/`finance/matricula.go`.

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { academiaService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import AnularReativarObrigacoesForm from "@/components/paineis/AnularReativarObrigacoesForm";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { Curso, FinanceiroMetodoPagamento, FinanceiroNivel, MatriculaConfiguracaoInput, MensalidadeConfiguracaoInput } from "@/types/api";

const METODOS: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];
const NIVEL_OPCOES: { value: FinanceiroNivel; label: string }[] = [
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
  { value: "superior", label: "Superior" },
];
const MES_FIM_OPCOES = [
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
];
/** Nomes reais dos meses (pt-AO) — corrige o bug de exibir "Mês 1", "Mês 2"... */
const MES_NOME_OPCOES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1)),
}));

function money(value: number) { return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(value); }
function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d); }

/** "6_ano_fundamental" → "6ª Classe"; "2_ano_medio" → "2.º Ano (Médio)". Mesmo padrão usado nas telas de matrícula/turmas. */
function labelAnoAcademico(codigo: string): string {
  const m = /^(\d+)_ano_(fundamental|medio|superior)$/.exec(codigo);
  if (!m) return codigo;
  const [, numero, nivel] = m;
  if (nivel === "fundamental") return `${numero}ª Classe`;
  if (nivel === "medio") return `${numero}.º Ano (Médio)`;
  return `${numero}.º Ano (Superior)`;
}

function LoadingState() {
  return <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"><span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />Carregando configurações...</div></div>;
}

function InfoBox() {
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-900/20">
      <div className="flex items-start gap-3">
        <Icon icon="mdi:information-outline" width={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
        <div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">Regras financeiras importantes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700/90 dark:text-brand-300">
            <li>Cada configuração enviada cria uma <b>nova versão vigente a partir de agora</b> — não edita nem apaga versões passadas. Meses e matrículas já vencidos continuam usando o valor que estava vigente na época em que venceram.</li>
            <li>A configuração é específica por <b>nível de ensino</b> e, dentro dele, por <b>ano/classe</b> (fundamental) ou por <b>curso e ano</b> (médio/superior) — por isso pode (e normalmente deve) haver várias configurações vigentes ao mesmo tempo, uma por combinação.</li>
            <li>Na Matrícula: se <b>nenhuma</b> configuração existir para a combinação nível/ano/curso de uma solicitação, a matrícula daquele candidato é <b>gratuita</b> e a academia aprova direto, sem cobrança.</li>
            <li>Pagamentos só podem ser feitos pelos métodos habilitados aqui: <b>GPO</b> (Multicaixa Express via número de telefone), <b>REF</b> (referência para pagar em qualquer Multicaixa/ATM/homebanking) e <b>GPO_QR</b> (QR Code, exibido para o pagador escanear no momento em que ele escolhe pagar).</li>
            <li>É <b>obrigatório configurar as credenciais AppyPay antes</b> — sem isso, nenhuma cobrança pode ser criada mesmo com o valor já configurado aqui. <Link href="/financas/credenciais" className="font-medium underline">Configurar credenciais</Link>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

type NivelFormState = {
  nivel: FinanceiroNivel;
  ano_academico: string;
  curso_id: string;
  valor: string;
  metodos_pagamento: FinanceiroMetodoPagamento[];
};

type FormFieldErrors = Partial<Record<"ano_academico" | "curso_id" | "valor", string>>;

/**
 * Painel de configurações financeiras.
 *
 * Visão de admin (FPP): configuração de propina/matrícula é uma
 * responsabilidade exclusiva de cada academia — não existe hoje nenhuma
 * configuração financeira que pertença ao administrador (nenhum tipo de
 * cobrança do próprio Spuri existe ainda, mesmo caso de /financas/pagamentos).
 * Por isso o admin não vê seletor de academia, nem os formulários de
 * mensalidade/matrícula: só o aviso abaixo.
 *
 * Visão de academia: mostra só o que é dela — nenhum seletor de academia
 * (a academia já é a autenticada), formulários de propina/matrícula,
 * histórico de versões e "Ações excecionais" (exclusivas da academia).
 */
export default function FinanceiroConfiguracoesPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";
  const codigoAcademia = user?.academia?.codigo_academia ?? "";
  const anosAcademicosAcademia = useMemo(() => user?.academia?.anos_academicos ?? [], [user?.academia?.anos_academicos]);

  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [mensalidadeForm, setMensalidadeForm] = useState<NivelFormState>({ nivel: "fundamental", ano_academico: "", curso_id: "", valor: "", metodos_pagamento: ["GPO"] });
  const [mensalidadeMesFim, setMensalidadeMesFim] = useState("6");
  const [mensalidadeErrors, setMensalidadeErrors] = useState<FormFieldErrors>({});
  const [matriculaForm, setMatriculaForm] = useState<NivelFormState>({ nivel: "fundamental", ano_academico: "", curso_id: "", valor: "", metodos_pagamento: ["GPO"] });
  const [matriculaErrors, setMatriculaErrors] = useState<FormFieldErrors>({});
  const [cursos, setCursos] = useState<Curso[]>([]);

  const mensalidadesApi = useApi(financeiroService.listarConfiguracoesMensalidade);
  const matriculasApi = useApi(financeiroService.listarConfiguracoesMatricula);
  const salvarMensalidade = useApi(financeiroService.configurarMensalidade);
  const salvarMatricula = useApi(financeiroService.configurarMatricula);
  const atualizarMensalidade = useApi(financeiroService.atualizarConfiguracaoMensalidade);
  const atualizarMatricula = useApi(financeiroService.atualizarConfiguracaoMatricula);

  const reload = async () => {
    if (!codigoAcademia) return;
    await Promise.all([
      mensalidadesApi.execute({ codigo_academia: codigoAcademia }),
      matriculasApi.execute({ codigo_academia: codigoAcademia }),
    ]);
  };

  useEffect(() => {
    if (!loading && isAcademia && codigoAcademia) void reload().catch((err) => setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar configurações.") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAcademia, codigoAcademia]);

  useEffect(() => {
    if (!isAcademia || !codigoAcademia) { setCursos([]); return; }
    academiaService.listarCursos({ codigo_academia: codigoAcademia })
      .then((r) => setCursos((r.cursos ?? []).filter((c) => c.status === "ativo")))
      .catch(() => setCursos([]));
  }, [isAcademia, codigoAcademia]);

  if (loading) return <LoadingState />;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} message="O módulo financeiro é exclusivo de administradores FPP e academias. Administradores adm/gerente não conseguem ler dados financeiros pela API atual." />;

  if (isFpp) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:cog-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Configurações financeiras</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Propina, matrícula e as demais configurações desta página pertencem a cada academia, não ao administrador —
              indisponível no momento. Ainda não existe nenhuma configuração financeira própria do Spuri.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const toggleMetodo = (kind: "mensalidade" | "matricula", metodo: FinanceiroMetodoPagamento) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    setter((prev) => ({ ...prev, metodos_pagamento: prev.metodos_pagamento.includes(metodo) ? prev.metodos_pagamento.filter((m) => m !== metodo) : [...prev.metodos_pagamento, metodo] }));
  };

  const cursosDoNivel = (nivel: FinanceiroNivel) => cursos.filter((c) => c.type === nivel);
  const anosDoFormulario = (form: NivelFormState): string[] => {
    if (form.nivel === "fundamental") return anosAcademicosAcademia.filter((a) => a.endsWith("_ano_fundamental"));
    const curso = cursos.find((c) => c.id === form.curso_id);
    return curso?.anos_academicos ?? [];
  };

  const validarValorEAno = (form: NivelFormState): FormFieldErrors => {
    const errors: FormFieldErrors = {};
    const valorNumero = Number(form.valor);
    if (!form.valor.trim() || !(valorNumero > 0)) errors.valor = "Informe um valor maior que zero.";
    if (form.nivel === "fundamental") {
      if (!form.ano_academico) errors.ano_academico = "Selecione o ano/classe.";
    } else {
      if (!form.curso_id) errors.curso_id = "Selecione o curso.";
      if (!form.ano_academico) errors.ano_academico = "Selecione o ano do curso.";
    }
    return errors;
  };

  const matches = (c: { nivel: string; curso_id?: string; ano_academico?: string }, form: NivelFormState) =>
    c.nivel === form.nivel && (form.nivel === "fundamental" ? c.ano_academico === form.ano_academico : c.curso_id === form.curso_id && c.ano_academico === form.ano_academico);

  const submitMensalidade = async () => {
    const errors = validarValorEAno(mensalidadeForm);
    setMensalidadeErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (!codigoAcademia) throw new Error("Academia não identificada.");
      const p: MensalidadeConfiguracaoInput = {
        codigo_academia: codigoAcademia,
        nivel: mensalidadeForm.nivel,
        ano_academico: mensalidadeForm.ano_academico,
        curso_id: mensalidadeForm.nivel === "fundamental" ? undefined : mensalidadeForm.curso_id,
        valor: Number(mensalidadeForm.valor),
        mes_fim_cobranca: Number(mensalidadeMesFim) as 6 | 7,
        metodos_pagamento: mensalidadeForm.metodos_pagamento,
      };
      const exists = (mensalidadesApi.data?.configuracoes ?? []).some((c) => matches(c, mensalidadeForm));
      await (exists ? atualizarMensalidade.execute(p) : salvarMensalidade.execute(p));
      setAlert({ variant: "success", message: "Configuração de mensalidade versionada com sucesso." });
      await reload();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível salvar mensalidade.") });
    }
  };

  const submitMatricula = async () => {
    const errors = validarValorEAno(matriculaForm);
    setMatriculaErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (!codigoAcademia) throw new Error("Academia não identificada.");
      const p: MatriculaConfiguracaoInput = {
        codigo_academia: codigoAcademia,
        nivel: matriculaForm.nivel,
        ano_academico: matriculaForm.ano_academico,
        curso_id: matriculaForm.nivel === "fundamental" ? undefined : matriculaForm.curso_id,
        valor: Number(matriculaForm.valor),
        metodos_pagamento: matriculaForm.metodos_pagamento,
      };
      const exists = (matriculasApi.data?.configuracoes ?? []).some((c) => matches(c, matriculaForm));
      await (exists ? atualizarMatricula.execute(p) : salvarMatricula.execute(p));
      setAlert({ variant: "success", message: "Configuração de matrícula versionada com sucesso." });
      await reload();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível salvar matrícula.") });
    }
  };

  const updateNivel = (kind: "mensalidade" | "matricula", nivel: FinanceiroNivel) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    const setErrors = kind === "mensalidade" ? setMensalidadeErrors : setMatriculaErrors;
    setter((prev) => ({ ...prev, nivel, curso_id: "", ano_academico: "" }));
    setErrors({});
  };

  const renderMetodos = (kind: "mensalidade" | "matricula", selected: FinanceiroMetodoPagamento[]) => (
    <div className="flex flex-wrap gap-4">
      {METODOS.map((m) => (
        <Checkbox key={m} id={`${kind}-metodo-${m}`} label={m} checked={selected.includes(m)} onChange={() => toggleMetodo(kind, m)} />
      ))}
    </div>
  );

  const renderNivelFields = (kind: "mensalidade" | "matricula", form: NivelFormState, errors: FormFieldErrors, setForm: (updater: (prev: NivelFormState) => NivelFormState) => void) => (
    <>
      <Label>Nível</Label>
      <SearchableSelect
        value={form.nivel}
        options={NIVEL_OPCOES}
        onChange={(v) => updateNivel(kind, (v || "fundamental") as FinanceiroNivel)}
        isSearchable={false}
        isClearable={false}
        inputId={`${kind}-nivel`}
        name={`${kind}-nivel`}
      />
      {form.nivel !== "fundamental" && (
        <>
          <Label>Curso</Label>
          <SearchableSelect
            value={form.curso_id}
            options={cursosDoNivel(form.nivel).map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => setForm((prev) => ({ ...prev, curso_id: v, ano_academico: "" }))}
            placeholder={cursosDoNivel(form.nivel).length ? "Selecione um curso" : "Nenhum curso cadastrado para este nível"}
            isClearable
            inputId={`${kind}-curso`}
            name={`${kind}-curso`}
            error={errors.curso_id}
          />
        </>
      )}
      <Label>{form.nivel === "fundamental" ? "Ano / classe" : "Ano do curso"}</Label>
      <SearchableSelect
        value={form.ano_academico}
        options={anosDoFormulario(form).map((a) => ({ value: a, label: labelAnoAcademico(a) }))}
        onChange={(v) => setForm((prev) => ({ ...prev, ano_academico: v }))}
        placeholder={anosDoFormulario(form).length ? "Selecione o ano" : "Selecione um curso primeiro"}
        isDisabled={form.nivel !== "fundamental" && !form.curso_id}
        isClearable
        inputId={`${kind}-ano-academico`}
        name={`${kind}-ano-academico`}
        error={errors.ano_academico}
      />
      <Label>Valor (Kz)</Label>
      <Input
        type="number"
        min="0.01"
        step={0.01}
        value={form.valor}
        onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))}
        error={!!errors.valor}
        hint={errors.valor}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
      <InfoBox />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:calendar-month-outline" width={22} className="text-gray-800 dark:text-white/90" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Propina / mensalidade</h2>
          </div>
          <div className="mt-4 grid gap-4">
            {renderNivelFields("mensalidade", mensalidadeForm, mensalidadeErrors, setMensalidadeForm)}
            <Label>Mês de encerramento da cobrança</Label>
            <SearchableSelect
              value={mensalidadeMesFim}
              options={MES_FIM_OPCOES}
              onChange={(v) => setMensalidadeMesFim(v || "6")}
              isSearchable={false}
              isClearable={false}
              inputId="mensalidade-mes-fim"
              name="mensalidade-mes-fim"
            />
            <Label>Métodos de pagamento aceites</Label>
            {renderMetodos("mensalidade", mensalidadeForm.metodos_pagamento)}
            <Button onClick={submitMensalidade} disabled={salvarMensalidade.loading || atualizarMensalidade.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16} />}>
              Salvar nova versão
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:school-outline" width={22} className="text-gray-800 dark:text-white/90" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Taxa de matrícula</h2>
          </div>
          <div className="mt-4 grid gap-4">
            {renderNivelFields("matricula", matriculaForm, matriculaErrors, setMatriculaForm)}
            <Label>Métodos de pagamento aceites</Label>
            {renderMetodos("matricula", matriculaForm.metodos_pagamento)}
            <Button onClick={submitMatricula} disabled={salvarMatricula.loading || atualizarMatricula.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16} />}>
              Salvar nova versão
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:history" width={22} className="text-gray-800 dark:text-white/90" />
          <h2 className="font-semibold text-gray-800 dark:text-white/90">Histórico de versões</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>{["Tipo", "Nível", "Ano/Curso", "Valor", "Fim", "Métodos", "Vigente em"].map((h) => <TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow>
            </TableHeader>
            <TableBody>
              {[
                ...(mensalidadesApi.data?.configuracoes ?? []).map((c) => ({ tipo: "Propina", fim: String(c.mes_fim_cobranca), ...c })),
                ...(matriculasApi.data?.configuracoes ?? []).map((c) => ({ tipo: "Matrícula", fim: "—", ...c })),
              ].map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.tipo}</TableCell>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{NIVEL_OPCOES.find((n) => n.value === c.nivel)?.label ?? c.nivel}</TableCell>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.ano_academico ? labelAnoAcademico(c.ano_academico) : (cursos.find((cu) => cu.id === c.curso_id)?.nome ?? c.curso_id ?? "—")}</TableCell>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{money(c.valor)}</TableCell>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.fim === "6" ? "Junho" : c.fim === "7" ? "Julho" : c.fim}</TableCell>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.metodos_pagamento.join(", ")}</TableCell>
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{date(c.vigente_em)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* "Ações excecionais" é exclusiva da academia — o backend já bloqueia
          anular/reativar obrigações para admin (403), e definir início de
          cobrança fora do padrão só faz sentido para quem opera o ano letivo
          da própria academia. */}
      {isAcademia && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:alert-circle-outline" width={22} className="text-gray-800 dark:text-white/90" />
            <h2 className="font-semibold text-gray-800 dark:text-white/90">Ações excecionais</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Use apenas se o ano letivo começou fora do padrão (ex.: turma que iniciou em março em vez de fevereiro) — isso ajusta a partir de qual mês a cobrança de propina passa a valer para esse ano letivo, e permite anular ou reativar obrigações pontuais de um estudante.
          </p>
          <div className="mt-4">
            <DefinirInicioCobrancaForm codigoAcademia={codigoAcademia} />
          </div>
          <div className="mt-5">
            <AnularReativarObrigacoesForm codigoAcademia={codigoAcademia} onSuccess={reload} />
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Formulário de "definir início de cobrança fora do padrão". Extraído do
 * corpo do painel para poder buscar o ano letivo real da academia (em vez
 * de texto livre) sem misturar essa busca com o resto do estado da página.
 */
function DefinirInicioCobrancaForm({ codigoAcademia }: { codigoAcademia: string }) {
  const [anosLetivos, setAnosLetivos] = useState<string[]>([]);
  const [anoLetivo, setAnoLetivo] = useState("");
  const [mesInicio, setMesInicio] = useState("2");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const definirInicio = useApi(financeiroService.definirInicioCobranca);

  useEffect(() => {
    if (!codigoAcademia) return;
    Promise.all([
      academiaService.getAnoLetivo({ codigo_academia: codigoAcademia }),
      academiaService.listarAnosLetivosLista({ codigo_academia: codigoAcademia }),
    ]).then(([atual, lista]) => {
      const anos = Array.from(new Set([atual?.ano_letivo, ...((lista?.anos_letivos_lista ?? []).map((a) => a.ano_letivo))].filter((a): a is string => !!a)));
      setAnosLetivos(anos);
      setAnoLetivo((prev) => prev || atual?.ano_letivo || anos[0] || "");
    }).catch(() => setAnosLetivos([]));
  }, [codigoAcademia]);

  const submit = async () => {
    setAlert(null);
    if (!anoLetivo) { setAlert({ variant: "error", message: "Selecione o ano letivo." }); return; }
    try {
      await definirInicio.execute({ codigo_academia: codigoAcademia, ano_letivo: anoLetivo, mes_inicio: Number(mesInicio) });
      setAlert({ variant: "success", message: "Início de cobrança definido com sucesso." });
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível definir o início de cobrança.") });
    }
  };

  return (
    <div className="space-y-3">
      {alert && <Alert variant={alert.variant} title="Início de cobrança" message={alert.message} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <Label>Ano letivo</Label>
          <SearchableSelect
            value={anoLetivo}
            options={anosLetivos.map((a) => ({ value: a, label: a.replace("_", "/") }))}
            onChange={(v) => setAnoLetivo(v)}
            placeholder={anosLetivos.length ? "Selecione o ano letivo" : "Nenhum ano letivo definido para esta academia"}
            isSearchable={false}
            inputId="inicio-cobranca-ano-letivo"
            name="inicio-cobranca-ano-letivo"
          />
        </div>
        <div>
          <Label>Mês início</Label>
          <SearchableSelect
            value={mesInicio}
            options={MES_NOME_OPCOES}
            onChange={(v) => setMesInicio(v || "2")}
            isSearchable={false}
            isClearable={false}
            inputId="inicio-cobranca-mes"
            name="inicio-cobranca-mes"
          />
        </div>
        <div className="self-end">
          <Button onClick={submit} disabled={!anoLetivo || definirInicio.loading} startIcon={<Icon icon="mdi:calendar-start" width={16} />}>
            Definir início de cobrança
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Seção 6 — `spuripainel/src/components/paineis/AnularReativarObrigacoesForm.tsx` (substituir arquivo inteiro)

**Objetivo:** este componente é usado dentro de "Ações excecionais" (Seção 5) e tinha os mesmos dois bugs: "Ano letivo" era um `Input` de texto livre, e o `MultiSelect` de meses mostrava "Mês 1", "Mês 2"... Corrigido para usar o mesmo SearchableSelect de ano letivo (real, vindo da academia) e nomes reais de mês, mantendo o restante da lógica de anular/reativar 100% intacta.

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
"use client";
import { useEffect, useState } from "react";
import { academiaService, consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import SearchableSelect from "@/components/form/SearchableSelect";
import MultiSelect from "@/components/form/MultiSelect";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";

/** Nomes reais dos meses — corrige o bug de exibir "Mês 1", "Mês 2"... */
const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  text: new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1)),
  selected: false,
}));

export default function AnularReativarObrigacoesForm({ codigoAcademia, onSuccess }: { codigoAcademia: string; onSuccess?: () => void }) {
  const [estudantes, setEstudantes] = useState<{ value: string; label: string }[]>([]);
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [anosLetivos, setAnosLetivos] = useState<string[]>([]);
  const [anoLetivo, setAnoLetivo] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const anular = useApi(financeiroService.anularObrigacoes);
  const reativar = useApi(financeiroService.reativarObrigacoes);

  useEffect(() => {
    if (!codigoAcademia) return;
    consultasService.listarEstudantes({ codigo_academia: codigoAcademia, limit: 300, offset: 0 })
      .then((r) => setEstudantes((r.estudantes ?? []).map((e: any) => ({ value: e.codigo_estudante, label: `${e.nome ?? e.codigo_estudante} (${e.codigo_estudante})` }))))
      .catch(() => setEstudantes([]));
  }, [codigoAcademia]);

  useEffect(() => {
    if (!codigoAcademia) return;
    Promise.all([
      academiaService.getAnoLetivo({ codigo_academia: codigoAcademia }),
      academiaService.listarAnosLetivosLista({ codigo_academia: codigoAcademia }),
    ]).then(([atual, lista]) => {
      const anos = Array.from(new Set([atual?.ano_letivo, ...((lista?.anos_letivos_lista ?? []).map((a) => a.ano_letivo))].filter((a): a is string => !!a)));
      setAnosLetivos(anos);
      setAnoLetivo((prev) => prev || atual?.ano_letivo || anos[0] || "");
    }).catch(() => setAnosLetivos([]));
  }, [codigoAcademia]);

  const executar = async (acao: "anular" | "reativar") => {
    if (!codigoEstudante || !anoLetivo || meses.length === 0) { setAlert({ variant: "error", message: "Selecione o estudante, o ano letivo e ao menos um mês." }); return; }
    if (acao === "anular" && !motivo.trim()) { setAlert({ variant: "error", message: "Informe o motivo para anular obrigações." }); return; }
    try {
      const payload = { codigo_estudante: codigoEstudante, codigo_academia: codigoAcademia, ano_letivo: anoLetivo, meses: meses.map(Number), motivo: motivo.trim() || undefined };
      await (acao === "anular" ? anular.execute(payload) : reativar.execute(payload));
      setAlert({ variant: "success", message: acao === "anular" ? "Obrigações anuladas." : "Obrigações reativadas." });
      onSuccess?.();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível concluir a ação.") });
    }
  };

  return <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
    {alert && <Alert variant={alert.variant} title="Obrigações de mensalidade" message={alert.message} />}
    <div><Label>Estudante</Label><SearchableSelect value={codigoEstudante} options={estudantes} onChange={setCodigoEstudante} placeholder="Buscar estudante..." isClearable /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>Ano letivo</Label>
        <SearchableSelect
          value={anoLetivo}
          options={anosLetivos.map((a) => ({ value: a, label: a.replace("_", "/") }))}
          onChange={setAnoLetivo}
          placeholder={anosLetivos.length ? "Selecione o ano letivo" : "Nenhum ano letivo definido para esta academia"}
          isSearchable={false}
          inputId="anular-reativar-ano-letivo"
          name="anular-reativar-ano-letivo"
        />
      </div>
      <MultiSelect label="Meses" options={MESES} defaultSelected={meses} onChange={setMeses} />
    </div>
    <div><Label>Motivo (obrigatório para anular)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: bolsa concedida, erro de lançamento..." /></div>
    <div className="flex gap-3"><Button size="sm" variant="outline" disabled={anular.loading} onClick={() => executar("anular")} startIcon={<Icon icon="mdi:close-circle-outline" width={16}/>}>Anular selecionados</Button><Button size="sm" disabled={reativar.loading} onClick={() => executar("reativar")} startIcon={<Icon icon="mdi:reload" width={16}/>}>Reativar selecionados</Button></div>
  </div>;
}
```

---

## Seção 7 — `spuripainel/src/components/paineis/FinanceiroPagamentosPainel.tsx` (substituir arquivo inteiro)

**Objetivo (item 3 do pedido), mapeado ponto a ponto:**

- **Paginação real (30 por página)** — usa `PaginacaoSetas` de `financeiroShared.tsx` (mesmo padrão visual/comportamental de botões numerados de `/estudantes/PageContent.tsx`), com `limit=30`/`offset` calculados a partir da página atual e enviados em toda requisição — nunca busca tudo de uma vez.
- **3.1 (Academia)** — dois selects (SearchableSelect): tipo de cobrança (Todos/Mensalidade/Matrícula/Outros, já com "Todos os tipos" selecionado por padrão) e estado do pagamento (já com "Todos os estados" selecionado por padrão). **Existe agora apenas uma tabela** — a antiga seção "Consultar mensalidades e histórico por estudante" (uma segunda tabela separada, com busca de estudante) foi removida. Cada cobrança tem seu próprio botão "Ver detalhes", que abre a subtela (`CobrancaDetalhesModal`, de `financeiroShared.tsx`) mostrando os dados da cobrança e, quando ela está vinculada a um estudante, também os dados desse estudante (nome, telefone, email, status — via `GET /consultar-estudante/:codigo`, permitido para academia/admin). A ação de cancelar cobrança (que já existia) foi movida para dentro dessa subtela.
- **3.2 (Administradores)** — ainda não existe tipo de cobrança específico para o Spuri: a tela mostra só o aviso "indisponível no momento", sem selecionar academia nem listar nada.

**Por que a tabela usa os dados já carregados na listagem em vez de buscar a cobrança de novo ao clicar "Ver detalhes":** `CobrancaResumo` (o item da listagem) já traz todos os campos necessários para o detalhe (valor, moeda, descrição, método, estado, referência AppyPay, transação, atualizado em, estudante/solicitação vinculados) — buscar de novo no servidor a cada clique seria uma requisição redundante, contrariando o próprio pedido de "evitar sobrecarga no banco de dados".

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  CobrancaDetalhesModal,
  CobrancasTable,
  EmptyState,
  LoadingState,
  PaginacaoSetas,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroOrigemCobranca } from "@/types/api";

const PAGE_SIZE = 30;

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

const ESTADO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

/**
 * Painel de pagamentos para academia e admin (FPP).
 *
 * - Academia: uma única tabela de cobranças, paginada de verdade (30 por
 *   página, requisição sempre com limit/offset da página atual — mesmo
 *   padrão de /estudantes), com filtro por tipo e por estado, e um botão
 *   "Ver detalhes" por cobrança.
 * - Admin (FPP): ainda não existe tipo de cobrança específico para o
 *   Spuri, então a tela mostra apenas um aviso "indisponível no momento"
 *   — sem listar cobranças de nenhuma academia.
 *
 * A antiga seção "Consultar mensalidades e histórico por estudante" (uma
 * segunda tabela, separada) foi removida: agora há só a tabela acima,
 * e "ver detalhes" mostra os dados do estudante vinculado quando houver.
 */
export default function FinanceiroPagamentosPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [tipo, setTipo] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [alert, setAlert] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<CobrancaResumo | null>(null);

  const list = useApi(financeiroService.listarCobrancas);
  const cancelApi = useApi(financeiroService.cancelarCobranca);

  useEffect(() => {
    if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia);
  }, [user?.academia?.codigo_academia]);

  const parametros = useMemo(
    () => ({
      contexto_tipo: "academia" as const,
      codigo_academia: codigoAcademia || undefined,
      limit: PAGE_SIZE,
      offset: (pagina - 1) * PAGE_SIZE,
      tipo: tipo ? [tipo] : undefined,
      estado: estado ? [estado] : undefined,
    }),
    [codigoAcademia, tipo, estado, pagina]
  );

  const carregar = useCallback(() => {
    if (!codigoAcademia) return Promise.resolve();
    return list.execute(parametros).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar as cobranças.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoAcademia, parametros]);

  useEffect(() => {
    if (!loading && isAcademia) void carregar();
  }, [loading, isAcademia, carregar]);

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

  const totalGeral = list.data?.total_geral ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalGeral / PAGE_SIZE));
  const cobrancas = list.data?.cobrancas ?? [];

  return (
    <div className="space-y-6">
      {alert && <Alert variant="error" title="Finanças" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cobranças AppyPay da sua academia, em todos os estados.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SearchableSelect
            value={tipo}
            options={TIPO_OPCOES}
            onChange={(v) => { setTipo(v); setPagina(1); }}
            placeholder="Tipo de cobrança"
            isSearchable={false}
            isClearable={false}
            inputId="pagamentos-tipo"
            name="pagamentos-tipo"
          />
          <SearchableSelect
            value={estado}
            options={ESTADO_OPCOES}
            onChange={(v) => { setEstado(v); setPagina(1); }}
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
            <CobrancasTable rows={cobrancas} onOpen={setSelecionada} />
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
      </section>

      <CobrancaDetalhesModal
        cobranca={selecionada}
        onClose={() => setSelecionada(null)}
        mostrarDadosEstudante
        onCancelar={async (cobranca, motivo) => {
          await cancelApi.execute(cobranca.id, motivo);
          await carregar();
        }}
      />
    </div>
  );
}
```

---

## Seção 8 — `spuripainel/src/components/paineis/EstudantePagamentosPainel.tsx` (substituir arquivo inteiro)

**Por que este arquivo, que não está sob `/financas/`, faz parte da tarefa:** o pedido descreve o item 3.3 ("Estudante") como parte da mesma funcionalidade de pagamentos dos itens 3.1/3.2, e o próprio código já tratava as duas telas como uma coisa só — `EstudantePagamentosPainel.tsx` já importava `CobrancasTable`/`badge`/`money`/`Qr` diretamente de `FinanceiroPagamentosPainel.tsx` antes desta tarefa. A rota real do estudante é `/pagamentos` (fora de `/financas/`, pois o estudante não tem acesso a `/financas/*` — ver `route-guards.ts`), mas é a mesma funcionalidade. Isso está sendo explicitado aqui para transparência; se a intenção era não tocar nesta tela, avise Claude para reverter só esta seção.

**Objetivo (item 3.3 do pedido):** a tela do estudante tem DUAS seções distintas e independentes, que continuam independentes após esta correção:

1. **"Meus pagamentos"** (mensalidades pendentes + fluxo de pagamento) — feature de iniciar pagamento, **fora do escopo desta tarefa, não alterada em nenhuma regra de negócio**. Só foi ajustada mecanicamente: a chamada `badge(m.estado)` virou `<StatusBadge status={m.estado} />` (mesmo resultado visual, só a forma de chamar o componente, já que `badge`/`StatusBadge` mudou de arquivo) e o import de `money`/`Qr` passou a vir de `financeiroShared.tsx` em vez de `FinanceiroPagamentosPainel.tsx`.
2. **"Histórico completo de cobranças"** — esta é a seção do item 3.3: agora tem dois SearchableSelect (tipo de cobrança e estado do pagamento) **independentes** dos filtros da seção "Meus pagamentos" (que tem seu próprio select de estado, sem alteração), paginação real de 30 itens (`PaginacaoSetas`), e "ver detalhes" (`CobrancaDetalhesModal` com `mostrarDadosEstudante={false}`, já que o próprio estudante não precisa buscar os próprios dados de novo, e o endpoint `GET /consultar-estudante/:codigo` nem é permitido para o ator `estudante`). Sem botão de cancelar (estudante nunca pôde cancelar as próprias cobranças, e isso não muda aqui).

**Extensão de backend necessária para o filtro de tipo do estudante:** ver Seção 10 — o endpoint `GET /financeiro/cobrancas/estudante/:codigo` não tinha filtro por tipo; foi adicionado.

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  CobrancaDetalhesModal,
  CobrancasTable,
  EmptyState,
  LoadingState,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  money,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView } from "@/types/api";

const PAGE_SIZE = 30;
const mesNome = (m: number) => new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, m - 1, 1));
function getCodigo(user: any) { return user?.estudante?.codigo_estudante || user?.estudante?.codigo || user?.codigo; }

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

const ESTADO_HISTORICO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  // ── Mensalidades pendentes + pagamento (feature independente, não alterada nesta tarefa) ──
  const mensalidades = useApi(financeiroService.consultarMensalidadesEstudante);
  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);
  const [estadoMensalidades, setEstadoMensalidades] = useState("");
  const [payAcademia, setPayAcademia] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [metodo, setMetodo] = useState<FinanceiroMetodoPagamento>("GPO");
  const [telefone, setTelefone] = useState("");
  const [result, setResult] = useState<any>(null);

  // ── Histórico completo de cobranças (tarefa 49: tipo + estado + ver detalhes) ──
  const historico = useApi(financeiroService.consultarCobrancasEstudante);
  const [tipoHistorico, setTipoHistorico] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estadoHistorico, setEstadoHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [selecionada, setSelecionada] = useState<CobrancaResumo | null>(null);

  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && codigo) {
      void mensalidades.execute(codigo).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar mensalidades.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo]);

  useEffect(() => {
    if (!loading && codigo && !restricted) {
      void historico
        .execute(codigo, {
          limit: PAGE_SIZE,
          offset: (paginaHistorico - 1) * PAGE_SIZE,
          tipo: tipoHistorico ? [tipoHistorico] : undefined,
          estado: estadoHistorico ? [estadoHistorico] : undefined,
        })
        .catch((e) => setAlert(formatApiError(e, "Não foi possível carregar o histórico de cobranças.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo, restricted, paginaHistorico, tipoHistorico, estadoHistorico]);

  const filtered = (mensalidades.data?.mensalidades ?? []).filter((m) => !estadoMensalidades || m.estado === estadoMensalidades);
  const byAcademia = useMemo(
    () => filtered.reduce<Record<string, MensalidadeMesView[]>>((acc, m) => { (acc[m.codigo_academia] ??= []).push(m); return acc; }, {}),
    [filtered]
  );

  const openPay = (academia: string, meses: MensalidadeMesView[]) => {
    const pend = meses.filter((m) => m.estado === "pendente").sort((a, b) => a.ano_letivo.localeCompare(b.ano_letivo) || a.mes - b.mes);
    setPayAcademia(academia);
    setSelected(pend[0] ? [`${pend[0].ano_letivo}:${pend[0].mes}`] : []);
    setMetodo((mensalidades.data?.metodos_pagamento_por_academia[academia]?.[0] ?? "GPO") as FinanceiroMetodoPagamento);
    setTelefone("");
    setResult(null);
  };

  const confirm = async () => {
    try {
      const meses = selected.map((x) => { const [ano_letivo, mes] = x.split(":"); return { ano_letivo, mes: Number(mes) }; });
      const r = await pagar.execute({ codigo_academia: payAcademia, meses, metodo_pagamento: metodo, telefone: metodo === "GPO" ? telefone : undefined });
      setResult(r);
      await mensalidades.execute(codigo);
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  };

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  const totalHistorico = historico.data?.total_geral ?? 0;
  const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
        <div className="mt-4">
          <Select
            key={estadoMensalidades}
            defaultValue={estadoMensalidades}
            options={[{ value: "", label: "Todos estados" }, { value: "pendente", label: "Pendentes" }, { value: "pago", label: "Pagos" }, { value: "anulado", label: "Anulados" }]}
            onChange={(v) => setEstadoMensalidades(v)}
          />
        </div>
        {Object.entries(byAcademia).map(([academia, rows]) => (
          <div key={academia} className="mt-5 rounded-xl border p-4 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white/90">Academia {academia}</h2>
              {rows.some((m) => m.estado === "pendente") && <Button size="sm" onClick={() => openPay(academia, rows)}>Pagar mensalidades</Button>}
            </div>
            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{["Ano letivo", "Mês", "Valor", "Estado"].map((h) => <TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{m.ano_letivo}</TableCell>
                      <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{mesNome(m.mes)}</TableCell>
                      <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{money(m.valor)}</TableCell>
                      <TableCell className="px-3 py-2"><StatusBadge status={m.estado} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h2 className="font-semibold text-gray-800 dark:text-white/90">Histórico completo de cobranças</h2>
        {restricted ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Histórico completo indisponível nesta sessão restrita; apenas mensalidades e pagamento estão liberados.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SearchableSelect
                value={tipoHistorico}
                options={TIPO_OPCOES}
                onChange={(v) => { setTipoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Tipo de cobrança"
                isSearchable={false}
                isClearable={false}
                inputId="historico-tipo"
                name="historico-tipo"
              />
              <SearchableSelect
                value={estadoHistorico}
                options={ESTADO_HISTORICO_OPCOES}
                onChange={(v) => { setEstadoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Estado do pagamento"
                isSearchable={false}
                isClearable={false}
                inputId="historico-estado"
                name="historico-estado"
              />
            </div>
            <div className="mt-4">
              {historico.loading ? (
                <LoadingState label="Carregando histórico..." />
              ) : (historico.data?.cobrancas?.length ?? 0) > 0 ? (
                <CobrancasTable rows={historico.data?.cobrancas ?? []} onOpen={setSelecionada} />
              ) : (
                <EmptyState title="Sem histórico." description="Nenhuma cobrança foi encontrada para os filtros selecionados." />
              )}
            </div>
            <div className="mt-4">
              <PaginacaoSetas paginaAtual={paginaHistorico} totalPaginas={totalPaginasHistorico} total={totalHistorico} porPagina={PAGE_SIZE} onChange={setPaginaHistorico} />
            </div>
          </>
        )}
      </section>

      <CobrancaDetalhesModal cobranca={selecionada} onClose={() => setSelecionada(null)} mostrarDadosEstudante={false} />

      <Modal isOpen={!!payAcademia} onClose={() => setPayAcademia("")} className="max-w-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pagar mensalidades</h3>
        {result ? (
          <div className="mt-4 space-y-3">
            <p>Status: {result.cobranca.status}</p>
            {metodo === "GPO" && <p>Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>}
            {metodo === "REF" && <pre className="rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(result.cobranca.response ?? {}, null, 2)}</pre>}
            {metodo === "GPO_QR" && <Qr value={result.cobranca.qrCodeArr} />}
            <Button size="sm" onClick={() => void mensalidades.execute(codigo)}>Verificar status</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {(mensalidades.data?.mensalidades ?? [])
              .filter((m) => m.codigo_academia === payAcademia && m.estado === "pendente")
              .sort((a, b) => a.ano_letivo.localeCompare(b.ano_letivo) || a.mes - b.mes)
              .map((m, i) => {
                const key = `${m.ano_letivo}:${m.mes}`;
                return (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={selected.includes(key)} disabled={i === 0} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, key] : s.filter((x) => x !== key)))} />
                    {m.ano_letivo} · {mesNome(m.mes)} · {money(m.valor)} {i === 0 && "(mais antigo obrigatório)"}
                  </label>
                );
              })}
            <Select
              key={metodo}
              defaultValue={metodo}
              options={(mensalidades.data?.metodos_pagamento_por_academia[payAcademia] ?? ["GPO"]).map((m) => ({ value: m, label: m }))}
              onChange={(v) => setMetodo(v as FinanceiroMetodoPagamento)}
            />
            {metodo === "GPO" && <Input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />}
            <Button disabled={!selected.length || (metodo === "GPO" && !telefone)} onClick={confirm}>Confirmar pagamento</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
```

---

## Seção 9 — `spuripainel/src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx` (editar 1 linha)

**Objetivo:** esta página pública de matrícula (fora do escopo funcional desta tarefa) importava `Qr`/`money` de `FinanceiroPagamentosPainel.tsx`. Como esses utilitários foram movidos para `financeiroShared.tsx` (Seção 3), só o caminho do import precisa mudar — nenhuma outra linha deste arquivo é tocada.

SUBSTITUIR:
```tsx
import { Qr, money } from "@/components/paineis/FinanceiroPagamentosPainel";
```

POR:
```tsx
import { Qr, money } from "@/components/paineis/financeiroShared";
```

---

## Seção 10 — `spuri-backend/internal/finance/appypay.go` (editar — extensão de backend, isolada e validada)

**Objetivo:** extrair a lógica de filtro por tipo de cobrança (`origensClause`, hoje só dentro de `ListCobrancas`) para uma função compartilhada, e usá-la também em `ListCobrancasEstudante` — necessário para o item 3.3 (o próprio estudante filtrar por tipo). Sem essa extensão, o filtro de tipo do item 3.3 teria que ser feito no cliente sobre a página atual (mostrando resultados incompletos/inconsistentes) ou buscando tudo de uma vez (contrariando o pedido de paginação real).

### 10.1 — Extrair `origensClause` de dentro de `ListCobrancas` e usá-la ali

SUBSTITUIR:
```go
	if len(origens) > 0 {
		clauses := make([]string, 0, len(origens))
		for _, origem := range origens {
			switch origem {
			case "matricula":
				clauses = append(clauses, "COALESCE(payload->>'codigo_solicitacao','') <> ''")
			case "mensalidade":
				clauses = append(clauses, "(COALESCE(payload->>'codigo_solicitacao','') = '' AND COALESCE(payload->>'codigo_estudante','') <> '')")
			case "avulsa":
				clauses = append(clauses, "(COALESCE(payload->>'codigo_solicitacao','') = '' AND COALESCE(payload->>'codigo_estudante','') = '')")
			default:
				return nil, fmt.Errorf("tipo de cobrança inválido: %s", origem)
			}
		}
		where += " AND (" + strings.Join(clauses, " OR ") + ")"
	}
	var total int
	if err := s.client.DB().QueryRowContext(ctx, "SELECT COUNT(*) FROM financeiro_cobrancas "+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	q := fmt.Sprintf(`SELECT id, COALESCE(provider_charge_id,''), merchant_transaction_id, contexto_tipo, COALESCE(codigo_academia,''), payload, updated_at FROM financeiro_cobrancas %s ORDER BY updated_at DESC LIMIT $%d OFFSET $%d`, where, i, i+1)
	args = append(args, limit, offset)
	rows, err := s.client.DB().QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CobrancaResumo{}
	for rows.Next() {
		dto, err := scanCobrancaResumo(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &CobrancaListResult{Cobrancas: out, Total: total}, nil
}

// scanCobrancaResumo lê uma linha de financeiro_cobrancas (id,
```

POR:
```go
	if len(origens) > 0 {
		clause, err := origensClause(origens)
		if err != nil {
			return nil, err
		}
		where += clause
	}
	var total int
	if err := s.client.DB().QueryRowContext(ctx, "SELECT COUNT(*) FROM financeiro_cobrancas "+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	q := fmt.Sprintf(`SELECT id, COALESCE(provider_charge_id,''), merchant_transaction_id, contexto_tipo, COALESCE(codigo_academia,''), payload, updated_at FROM financeiro_cobrancas %s ORDER BY updated_at DESC LIMIT $%d OFFSET $%d`, where, i, i+1)
	args = append(args, limit, offset)
	rows, err := s.client.DB().QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CobrancaResumo{}
	for rows.Next() {
		dto, err := scanCobrancaResumo(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &CobrancaListResult{Cobrancas: out, Total: total}, nil
}

// origensClause monta a cláusula SQL "AND (...)" que filtra
// financeiro_cobrancas pelo tipo de cobrança derivado do payload
// (mensalidade, matrícula ou avulsa) — a mesma derivação usada por
// scanCobrancaResumo. Devolve "" (sem filtro) quando origens está vazio.
// Extraída durante a tarefa 49 para ser compartilhada por ListCobrancas e
// ListCobrancasEstudante e nunca divergir entre as duas.
func origensClause(origens []string) (string, error) {
	if len(origens) == 0 {
		return "", nil
	}
	clauses := make([]string, 0, len(origens))
	for _, origem := range origens {
		switch origem {
		case "matricula":
			clauses = append(clauses, "COALESCE(payload->>'codigo_solicitacao','') <> ''")
		case "mensalidade":
			clauses = append(clauses, "(COALESCE(payload->>'codigo_solicitacao','') = '' AND COALESCE(payload->>'codigo_estudante','') <> '')")
		case "avulsa":
			clauses = append(clauses, "(COALESCE(payload->>'codigo_solicitacao','') = '' AND COALESCE(payload->>'codigo_estudante','') = '')")
		default:
			return "", fmt.Errorf("tipo de cobrança inválido: %s", origem)
		}
	}
	return " AND (" + strings.Join(clauses, " OR ") + ")", nil
}

// scanCobrancaResumo lê uma linha de financeiro_cobrancas (id,
```

### 10.2 — Assinatura de `ListCobrancasEstudante` (novo parâmetro `origens`)

SUBSTITUIR:
```go
func (s *Service) ListCobrancasEstudante(ctx context.Context, codigoEstudante string, somenteAcademia *string, estados []string, limit, offset int) (*CobrancaListResult, error) {
	if s.client == nil {
		return nil, errors.New("serviço financeiro não inicializado")
	}
	if codigoEstudante == "" {
		return nil, errors.New("código do estudante é obrigatório")
	}
	where := `WHERE (payload->>'codigo_estudante' = $1 OR payload->>'codigo_solicitacao' IN (SELECT codigo_solicitacao FROM projection_solicitacoes_matricula WHERE codigo_estudante_gerado = $1))`
	args := []any{codigoEstudante}
	i := 2
	if somenteAcademia != nil {
		where += fmt.Sprintf(" AND codigo_academia=$%d", i)
		args = append(args, *somenteAcademia)
		i++
	}
	if len(estados) > 0 {
		where += fmt.Sprintf(" AND payload->>'status' = ANY($%d)", i)
		args = append(args, pq.Array(estados))
		i++
	}
	var total int
```

POR:
```go
func (s *Service) ListCobrancasEstudante(ctx context.Context, codigoEstudante string, somenteAcademia *string, estados, origens []string, limit, offset int) (*CobrancaListResult, error) {
	if s.client == nil {
		return nil, errors.New("serviço financeiro não inicializado")
	}
	if codigoEstudante == "" {
		return nil, errors.New("código do estudante é obrigatório")
	}
	where := `WHERE (payload->>'codigo_estudante' = $1 OR payload->>'codigo_solicitacao' IN (SELECT codigo_solicitacao FROM projection_solicitacoes_matricula WHERE codigo_estudante_gerado = $1))`
	args := []any{codigoEstudante}
	i := 2
	if somenteAcademia != nil {
		where += fmt.Sprintf(" AND codigo_academia=$%d", i)
		args = append(args, *somenteAcademia)
		i++
	}
	if len(estados) > 0 {
		where += fmt.Sprintf(" AND payload->>'status' = ANY($%d)", i)
		args = append(args, pq.Array(estados))
		i++
	}
	if len(origens) > 0 {
		clause, err := origensClause(origens)
		if err != nil {
			return nil, err
		}
		where += clause
	}
	var total int
```

**Atenção:** `ListCobrancasEstudante` é chamada em 5 lugares no total — 1 no handler (Seção 11) e 4 em testes de integração (Seção 12). Todos precisam do parâmetro `origens` adicionado na posição correta (depois de `estados`, antes de `limit`) ou o build quebra com "not enough arguments". As duas seções seguintes já cobrem todos os 5 pontos.

---

## Seção 11 — `spuri-backend/internal/handlers/financeiro_handlers.go` (editar 1 linha)

SUBSTITUIR:
```go
	res, err := FinanceiroService.ListCobrancasEstudante(c.Request.Context(), codigo, somenteAcademia, c.QueryArray("estado"), limit, offset)
```

POR:
```go
	res, err := FinanceiroService.ListCobrancasEstudante(c.Request.Context(), codigo, somenteAcademia, c.QueryArray("estado"), c.QueryArray("tipo"), limit, offset)
```

Isso habilita `GET /financeiro/cobrancas/estudante/:codigo?tipo=mensalidade&tipo=matricula" (mesmo padrão de múltiplos `tipo=` que `ListarCobrancasAppyPay` já aceita para academia/admin).

---

## Seção 12 — `spuri-backend/internal/finance/cobrancas_estudante_integration_test.go` (editar — atualiza chamadas + cobre o novo filtro)

**Objetivo:** as 4 chamadas existentes a `ListCobrancasEstudante` precisam do novo parâmetro `nil` (sem filtro de tipo) na posição correta, e foram adicionados 4 casos novos de teste cobrindo o filtro por tipo (mensalidade, matrícula, e um tipo inválido que deve retornar erro — mesmo comportamento que `ListCobrancas` já tinha).


### 12.1 — dentro de `TestIntegrationListCobrancasEstudanteIncluiMensalidadeEMatricula`

SUBSTITUIR:
```go
	res, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, nil, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if res.Total != 3 {
		t.Fatalf("esperava 3 cobranças do estudante (1 matrícula + 2 mensalidade), obteve %d: %#v", res.Total, res.Cobrancas)
	}
	var temMatricula, temFalhada bool
	for _, cobranca := range res.Cobrancas {
		if cobranca.Origem == "matricula" && cobranca.CodigoSolicitacao == codigoSolicitacao {
			temMatricula = true
		}
		if cobranca.Status == "Failed" {
			temFalhada = true
		}
	}
	if !temMatricula {
		t.Fatalf("cobrança de matrícula original não apareceu na listagem: %#v", res.Cobrancas)
	}
	if !temFalhada {
		t.Fatalf("cobrança falhada não apareceu (listagem deveria incluir todos os estados por padrão): %#v", res.Cobrancas)
	}

	pagas, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, []string{"Success"}, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if pagas.Total != 2 {
		t.Fatalf("filtro por estado=Success deveria devolver 2 cobranças (matrícula + mensalidade paga), obteve %d", pagas.Total)
	}
}
```

POR:
```go
	res, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, nil, nil, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if res.Total != 3 {
		t.Fatalf("esperava 3 cobranças do estudante (1 matrícula + 2 mensalidade), obteve %d: %#v", res.Total, res.Cobrancas)
	}
	var temMatricula, temFalhada bool
	for _, cobranca := range res.Cobrancas {
		if cobranca.Origem == "matricula" && cobranca.CodigoSolicitacao == codigoSolicitacao {
			temMatricula = true
		}
		if cobranca.Status == "Failed" {
			temFalhada = true
		}
	}
	if !temMatricula {
		t.Fatalf("cobrança de matrícula original não apareceu na listagem: %#v", res.Cobrancas)
	}
	if !temFalhada {
		t.Fatalf("cobrança falhada não apareceu (listagem deveria incluir todos os estados por padrão): %#v", res.Cobrancas)
	}

	pagas, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, []string{"Success"}, nil, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if pagas.Total != 2 {
		t.Fatalf("filtro por estado=Success deveria devolver 2 cobranças (matrícula + mensalidade paga), obteve %d", pagas.Total)
	}

	// tarefa 49: o próprio estudante também precisa conseguir filtrar por
	// tipo de cobrança (mensalidade/matrícula/avulsa), mesmo mecanismo que
	// ListCobrancas já oferece à academia/admin.
	somenteMensalidade, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, nil, []string{"mensalidade"}, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if somenteMensalidade.Total != 2 {
		t.Fatalf("filtro por tipo=mensalidade deveria devolver 2 cobranças, obteve %d: %#v", somenteMensalidade.Total, somenteMensalidade.Cobrancas)
	}
	for _, cobranca := range somenteMensalidade.Cobrancas {
		if cobranca.Origem != "mensalidade" {
			t.Fatalf("filtro por tipo=mensalidade devolveu cobrança de origem %q: %#v", cobranca.Origem, cobranca)
		}
	}

	somenteMatricula, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, nil, []string{"matricula"}, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if somenteMatricula.Total != 1 || somenteMatricula.Cobrancas[0].CodigoSolicitacao != codigoSolicitacao {
		t.Fatalf("filtro por tipo=matricula deveria devolver só a cobrança da matrícula original, obteve %#v", somenteMatricula.Cobrancas)
	}

	if _, err := service.ListCobrancasEstudante(ctx, codigoEstudante, nil, nil, []string{"invalido"}, 50, 0); err == nil {
		t.Fatal("esperava erro para tipo de cobrança inválido")
	}
}
```

### 12.2 — dentro de `TestIntegrationListCobrancasEstudanteSomenteAcademiaIsolaOutraAcademia`

SUBSTITUIR:
```go
	semRestricao, err := service.ListCobrancasEstudante(ctx, estudante, nil, nil, 50, 0)
```

POR:
```go
	semRestricao, err := service.ListCobrancasEstudante(ctx, estudante, nil, nil, nil, 50, 0)
```

### 12.3 — mesma função, chamada seguinte

SUBSTITUIR:
```go
	comRestricao, err := service.ListCobrancasEstudante(ctx, estudante, &academiaA, nil, 50, 0)
```

POR:
```go
	comRestricao, err := service.ListCobrancasEstudante(ctx, estudante, &academiaA, nil, nil, 50, 0)
```

**Validação já feita por Claude (backend, Seções 10-12):** `go build ./...`, `go vet ./...` e `gofmt -l` sem nenhum erro/diferença. Suíte completa de `internal/finance/...` rodada com PostgreSQL 16 real: os 4 novos casos de asserção do filtro por tipo passam, e o teste inteiro passa. Os testes que já falhavam **antes** desta mudança (`TestIntegrationPagamentoMensalidadeConfirmadoPelaAppyPayMarcaComoPago`, `TestIntegrationPagamentoMensalidadeGPOQRDevolveQRCodeArr`, `TestIntegrationPagamentoMatriculaGPOQRDevolveQRCodeArr`) continuam falhando **exatamente da mesma forma** numa cópia intocada do repositório — ou seja, são falhas pré-existentes, sem relação com esta tarefa (ver "Observação sobre testes pré-existentes" no final).

---

## Fora de escopo (não fazer)

- Não alterar nenhuma migração existente (nenhuma coluna/tabela nova era necessária para esta tarefa).
- Não alterar `AppyPay` webhook receivers (`ReceberWebhookAppyPay`), lógica de assinatura/verificação do webhook, nem `internal/finance/mensalidade.go`/`internal/finance/matricula.go` além do que está descrito acima — a validação de negócio já estava correta, só o frontend não a respeitava.
- Não tocar em `src/app/(painel)/estudantes/PageContent.tsx` — o padrão de paginação foi **replicado**, não importado, exatamente para não mexer nessa página fora do escopo.
- Não alterar a seção "Meus pagamentos" (mensalidades pendentes + fluxo de pagamento) de `EstudantePagamentosPainel.tsx` além da troca mecânica de `badge(...)` para `<StatusBadge status={...} />` e do import de `money`/`Qr` — é uma feature independente (iniciar pagamento), não a listagem/filtro/ver-detalhes pedida.
- Não remover a função de cancelar cobrança — ela foi apenas movida para dentro da subtela "Ver detalhes" (`CobrancaDetalhesModal`), academia/admin continuam podendo cancelar cobranças não finalizadas.
- Não tocar `package-lock.json`/`yarn.lock` — qualquer diferença nesses arquivos no ambiente de Claude veio de rodar `npm install` para validar, e não deve ser commitada.
- Não mexer em nenhum outro arquivo do repositório além dos 12 listados no resumo executivo.

## Critérios de aceitação

1. `cd spuripainel && npx tsc --noEmit` termina sem nenhum erro.
2. `cd spuripainel && npx eslint src/components/paineis/FinanceiroCredenciaisPainel.tsx src/components/paineis/FinanceiroConfiguracoesPainel.tsx src/components/paineis/AnularReativarObrigacoesForm.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx src/components/paineis/EstudantePagamentosPainel.tsx src/components/paineis/financeiroShared.tsx "src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx" src/types/api.ts src/lib/api/services.ts` termina sem nenhum erro/aviso.
3. `cd spuri-backend && go build ./...`, `go vet ./...` e `gofmt -l internal/finance/appypay.go internal/handlers/financeiro_handlers.go internal/finance/cobrancas_estudante_integration_test.go` terminam sem erro/saída.
4. Formulário de credenciais nunca envia `webhook_secret`/`webhook_header_name`; ao criar uma credencial nova, o segredo aparece uma vez na tela com botão de copiar.
5. Configurar propina/matrícula para nível médio e superior funciona (antes retornava erro do backend por falta de `curso_id`/`ano_academico`).
6. Nenhum select nativo (`<select>`) resta em `/financas/configuracoes`; nenhum `<input type="checkbox">` nativo resta no formulário de métodos de pagamento.
7. `/financas/pagamentos` (academia) mostra uma única tabela, paginada de 30 em 30, com filtros de tipo/estado e botão "Ver detalhes" por linha; visão de admin mostra só o aviso "indisponível no momento".
8. `/pagamentos` (estudante) tem os dois selects (tipo/estado) na seção "Histórico completo de cobranças", com paginação real e "ver detalhes"; a seção "Meus pagamentos" continua funcionando exatamente como antes.

## Observação sobre testes pré-existentes (fora do escopo desta tarefa)

Durante a validação, três testes de integração do pacote `internal/finance` falharam **tanto na cópia com as mudanças desta tarefa quanto numa cópia intocada do repositório** (testado lado a lado, mesmo ambiente, mesmo banco): `TestIntegrationPagamentoMensalidadeConfirmadoPelaAppyPayMarcaComoPago`, `TestIntegrationPagamentoMensalidadeGPOQRDevolveQRCodeArr` e `TestIntegrationPagamentoMatriculaGPOQRDevolveQRCodeArr`. São falhas já existentes no repositório, sem nenhuma relação com `/financas/*` — não fazem parte desta tarefa e não devem ser corrigidas aqui. Fredy: se quiser, posso investigar essas três separadamente em uma próxima tarefa.

## Procedimento de conclusão

Depois de aplicar todas as seções, rode e cole o resultado bruto de cada comando:

```bash
cd spuripainel
npx tsc --noEmit
npx eslint src/components/paineis/FinanceiroCredenciaisPainel.tsx src/components/paineis/FinanceiroConfiguracoesPainel.tsx src/components/paineis/AnularReativarObrigacoesForm.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx src/components/paineis/EstudantePagamentosPainel.tsx src/components/paineis/financeiroShared.tsx "src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx" src/types/api.ts src/lib/api/services.ts

cd ../spuri-backend
go build ./...
go vet ./...
gofmt -l internal/finance/appypay.go internal/handlers/financeiro_handlers.go internal/finance/cobrancas_estudante_integration_test.go
go test ./internal/finance/... -run TestIntegrationListCobrancasEstudante -v
```

O último comando (`go test`) só funciona se o seu ambiente tiver acesso a um PostgreSQL local com `DATABASE_URL`, `RUN_POSTGRES_INTEGRATION=1` e `FINANCE_ENCRYPTION_KEY` definidos — se o seu ambiente não tiver `psql`/rede para isso (limitação já conhecida), pule este último comando e reporte apenas os três primeiros; Claude já validou o `go test` com PostgreSQL 16 real neste documento.

Depois de mover esta tarefa para `docs/Tarefas feitas/`, atualize o frontmatter `status` para `concluída`.
