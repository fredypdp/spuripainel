---
criado: 03-09-2026 00:00
origem: Fredy + Claude (orquestração)
status: pronto para execução
tipo: frontend (spuripainel)
depende_de: Tarefa 81 no spuri-backend (NIF deixa de ser único; endpoints /academia/solicitacoes-nif e /dominis/solicitacoes-nif-academia)
---

# Tarefa — Permitir alteração de NIF de academia mediante aprovação (Frontend)

### Documento de execução para o Codex (orquestrado e pré-testado pelo Claude)

## 0. Leia isto primeiro — sobre o seu ambiente (Codex) e como isto foi validado

Diferente de tarefas de backend, aqui **eu (Claude) consegui rodar toda a cadeia de validação de verdade** — não só ler o código:

- `npm install` — ok, sem conflitos de dependência.
- `npx tsc --noEmit` no repositório inteiro, **antes** de qualquer alteração (baseline): 0 erros.
- Apliquei todas as mudanças da seção 3 e rodei `npx tsc --noEmit` de novo: **0 erros**.
- Rodei `npx eslint` nos 5 arquivos alterados/criados: **0 avisos, 0 erros**.
- Tentei `npm run build` (Next.js) até o fim: falhou, mas **só** porque o meu sandbox bloqueia acesso a `fonts.googleapis.com` (o `src/app/layout.tsx`, que eu nem toquei, busca uma Google Font em build-time). Confirmei que essa mesma falha acontece exatamente igual no repositório original, sem nenhuma das minhas alterações — não é algo introduzido por esta tarefa. Se o seu ambiente tiver acesso à internet normalmente, `npm run build` deve completar sem problema; se não tiver, `tsc --noEmit` + `eslint` já são suficientes para saber que o código está correto.

O que **você** precisa fazer: aplicar os blocos da seção 3 exatamente como estão, rodar `npx tsc --noEmit` e `npx eslint` nos arquivos tocados, e tentar `npm run build` se sua rede permitir. Não precisa planejar nada — o desenho já está fechado, incluindo onde cada pedaço de UI vai morar.

## 1. Prompt recomendado para executar esta correção

> Aplique exatamente os blocos "localizar/substituir" e "criar arquivo novo" da seção 3 deste documento, na ordem listada. Não refatore nada além do que está descrito. Depois, rode `npx tsc --noEmit` e `npx eslint` nos arquivos alterados e corrija qualquer erro antes de considerar a tarefa concluída. Ao final, siga o "Procedimento de conclusão" (seção 6).

## 2. Contexto

No backend (Tarefa 81, `spuri-backend`), `nif` deixou de ser um dado único entre academias, e alterá-lo passou a exigir aprovação:

1. A academia autenticada solicita um novo NIF via `POST /academia/solicitacoes-nif`. Nada muda ainda.
2. Um Admin com role `adm` ou `fpp` aprova (`PUT /dominis/solicitacoes-nif-academia/:codigo/aprovar`) ou reprova (`.../reprovar`).
   - **Aprovado** → o NIF muda de fato.
   - **Reprovado** → nada muda (exige `motivo_reprovacao`).

`PUT /academia/dados` já rejeitava o campo `nif` antes desta tarefa (isso não muda). O frontend precisa de duas coisas novas:

- **Lado da academia** (autoatendimento): ver o NIF atual e pedir uma alteração, na tela de Configurações.
- **Lado do admin**: ver e decidir as solicitações de NIF de uma academia, na tela de detalhes da academia.

⚠️ **Esta tarefa depende da Tarefa 81 do backend estar implantada primeiro** — as chamadas novas (`academiaService.criarSolicitacaoAlteracaoNIF`, `adminService.listarSolicitacoesAlteracaoNIFAcademia`, etc.) vão receber `404` se o backend ainda não tiver os endpoints. Ver "Coordenação de deploy" na seção 6.

## 3. O que já existe (mapeado antes de escrever o código)

