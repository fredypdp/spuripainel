---
criado: 2026-09-09
origem: Fredy (orquestrado via Claude)
status: feito
---

# Comunicação deixa de ser página de teste: aviso para academia, gestão completa para admin (feito)

## Prompt recomendado para executar a atualização

> Implemente, no repositório `spuripainel`, exatamente o que está descrito neste documento: a página `/comunicacao` deixa de ser restrita a ambiente de teste e passa a ter duas visões — um aviso de indisponibilidade para academias (período de testes) e a gestão completa do módulo para administradores, consumindo os endpoints já implementados em `spuri-backend` (documento de tarefa backend "Base do módulo de Comunicação"). Não altere nada além do que está descrito aqui, e não invente campos, rotas ou validações que não estejam explicitamente pedidos. Este documento **depende** da tarefa de backend já ter sido implementada e publicada (as rotas `/comunicacao/*` e `/admin/comunicacao/provedor-padrao` precisam existir). Ao terminar, siga o "Procedimento de conclusão" no final deste documento.

## Contexto

A página `/comunicacao` hoje é **exclusivamente uma ferramenta interna de teste** (`src/app/(painel)/comunicacao/page.tsx` + `PageContent.tsx`), só acessível em ambiente de teste/desenvolvimento (`isTestesPageEnabled()`) e só para administradores FPP, e ela dispara SMS reais direto contra a rota isolada `POST /integracoes/ziett/mensagens/teste`. **Essa rota de teste e o respetivo cliente Go (`ziett_sms_test_client.go`) não são tocados por esta tarefa** — continuam existindo exatamente como estão, para uso interno.

Esta tarefa transforma `/comunicacao` numa página de produto real, com duas visões:

1. **Academia:** só vê um aviso dizendo que o módulo está indisponível durante o período de testes, porque gera custos com provedores terceiros. Nenhuma funcionalidade real é exposta a academias por enquanto.
2. **Administrador:** vê a gestão completa que o backend já permite — enviar mensagem, ver o histórico de mensagens, cadastrar/ver remetentes (GoSMS/Ziett) e (apenas admin FPP) definir o provedor padrão.

Decisão já fechada com o Fredy: o backend já suporta academia na rota de enviar/listar mensagens (é "a base" do módulo, pensada para o futuro), mas o frontend **restringe deliberadamente** a visão de academia a um aviso, por decisão de produto (o módulo gera custo e ainda está em período de testes) — isso é só uma regra de UI, o backend não muda.

### Nota de validação (já feita por Claude)

Já escrevi todo o código deste documento no meu próprio sandbox e validei com as ferramentas reais do próprio projeto — não apenas formatação:

- `npm install` (dependências reais do `package.json`) seguido de `npx tsc --noEmit` (o mesmo `tsconfig.json` do projeto, com os mesmos paths `@/*`) — **zero erros**, tanto na baseline (antes do `PageContent.tsx` novo) quanto no estado final com todos os arquivos deste documento aplicados.
- `npx eslint` nos arquivos novos/alterados — zero problemas novos (os 2 warnings pré-existentes em `AppSidebar.tsx`, sobre uma dependência de `useEffect` não relacionada a esta tarefa, já existiam antes e não foram introduzidos por este documento).

Ainda assim, rode `npm run lint` e `npx tsc --noEmit` de novo no seu ambiente antes de concluir (ver "Testes obrigatórios") — é rápido e é uma segunda confirmação independente.

## Resumo executivo