- Tipos, serviços e telas de um fluxo de solicitação/aprovação **quase idêntico** já existem para dados de estudante: `SolicitacaoEdicaoDadoEstudante` em `src/types/api.ts`, `academiaService.criarSolicitacaoEdicaoEstudante`/`reprovarSolicitacaoEdicaoEstudante` em `src/lib/api/services.ts`, e a tela `src/app/(painel)/solicitacoes/PageContent.tsx`. Não reaproveitei essa tela porque lá quem decide é sempre a **academia**; aqui quem decide é o **Admin** — a direção da decisão é invertida, e misturar os dois ali complicaria a lógica de `canDecide` sem necessidade.
- Em vez disso, segui o mesmo padrão usado para o alvará opcional (Tarefa anterior, "Tornar alvara opcional no cadastro de academia"): um card de autoatendimento em `src/app/(painel)/configuracoes/AlvaraSettingsCard.tsx`, e uma seção dentro de `SubtelaDetalhesAcademia` (`src/app/(painel)/academias/PageContent.tsx`) para o lado do admin. Repliquei essa mesma divisão: `NIFSettingsCard.tsx` novo (autoatendimento) + nova seção "Solicitações de alteração de NIF" dentro de `SubtelaDetalhesAcademia` (admin).
- `useUserCookie()` (`src/hooks/useUserCookie.ts`) devolve `{ user }` com `user.tipo` (`'academia' | 'admin' | 'estudante'`) e, quando admin, `user.admin.role` (`'gerente' | 'adm' | 'fpp'`) — é assim que `AppSidebar.tsx` já decide o que cada tipo de usuário vê. Uso a mesma checagem (`['adm','fpp'].includes(user?.admin?.role)`) para só mostrar os botões Aprovar/Reprovar a quem pode decidir de verdade — o backend também barra `gerente` com `403`, isso aqui é só UX.
- `SubtelaDetalhesAcademia` recebe só `{ academia, onVoltar }` — não tem callback de "recarregar lista" do componente pai. Por isso, depois de um "aprovar" bem-sucedido, atualizo o NIF exibido localmente (`nifExibido`, um `useState` inicializado com `academia.nif`) em vez de tentar re-buscar a academia inteira do pai — é o mesmo tipo de escolha pragmática que a seção de alvará já fazia (ela também não propaga nada para o pai).
- Motivo de reprovação: o padrão já estabelecido em `solicitacoes/PageContent.tsx` usa `window.prompt('Motivo da reprovação', '')` — sem modal dedicado. Repeti exatamente isso.
- `api.post`/`api.get`/`api.put` (`src/lib/api/client.ts`) já existem com a assinatura `(endpoint, data?, options?)` — uso normal, nada novo aqui.
- `Button` (`src/components/ui/button/Button.tsx`) tem `type` padrão `"submit"` — importante para o botão "Enviar solicitação" dentro do `<form>` do `NIFSettingsCard` funcionar sem precisar de `onClick` manual, e para o botão "Cancelar" precisar de `type="button"` explícito (já está assim no código abaixo).
- **Achado à parte, fora do escopo desta tarefa**: existem hoje *três* cópias de "Documentação da API.md" no seu workspace — `spuri-backend/Documentação da API.md` (fonte), `spuripainel/src/docs/Documentação da API.md` (cópia mantida em dia, mesmo conteúdo byte-a-byte da fonte, só com quebra de linha CRLF) e `spuripainel/src/Documentação da API.md` (uma cópia mais antiga, parada desde 23/08, com conteúdo diferente das outras duas). Atualizei a cópia mantida em dia (`src/docs/`) na seção 3.6 abaixo. **Não toquei** em `src/Documentação da API.md` porque ela já estava dessincronizada antes desta tarefa e mexer nisso é uma decisão sua, não algo implícito neste pedido — se quiser, decida depois se ela ainda serve para algo ou pode ser removida.

## 4. Arquivos a alterar/criar, em ordem

### 4.1 — `src/types/api.ts`

**Localizar este bloco exato:**

```typescript
export interface ListarSolicitacoesEdicaoDadoEstudanteResponse {
  solicitacoes: SolicitacaoEdicaoDadoEstudante[];
  limit: number;
  offset: number;
  total: number;
}
```

**Substituir por:**