| Item | Decisão |
| --- | --- |
| Disponibilidade | `/comunicacao` deixa de depender de `isTestesPageEnabled()` — disponível em qualquer ambiente |
| `route-guards.ts` | `/comunicacao` passa de `allowedTypes: ['admin']` para `['admin', 'academia']`; bloqueio de ambiente passa a valer só para `/testes` |
| `AppSidebar.tsx` | Item "Comunicação" visível para qualquer admin ou academia, em qualquer ambiente |
| Tipos novos | `ProvedorComunicacao`, `RemetenteComunicacao(Payload)`, `MensagemComunicacao`, `TentativaEnvioComunicacao`, `EnviarMensagemComunicacaoPayload`, `ListarMensagensComunicacaoResponse`, `ProvedorPadraoComunicacaoResponse` em `src/types/api.ts` |
| Serviço novo | `comunicacaoService` em `src/lib/api/services.ts` (+ export em `src/lib/api/index.ts`) |
| `page.tsx` | Remove o gate de ambiente; título passa de "Comunicação (Teste Ziett)" para "Comunicação" |
| `PageContent.tsx` | Reescrito por completo: aviso para academia; para admin, 3 abas (Enviar mensagem, Mensagens, Remetentes) + 1 aba extra só para FPP (Configurações — provedor padrão) |
| Arquivos que **não** mudam | Rota de teste isolada no backend e qualquer coisa em `src/app/(painel)/testes/` |

---


## 1. Tipos novos

### Localizar este bloco exato (`src/types/api.ts`)

```ts
export interface CategoriaServico { id: string; codigo_academia: string; nome: string; ativo: boolean; created_at: string; updated_at: string; }
export interface CategoriaServicoPayload { nome: string }

export type StatusSolicitacaoServicoExtra = 'pendente' | 'aprovada_pendente_pagamento_taxa_inscricao' | 'vinculada' | 'reprovada' | 'cancelada_antes_da_vinculacao' | 'cancelada';
```

### Substituir por

```ts
export interface CategoriaServico { id: string; codigo_academia: string; nome: string; ativo: boolean; created_at: string; updated_at: string; }
export interface CategoriaServicoPayload { nome: string }

export type ProvedorComunicacao = 'GOSMS' | 'ZIETT';
export interface RemetenteComunicacao {
  id: string; provedor: ProvedorComunicacao; identificador: string; token_configurado: boolean;
  configurado_por: string; configurado_por_tipo: 'admin'; created_at: string; updated_at: string;
}
export interface RemetenteComunicacaoPayload { provedor: ProvedorComunicacao; identificador: string; token_api: string; }
export type StatusMensagemComunicacao = 'enviada' | 'falhou';
export interface TentativaEnvioComunicacao {
  provedor: ProvedorComunicacao; sucesso: boolean;
  mensagem_externa_id?: string; erro_codigo?: string; erro_mensagem?: string;
}
export interface MensagemComunicacao {
  id: string; destinatario: string; conteudo: string;
  provedor_tentado_1: ProvedorComunicacao; provedor_tentado_2?: ProvedorComunicacao; provedor_utilizado?: ProvedorComunicacao;
  status: StatusMensagemComunicacao; mensagem_externa_id?: string; detalhes_tentativas: TentativaEnvioComunicacao[];
  enviado_por: string; enviado_por_tipo: 'admin' | 'academia'; codigo_academia?: string; created_at: string;
}
export interface EnviarMensagemComunicacaoPayload { destinatario: string; conteudo: string; }
export interface ListarMensagensComunicacaoResponse { mensagens: MensagemComunicacao[]; total: number; limit: number; offset: number; }
export interface ProvedorPadraoComunicacaoResponse { provedor_padrao: ProvedorComunicacao | null; atualizado_em?: string | null; }

export type StatusSolicitacaoServicoExtra = 'pendente' | 'aprovada_pendente_pagamento_taxa_inscricao' | 'vinculada' | 'reprovada' | 'cancelada_antes_da_vinculacao' | 'cancelada';
```


## 2. Serviço novo (`comunicacaoService`)

### 2.1 — Localizar este bloco exato (import de tipos no topo de `src/lib/api/services.ts`)

```ts
  CategoriaServico,
  CategoriaServicoPayload,
  SolicitacaoServicoExtra,
```

### Substituir por

```ts
  CategoriaServico,
  CategoriaServicoPayload,
  RemetenteComunicacao,
  RemetenteComunicacaoPayload,
  MensagemComunicacao,
  EnviarMensagemComunicacaoPayload,
  ListarMensagensComunicacaoResponse,
  ProvedorPadraoComunicacaoResponse,
  ProvedorComunicacao,
  SolicitacaoServicoExtra,
```

### 2.2 — Localizar este bloco exato (fim de `academiaService`, início de `adminService`)

```ts
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),
};

// =====================
// ADMIN
// =====================

export const adminService = {
```

### Substituir por

```ts
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),
};

// =====================
// COMUNICAÇÃO
// =====================
// Módulo global (não pertence a nenhuma academia). Usado tanto por admin
// quanto por academia — a rota decide o escopo pelo token, não por
// parâmetro explícito aqui.

export const comunicacaoService = {
  criarRemetenteComunicacao: (data: RemetenteComunicacaoPayload, token?: string) =>
    api.post<{ id: string; provedor: ProvedorComunicacao; identificador: string; token_configurado: boolean; configurado_por: string; configurado_por_tipo: 'admin'; created_at: string; updated_at: string; }, RemetenteComunicacaoPayload>(
      '/comunicacao/remetentes',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarRemetentesComunicacao: (token?: string) =>
    api.get<{ remetentes: RemetenteComunicacao[] }>('/comunicacao/remetentes', {
      token: token || tokenStorage.get() || undefined,
    }),

  enviarMensagemComunicacao: (data: EnviarMensagemComunicacaoPayload, token?: string) =>
    api.post<MensagemComunicacao, EnviarMensagemComunicacaoPayload>('/comunicacao/mensagens', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarMensagensComunicacao: (
    params?: { codigo_academia?: string; limit?: number; offset?: number },
    token?: string
  ) => {
    const query = new URLSearchParams();
    if (params?.codigo_academia) query.set('codigo_academia', params.codigo_academia);
    if (params?.limit != null) query.set('limit', String(params.limit));
    if (params?.offset != null) query.set('offset', String(params.offset));
    const qs = query.toString();
    return api.get<ListarMensagensComunicacaoResponse>(`/comunicacao/mensagens${qs ? `?${qs}` : ''}`, {
      token: token || tokenStorage.get() || undefined,
    });
  },

  consultarProvedorPadraoComunicacao: (token?: string) =>
    api.get<ProvedorPadraoComunicacaoResponse>('/admin/comunicacao/provedor-padrao', {
      token: token || tokenStorage.get() || undefined,
    }),

  definirProvedorPadraoComunicacao: (provedor_padrao: ProvedorComunicacao, token?: string) =>
    api.put<{ provedor_padrao: ProvedorComunicacao }, { provedor_padrao: ProvedorComunicacao }>(
      '/admin/comunicacao/provedor-padrao',
      { provedor_padrao },
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ADMIN
// =====================

export const adminService = {
```

### 2.3 — Localizar este bloco exato (`src/lib/api/index.ts`)

```ts
  academiaService,
  adminService,
  solicitacaoMatriculaService,
```

### Substituir por

```ts
  academiaService,
  adminService,
  comunicacaoService,
  solicitacaoMatriculaService,
```


## 3. Rotas e navegação

### 3.1 — Localizar este bloco exato (`src/lib/route-guards.ts`, dentro de `ROUTE_PERMISSIONS`)

```ts
  {
    path: '/comunicacao',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/painel',
  },
```

### Substituir por

```ts
  {
    path: '/comunicacao',
    allowedTypes: ['admin', 'academia'],
    redirectIfUnauthorized: '/painel',
  },
```

### 3.2 — Localizar este bloco exato (`src/lib/route-guards.ts`, dentro de `checkRoutePermission`)