```typescript
export interface ListarSolicitacoesEdicaoDadoEstudanteResponse {
  solicitacoes: SolicitacaoEdicaoDadoEstudante[];
  limit: number;
  offset: number;
  total: number;
}

/**
 * Fluxo de alteração de NIF de academia (nif deixou de ser único entre
 * academias). A academia solicita; só um Admin (role 'adm' ou 'fpp') pode
 * aprovar ou reprovar — diferente de SolicitacaoEdicaoDadoEstudante, que é
 * decidida pela própria academia. Sem documento comprobatório.
 */
export type StatusSolicitacaoAlteracaoNIFAcademia = 'pendente' | 'aprovada' | 'reprovada';

export interface CriarSolicitacaoAlteracaoNIFAcademiaRequest {
  novo_nif: string;
}

export interface CriarSolicitacaoAlteracaoNIFAcademiaResponse {
  message: string;
  codigo_solicitacao: string;
  nif_atual: string;
  nif_solicitado: string;
  status: StatusSolicitacaoAlteracaoNIFAcademia;
}

export interface SolicitacaoAlteracaoNIFAcademia {
  codigo_solicitacao: string;
  codigo_academia: string;
  nif_atual: string;
  nif_solicitado: string;
  status: StatusSolicitacaoAlteracaoNIFAcademia;
  motivo_reprovacao?: string | null;
  solicitado_por: string;
  decidido_por?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ListarSolicitacoesAlteracaoNIFAcademiaParams {
  status?: StatusSolicitacaoAlteracaoNIFAcademia;
  codigo_academia?: string;
  limit?: number;
  offset?: number;
}

export interface ListarSolicitacoesAlteracaoNIFAcademiaResponse {
  solicitacoes: SolicitacaoAlteracaoNIFAcademia[];
  limit: number;
  offset: number;
  total: number;
}

export interface DecidirSolicitacaoAlteracaoNIFAcademiaResponse {
  message: string;
  codigo_solicitacao: string;
  status: StatusSolicitacaoAlteracaoNIFAcademia;
}

export interface ReprovarSolicitacaoAlteracaoNIFAcademiaRequest {
  motivo_reprovacao: string;
}
```

---

### 4.2 — `src/lib/api/services.ts`

**4.2.1 — Localizar este bloco exato** (dentro do bloco `import type { ... } from '@/types/api'`):

```typescript
  DecidirSolicitacaoEdicaoDadoEstudanteResponse,
  ReprovarSolicitacaoEdicaoDadoEstudanteRequest,
```

**Substituir por:**

```typescript
  DecidirSolicitacaoEdicaoDadoEstudanteResponse,
  ReprovarSolicitacaoEdicaoDadoEstudanteRequest,
  StatusSolicitacaoAlteracaoNIFAcademia,
  CriarSolicitacaoAlteracaoNIFAcademiaRequest,
  CriarSolicitacaoAlteracaoNIFAcademiaResponse,
  ListarSolicitacoesAlteracaoNIFAcademiaParams,
  ListarSolicitacoesAlteracaoNIFAcademiaResponse,
  DecidirSolicitacaoAlteracaoNIFAcademiaResponse,
  ReprovarSolicitacaoAlteracaoNIFAcademiaRequest,
```

**4.2.2 — Localizar este bloco exato** (função helper de query string, logo antes de `prepareSolicitacaoMatriculaForm`):

```typescript
function buildSolicitacoesEdicaoDadoEstudanteQuery(params?: ListarSolicitacoesEdicaoDadoEstudanteParams): string {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.campo) qs.set('campo', params.campo);
  if (params?.codigo_estudante) qs.set('codigo_estudante', params.codigo_estudante);
  appendPageParams(qs, params);
  const query = qs.toString();
  return query ? `?${query}` : '';
}
```

**Substituir por:**

```typescript
function buildSolicitacoesEdicaoDadoEstudanteQuery(params?: ListarSolicitacoesEdicaoDadoEstudanteParams): string {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.campo) qs.set('campo', params.campo);
  if (params?.codigo_estudante) qs.set('codigo_estudante', params.codigo_estudante);
  appendPageParams(qs, params);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

function buildSolicitacoesAlteracaoNIFAcademiaQuery(params?: ListarSolicitacoesAlteracaoNIFAcademiaParams): string {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.codigo_academia) qs.set('codigo_academia', params.codigo_academia);
  appendPageParams(qs, params);
  const query = qs.toString();
  return query ? `?${query}` : '';
}
```

**4.2.3 — Localizar este bloco exato** (dentro de `academiaService`, logo após `reprovarSolicitacaoEdicaoEstudante`):

```typescript
  reprovarSolicitacaoEdicaoEstudante: (campo: CampoEdicaoDadoEstudante, codigo: string, data: ReprovarSolicitacaoEdicaoDadoEstudanteRequest, token?: string) =>
    api.put<DecidirSolicitacaoEdicaoDadoEstudanteResponse>(
      `/academia/solicitacoes-edicao-estudante/${campo.replace(/_/g, '-')}/${encodeURIComponent(codigo)}/reprovar`,
      { motivo_reprovacao: data.motivo_reprovacao?.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),
```

**Substituir por:**