```ts
  if ((normalizedPath === '/testes' || normalizedPath === '/comunicacao') && !isTestesPageEnabled()) {
    return { allowed: false, redirectTo: '/painel' };
  }
```

### Substituir por

```ts
  if (normalizedPath === '/testes' && !isTestesPageEnabled()) {
    return { allowed: false, redirectTo: '/painel' };
  }
```

### 3.3 — Localizar este bloco exato (`src/layout/AppSidebar.tsx`, filtro de ambiente)

```ts
    const environmentNavItems = isTestesPageEnabled()
      ? navItems
      : navItems.filter((item) => item.path !== "/testes" && item.path !== "/comunicacao");
```

### Substituir por

```ts
    const environmentNavItems = isTestesPageEnabled()
      ? navItems
      : navItems.filter((item) => item.path !== "/testes");
```

### 3.4 — Localizar este bloco exato (`src/layout/AppSidebar.tsx`, filtro por tipo de usuário)

```ts
          // Comunicação: apenas admin FPP
          if (item.path === "/comunicacao") {
            return user.tipo === "admin" && user?.admin?.role === "fpp";
          }
```

### Substituir por

```ts
          // Comunicação: qualquer administrador ou academia (a própria
          // página decide o que mostrar a cada tipo — aviso de
          // indisponibilidade para academia, gestão completa para admin)
          if (item.path === "/comunicacao") {
            return user.tipo === "admin" || user.tipo === "academia";
          }
```

Não altere o ícone nem o `name`/`path` do item "Comunicação" na lista `navItems` — só as duas checagens de filtro acima mudam.


## 4. `page.tsx` (remover o gate de ambiente)

Substitua o arquivo inteiro por este conteúdo.


### `src/app/(painel)/comunicacao/page.tsx`

```tsx
import { Metadata } from "next";
import PageContent from "./PageContent";

export const metadata: Metadata = {
  title: "Comunicação",
};

export default function ComunicacaoPage() {
  return <PageContent />;
}
```

## 5. `PageContent.tsx` (reescrita completa)

Substitua o arquivo inteiro por este conteúdo. Ele já está validado com `tsc`/`eslint` reais do projeto (ver nota no topo do documento).

Estrutura: um aviso simples para academia; para admin, um seletor de abas (mesmo padrão visual do `ChartTab` já existente) com "Enviar mensagem", "Mensagens", "Remetentes" e, só para admin com `role === "fpp"`, "Configurações" (provedor padrão).


### `src/app/(painel)/comunicacao/PageContent.tsx`