```typescript
  reprovarSolicitacaoEdicaoEstudante: (campo: CampoEdicaoDadoEstudante, codigo: string, data: ReprovarSolicitacaoEdicaoDadoEstudanteRequest, token?: string) =>
    api.put<DecidirSolicitacaoEdicaoDadoEstudanteResponse>(
      `/academia/solicitacoes-edicao-estudante/${campo.replace(/_/g, '-')}/${encodeURIComponent(codigo)}/reprovar`,
      { motivo_reprovacao: data.motivo_reprovacao?.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),

  // Fluxo de alteração de NIF (nif deixou de ser único entre academias):
  // a própria academia solicita, mas só um Admin (role 'adm' ou 'fpp') pode
  // aprovar — ver adminService.aprovarSolicitacaoAlteracaoNIFAcademia /
  // reprovarSolicitacaoAlteracaoNIFAcademia.
  criarSolicitacaoAlteracaoNIF: (data: CriarSolicitacaoAlteracaoNIFAcademiaRequest, token?: string) =>
    api.post<CriarSolicitacaoAlteracaoNIFAcademiaResponse>(
      '/academia/solicitacoes-nif',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarSolicitacoesAlteracaoNIF: (params?: { status?: StatusSolicitacaoAlteracaoNIFAcademia; limit?: number; offset?: number; token?: string }) =>
    api.get<ListarSolicitacoesAlteracaoNIFAcademiaResponse>(
      `/academia/solicitacoes-nif${buildSolicitacoesAlteracaoNIFAcademiaQuery(params)}`,
      { token: params?.token || tokenStorage.get() || undefined }
    ),
```

**4.2.4 — Localizar este bloco exato** (dentro de `adminService`, logo após `deletarAcademia`):

```typescript
  deletarAcademia: (codigoAcademia: string, data: DesativarRequest, token?: string) =>
    api.delete<{ message: string }, DesativarRequest>(
      `/dominis/academia/${codigoAcademia}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
```

**Substituir por:**

```typescript
  deletarAcademia: (codigoAcademia: string, data: DesativarRequest, token?: string) =>
    api.delete<{ message: string }, DesativarRequest>(
      `/dominis/academia/${codigoAcademia}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // Fluxo de alteração de NIF (nif deixou de ser único entre academias):
  // listagem/decisão do lado do Admin — só role 'adm' ou 'fpp' consegue
  // aprovar/reprovar de fato (o backend retorna 403 para 'gerente'); a
  // listagem em si é visível a qualquer admin autenticado.
  listarSolicitacoesAlteracaoNIFAcademia: (params?: ListarSolicitacoesAlteracaoNIFAcademiaParams & { token?: string }) =>
    api.get<ListarSolicitacoesAlteracaoNIFAcademiaResponse>(
      `/dominis/solicitacoes-nif-academia${buildSolicitacoesAlteracaoNIFAcademiaQuery(params)}`,
      { token: params?.token || tokenStorage.get() || undefined }
    ),

  aprovarSolicitacaoAlteracaoNIFAcademia: (codigoSolicitacao: string, token?: string) =>
    api.put<DecidirSolicitacaoAlteracaoNIFAcademiaResponse>(
      `/dominis/solicitacoes-nif-academia/${encodeURIComponent(codigoSolicitacao)}/aprovar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarSolicitacaoAlteracaoNIFAcademia: (codigoSolicitacao: string, data: ReprovarSolicitacaoAlteracaoNIFAcademiaRequest, token?: string) =>
    api.put<DecidirSolicitacaoAlteracaoNIFAcademiaResponse>(
      `/dominis/solicitacoes-nif-academia/${encodeURIComponent(codigoSolicitacao)}/reprovar`,
      { motivo_reprovacao: data.motivo_reprovacao?.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),
```

**Atenção**: `deletarAcademia` também é seguida, logo depois, de `listarAuditoriaDelecoes` no arquivo original — confirme que a âncora acima é única (ela é: só há uma definição de `deletarAcademia` no arquivo) e que o bloco novo fica **entre** `deletarAcademia` e `listarAuditoriaDelecoes`.

---

### 4.3 — Criar `src/app/(painel)/configuracoes/NIFSettingsCard.tsx`

Arquivo novo, conteúdo exato (mirror de `AlvaraSettingsCard.tsx`, já validado com `tsc --noEmit` e `eslint` limpos):

```tsx
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useUserType } from "@/hooks/useRoutePermission";
import { academiaService } from "@/lib/api/services";
import { formatApiError } from "@/lib/api/client";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/button/Button";
import type { SolicitacaoAlteracaoNIFAcademia } from "@/types/api";

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
};

const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reprovada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// NIF deixou de ser único entre academias — a mesma entidade fiscal pode
// estar associada a mais de uma academia na plataforma. Por isso, alterar o
// NIF não é mais um PUT direto: a academia solicita e só um Admin (role
// 'adm' ou 'fpp') pode aprovar. Este card cobre o lado da própria academia:
// ver o NIF atual, ver o estado do último pedido, e criar um novo pedido
// quando não há nenhum pendente.
export default function NIFSettingsCard() {
  const { user } = useUserType();
  const nifAtual = user?.academia?.nif;

  const [ultima, setUltima] = useState<SolicitacaoAlteracaoNIFAcademia | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroCarregar, setErroCarregar] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novoNif, setNovoNif] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucessoEnvio, setSucessoEnvio] = useState(false);

  const carregarUltima = useCallback(async () => {
    setCarregando(true);
    setErroCarregar("");
    try {
      const response = await academiaService.listarSolicitacoesAlteracaoNIF({ limit: 1, offset: 0 });
      setUltima(response.solicitacoes?.[0] ?? null);
    } catch (err) {
      setErroCarregar(formatApiError(err, "Não foi possível carregar o estado da solicitação de NIF."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarUltima();
  }, [carregarUltima]);

  const pendente = ultima?.status === "pendente";

  const enviarSolicitacao = async (e: FormEvent) => {
    e.preventDefault();
    setErroEnvio("");
    setSucessoEnvio(false);
    setEnviando(true);
    try {
      await academiaService.criarSolicitacaoAlteracaoNIF({ novo_nif: novoNif.replace(/\D/g, "") });
      setSucessoEnvio(true);
      setMostrarFormulario(false);
      setNovoNif("");
      await carregarUltima();
    } catch (err) {
      setErroEnvio(formatApiError(err, "Não foi possível enviar a solicitação de alteração de NIF."));
    } finally {
      setEnviando(false);
    }
  };

  if (!nifAtual) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center gap-3">
        <Icon icon="mdi:card-account-details-outline" width={22} className="text-brand-500" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">NIF</h3>
      </div>
      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">NIF atual</p>
      <p className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">{nifAtual}</p>

      {carregando && <p className="text-sm text-gray-500 dark:text-gray-400">A verificar solicitações...</p>}
      {erroCarregar && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroCarregar}</p>}

      {ultima && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Última solicitação: <b>{ultima.nif_solicitado}</b>
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[ultima.status]}`}>
              {statusLabel[ultima.status] ?? ultima.status}
            </span>
          </div>
          {ultima.status === "reprovada" && ultima.motivo_reprovacao && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">Motivo: {ultima.motivo_reprovacao}</p>
          )}
        </div>
      )}

      {pendente ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Já existe uma solicitação de alteração de NIF pendente. Aguarde a decisão de um administrador antes de enviar outra.
        </p>
      ) : mostrarFormulario ? (
        <form onSubmit={enviarSolicitacao} className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Novo NIF
            <input
              value={novoNif}
              onChange={(e) => setNovoNif(e.target.value)}
              maxLength={10}
              inputMode="numeric"
              required
              placeholder="10 dígitos"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 dark:border-gray-700"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={enviando}>{enviando ? "A enviar..." : "Enviar solicitação"}</Button>
            <Button size="sm" type="button" variant="outline" onClick={() => { setMostrarFormulario(false); setNovoNif(""); }}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" onClick={() => setMostrarFormulario(true)} startIcon={<Icon icon="mdi:pencil-outline" width={16} />}>
          Solicitar alteração de NIF
        </Button>
      )}

      {erroEnvio && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvio}</p>}
      {sucessoEnvio && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Solicitação enviada. A alteração só é aplicada após aprovação de um administrador.</p>}
    </div>
  );
}
```

---

### 4.4 — `src/app/(painel)/configuracoes/AcademiaSection.tsx`

**4.4.1 — Localizar este bloco exato:**

```typescript
import PasswordSettingsCard from "./PasswordSettingsCard";
import AlvaraSettingsCard from "./AlvaraSettingsCard";
import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
```

**Substituir por:**

```typescript
import PasswordSettingsCard from "./PasswordSettingsCard";
import AlvaraSettingsCard from "./AlvaraSettingsCard";
import NIFSettingsCard from "./NIFSettingsCard";
import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
```

**4.4.2 — Localizar este bloco exato:**

```typescript
        {section === "all" && <AlvaraSettingsCard />}
        {section === "all" && <PasswordSettingsCard />}
```

**Substituir por:**

```typescript
        {section === "all" && <AlvaraSettingsCard />}
        {section === "all" && <NIFSettingsCard />}
        {section === "all" && <PasswordSettingsCard />}
```

---

### 4.5 — `src/app/(painel)/academias/PageContent.tsx`

**4.5.1 — Localizar este bloco exato** (import de tipos, topo do arquivo):

```typescript
import { Provincias, AcademiaDetalhada, ConsultarAcademiasResponse, formatAnoAcademico } from '@/types/api';
```

**Substituir por:**

```typescript
import { Provincias, AcademiaDetalhada, ConsultarAcademiasResponse, SolicitacaoAlteracaoNIFAcademia, formatAnoAcademico } from '@/types/api';
```

**4.5.2 — Localizar este bloco exato** (logo após a função `getStatusBadgeClass`):

```typescript
function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':   return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}
```

**Substituir por:**

```typescript
function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':   return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

const statusSolicitacaoNifClass: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  aprovada: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  reprovada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
```

**4.5.3 — Localizar este bloco exato** (início de `SubtelaDetalhesAcademia`, os primeiros `useState` de documento/alvará):

```typescript
function SubtelaDetalhesAcademia({ academia, onVoltar }: { academia: AcademiaDetalhada; onVoltar: () => void }) {
  const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState('');
  const [enviandoAlvara, setEnviandoAlvara] = useState(false);
  const [erroEnvioAlvara, setErroEnvioAlvara] = useState('');
  const [sucessoEnvioAlvara, setSucessoEnvioAlvara] = useState(false);
  const inputAlvaraRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (documentoAberto) URL.revokeObjectURL(documentoAberto); }, [documentoAberto]);
```

**Substituir por:**

```typescript
function SubtelaDetalhesAcademia({ academia, onVoltar }: { academia: AcademiaDetalhada; onVoltar: () => void }) {
  const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState('');
  const [enviandoAlvara, setEnviandoAlvara] = useState(false);
  const [erroEnvioAlvara, setErroEnvioAlvara] = useState('');
  const [sucessoEnvioAlvara, setSucessoEnvioAlvara] = useState(false);
  const inputAlvaraRef = useRef<HTMLInputElement>(null);

  // Solicitações de alteração de NIF: nif deixou de ser único entre
  // academias — a academia solicita, mas só um Admin (role 'adm' ou 'fpp')
  // pode aprovar/reprovar. nifExibido é um override local, atualizado só
  // depois de um "aprovar" bem-sucedido, para o card "Dados da academia"
  // refletir o novo NIF sem precisar recarregar a lista inteira do pai.
  const { user } = useUserCookie();
  const podeDecidirNif = user?.tipo === 'admin' && ['adm', 'fpp'].includes(user?.admin?.role ?? '');
  const [nifExibido, setNifExibido] = useState(academia.nif);
  const [nifSolicitacoes, setNifSolicitacoes] = useState<SolicitacaoAlteracaoNIFAcademia[]>([]);
  const [carregandoNif, setCarregandoNif] = useState(false);
  const [erroNif, setErroNif] = useState('');
  const [decidindoNif, setDecidindoNif] = useState<string | null>(null);

  const carregarSolicitacoesNif = useCallback(async () => {
    setCarregandoNif(true);
    setErroNif('');
    try {
      const response = await adminService.listarSolicitacoesAlteracaoNIFAcademia({ codigo_academia: academia.codigo_academia });
      setNifSolicitacoes(response.solicitacoes ?? []);
    } catch (err: any) {
      setErroNif(formatApiError(err, 'Não foi possível carregar as solicitações de alteração de NIF.'));
    } finally {
      setCarregandoNif(false);
    }
  }, [academia.codigo_academia]);

  useEffect(() => { void carregarSolicitacoesNif(); }, [carregarSolicitacoesNif]);

  const decidirNif = async (item: SolicitacaoAlteracaoNIFAcademia, action: 'aprovar' | 'reprovar') => {
    const motivo = action === 'reprovar' ? window.prompt('Motivo da reprovação', '') : null;
    if (action === 'reprovar' && !motivo?.trim()) return;
    setDecidindoNif(item.codigo_solicitacao);
    setErroNif('');
    try {
      if (action === 'aprovar') {
        await adminService.aprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, tokenStorage.get() || undefined);
        setNifExibido(item.nif_solicitado);
      } else {
        await adminService.reprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, { motivo_reprovacao: motivo!.trim() }, tokenStorage.get() || undefined);
      }
      await carregarSolicitacoesNif();
    } catch (err: any) {
      setErroNif(formatApiError(err, 'Não foi possível decidir a solicitação de alteração de NIF.'));
    } finally {
      setDecidindoNif(null);
    }
  };

  useEffect(() => () => { if (documentoAberto) URL.revokeObjectURL(documentoAberto); }, [documentoAberto]);
```

**Nota**: `useCallback`, `useEffect`, `useState`, `useRef` já estão importados de `"react"` no topo do arquivo (são usados nas linhas ao redor deste bloco) — não precisa adicionar import novo. `adminService`, `tokenStorage`, `formatApiError` e `useUserCookie` também já estão importados no topo do arquivo (usados no componente principal, mais abaixo) — confirme isso antes de aplicar; se por algum motivo não estiverem, adicione-os no bloco de imports do topo, não aqui dentro da função.

**4.5.4 — Localizar este bloco exato** (dentro do JSX de retorno, o `DetailItem` de NIF no card "Dados da academia" — é uma linha só, muito longa; a âncora abaixo já é única no arquivo):

```typescript
<DetailItem label="NIF" value={academia.nif} />
```

**Substituir por:**

```typescript
<DetailItem label="NIF" value={nifExibido} />
```

**4.5.5 — Localizar este bloco exato** (a seção "Documentos" inteira, terminando antes do `</div>;` de fechamento do componente — é uma linha só, muito longa; cole com cuidado):

```typescript
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Documentos</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">O alvará é opcional no cadastro — visualize ou envie/atualize aqui.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={carregandoDocumento} onClick={abrirAlvara} startIcon={<Icon icon={carregandoDocumento ? 'mdi:loading' : documentoAberto ? 'mdi:close' : 'mdi:file-eye-outline'} width={16} className={carregandoDocumento ? 'animate-spin' : undefined} />}>{carregandoDocumento ? 'A abrir...' : documentoAberto ? 'Fechar alvará' : 'Visualizar alvará'}</Button><input ref={inputAlvaraRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) enviarAlvara(file); }} /><Button size="sm" disabled={enviandoAlvara} onClick={() => inputAlvaraRef.current?.click()} startIcon={<Icon icon={enviandoAlvara ? 'mdi:loading' : 'mdi:file-upload-outline'} width={16} className={enviandoAlvara ? 'animate-spin' : undefined} />}>{enviandoAlvara ? 'A enviar...' : 'Enviar/atualizar alvará'}</Button></div></div>{erroDocumento && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}{erroEnvioAlvara && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvioAlvara}</p>}{sucessoEnvioAlvara && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Alvará enviado com sucesso.</p>}{documentoAberto && <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><iframe title={`Alvará de ${academia.nome}`} src={documentoAberto} className="h-[70vh] w-full bg-white" /></div>}</section>
  </div>;
}
```

**Substituir por:**

```typescript
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Documentos</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">O alvará é opcional no cadastro — visualize ou envie/atualize aqui.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={carregandoDocumento} onClick={abrirAlvara} startIcon={<Icon icon={carregandoDocumento ? 'mdi:loading' : documentoAberto ? 'mdi:close' : 'mdi:file-eye-outline'} width={16} className={carregandoDocumento ? 'animate-spin' : undefined} />}>{carregandoDocumento ? 'A abrir...' : documentoAberto ? 'Fechar alvará' : 'Visualizar alvará'}</Button><input ref={inputAlvaraRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) enviarAlvara(file); }} /><Button size="sm" disabled={enviandoAlvara} onClick={() => inputAlvaraRef.current?.click()} startIcon={<Icon icon={enviandoAlvara ? 'mdi:loading' : 'mdi:file-upload-outline'} width={16} className={enviandoAlvara ? 'animate-spin' : undefined} />}>{enviandoAlvara ? 'A enviar...' : 'Enviar/atualizar alvará'}</Button></div></div>{erroDocumento && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}{erroEnvioAlvara && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvioAlvara}</p>}{sucessoEnvioAlvara && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Alvará enviado com sucesso.</p>}{documentoAberto && <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><iframe title={`Alvará de ${academia.nome}`} src={documentoAberto} className="h-[70vh] w-full bg-white" /></div>}</section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3"><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Solicitações de alteração de NIF</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">NIF não é mais único entre academias. Pedidos de alteração aparecem aqui{podeDecidirNif ? ' — aprovar aplica o novo NIF imediatamente; reprovar não altera nada.' : '.'}</p></div>
      {erroNif && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroNif}</p>}
      {carregandoNif ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">A carregar...</p>
      ) : nifSolicitacoes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma solicitação de alteração de NIF para esta academia.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{['Código', 'NIF atual', 'NIF solicitado', 'Status', 'Criada em', 'Ações'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {nifSolicitacoes.map((item) => (
                <tr key={item.codigo_solicitacao}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.codigo_solicitacao}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_atual}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_solicitado}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusSolicitacaoNifClass[item.status]}`}>{item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatarDataHora(item.created_at)}</td>
                  <td className="px-4 py-3 text-sm">
                    {podeDecidirNif && item.status === 'pendente' ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={decidindoNif === item.codigo_solicitacao} onClick={() => decidirNif(item, 'aprovar')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Aprovar</button>
                        <button type="button" disabled={decidindoNif === item.codigo_solicitacao} onClick={() => decidirNif(item, 'reprovar')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Reprovar</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </div>;
}
```

**Atenção**: `formatarDataHora` já é usada em outros pontos deste mesmo componente (ex.: nos `DetailItem` de "Deletada em", "Data de criação") — não precisa de import novo, é uma função já definida/importada no arquivo.

---

### 4.6 — `src/docs/Documentação da API.md`

Aplique exatamente os mesmos 4 blocos "localizar/substituir" da seção 4.13 do documento irmão do backend (Tarefa 81, `spuri-backend/docs/Lista de Tarefas/81 - ...md`) — o conteúdo textual é idêntico, incluindo a nova subseção "Solicitações de alteração de NIF de academia" inteira. A única diferença é que este arquivo usa quebra de linha CRLF (`\r\n`); mantenha essa convenção ao salvar (não converta o arquivo inteiro para LF). Se o seu editor não deixar claro qual convenção está em uso, rode `file "src/docs/Documentação da API.md"` antes e depois de editar para confirmar que continua `CRLF line terminators`.

Não altere `src/Documentação da API.md` — ver observação na seção 3.

## 5. Checklist de validação

- [ ] `npx tsc --noEmit` na raiz do repositório — sem erros.
- [ ] `npx eslint src/types/api.ts src/lib/api/services.ts "src/app/(painel)/configuracoes/NIFSettingsCard.tsx" "src/app/(painel)/configuracoes/AcademiaSection.tsx" "src/app/(painel)/academias/PageContent.tsx"` — sem erros/avisos.
- [ ] `npm run build` se sua rede permitir acesso a `fonts.googleapis.com`; se não permitir e a única falha for relacionada a fontes do Google, isso é esperado e não bloqueia a conclusão (ver seção 0).
- [ ] `file "src/docs/Documentação da API.md"` ainda reporta `CRLF line terminators` depois da edição.

## 6. Critérios de aceite

1. Em Configurações da academia, aparece um card "NIF" mostrando o NIF atual e permitindo solicitar alteração — some o botão de solicitar quando já existe uma pendente, mostrando o status em vez disso.
2. Na tela de detalhes da academia (admin), aparece uma seção "Solicitações de alteração de NIF" listando as solicitações daquela academia.
3. Os botões Aprovar/Reprovar dessa seção só aparecem para admin com role `adm` ou `fpp`, e só quando o item está `pendente`.
4. Aprovar atualiza o NIF exibido no card "Dados da academia" imediatamente, sem precisar recarregar a página.
5. Reprovar pede o motivo (`window.prompt`) e não altera o NIF exibido.
6. `npx tsc --noEmit` e `eslint` limpos.

## 7. Procedimento de conclusão

1. Depois de tudo validado, mova este arquivo para `src/docs/`, renomeando para o padrão já usado nesse diretório (ex.: `Tarefa - Permitir alteracao de NIF de academia mediante aprovacao (Frontend).md`), igual ao que já foi feito com a tarefa do alvará.
2. **Coordenação de deploy**: os endpoints novos (`/academia/solicitacoes-nif`, `/dominis/solicitacoes-nif-academia/...`) só existem depois que a Tarefa 81 do `spuri-backend` estiver implantada. Se este frontend for para produção antes do backend, o card de NIF e a nova seção do admin vão mostrar erro ao carregar (404) até o backend acompanhar — não é um bug desta implementação, é uma dependência de ordem de deploy. Se preferir, segure o merge deste PR até confirmar que o backend já está no ar.

## 8. Perguntas em aberto (não bloqueiam a execução, mas o Fredy deve decidir depois)

- Não criei uma tela de "fila global de solicitações de NIF" (todas as academias de uma vez, fora do contexto de uma academia específica) — o backend já suporta isso (`GET /dominis/solicitacoes-nif-academia` sem `codigo_academia` lista tudo), mas hoje o admin só vê essas solicitações entrando na tela de detalhes de cada academia, uma de cada vez. Se o volume de pedidos crescer, pode valer a pena um dashboard dedicado (parecido com `/solicitacoes-matricula`), mas isso não foi pedido nesta tarefa.
- `src/Documentação da API.md` (a cópia antiga e dessincronizada, ver seção 3) continua como estava — decidir separadamente se ainda serve para algo.