```tsx
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { comunicacaoService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import type {
  EnviarMensagemComunicacaoPayload,
  MensagemComunicacao,
  ProvedorComunicacao,
  RemetenteComunicacao,
} from "@/types/api";

const MAX_CONTEUDO_LENGTH = 1000;
const DESTINATARIO_REGEX = /^9\d{8}$/;
const MENSAGENS_LIMIT = 20;

type AbaComunicacao = "enviar" | "mensagens" | "remetentes" | "configuracoes";

// ── Aviso para academia (módulo indisponível no período de testes) ───────

function AvisoIndisponivelAcademia() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
        <h1 className="mb-2 text-xl font-semibold">Comunicação indisponível durante o período de testes</h1>
        <p className="text-sm">
          O módulo de comunicação (envio de SMS) está indisponível enquanto a sua instituição estiver no período de
          testes, por se tratar de uma funcionalidade que gera custos com provedores terceiros. Fale com a equipa do
          Spuri quando quiser ativar este módulo para a sua instituição.
        </p>
      </div>
    </div>
  );
}

// ── Badges auxiliares ──────────────────────────────────────────────────

function BadgeProvedor({ provedor }: { provedor: ProvedorComunicacao | null | undefined }) {
  if (!provedor) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {provedor === "GOSMS" ? "GoSMS" : "Ziett"}
    </span>
  );
}

function BadgeStatusMensagem({ status }: { status: "enviada" | "falhou" }) {
  if (status === "enviada") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
        Enviada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
      Falhou
    </span>
  );
}

// ── Seletor de abas (mesmo padrão visual de ChartTab) ─────────────────────

function SeletorAbas({
  aba,
  setAba,
  mostrarConfiguracoes,
}: {
  aba: AbaComunicacao;
  setAba: (aba: AbaComunicacao) => void;
  mostrarConfiguracoes: boolean;
}) {
  const opcoes: { id: AbaComunicacao; label: string }[] = [
    { id: "enviar", label: "Enviar mensagem" },
    { id: "mensagens", label: "Mensagens" },
    { id: "remetentes", label: "Remetentes" },
    ...(mostrarConfiguracoes ? [{ id: "configuracoes" as const, label: "Configurações" }] : []),
  ];

  const getButtonClass = (id: AbaComunicacao) =>
    aba === id
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="mb-6 flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          onClick={() => setAba(opcao.id)}
          className={`w-full rounded-md px-3 py-2 text-theme-sm font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass(
            opcao.id
          )}`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

// ── Aba: Enviar mensagem ───────────────────────────────────────────────

function EnviarMensagemTab() {
  const [destinatario, setDestinatario] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<MensagemComunicacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const destinatarioValido = DESTINATARIO_REGEX.test(destinatario);
  const conteudoValido = conteudo.trim().length > 0 && conteudo.length <= MAX_CONTEUDO_LENGTH;
  const formValido = destinatarioValido && conteudoValido;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValido || enviando) return;

    setEnviando(true);
    setErro(null);
    setResultado(null);

    const payload: EnviarMensagemComunicacaoPayload = {
      destinatario,
      conteudo: conteudo.trim(),
    };

    try {
      const resposta = await comunicacaoService.enviarMensagemComunicacao(payload);
      setResultado(resposta);
      if (resposta.status === "enviada") {
        setConteudo("");
      }
    } catch (error) {
      setErro(formatApiError(error, "Não foi possível enviar a mensagem."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="destinatario">
              Destinatário
            </label>
            <input
              id="destinatario"
              value={destinatario}
              onChange={(event) => setDestinatario(event.target.value.replace(/\D/g, "").slice(0, 9))}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="923456789"
              inputMode="numeric"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Número nacional angolano, 9 dígitos, sem 0 inicial e sem +244. Ex.: 923456789
            </p>
            {destinatario.length > 0 && !destinatarioValido && (
              <p className="mt-1 text-sm text-red-600">Informe exatamente 9 dígitos iniciados em 9.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="conteudo">
                Conteúdo
              </label>
              <span
                className={`text-xs ${
                  conteudo.length > MAX_CONTEUDO_LENGTH ? "text-red-600" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {conteudo.length} / {MAX_CONTEUDO_LENGTH}
              </span>
            </div>
            <textarea
              id="conteudo"
              value={conteudo}
              onChange={(event) => setConteudo(event.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Mensagem a enviar..."
            />
          </div>

          <button
            type="submit"
            disabled={!formValido || enviando}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar mensagem"}
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
            {erro}
          </div>
        )}

        {resultado && (
          <div
            className={`rounded-2xl border p-5 ${
              resultado.status === "enviada"
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-semibold">{resultado.status === "enviada" ? "Mensagem enviada" : "Falha no envio"}</h2>
              <BadgeStatusMensagem status={resultado.status} />
            </div>
            <p className="text-sm">Destinatário: {resultado.destinatario}</p>
            {resultado.provedor_utilizado && (
              <p className="mt-1 flex items-center gap-1 text-sm">
                Enviada via <BadgeProvedor provedor={resultado.provedor_utilizado} />
              </p>
            )}
            <ul className="mt-3 space-y-1 text-sm">
              {resultado.detalhes_tentativas.map((tentativa, index) => (
                <li key={`${tentativa.provedor}-${index}`} className="flex items-center gap-1">
                  <BadgeProvedor provedor={tentativa.provedor} />
                  <span>{tentativa.sucesso ? "sucesso" : `falhou — ${tentativa.erro_mensagem || "erro desconhecido"}`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Aba: Mensagens ─────────────────────────────────────────────────────

function MensagensTab({ isAdmin }: { isAdmin: boolean }) {
  const [mensagens, setMensagens] = useState<MensagemComunicacao[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [codigoAcademiaFiltro, setCodigoAcademiaFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (novoOffset: number) => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await comunicacaoService.listarMensagensComunicacao({
          codigo_academia: isAdmin && codigoAcademiaFiltro.trim() ? codigoAcademiaFiltro.trim() : undefined,
          limit: MENSAGENS_LIMIT,
          offset: novoOffset,
        });
        setMensagens((atual) => (novoOffset === 0 ? resposta.mensagens : [...atual, ...resposta.mensagens]));
        setTotal(resposta.total);
        setOffset(novoOffset);
      } catch (error) {
        setErro(formatApiError(error, "Não foi possível carregar as mensagens."));
      } finally {
        setCarregando(false);
      }
    },
    [isAdmin, codigoAcademiaFiltro]
  );

  useEffect(() => {
    carregar(0);
  }, [carregar]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {isAdmin && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="filtro-academia">
            Filtrar por código da academia
          </label>
          <input
            id="filtro-academia"
            value={codigoAcademiaFiltro}
            onChange={(event) => setCodigoAcademiaFiltro(event.target.value)}
            className="h-9 w-48 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="ex.: ACAD001"
          />
        </div>
      )}

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {mensagens.length === 0 && !carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma mensagem enviada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {mensagens.map((mensagem) => (
            <li key={mensagem.id} className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeStatusMensagem status={mensagem.status} />
                <BadgeProvedor provedor={mensagem.provedor_utilizado} />
                <span className="text-gray-700 dark:text-gray-300">{mensagem.destinatario}</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {new Date(mensagem.created_at).toLocaleString("pt-AO")}
                </span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{mensagem.conteudo}</p>
              {isAdmin && mensagem.codigo_academia && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Academia: {mensagem.codigo_academia}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {mensagens.length < total && (
        <button
          type="button"
          onClick={() => carregar(offset + MENSAGENS_LIMIT)}
          disabled={carregando}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {carregando ? "Carregando..." : "Carregar mais"}
        </button>
      )}
    </div>
  );
}

// ── Aba: Remetentes ────────────────────────────────────────────────────

function ListaRemetentes({
  remetentes,
  carregando,
  erro,
}: {
  remetentes: RemetenteComunicacao[];
  carregando: boolean;
  erro: string | null;
}) {
  return (
    <>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {!carregando && remetentes.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum remetente configurado ainda.</p>
      )}
      <ul className="space-y-2">
        {remetentes.map((remetente) => (
          <li key={remetente.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <BadgeProvedor provedor={remetente.provedor} />
            <span className="text-gray-700 dark:text-gray-300">{remetente.identificador}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function RemetentesTab({ isFpp }: { isFpp: boolean }) {
  const [remetentes, setRemetentes] = useState<RemetenteComunicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [provedor, setProvedor] = useState<ProvedorComunicacao>("GOSMS");
  const [identificador, setIdentificador] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [sucessoForm, setSucessoForm] = useState<string | null>(null);

  const carregarLista = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);
    try {
      const resposta = await comunicacaoService.listarRemetentesComunicacao();
      setRemetentes(resposta.remetentes);
    } catch (error) {
      setErroLista(formatApiError(error, "Não foi possível carregar os remetentes."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  if (!isFpp) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Remetentes configurados</h2>
        <ListaRemetentes remetentes={remetentes} carregando={carregando} erro={erroLista} />
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Apenas administradores FPP podem cadastrar ou substituir remetentes.
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (salvando || !identificador.trim() || !tokenApi.trim()) return;

    setSalvando(true);
    setErroForm(null);
    setSucessoForm(null);

    try {
      await comunicacaoService.criarRemetenteComunicacao({
        provedor,
        identificador: identificador.trim(),
        token_api: tokenApi.trim(),
      });
      setSucessoForm(`Remetente do ${provedor === "GOSMS" ? "GoSMS" : "Ziett"} salvo com sucesso.`);
      setIdentificador("");
      setTokenApi("");
      carregarLista();
    } catch (error) {
      setErroForm(formatApiError(error, "Não foi possível salvar o remetente."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Cadastrar remetente</h2>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="provedor">
              Provedor
            </label>
            <select
              id="provedor"
              value={provedor}
              onChange={(event) => setProvedor(event.target.value as ProvedorComunicacao)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="GOSMS">GoSMS</option>
              <option value="ZIETT">Ziett</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="identificador">
              Identificador
            </label>
            <input
              id="identificador"
              value={identificador}
              onChange={(event) => setIdentificador(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={provedor === "GOSMS" ? "Ex.: SPURI (Sender ID)" : "UUID do remitter_id"}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {provedor === "GOSMS"
                ? "Nome do Sender ID já aprovado no GoSMS, até 11 caracteres alfanuméricos."
                : "UUID do remitter_id já configurado no painel da Ziett."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="token_api">
              Token de API
            </label>
            <input
              id="token_api"
              type="password"
              value={tokenApi}
              onChange={(event) => setTokenApi(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Token de API deste provedor"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Fica cifrado no servidor e nunca é mostrado de novo — para trocar, cadastre novamente.
            </p>
          </div>

          {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}
          {sucessoForm && <p className="text-sm text-green-600">{sucessoForm}</p>}

          <button
            type="submit"
            disabled={salvando || !identificador.trim() || !tokenApi.trim()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar remetente"}
          </button>
        </div>
      </form>

      <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Remetentes configurados</h2>
        <ListaRemetentes remetentes={remetentes} carregando={carregando} erro={erroLista} />
      </aside>
    </div>
  );
}

// ── Aba: Configurações (provedor padrão — apenas FPP) ─────────────────

function ConfiguracoesTab() {
  const [provedorPadrao, setProvedorPadrao] = useState<ProvedorComunicacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<ProvedorComunicacao>("GOSMS");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await comunicacaoService.consultarProvedorPadraoComunicacao();
        setProvedorPadrao(resposta.provedor_padrao);
        if (resposta.provedor_padrao) setSelecionado(resposta.provedor_padrao);
      } catch (error) {
        setErro(formatApiError(error, "Não foi possível carregar o provedor padrão."));
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const resposta = await comunicacaoService.definirProvedorPadraoComunicacao(selecionado);
      setProvedorPadrao(resposta.provedor_padrao);
      setSucesso("Provedor padrão atualizado.");
    } catch (error) {
      setErro(formatApiError(error, "Não foi possível atualizar o provedor padrão."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Provedor padrão</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Ao enviar uma mensagem, o sistema tenta primeiro este provedor; se falhar, tenta automaticamente o outro.
      </p>

      {carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            Atual: {provedorPadrao ? <BadgeProvedor provedor={provedorPadrao} /> : "nenhum definido ainda"}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={selecionado}
              onChange={(event) => setSelecionado(event.target.value as ProvedorComunicacao)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="GOSMS">GoSMS</option>
              <option value="ZIETT">Ziett</option>
            </select>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="mt-3 text-sm text-green-600">{sucesso}</p>}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────

export default function ComunicacaoPageContent() {
  const { user, loading } = useUserCookie();
  const [aba, setAba] = useState<AbaComunicacao>("enviar");

  if (loading) {
    return null;
  }

  if (user?.tipo === "academia") {
    return <AvisoIndisponivelAcademia />;
  }

  const isAdmin = user?.tipo === "admin";
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Comunicação</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Envio de SMS institucional via GoSMS ou Ziett.
        </p>
      </div>

      <SeletorAbas aba={aba} setAba={setAba} mostrarConfiguracoes={isFpp} />

      {aba === "enviar" && <EnviarMensagemTab />}
      {aba === "mensagens" && <MensagensTab isAdmin={isAdmin} />}
      {aba === "remetentes" && <RemetentesTab isFpp={isFpp} />}
      {aba === "configuracoes" && isFpp && <ConfiguracoesTab />}
    </div>
  );
}
```

## Testes obrigatórios

1. `npx tsc --noEmit` na raiz do repositório — já validei que passa sem erros com exatamente este código; confirme no seu ambiente.
2. `npm run lint` — confirme que não introduz nenhum problema novo (os 2 warnings pré-existentes em `AppSidebar.tsx`, sobre uma dependência de `useEffect` alheia a esta tarefa, podem continuar aparecendo — não são desta tarefa).
3. Teste manual, com o backend da tarefa "Base do módulo de Comunicação" já rodando:
   - Login como **academia**: abrir `/comunicacao` deve mostrar apenas o aviso de indisponibilidade, em qualquer ambiente (não só em teste/desenvolvimento). O item "Comunicação" deve aparecer no menu lateral para a academia.
   - Login como **admin não-FPP** (`adm` ou `gerente`): deve ver as abas "Enviar mensagem", "Mensagens" e "Remetentes", mas **não** "Configurações". Na aba "Remetentes", deve ver a lista (sem token), mas sem formulário de cadastro.
   - Login como **admin FPP**: deve ver as 4 abas, conseguir cadastrar um remetente (GOSMS e ZIETT), definir o provedor padrão, enviar uma mensagem de teste e ver o resultado (sucesso ou detalhe de cada tentativa em caso de falha), e ver o histórico em "Mensagens".
4. Confirmar que `/testes` continua exatamente com o comportamento de antes (bloqueada fora de ambiente de teste/desenvolvimento, visível só para academia) — esta tarefa não deve alterar nada relacionado a `/testes`.

## Fora de escopo (não implementar nesta tarefa)

- Qualquer funcionalidade real de comunicação para o tipo `academia` na UI — é só o aviso, mesmo que o backend já suporte academia nas rotas de mensagens.
- Editar ou desativar um remetente já cadastrado (o backend não expõe essa rota nesta base — cadastrar de novo já substitui).
- Paginação sofisticada (ordenação, busca por texto) na aba "Mensagens" — só "carregar mais" com o filtro simples por `codigo_academia` para admin.
- Qualquer alteração em `src/app/(painel)/testes/`, `src/lib/app-env.ts`, ou na rota isolada de teste do backend.

## Critérios de aceite

- [ ] `/comunicacao` acessível em qualquer ambiente (não só teste/desenvolvimento), para `admin` e `academia`.
- [ ] Academia vê apenas o aviso de indisponibilidade — nenhuma chamada de API de comunicação é feita para esse tipo de usuário.
- [ ] Admin vê a gestão completa; a aba "Configurações" só aparece para `role === "fpp"`.
- [ ] O item "Comunicação" no menu lateral segue exatamente a mesma regra de visibilidade da página.
- [ ] `npx tsc --noEmit` e `npm run lint` passam sem erros novos.
- [ ] `/testes` continua funcionando exatamente como antes.

## Procedimento de conclusão

1. Confirme que todos os critérios de aceite acima estão satisfeitos.
2. Mova este documento de `src/docs/` (pendente) para o local usado pelas tarefas já concluídas neste repositório, seguindo a mesma convenção já usada por `src/docs/Criar página de teste comunicacao para o endpoint ziett (sms).md` (front matter `status: feito`, título com "(feito)").
3. Não abra pull request nem faça merge — deixe o commit pronto para o Fredy revisar.
