# Tarefa de Correção para o Codex — Lançamento de Notas e Faltas por Planilha Excel

> **Como usar este documento:** a tarefa original (`src/docs/TASK_LANCAMENTO_NOTAS_FALTAS.md`) foi implementada no
> commit `e52ef27` ("Implement bulk grade and absence launches"), mas uma auditoria profunda encontrou **4 bugs
> críticos**, **vários problemas de paleta/dark-mode** (confirmado pelo usuário) e alguns itens de limpeza. Este
> documento já traz a correção **pronta e validada** (`npx tsc --noEmit` e `npx eslint` limpos, mais um teste
> funcional de geração/leitura de `.xlsx`) — o Codex só precisa **substituir o conteúdo de cada arquivo abaixo pelo
> conteúdo fornecido** (ou aplicar o patch anexo) e depois rodar a Seção "Validação" para confirmar que reproduziu
> os mesmos resultados. Não é necessário reprojetar nada.
>
> Um patch git pronto (`correcao-notas-faltas.patch`) também é fornecido como alternativa/conferência — mas a fonte
> de verdade é o conteúdo de arquivo completo listado abaixo, caso o patch não aplique de forma limpa (ex.: por
> diferenças de espaço em branco).

---

## 1. Resumo executivo — o que estava errado

A implementação (commit `e52ef27`) passou em `tsc`/`eslint`/`build`, mas isso escondeu vários problemas reais.
Causa raiz do porquê o `tsc` não pegou nada: `BatchProgressScreenNotas.tsx` e `BatchProgressScreenFaltas.tsx` eram
**wrappers finos que reexportavam o componente `BatchProgressScreen` do fluxo de cadastro de estudantes**, repassando
as props com `as any` — isso escondeu do compilador uma incompatibilidade de domínio real (ver Correção 1).

| # | Severidade | Problema | Onde |
|---|---|---|---|
| 1 | 🔴 Crítica | Tela de progresso de notas/faltas reaproveitava literalmente o componente de progresso do **cadastro de estudantes**, com textos errados ("estudante(s)"), lendo/gravando a chave de `localStorage` errada, e exportando falhas com colunas de estudante (Nome, BI, Género...) em vez de notas/faltas | `BatchProgressScreenNotas.tsx`, `BatchProgressScreenFaltas.tsx` |
| 2 | 🔴 Crítica | `notasErrorExport.ts`/`faltasErrorExport.ts` eram **stubs vazios** — a funcionalidade de "baixar planilha só com erros" e "baixar falhas do lote" não existia de verdade (nunca eram chamadas em lugar nenhum) | `notasErrorExport.ts`, `faltasErrorExport.ts` |
| 3 | 🔴 Crítica | `removerItensConcluidosNotas`/`removerItensConcluidosFaltas` eram **no-ops** (não removiam nada do rascunho) — e nem chegavam a ser chamadas, por causa do bug #1 | `notasDraft.ts`, `faltasDraft.ts` |
| 4 | 🔴 Crítica | Lista de **categorias de nota do ensino escolar hardcoded, incompleta e sem filtro por ano acadêmico** — só tinha 2 das 5 categorias reais (faltavam Exame Final, Exame de Recurso e Prova de Aptidão Profissional). Como o lançamento individual foi removido por design, isso deixava a academia **sem nenhuma forma de lançar essas notas** | `SelecaoContextoNotas.tsx` |
| 5 | 🟠 Alta | Falta quase total de classes `dark:` nos componentes novos (2–3 por arquivo vs. dezenas no padrão original de `/estudantes/cadastrar`), badge circular de ícone ausente, tipografia de heading incompleta — **é exatamente o problema de paleta/cores que o usuário reportou** | Todos os arquivos novos em `notas/lancar` e `faltas/lancar` |
| 6 | 🟡 Média | Código morto: `handleRegistrar` (nível de página) ficou órfão em `NotasAcademia.tsx`; `CATEGORIAS_ESCOLAR`/`cats`/`listarCategoriasNota` não utilizados em `SelecaoContextoFaltas.tsx`; `/* eslint-disable ... */` no topo do arquivo inteiro em vez de escopo pontual | `NotasAcademia.tsx`, `SelecaoContextoFaltas.tsx` |
| 7 | 🟡 Média | `materiaId`/`categoria` só eram resetados quando o **período** mudava, não quando a **turma** mudava — podia deixar uma matéria/categoria selecionada que não é mais compatível com a turma atual | `SelecaoContextoNotas.tsx`, `SelecaoContextoFaltas.tsx` |
| 8 | 🟢 Baixa (opcional) | Vários arquivos foram gerados minificados em uma única linha (sem indentação/quebras), fora do padrão de formatação do resto do projeto — dificulta manutenção futura, mas não é um bug funcional | `notasTemplate.ts`, `faltasTemplate.ts`, `notasParser.ts`, `faltasParser.ts`, `notasTypes.ts`, `faltasTypes.ts`, `notasPayload.ts`, `faltasPayload.ts`, `notasApi.ts`, `faltasApi.ts` |

Todas as correções 1–7 já foram implementadas, e **validadas** com:
- `npx tsc --noEmit` → 0 erros
- `npx eslint` nos diretórios/arquivos tocados → 0 erros, 0 warnings
- Teste funcional isolado (Node + biblioteca `xlsx`) confirmando que a geração/leitura de planilhas de erro produz
  arquivos `.xlsx` válidos, com a aba `_meta` correta (incluindo `codigo_turma` e a categoria "Exame final" — a
  categoria que estava ausente no bug #4)
- `npm run build` falha **apenas** por não conseguir baixar a fonte Google `Outfit` (`next/font`) — isso é uma
  limitação de rede do ambiente sandbox (tanto do Codex quanto deste orquestrador), **não é causado por este
  código**; confirmado de forma independente antes e depois da correção.

O item 8 é **opcional** — não é necessário para esta tarefa de correção, mas pode ser feito depois se sobrar tempo
(ver Seção 10).

---

## 2. Instruções de aplicação

Para cada arquivo na Seção 3 em diante: **substitua todo o conteúdo do arquivo pelo bloco de código fornecido**
(sobrescrever integralmente — não faça merge manual). Depois de aplicar todos, rode a Seção 9 (Validação) e
compare com os resultados já reportados aqui.


---

## 3. Correção 1 (Crítica) — `BatchProgressScreenNotas.tsx` e `BatchProgressScreenFaltas.tsx`

Estes arquivos reaproveitavam literalmente o componente `BatchProgressScreen` de `estudantes/cadastrar`, o que fazia a tela de progresso de notas/faltas mostrar textos de "estudante(s)", ler/gravar a chave de rascunho errada em `localStorage`, e (quando o botão de baixar falhas aparecesse) exportar as falhas com colunas de cadastro de estudante. A correção implementa componentes de progresso próprios, ligados a `notasDraft.ts`/`notasErrorExport.ts` (e equivalentes de faltas), com textos corretos, badge/paleta consistentes com o padrão do projeto, e um novo mecanismo (`nomesPorCodigo`, construído a partir das próprias linhas da planilha enviada) para mostrar o nome do estudante nas falhas, já que `RegistrarNotasRequest`/`RegistrarFaltasRequest` não têm campo `nome`.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/BatchProgressScreenNotas.tsx` por:**

```tsx
// src/app/(painel)/notas/lancar/BatchProgressScreenNotas.tsx
"use client";
import { useEffect, useRef, useState } from 'react';
import { pollJob, jobApiService } from '@/lib/api';
import type { JobSummary, JobDetail } from '@/lib/api';
import Button from '@/components/ui/button/Button';
import { baixarNotasComFalha, baixarRascunhoNotasPendentes } from './notasErrorExport';
import { lerRascunhoNotas, removerItensConcluidosNotas } from './notasDraft';
import type { ContextoModeloNotas } from './notasTypes';

interface BatchProgressScreenNotasProps {
  /** Um lançamento em massa pode gerar vários lotes (jobs) quando ultrapassa
   * o limite de notas por requisição da API. Esta tela acompanha todos em
   * paralelo e agrega o progresso. */
  jobIds: string[];
  contexto?: ContextoModeloNotas | null;
  /** Aviso opcional quando algum lote não foi sequer submetido ao servidor. */
  avisoSubmissao?: string | null;
  /** Nome do estudante por código (minúsculo, sem espaços), extraído da
   * própria planilha enviada — usado só para exibição/exportação de falhas. */
  nomesPorCodigo?: Record<string, string>;
  onConcluido: () => void;
}

interface EstadoLote {
  summary: JobSummary | null;
  detail: JobDetail | null;
  erro?: string;
}

export default function BatchProgressScreenNotas({ jobIds, contexto, avisoSubmissao, nomesPorCodigo = {}, onConcluido }: BatchProgressScreenNotasProps) {
  const [estadoLotes, setEstadoLotes] = useState<Record<string, EstadoLote>>(() =>
    Object.fromEntries(jobIds.map((id) => [id, { summary: null, detail: null }]))
  );
  const canceladoRef = useRef(false);
  const [totalRascunho, setTotalRascunho] = useState(0);

  useEffect(() => {
    setTotalRascunho(lerRascunhoNotas()?.itensPendentes.length ?? 0);
  }, []);

  useEffect(() => {
    canceladoRef.current = false;

    jobIds.forEach((jobId) => {
      jobApiService
        .getStatus(jobId)
        .then((s) => {
          if (canceladoRef.current) return;
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: s } }));
        })
        .catch(() => {});

      pollJob(jobId, {
        onProgress: (s) => {
          if (canceladoRef.current) return;
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: s } }));
        },
        onComplete: (d) => {
          if (canceladoRef.current) return;
          const lancadas = d.results.filter((r) => r.sucesso).map((r) => r.payload);
          const rascunhoAtualizado = removerItensConcluidosNotas(lancadas);
          setTotalRascunho(rascunhoAtualizado?.itensPendentes.length ?? 0);
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: d, detail: d } }));
        },
        onError: () => {},
      }).catch((err) => {
        if (canceladoRef.current) return;
        setEstadoLotes((prev) => ({
          ...prev,
          [jobId]: { ...prev[jobId], erro: err instanceof Error ? err.message : 'Não foi possível acompanhar este grupo de envio.' },
        }));
      });
    });

    return () => {
      canceladoRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIds.join(',')]);

  const lotes = jobIds.map((id) => ({ jobId: id, ...estadoLotes[id] }));
  const total = lotes.reduce((acc, l) => acc + (l.summary?.total_items ?? 0), 0);
  const doneItems = lotes.reduce((acc, l) => acc + (l.summary?.done_items ?? 0), 0);
  const failItems = lotes.reduce((acc, l) => acc + (l.summary?.fail_items ?? 0), 0);
  const feitos = doneItems + failItems;
  const progresso = total > 0 ? Math.round((feitos / total) * 100) : 0;
  const concluido = lotes.every((l) => l.summary?.status === 'done' || l.summary?.status === 'failed');
  const algumFalhou = lotes.some((l) => l.summary?.status === 'failed');
  const falhas = lotes.flatMap((l) => l.detail?.results?.filter((r) => !r.sucesso) ?? []);
  const errosPolling = lotes.filter((l) => l.erro).map((l) => l.erro as string);
  const multiploLotes = jobIds.length > 1;

  const nomeEstudante = (payload: any): string => {
    const codigo = payload?.codigo_estudante;
    if (!codigo) return '';
    return nomesPorCodigo[String(codigo).trim().toLowerCase()] || '';
  };

  const handleBaixarFalhas = () => {
    if (falhas.length === 0) return;
    const resultados = falhas.map((f) => ({ payload: f.payload, erro: f.erro }));
    baixarNotasComFalha(contexto ?? null, resultados, `lancamento-notas-${jobIds[0]?.slice(0, 8) || 'grupo'}`, nomesPorCodigo);
  };

  const handleBaixarRascunho = () => {
    const rascunho = lerRascunhoNotas();
    if (!rascunho?.itensPendentes.length) return;
    baixarRascunhoNotasPendentes(
      rascunho.contexto ?? contexto ?? null,
      rascunho.itensPendentes,
      jobIds[0]?.slice(0, 8) || 'grupo',
      nomesPorCodigo
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
          {concluido ? 'Lançamento de notas concluído' : 'Lançando notas...'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {concluido
            ? 'Veja abaixo o resultado do lançamento.'
            : multiploLotes
            ? `As notas serão lançadas em ${jobIds.length} grupos, automaticamente, para que tudo seja enviado com segurança. A integração de cada nota na base de dados pode demorar alguns minutos. `
            : 'A integração das notas na base de dados pode demorar alguns minutos. '}
          {!concluido && 'Pode navegar para outra página — ao voltar aqui, o progresso continua a ser mostrado.'}
        </p>

        {avisoSubmissao && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {avisoSubmissao}
          </div>
        )}

        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${algumFalhou ? 'bg-orange-500' : 'bg-brand-500'}`}
            style={{ width: `${Math.min(100, Math.max(concluido ? 100 : 4, progresso))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span>
            {feitos} de {total || '...'} processados
          </span>
          {!!doneItems && <span className="text-green-600 dark:text-green-400">{doneItems} com sucesso</span>}
          {!!failItems && <span className="text-red-600 dark:text-red-400">{failItems} com falha</span>}
        </div>

        {multiploLotes && (
          <div className="mt-4 flex flex-wrap gap-2">
            {lotes.map((l, i) => {
              const status = l.summary?.status;
              const label =
                status === 'done'
                  ? 'Concluído'
                  : status === 'failed'
                  ? 'Concluído com falhas'
                  : status === 'processing'
                  ? 'Processando'
                  : 'Na fila';
              const cor =
                status === 'done'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : status === 'failed'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : status === 'processing'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300';
              return (
                <span key={l.jobId} className={`rounded-full px-3 py-1 text-xs font-medium ${cor}`}>
                  Grupo {i + 1}: {label}
                </span>
              );
            })}
          </div>
        )}

        {errosPolling.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 space-y-1">
            {errosPolling.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {!concluido && (
          <div className="mt-4 space-y-1 text-xs text-gray-400">
            <p>Não é necessário permanecer nesta tela — o lançamento continua em andamento.</p>
            {totalRascunho > 0 && (
              <p>
                Uma cópia de segurança neste navegador guardou {totalRascunho} nota(s) desta planilha que ainda não foram lançadas.
                Assim, pode retomar o envio se ocorrer algum problema.
              </p>
            )}
          </div>
        )}
      </div>

      {concluido && totalRascunho > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Cópia de segurança atualizada com {totalRascunho} nota(s) desta planilha que ainda não foram lançadas.
          Pode baixar essa cópia para corrigir e tentar novamente.
        </div>
      )}

      {concluido && falhas.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Notas que não foram lançadas ({falhas.length})
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30 bg-white dark:bg-transparent">
            {falhas.map((f, i) => {
              const nome = nomeEstudante(f.payload) || (f.payload as any)?.codigo_estudante || `Nota #${(f.index ?? i) + 1}`;
              return (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {f.erro || 'Não foi possível identificar o motivo da falha.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {concluido && (
        <div className="flex flex-col sm:flex-row gap-3">
          {totalRascunho > 0 && (
            <Button variant="outline" size="sm" onClick={handleBaixarRascunho}>
              Baixar notas por lançar ({totalRascunho})
            </Button>
          )}
          {falhas.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBaixarFalhas}>
              Baixar notas com falha ({falhas.length})
            </Button>
          )}
          <Button size="sm" onClick={onConcluido}>
            {falhas.length > 0 ? 'Corrigir e tentar novamente' : 'Concluir'}
          </Button>
        </div>
      )}
    </div>
  );
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/BatchProgressScreenFaltas.tsx` por:**

```tsx
// src/app/(painel)/faltas/lancar/BatchProgressScreenFaltas.tsx
"use client";
import { useEffect, useRef, useState } from 'react';
import { pollJob, jobApiService } from '@/lib/api';
import type { JobSummary, JobDetail } from '@/lib/api';
import Button from '@/components/ui/button/Button';
import { baixarFaltasComFalha, baixarRascunhoFaltasPendentes } from './faltasErrorExport';
import { lerRascunhoFaltas, removerItensConcluidosFaltas } from './faltasDraft';
import type { ContextoModeloFaltas } from './faltasTypes';

interface BatchProgressScreenFaltasProps {
  /** Um lançamento em massa pode gerar vários lotes (jobs) quando ultrapassa
   * o limite de faltas por requisição da API. Esta tela acompanha todos em
   * paralelo e agrega o progresso. */
  jobIds: string[];
  contexto?: ContextoModeloFaltas | null;
  /** Aviso opcional quando algum lote não foi sequer submetido ao servidor. */
  avisoSubmissao?: string | null;
  /** Nome do estudante por código (minúsculo, sem espaços), extraído da
   * própria planilha enviada — usado só para exibição/exportação de falhas. */
  nomesPorCodigo?: Record<string, string>;
  onConcluido: () => void;
}

interface EstadoLote {
  summary: JobSummary | null;
  detail: JobDetail | null;
  erro?: string;
}

export default function BatchProgressScreenFaltas({ jobIds, contexto, avisoSubmissao, nomesPorCodigo = {}, onConcluido }: BatchProgressScreenFaltasProps) {
  const [estadoLotes, setEstadoLotes] = useState<Record<string, EstadoLote>>(() =>
    Object.fromEntries(jobIds.map((id) => [id, { summary: null, detail: null }]))
  );
  const canceladoRef = useRef(false);
  const [totalRascunho, setTotalRascunho] = useState(0);

  useEffect(() => {
    setTotalRascunho(lerRascunhoFaltas()?.itensPendentes.length ?? 0);
  }, []);

  useEffect(() => {
    canceladoRef.current = false;

    jobIds.forEach((jobId) => {
      jobApiService
        .getStatus(jobId)
        .then((s) => {
          if (canceladoRef.current) return;
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: s } }));
        })
        .catch(() => {});

      pollJob(jobId, {
        onProgress: (s) => {
          if (canceladoRef.current) return;
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: s } }));
        },
        onComplete: (d) => {
          if (canceladoRef.current) return;
          const lancadas = d.results.filter((r) => r.sucesso).map((r) => r.payload);
          const rascunhoAtualizado = removerItensConcluidosFaltas(lancadas);
          setTotalRascunho(rascunhoAtualizado?.itensPendentes.length ?? 0);
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: d, detail: d } }));
        },
        onError: () => {},
      }).catch((err) => {
        if (canceladoRef.current) return;
        setEstadoLotes((prev) => ({
          ...prev,
          [jobId]: { ...prev[jobId], erro: err instanceof Error ? err.message : 'Não foi possível acompanhar este grupo de envio.' },
        }));
      });
    });

    return () => {
      canceladoRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIds.join(',')]);

  const lotes = jobIds.map((id) => ({ jobId: id, ...estadoLotes[id] }));
  const total = lotes.reduce((acc, l) => acc + (l.summary?.total_items ?? 0), 0);
  const doneItems = lotes.reduce((acc, l) => acc + (l.summary?.done_items ?? 0), 0);
  const failItems = lotes.reduce((acc, l) => acc + (l.summary?.fail_items ?? 0), 0);
  const feitos = doneItems + failItems;
  const progresso = total > 0 ? Math.round((feitos / total) * 100) : 0;
  const concluido = lotes.every((l) => l.summary?.status === 'done' || l.summary?.status === 'failed');
  const algumFalhou = lotes.some((l) => l.summary?.status === 'failed');
  const falhas = lotes.flatMap((l) => l.detail?.results?.filter((r) => !r.sucesso) ?? []);
  const errosPolling = lotes.filter((l) => l.erro).map((l) => l.erro as string);
  const multiploLotes = jobIds.length > 1;

  const nomeEstudante = (payload: any): string => {
    const codigo = payload?.codigo_estudante;
    if (!codigo) return '';
    return nomesPorCodigo[String(codigo).trim().toLowerCase()] || '';
  };

  const handleBaixarFalhas = () => {
    if (falhas.length === 0) return;
    const resultados = falhas.map((f) => ({ payload: f.payload, erro: f.erro }));
    baixarFaltasComFalha(contexto ?? null, resultados, `lancamento-faltas-${jobIds[0]?.slice(0, 8) || 'grupo'}`, nomesPorCodigo);
  };

  const handleBaixarRascunho = () => {
    const rascunho = lerRascunhoFaltas();
    if (!rascunho?.itensPendentes.length) return;
    baixarRascunhoFaltasPendentes(
      rascunho.contexto ?? contexto ?? null,
      rascunho.itensPendentes,
      jobIds[0]?.slice(0, 8) || 'grupo',
      nomesPorCodigo
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
          {concluido ? 'Lançamento de faltas concluído' : 'Lançando faltas...'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {concluido
            ? 'Veja abaixo o resultado do lançamento.'
            : multiploLotes
            ? `As faltas serão lançadas em ${jobIds.length} grupos, automaticamente, para que tudo seja enviado com segurança. A integração de cada falta na base de dados pode demorar alguns minutos. `
            : 'A integração das faltas na base de dados pode demorar alguns minutos. '}
          {!concluido && 'Pode navegar para outra página — ao voltar aqui, o progresso continua a ser mostrado.'}
        </p>

        {avisoSubmissao && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {avisoSubmissao}
          </div>
        )}

        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${algumFalhou ? 'bg-orange-500' : 'bg-brand-500'}`}
            style={{ width: `${Math.min(100, Math.max(concluido ? 100 : 4, progresso))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span>
            {feitos} de {total || '...'} processados
          </span>
          {!!doneItems && <span className="text-green-600 dark:text-green-400">{doneItems} com sucesso</span>}
          {!!failItems && <span className="text-red-600 dark:text-red-400">{failItems} com falha</span>}
        </div>

        {multiploLotes && (
          <div className="mt-4 flex flex-wrap gap-2">
            {lotes.map((l, i) => {
              const status = l.summary?.status;
              const label =
                status === 'done'
                  ? 'Concluído'
                  : status === 'failed'
                  ? 'Concluído com falhas'
                  : status === 'processing'
                  ? 'Processando'
                  : 'Na fila';
              const cor =
                status === 'done'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : status === 'failed'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : status === 'processing'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300';
              return (
                <span key={l.jobId} className={`rounded-full px-3 py-1 text-xs font-medium ${cor}`}>
                  Grupo {i + 1}: {label}
                </span>
              );
            })}
          </div>
        )}

        {errosPolling.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 space-y-1">
            {errosPolling.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {!concluido && (
          <div className="mt-4 space-y-1 text-xs text-gray-400">
            <p>Não é necessário permanecer nesta tela — o lançamento continua em andamento.</p>
            {totalRascunho > 0 && (
              <p>
                Uma cópia de segurança neste navegador guardou {totalRascunho} falta(s) desta planilha que ainda não foram lançadas.
                Assim, pode retomar o envio se ocorrer algum problema.
              </p>
            )}
          </div>
        )}
      </div>

      {concluido && totalRascunho > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Cópia de segurança atualizada com {totalRascunho} falta(s) desta planilha que ainda não foram lançadas.
          Pode baixar essa cópia para corrigir e tentar novamente.
        </div>
      )}

      {concluido && falhas.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Faltas que não foram lançadas ({falhas.length})
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30 bg-white dark:bg-transparent">
            {falhas.map((f, i) => {
              const nome = nomeEstudante(f.payload) || (f.payload as any)?.codigo_estudante || `Falta #${(f.index ?? i) + 1}`;
              return (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {f.erro || 'Não foi possível identificar o motivo da falha.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {concluido && (
        <div className="flex flex-col sm:flex-row gap-3">
          {totalRascunho > 0 && (
            <Button variant="outline" size="sm" onClick={handleBaixarRascunho}>
              Baixar faltas por lançar ({totalRascunho})
            </Button>
          )}
          {falhas.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBaixarFalhas}>
              Baixar faltas com falha ({falhas.length})
            </Button>
          )}
          <Button size="sm" onClick={onConcluido}>
            {falhas.length > 0 ? 'Corrigir e tentar novamente' : 'Concluir'}
          </Button>
        </div>
      )}
    </div>
  );
}
```


---

## 4. Correção 2 (Crítica) — `notasErrorExport.ts` e `faltasErrorExport.ts`

Estes arquivos eram stubs vazios (comentário `/* geração dedicada pode ser expandida... */` sem nenhuma implementação real). A correção implementa de fato as três funções exigidas pela tarefa original (Seção 8.11/8.12/9.x do documento original): baixar apenas as linhas com erro de validação, baixar as notas/faltas que falharam no envio ao servidor (com o motivo do erro), e baixar o rascunho de itens ainda pendentes.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/notasErrorExport.ts` por:**

```ts
// src/app/(painel)/notas/lancar/notasErrorExport.ts
// Geração de planilhas Excel contendo apenas as linhas/notas com erro ou que
// falharam no envio, para que a academia possa corrigir e reenviar rapidamente.

import * as XLSX from 'xlsx';
import type { ContextoModeloNotas, NotaBulkRow, ErroValidacao } from './notasTypes';

const CABECALHO_BASE = ['Nome do Estudante', 'Código do Estudante', 'Valor da Nota'];

function montarMetaLinhas(contexto: ContextoModeloNotas) {
  return [
    ['chave', 'valor'],
    ['versao_modelo', contexto.versaoModelo || '1'],
    ['codigo_academia', contexto.codigoAcademia || ''],
    ['nome_academia', contexto.nomeAcademia || ''],
    ['nivel', contexto.nivel || ''],
    ['curso_id', contexto.cursoId || ''],
    ['curso_nome', contexto.cursoNome || ''],
    ['ano_academico', contexto.anoAcademico || ''],
    ['ano_academico_label', contexto.anoAcademicoLabel || ''],
    ['codigo_turma', contexto.codigoTurma || ''],
    ['turma_label', contexto.turmaLabel || ''],
    ['periodo', contexto.periodo || ''],
    ['periodo_label', contexto.periodoLabel || ''],
    ['materia_disciplinar_id', contexto.materiaId || ''],
    ['materia_nome', contexto.materiaNome || ''],
    ['categoria', contexto.categoria || ''],
    ['categoria_nome', contexto.categoriaNome || ''],
    ['tipo_nota', contexto.tipoNota || ''],
    ['gerado_em', new Date().toISOString()],
  ];
}

function escreverPlanilhaComErros(nomeArquivo: string, contexto: ContextoModeloNotas | null, linhas: (string | number)[][]) {
  const wb = XLSX.utils.book_new();

  const dados = [[...CABECALHO_BASE, 'Erro(s) encontrados'], ...linhas];
  const ws: any = XLSX.utils.aoa_to_sheet(dados);
  ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 60 }];
  // Mantém o nome "Notas" para que este ficheiro possa ser corrigido e
  // reenviado diretamente, sem precisar de descarregar um novo modelo — a
  // coluna extra de erro é simplesmente ignorada na leitura.
  XLSX.utils.book_append_sheet(wb, ws, 'Notas');

  if (contexto) {
    const wsMeta = XLSX.utils.aoa_to_sheet(montarMetaLinhas(contexto));
    XLSX.utils.book_append_sheet(wb, wsMeta, '_meta');
    const idx = wb.SheetNames.indexOf('_meta');
    (wb as any).Workbook = {
      Sheets: wb.SheetNames.map((_: string, i: number) => (i === idx ? { Hidden: 1 } : {})),
    };
  }

  XLSX.writeFile(wb, nomeArquivo);
}

/**
 * Descarrega um Excel apenas com as linhas que falharam na validação
 * client-side (antes de qualquer envio ao servidor).
 */
export function baixarLinhasComErroNotas(
  contexto: ContextoModeloNotas,
  linhas: NotaBulkRow[],
  erros: ErroValidacao[],
  nomeArquivoOriginal: string
) {
  const errosPorLinha = new Map<number, string[]>();
  erros.forEach((e) => {
    if (!errosPorLinha.has(e.linha)) errosPorLinha.set(e.linha, []);
    errosPorLinha.get(e.linha)!.push(`${e.campo}: ${e.mensagem}`);
  });

  const linhasComErro = linhas.filter((l) => errosPorLinha.has(l.linha));
  if (linhasComErro.length === 0) return;

  const dados = linhasComErro.map((l) => [
    l.nome,
    l.codigoEstudante,
    l.valorNotaTexto,
    (errosPorLinha.get(l.linha) || []).join(' | '),
  ]);

  const nomeBase = nomeArquivoOriginal.replace(/\.xlsx$/i, '');
  escreverPlanilhaComErros(`erros-${nomeBase}.xlsx`, contexto, dados);
}

interface ResultadoFalhaJob {
  payload: any;
  erro?: string;
}

/**
 * Descarrega um Excel apenas com as notas que falharam no lançamento em
 * massa já submetido ao servidor, incluindo o motivo de cada falha.
 * `nomesPorCodigo` é opcional e permite mostrar o nome do estudante (extraído
 * da própria planilha enviada) em vez de apenas o código.
 */
export function baixarNotasComFalha(
  contexto: ContextoModeloNotas | null,
  resultados: ResultadoFalhaJob[],
  nomeBase: string,
  nomesPorCodigo: Record<string, string> = {}
) {
  if (resultados.length === 0) return;

  const dados = resultados.map(({ payload, erro }) => {
    const p = payload || {};
    const codigo = p.codigo_estudante || '';
    const nome = nomesPorCodigo[String(codigo).trim().toLowerCase()] || '';
    return [
      nome,
      codigo,
      p.nota ?? '',
      erro || 'Não foi possível identificar o motivo da falha.',
    ];
  });

  escreverPlanilhaComErros(`falhas-${nomeBase}.xlsx`, contexto, dados);
}

export function baixarRascunhoNotasPendentes(
  contexto: ContextoModeloNotas | null,
  itens: any[],
  nomeBase: string,
  nomesPorCodigo: Record<string, string> = {}
) {
  const resultados = itens.map((payload) => ({
    payload,
    erro: 'Ainda não foi lançada. Use esta cópia para corrigir e tentar novamente.',
  }));
  baixarNotasComFalha(contexto, resultados, `rascunho-${nomeBase}`, nomesPorCodigo);
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/faltasErrorExport.ts` por:**

```ts
// src/app/(painel)/faltas/lancar/faltasErrorExport.ts
// Geração de planilhas Excel contendo apenas as linhas/faltas com erro ou que
// falharam no envio, para que a academia possa corrigir e reenviar rapidamente.

import * as XLSX from 'xlsx';
import type { ContextoModeloFaltas, FaltaBulkRow, ErroValidacao } from './faltasTypes';

const CABECALHO_BASE = ['Nome do Estudante', 'Código do Estudante', 'Data da Falta', 'Quantidade'];

function montarMetaLinhas(contexto: ContextoModeloFaltas) {
  return [
    ['chave', 'valor'],
    ['versao_modelo', contexto.versaoModelo || '1'],
    ['codigo_academia', contexto.codigoAcademia || ''],
    ['nome_academia', contexto.nomeAcademia || ''],
    ['nivel', contexto.nivel || ''],
    ['curso_id', contexto.cursoId || ''],
    ['curso_nome', contexto.cursoNome || ''],
    ['ano_academico', contexto.anoAcademico || ''],
    ['ano_academico_label', contexto.anoAcademicoLabel || ''],
    ['codigo_turma', contexto.codigoTurma || ''],
    ['turma_label', contexto.turmaLabel || ''],
    ['periodo', contexto.periodo || ''],
    ['periodo_label', contexto.periodoLabel || ''],
    ['materia_disciplinar_id', contexto.materiaId || ''],
    ['materia_nome', contexto.materiaNome || ''],
    ['gerado_em', new Date().toISOString()],
  ];
}

function escreverPlanilhaComErros(nomeArquivo: string, contexto: ContextoModeloFaltas | null, linhas: (string | number)[][]) {
  const wb = XLSX.utils.book_new();

  const dados = [[...CABECALHO_BASE, 'Erro(s) encontrados'], ...linhas];
  const ws: any = XLSX.utils.aoa_to_sheet(dados);
  ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Faltas');

  if (contexto) {
    const wsMeta = XLSX.utils.aoa_to_sheet(montarMetaLinhas(contexto));
    XLSX.utils.book_append_sheet(wb, wsMeta, '_meta');
    const idx = wb.SheetNames.indexOf('_meta');
    (wb as any).Workbook = {
      Sheets: wb.SheetNames.map((_: string, i: number) => (i === idx ? { Hidden: 1 } : {})),
    };
  }

  XLSX.writeFile(wb, nomeArquivo);
}

/**
 * Descarrega um Excel apenas com as linhas que falharam na validação
 * client-side (antes de qualquer envio ao servidor).
 */
export function baixarLinhasComErroFaltas(
  contexto: ContextoModeloFaltas,
  linhas: FaltaBulkRow[],
  erros: ErroValidacao[],
  nomeArquivoOriginal: string
) {
  const errosPorLinha = new Map<number, string[]>();
  erros.forEach((e) => {
    if (!errosPorLinha.has(e.linha)) errosPorLinha.set(e.linha, []);
    errosPorLinha.get(e.linha)!.push(`${e.campo}: ${e.mensagem}`);
  });

  const linhasComErro = linhas.filter((l) => errosPorLinha.has(l.linha));
  if (linhasComErro.length === 0) return;

  const dados = linhasComErro.map((l) => [
    l.nome,
    l.codigoEstudante,
    l.dataTexto,
    l.quantidadeTexto,
    (errosPorLinha.get(l.linha) || []).join(' | '),
  ]);

  const nomeBase = nomeArquivoOriginal.replace(/\.xlsx$/i, '');
  escreverPlanilhaComErros(`erros-${nomeBase}.xlsx`, contexto, dados);
}

interface ResultadoFalhaJob {
  payload: any;
  erro?: string;
}

/**
 * Descarrega um Excel apenas com as faltas que falharam no lançamento em
 * massa já submetido ao servidor, incluindo o motivo de cada falha.
 * `nomesPorCodigo` é opcional e permite mostrar o nome do estudante (extraído
 * da própria planilha enviada) em vez de apenas o código.
 */
export function baixarFaltasComFalha(
  contexto: ContextoModeloFaltas | null,
  resultados: ResultadoFalhaJob[],
  nomeBase: string,
  nomesPorCodigo: Record<string, string> = {}
) {
  if (resultados.length === 0) return;

  const dados = resultados.map(({ payload, erro }) => {
    const p = payload || {};
    const codigo = p.codigo_estudante || '';
    const nome = nomesPorCodigo[String(codigo).trim().toLowerCase()] || '';
    return [
      nome,
      codigo,
      p.data || '',
      p.quantidade ?? '',
      erro || 'Não foi possível identificar o motivo da falha.',
    ];
  });

  escreverPlanilhaComErros(`falhas-${nomeBase}.xlsx`, contexto, dados);
}

export function baixarRascunhoFaltasPendentes(
  contexto: ContextoModeloFaltas | null,
  itens: any[],
  nomeBase: string,
  nomesPorCodigo: Record<string, string> = {}
) {
  const resultados = itens.map((payload) => ({
    payload,
    erro: 'Ainda não foi lançada. Use esta cópia para corrigir e tentar novamente.',
  }));
  baixarFaltasComFalha(contexto, resultados, `rascunho-${nomeBase}`, nomesPorCodigo);
}
```


---

## 5. Correção 3 (Crítica) — `notasDraft.ts` e `faltasDraft.ts`

A função `removerItensConcluidosNotas`/`removerItensConcluidosFaltas` existia mas não fazia nada (só relia o mesmo rascunho sem filtrar). A correção implementa a remoção real dos itens já lançados com sucesso (identificados por uma chave composta — estudante + período + matéria + categoria para notas; estudante + data + matéria + período para faltas), e limpa o rascunho por completo quando não sobra nenhum item pendente.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/notasDraft.ts` por:**

```ts
// src/app/(painel)/notas/lancar/notasDraft.ts
// Cópia de segurança (rascunho) em localStorage do lançamento de notas em
// massa em andamento, para permitir retomar o envio após uma falha parcial.
// Isolado do fluxo de cadastro de estudantes para evitar acoplamento entre
// os dois fluxos.

import type { RegistrarNotasRequest } from '@/types/api';
import type { ContextoModeloNotas } from './notasTypes';

const CHAVE_RASCUNHO_NOTAS = 'spuri:lancamento-notas:rascunho:v1';

export interface RascunhoNotas {
  criadoEm: string;
  atualizadoEm: string;
  nomeArquivo?: string;
  contexto: ContextoModeloNotas | null;
  jobIds: string[];
  itensPendentes: RegistrarNotasRequest[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function chaveNota(item: RegistrarNotasRequest): string {
  return JSON.stringify({
    codigo_estudante: (item.codigo_estudante || '').trim().toLowerCase(),
    periodo: item.periodo || '',
    materia_disciplinar_id: item.materia_disciplinar_id || '',
    categoria: item.categoria || '',
  });
}

export function lerRascunhoNotas(): RascunhoNotas | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_RASCUNHO_NOTAS);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RascunhoNotas;
    if (!Array.isArray(draft.itensPendentes)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function salvarRascunhoNotas(draft: Omit<RascunhoNotas, 'criadoEm' | 'atualizadoEm'>): void {
  if (!isBrowser()) return;
  const anterior = lerRascunhoNotas();
  const agora = new Date().toISOString();
  window.localStorage.setItem(
    CHAVE_RASCUNHO_NOTAS,
    JSON.stringify({ ...draft, criadoEm: anterior?.criadoEm || agora, atualizadoEm: agora })
  );
}

export function removerRascunhoNotas(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CHAVE_RASCUNHO_NOTAS);
}

/**
 * Remove do rascunho as notas já lançadas com sucesso (identificadas por
 * estudante + período + matéria + categoria), mantendo apenas as pendentes.
 */
export function removerItensConcluidosNotas(itensConcluidos: unknown[]): RascunhoNotas | null {
  const draft = lerRascunhoNotas();
  if (!draft) return null;
  const concluidos = new Set(
    itensConcluidos
      .filter((item): item is RegistrarNotasRequest => !!item && typeof item === 'object')
      .map((item) => chaveNota(item))
  );
  if (concluidos.size === 0) return draft;
  const itensPendentes = draft.itensPendentes.filter((item) => !concluidos.has(chaveNota(item)));
  if (itensPendentes.length === 0) {
    removerRascunhoNotas();
    return null;
  }
  salvarRascunhoNotas({
    contexto: draft.contexto,
    nomeArquivo: draft.nomeArquivo,
    jobIds: draft.jobIds,
    itensPendentes,
  });
  return lerRascunhoNotas();
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/faltasDraft.ts` por:**

```ts
// src/app/(painel)/faltas/lancar/faltasDraft.ts
// Cópia de segurança (rascunho) em localStorage do lançamento de faltas em
// massa em andamento, para permitir retomar o envio após uma falha parcial.
// Isolado do fluxo de cadastro de estudantes para evitar acoplamento entre
// os dois fluxos.

import type { RegistrarFaltasRequest } from '@/types/api';
import type { ContextoModeloFaltas } from './faltasTypes';

const CHAVE_RASCUNHO_FALTAS = 'spuri:lancamento-faltas:rascunho:v1';

export interface RascunhoFaltas {
  criadoEm: string;
  atualizadoEm: string;
  nomeArquivo?: string;
  contexto: ContextoModeloFaltas | null;
  jobIds: string[];
  itensPendentes: RegistrarFaltasRequest[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function chaveFalta(item: RegistrarFaltasRequest): string {
  return JSON.stringify({
    codigo_estudante: (item.codigo_estudante || '').trim().toLowerCase(),
    data: item.data || '',
    materia_disciplinar_id: item.materia_disciplinar_id || '',
    periodo: item.periodo || '',
  });
}

export function lerRascunhoFaltas(): RascunhoFaltas | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_RASCUNHO_FALTAS);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RascunhoFaltas;
    if (!Array.isArray(draft.itensPendentes)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function salvarRascunhoFaltas(draft: Omit<RascunhoFaltas, 'criadoEm' | 'atualizadoEm'>): void {
  if (!isBrowser()) return;
  const anterior = lerRascunhoFaltas();
  const agora = new Date().toISOString();
  window.localStorage.setItem(
    CHAVE_RASCUNHO_FALTAS,
    JSON.stringify({ ...draft, criadoEm: anterior?.criadoEm || agora, atualizadoEm: agora })
  );
}

export function removerRascunhoFaltas(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CHAVE_RASCUNHO_FALTAS);
}

/**
 * Remove do rascunho as faltas já lançadas com sucesso (identificadas por
 * estudante + data + matéria + período), mantendo apenas as pendentes.
 */
export function removerItensConcluidosFaltas(itensConcluidos: unknown[]): RascunhoFaltas | null {
  const draft = lerRascunhoFaltas();
  if (!draft) return null;
  const concluidos = new Set(
    itensConcluidos
      .filter((item): item is RegistrarFaltasRequest => !!item && typeof item === 'object')
      .map((item) => chaveFalta(item))
  );
  if (concluidos.size === 0) return draft;
  const itensPendentes = draft.itensPendentes.filter((item) => !concluidos.has(chaveFalta(item)));
  if (itensPendentes.length === 0) {
    removerRascunhoFaltas();
    return null;
  }
  salvarRascunhoFaltas({
    contexto: draft.contexto,
    nomeArquivo: draft.nomeArquivo,
    jobIds: draft.jobIds,
    itensPendentes,
  });
  return lerRascunhoFaltas();
}
```


---

## 6. Correção 4 (Crítica) + Correção 5 (Alta, paleta/dark-mode) — `SelecaoContextoNotas.tsx` e `SelecaoContextoFaltas.tsx`

**Bug crítico:** a lista de categorias de nota do ensino não-superior estava com apenas 2 das 5 categorias reais, sem filtro por ano acadêmico. A correção importa `CATEGORIAS_ESCOLAR` diretamente de `NotasAcademia.tsx` (agora exportado — ver Correção 6) como fonte única de verdade, e aplica o mesmo filtro por `anos_academicos` já usado no resto do app. **Bug de paleta:** badges de ícone circulares, tipografia de heading e classes `dark:` foram adicionadas em todos os elementos, seguindo exatamente o padrão de `SelecaoContextoMassa.tsx`. **Bug médio:** `materiaId`/`categoria` agora são resetados também quando a turma muda (`[codigoTurma, periodo]`), não só quando o período muda. Em `SelecaoContextoFaltas.tsx`, o código morto de categorias (`cats`, `CATEGORIAS_ESCOLAR` local não utilizado, chamada a `listarCategoriasNota`) foi removido, já que faltas não têm categoria.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/SelecaoContextoNotas.tsx` por:**

```tsx
// src/app/(painel)/notas/lancar/SelecaoContextoNotas.tsx
"use client";
import { useEffect, useMemo, useState } from 'react';
import { academiaService, consultasService, tokenStorage } from '@/lib/api';
import { useUserCookie } from '@/hooks/useUserCookie';
import SearchableSelect from '@/components/form/SearchableSelect';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { Curso, Turma, EstudanteDetalhado } from '@/types/api';
import {
  ANOS_FUNDAMENTAL_LIST,
  isAnoMedioValue,
  isAnoSuperiorValue,
  isAnoFundamental,
  anoOrder,
  getAnoLabel,
  labelNivel,
  type NivelBulk,
} from '../../estudantes/cadastrar/massaHelpers';
import { CATEGORIAS_ESCOLAR } from '@/components/notas/NotasAcademia';
import { gerarModeloExcelNotas } from './notasTemplate';
import type { ContextoModeloNotas } from './notasTypes';

const PERIODOS_ESCOLA = [
  { label: '1º Trimestre', value: '1_trimestre' },
  { label: '2º Trimestre', value: '2_trimestre' },
  { label: '3º Trimestre', value: '3_trimestre' },
];
const PERIODOS_SUPERIOR = [
  { label: '1º Semestre', value: '1_semestre' },
  { label: '2º Semestre', value: '2_semestre' },
];

interface SelecaoContextoNotasProps {
  onModeloGerado: (contexto: ContextoModeloNotas) => void;
}

export default function SelecaoContextoNotas({ onModeloGerado }: SelecaoContextoNotasProps) {
  const { user } = useUserCookie();
  const token = tokenStorage.get() || undefined;

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [categoriasSuperior, setCategoriasSuperior] = useState<any[]>([]);
  const [estudantes, setEstudantes] = useState<EstudanteDetalhado[]>([]);
  const [loadingEstudantes, setLoadingEstudantes] = useState(false);

  const isSuperior = user?.academia?.nivel === 'superior';
  const nivelEscolar = user?.academia?.nivel_escolar ?? 'fundamental';
  const niveisDisponiveis = useMemo<NivelBulk[]>(() => {
    if (isSuperior) return ['superior'];
    if (nivelEscolar === 'misto') return ['fundamental', 'medio'];
    if (nivelEscolar === 'medio') return ['medio'];
    return ['fundamental'];
  }, [isSuperior, nivelEscolar]);

  const [nivel, setNivel] = useState<NivelBulk | ''>('');
  const [cursoId, setCursoId] = useState('');
  const [anoAcademico, setAnoAcademico] = useState('');
  const [codigoTurma, setCodigoTurma] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [categoria, setCategoria] = useState('');

  useEffect(() => {
    academiaService.listarTurmas(token).then((r: any) => setTurmas((r?.turmas ?? []).filter((t: Turma) => t.status === 'ativo')));
    academiaService.listarMaterias(token).then((r: any) => setMaterias((r?.materias ?? []).filter((m: any) => m.status === 'ativo')));
    if (isSuperior) {
      academiaService.listarCategoriasNota(token).then((r: any) => setCategoriasSuperior(r?.categorias ?? []));
    }
     
  }, [token, isSuperior]);

  useEffect(() => {
    if (niveisDisponiveis.length === 1 && nivel !== niveisDisponiveis[0]) {
      setNivel(niveisDisponiveis[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveisDisponiveis]);

  useEffect(() => {
    if (nivel === 'medio' || nivel === 'superior') {
      academiaService.listarCursos(token).then((r: any) => setCursos((r?.cursos ?? []).filter((c: Curso) => c.status === 'ativo')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  useEffect(() => {
    setCursoId('');
    setAnoAcademico('');
    setCodigoTurma('');
    setPeriodo('');
    setMateriaId('');
    setCategoria('');
     
  }, [nivel]);

  useEffect(() => {
    setAnoAcademico('');
    setCodigoTurma('');
  }, [cursoId]);

  useEffect(() => {
    setCodigoTurma('');
  }, [anoAcademico]);

  useEffect(() => {
    // A matéria/categoria dependem do período e também da turma (curso da
    // turma pode mudar a compatibilidade de matérias), por isso ambas são
    // limpas sempre que a turma ou o período mudam.
    setMateriaId('');
    setCategoria('');
  }, [codigoTurma, periodo]);

  useEffect(() => {
    if (!codigoTurma) {
      setEstudantes([]);
      return;
    }
    setLoadingEstudantes(true);
    consultasService
      .listarEstudantes({ token, codigo_turma: codigoTurma } as any)
      .then((r: any) => setEstudantes(r?.estudantes ?? []))
      .finally(() => setLoadingEstudantes(false));
  }, [codigoTurma, token]);

  const cursosDoNivel = cursos.filter((c) => c.type === nivel);
  const precisaCurso = nivel === 'medio' || nivel === 'superior';
  const cursoSelecionado = cursosDoNivel.find((c) => c.id === cursoId);

  const anosDisponiveis = useMemo(() => {
    if (nivel === 'fundamental') {
      const ativos = (user?.academia?.anos_academicos ?? []).filter(isAnoFundamental);
      return ativos.length ? ANOS_FUNDAMENTAL_LIST.filter((a) => ativos.includes(a.value)) : ANOS_FUNDAMENTAL_LIST;
    }
    if (cursoSelecionado && nivel === 'medio') {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoMedioValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    if (cursoSelecionado && nivel === 'superior') {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoSuperiorValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    return [];
     
  }, [nivel, cursoSelecionado, user?.academia?.anos_academicos]);

  const turmasCompativeis = turmas.filter((t) => t.nivel === anoAcademico && (!precisaCurso || t.curso_id === cursoId));
  const turmaSelecionada = turmasCompativeis.find((t) => t.codigo_turma === codigoTurma);
  const periodos = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  const materiasCompativeis = materias.filter(
    (m: any) =>
      (m.anos_academicos ?? []).includes(anoAcademico) &&
      (!turmaSelecionada?.curso_id || !m.curso_id || m.curso_id === turmaSelecionada.curso_id) &&
      (!isSuperior || !m.periodo || m.periodo === periodo)
  );

  const categoriasCompativeis = isSuperior
    ? categoriasSuperior
        .filter((c: any) => c.status !== 'inativo' && (!(c.anos_academicos ?? []).length || (c.anos_academicos ?? []).includes(anoAcademico)))
        .map((c: any) => ({ label: c.nome, value: c.codigo }))
    : CATEGORIAS_ESCOLAR.filter((c) => !(c.anos_academicos ?? []).length || (c.anos_academicos ?? []).includes(anoAcademico));

  const podeBaixar =
    !!nivel &&
    (!precisaCurso || !!cursoId) &&
    !!anoAcademico &&
    !!codigoTurma &&
    !!periodo &&
    !!materiaId &&
    !!categoria &&
    estudantes.length > 0;

  const handleBaixar = () => {
    if (!podeBaixar || !nivel || !user?.academia) return;

    const materiaSelecionada = materiasCompativeis.find((m: any) => m.id === materiaId);
    const categoriaSelecionada = categoriasCompativeis.find((c: any) => c.value === categoria);

    const contexto: ContextoModeloNotas = {
      codigoAcademia: user.academia.codigo_academia,
      nomeAcademia: user.academia.nome,
      nivel: nivel as ContextoModeloNotas['nivel'],
      cursoId: precisaCurso ? cursoId : undefined,
      cursoNome: cursoSelecionado?.nome,
      anoAcademico,
      anoAcademicoLabel: anosDisponiveis.find((a) => a.value === anoAcademico)?.label || getAnoLabel(anoAcademico),
      codigoTurma,
      turmaLabel: turmaSelecionada ? `${turmaSelecionada.codigo_turma} · ${turmaSelecionada.turno}` : codigoTurma,
      periodo,
      periodoLabel: periodos.find((p) => p.value === periodo)?.label || periodo,
      materiaId,
      materiaNome: materiaSelecionada?.nome || materiaId,
      categoria,
      categoriaNome: categoriaSelecionada?.label || categoria,
      tipoNota: isSuperior ? 'superior' : 'escolar',
      versaoModelo: '1',
    };

    gerarModeloExcelNotas(contexto, estudantes.map((e) => ({ nome: e.nome, codigo_estudante: e.codigo_estudante })));
    onModeloGerado(contexto);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:file-excel-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">1. Descarregar o modelo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Escolha o nível, curso e ano acadêmico até chegar à turma. Em seguida, escolha o período, a matéria e a
            categoria da nota — o modelo já vem preparado com os estudantes dessa turma, ordenados pelo nome.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {niveisDisponiveis.length > 1 && (
          <div>
            <Label>Nível de ensino</Label>
            <SearchableSelect
              value={nivel}
              options={niveisDisponiveis.map((n) => ({ value: n, label: labelNivel(n) }))}
              onChange={(v) => setNivel((v as NivelBulk) || '')}
              placeholder="Selecione o nível"
              isClearable={false}
            />
          </div>
        )}

        {precisaCurso && nivel && (
          <div>
            <Label>Curso *</Label>
            <SearchableSelect
              value={cursoId}
              options={cursosDoNivel.map((c) => ({ value: c.id, label: c.nome }))}
              onChange={(v) => setCursoId(v || '')}
              placeholder={cursosDoNivel.length ? 'Selecione o curso' : 'Nenhum curso ativo encontrado'}
              isClearable={false}
              isDisabled={cursosDoNivel.length === 0}
            />
          </div>
        )}

        {nivel && (!precisaCurso || cursoId) && (
          <div>
            <Label>Ano Acadêmico *</Label>
            <SearchableSelect
              value={anoAcademico}
              options={anosDisponiveis}
              onChange={(v) => setAnoAcademico(v || '')}
              placeholder={anosDisponiveis.length ? 'Selecione o ano' : 'Nenhum ano disponível'}
              isClearable={false}
              isDisabled={anosDisponiveis.length === 0}
            />
          </div>
        )}

        {anoAcademico && (
          <div>
            <Label>Turma *</Label>
            <SearchableSelect
              value={codigoTurma}
              options={turmasCompativeis.map((t) => ({ value: t.codigo_turma, label: `Turma ${t.codigo_turma} · ${t.turno}` }))}
              onChange={(v) => setCodigoTurma(v || '')}
              placeholder={turmasCompativeis.length ? 'Selecione a turma' : 'Nenhuma turma ativa compatível'}
              isClearable={false}
              isDisabled={turmasCompativeis.length === 0}
            />
            {codigoTurma && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {loadingEstudantes ? 'A carregar...' : `${estudantes.length} estudante(s) nesta turma`}
              </p>
            )}
            {codigoTurma && !loadingEstudantes && estudantes.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Esta turma não tem estudantes ativos. Adicione estudantes à turma antes de lançar notas.
              </p>
            )}
          </div>
        )}

        {codigoTurma && (
          <div>
            <Label>Período *</Label>
            <SearchableSelect
              value={periodo}
              options={periodos}
              onChange={(v) => setPeriodo(v || '')}
              placeholder="Selecione o período"
              isClearable={false}
            />
          </div>
        )}

        {periodo && (
          <div>
            <Label>Matéria *</Label>
            <SearchableSelect
              value={materiaId}
              options={materiasCompativeis.map((m: any) => ({ value: m.id, label: m.nome }))}
              onChange={(v) => setMateriaId(v || '')}
              placeholder={materiasCompativeis.length ? 'Selecione a matéria' : 'Nenhuma matéria compatível'}
              isClearable={false}
              isDisabled={materiasCompativeis.length === 0}
            />
          </div>
        )}

        {periodo && (
          <div>
            <Label>Categoria *</Label>
            <SearchableSelect
              value={categoria}
              options={categoriasCompativeis}
              onChange={(v) => setCategoria(v || '')}
              placeholder={categoriasCompativeis.length ? 'Selecione a categoria' : 'Nenhuma categoria compatível'}
              isClearable={false}
              isDisabled={categoriasCompativeis.length === 0}
            />
          </div>
        )}
      </div>

      <div className="mt-5">
        <Button size="sm" onClick={handleBaixar} disabled={!podeBaixar} startIcon={<Icon icon="mdi:download" width={16} />}>
          Baixar Modelo de Excel
        </Button>
      </div>
    </div>
  );
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx` por:**

```tsx
// src/app/(painel)/faltas/lancar/SelecaoContextoFaltas.tsx
"use client";
import { useEffect, useMemo, useState } from 'react';
import { academiaService, consultasService, tokenStorage } from '@/lib/api';
import { useUserCookie } from '@/hooks/useUserCookie';
import SearchableSelect from '@/components/form/SearchableSelect';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { Curso, Turma, EstudanteDetalhado } from '@/types/api';
import {
  ANOS_FUNDAMENTAL_LIST,
  isAnoMedioValue,
  isAnoSuperiorValue,
  isAnoFundamental,
  anoOrder,
  getAnoLabel,
  labelNivel,
  type NivelBulk,
} from '../../estudantes/cadastrar/massaHelpers';
import { gerarModeloExcelFaltas } from './faltasTemplate';
import type { ContextoModeloFaltas } from './faltasTypes';

const PERIODOS_ESCOLA = [
  { label: '1º Trimestre', value: '1_trimestre' },
  { label: '2º Trimestre', value: '2_trimestre' },
  { label: '3º Trimestre', value: '3_trimestre' },
];
const PERIODOS_SUPERIOR = [
  { label: '1º Semestre', value: '1_semestre' },
  { label: '2º Semestre', value: '2_semestre' },
];

interface SelecaoContextoFaltasProps {
  onModeloGerado: (contexto: ContextoModeloFaltas) => void;
}

export default function SelecaoContextoFaltas({ onModeloGerado }: SelecaoContextoFaltasProps) {
  const { user } = useUserCookie();
  const token = tokenStorage.get() || undefined;

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [estudantes, setEstudantes] = useState<EstudanteDetalhado[]>([]);
  const [loadingEstudantes, setLoadingEstudantes] = useState(false);

  const isSuperior = user?.academia?.nivel === 'superior';
  const nivelEscolar = user?.academia?.nivel_escolar ?? 'fundamental';
  const niveisDisponiveis = useMemo<NivelBulk[]>(() => {
    if (isSuperior) return ['superior'];
    if (nivelEscolar === 'misto') return ['fundamental', 'medio'];
    if (nivelEscolar === 'medio') return ['medio'];
    return ['fundamental'];
  }, [isSuperior, nivelEscolar]);

  const [nivel, setNivel] = useState<NivelBulk | ''>('');
  const [cursoId, setCursoId] = useState('');
  const [anoAcademico, setAnoAcademico] = useState('');
  const [codigoTurma, setCodigoTurma] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [materiaId, setMateriaId] = useState('');

  useEffect(() => {
    academiaService.listarTurmas(token).then((r: any) => setTurmas((r?.turmas ?? []).filter((t: Turma) => t.status === 'ativo')));
    academiaService.listarMaterias(token).then((r: any) => setMaterias((r?.materias ?? []).filter((m: any) => m.status === 'ativo')));
     
  }, [token]);

  useEffect(() => {
    if (niveisDisponiveis.length === 1 && nivel !== niveisDisponiveis[0]) {
      setNivel(niveisDisponiveis[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveisDisponiveis]);

  useEffect(() => {
    if (nivel === 'medio' || nivel === 'superior') {
      academiaService.listarCursos(token).then((r: any) => setCursos((r?.cursos ?? []).filter((c: Curso) => c.status === 'ativo')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  useEffect(() => {
    setCursoId('');
    setAnoAcademico('');
    setCodigoTurma('');
    setPeriodo('');
    setMateriaId('');
     
  }, [nivel]);

  useEffect(() => {
    setAnoAcademico('');
    setCodigoTurma('');
  }, [cursoId]);

  useEffect(() => {
    setCodigoTurma('');
  }, [anoAcademico]);

  useEffect(() => {
    // A matéria depende do período e também da turma (curso da turma pode
    // mudar a compatibilidade de matérias), por isso é limpa sempre que a
    // turma ou o período mudam.
    setMateriaId('');
  }, [codigoTurma, periodo]);

  useEffect(() => {
    if (!codigoTurma) {
      setEstudantes([]);
      return;
    }
    setLoadingEstudantes(true);
    consultasService
      .listarEstudantes({ token, codigo_turma: codigoTurma } as any)
      .then((r: any) => setEstudantes(r?.estudantes ?? []))
      .finally(() => setLoadingEstudantes(false));
  }, [codigoTurma, token]);

  const cursosDoNivel = cursos.filter((c) => c.type === nivel);
  const precisaCurso = nivel === 'medio' || nivel === 'superior';
  const cursoSelecionado = cursosDoNivel.find((c) => c.id === cursoId);

  const anosDisponiveis = useMemo(() => {
    if (nivel === 'fundamental') {
      const ativos = (user?.academia?.anos_academicos ?? []).filter(isAnoFundamental);
      return ativos.length ? ANOS_FUNDAMENTAL_LIST.filter((a) => ativos.includes(a.value)) : ANOS_FUNDAMENTAL_LIST;
    }
    if (cursoSelecionado && nivel === 'medio') {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoMedioValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    if (cursoSelecionado && nivel === 'superior') {
      return (cursoSelecionado.anos_academicos as string[])
        .filter(isAnoSuperiorValue)
        .sort((a, b) => anoOrder(a) - anoOrder(b))
        .map((v) => ({ value: v, label: getAnoLabel(v) }));
    }
    return [];
     
  }, [nivel, cursoSelecionado, user?.academia?.anos_academicos]);

  const turmasCompativeis = turmas.filter((t) => t.nivel === anoAcademico && (!precisaCurso || t.curso_id === cursoId));
  const turmaSelecionada = turmasCompativeis.find((t) => t.codigo_turma === codigoTurma);
  const periodos = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  const materiasCompativeis = materias.filter(
    (m: any) =>
      (m.anos_academicos ?? []).includes(anoAcademico) &&
      (!turmaSelecionada?.curso_id || !m.curso_id || m.curso_id === turmaSelecionada.curso_id) &&
      (!isSuperior || !m.periodo || m.periodo === periodo)
  );

  const podeBaixar =
    !!nivel && (!precisaCurso || !!cursoId) && !!anoAcademico && !!codigoTurma && !!periodo && !!materiaId && estudantes.length > 0;

  const handleBaixar = () => {
    if (!podeBaixar || !nivel || !user?.academia) return;

    const materiaSelecionada = materiasCompativeis.find((m: any) => m.id === materiaId);

    const contexto: ContextoModeloFaltas = {
      codigoAcademia: user.academia.codigo_academia,
      nomeAcademia: user.academia.nome,
      nivel: nivel as ContextoModeloFaltas['nivel'],
      cursoId: precisaCurso ? cursoId : undefined,
      cursoNome: cursoSelecionado?.nome,
      anoAcademico,
      anoAcademicoLabel: anosDisponiveis.find((a) => a.value === anoAcademico)?.label || getAnoLabel(anoAcademico),
      codigoTurma,
      turmaLabel: turmaSelecionada ? `${turmaSelecionada.codigo_turma} · ${turmaSelecionada.turno}` : codigoTurma,
      periodo,
      periodoLabel: periodos.find((p) => p.value === periodo)?.label || periodo,
      materiaId,
      materiaNome: materiaSelecionada?.nome || materiaId,
      versaoModelo: '1',
    };

    gerarModeloExcelFaltas(contexto, estudantes.map((e) => ({ nome: e.nome, codigo_estudante: e.codigo_estudante })));
    onModeloGerado(contexto);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:file-excel-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">1. Descarregar o modelo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Escolha o nível, curso e ano acadêmico até chegar à turma. Em seguida, escolha o período e a matéria — o
            modelo já vem preparado com os estudantes dessa turma, ordenados pelo nome.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {niveisDisponiveis.length > 1 && (
          <div>
            <Label>Nível de ensino</Label>
            <SearchableSelect
              value={nivel}
              options={niveisDisponiveis.map((n) => ({ value: n, label: labelNivel(n) }))}
              onChange={(v) => setNivel((v as NivelBulk) || '')}
              placeholder="Selecione o nível"
              isClearable={false}
            />
          </div>
        )}

        {precisaCurso && nivel && (
          <div>
            <Label>Curso *</Label>
            <SearchableSelect
              value={cursoId}
              options={cursosDoNivel.map((c) => ({ value: c.id, label: c.nome }))}
              onChange={(v) => setCursoId(v || '')}
              placeholder={cursosDoNivel.length ? 'Selecione o curso' : 'Nenhum curso ativo encontrado'}
              isClearable={false}
              isDisabled={cursosDoNivel.length === 0}
            />
          </div>
        )}

        {nivel && (!precisaCurso || cursoId) && (
          <div>
            <Label>Ano Acadêmico *</Label>
            <SearchableSelect
              value={anoAcademico}
              options={anosDisponiveis}
              onChange={(v) => setAnoAcademico(v || '')}
              placeholder={anosDisponiveis.length ? 'Selecione o ano' : 'Nenhum ano disponível'}
              isClearable={false}
              isDisabled={anosDisponiveis.length === 0}
            />
          </div>
        )}

        {anoAcademico && (
          <div>
            <Label>Turma *</Label>
            <SearchableSelect
              value={codigoTurma}
              options={turmasCompativeis.map((t) => ({ value: t.codigo_turma, label: `Turma ${t.codigo_turma} · ${t.turno}` }))}
              onChange={(v) => setCodigoTurma(v || '')}
              placeholder={turmasCompativeis.length ? 'Selecione a turma' : 'Nenhuma turma ativa compatível'}
              isClearable={false}
              isDisabled={turmasCompativeis.length === 0}
            />
            {codigoTurma && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {loadingEstudantes ? 'A carregar...' : `${estudantes.length} estudante(s) nesta turma`}
              </p>
            )}
            {codigoTurma && !loadingEstudantes && estudantes.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Esta turma não tem estudantes ativos. Adicione estudantes à turma antes de lançar faltas.
              </p>
            )}
          </div>
        )}

        {codigoTurma && (
          <div>
            <Label>Período *</Label>
            <SearchableSelect
              value={periodo}
              options={periodos}
              onChange={(v) => setPeriodo(v || '')}
              placeholder="Selecione o período"
              isClearable={false}
            />
          </div>
        )}

        {periodo && (
          <div>
            <Label>Matéria *</Label>
            <SearchableSelect
              value={materiaId}
              options={materiasCompativeis.map((m: any) => ({ value: m.id, label: m.nome }))}
              onChange={(v) => setMateriaId(v || '')}
              placeholder={materiasCompativeis.length ? 'Selecione a matéria' : 'Nenhuma matéria compatível'}
              isClearable={false}
              isDisabled={materiasCompativeis.length === 0}
            />
          </div>
        )}
      </div>

      <div className="mt-5">
        <Button size="sm" onClick={handleBaixar} disabled={!podeBaixar} startIcon={<Icon icon="mdi:download" width={16} />}>
          Baixar Modelo de Excel
        </Button>
      </div>
    </div>
  );
}
```


---

## 7. Correção 5 (Alta, paleta/dark-mode) — `RelatorioValidacaoNotas.tsx` e `RelatorioValidacaoFaltas.tsx`

Além da falta de `dark:`/badge/tipografia (mesmo padrão da Correção anterior), estes arquivos **não tinham o botão "baixar planilha apenas com as linhas com erro"**, exigido pela tarefa original (Seção 8.11) — agora conectado às funções reais da Correção 2.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/RelatorioValidacaoNotas.tsx` por:**

```tsx
// src/app/(painel)/notas/lancar/RelatorioValidacaoNotas.tsx
"use client";
import { useMemo } from 'react';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { ResultadoAnaliseNotas, ErroValidacao } from './notasTypes';
import { baixarLinhasComErroNotas } from './notasErrorExport';

export const LIMITE_NOTAS_POR_LOTE = 2000;

interface RelatorioValidacaoNotasProps {
  resultado: ResultadoAnaliseNotas;
  nomeArquivo: string;
  enviando: boolean;
  erroEnvio?: string;
  onConfirmar: () => void;
  onNovoUpload: () => void;
}

export default function RelatorioValidacaoNotas({
  resultado,
  nomeArquivo,
  enviando,
  erroEnvio,
  onConfirmar,
  onNovoUpload,
}: RelatorioValidacaoNotasProps) {
  const { contexto, linhas, erros, totalLinhas, totalLinhasIgnoradas } = resultado;

  const errosGerais = useMemo(() => erros.filter((e) => e.linha === 0), [erros]);
  const errosPorLinhaLista = useMemo(() => erros.filter((e) => e.linha > 0), [erros]);
  const errosAgrupados = useMemo(() => {
    const mapa: Record<number, ErroValidacao[]> = {};
    errosPorLinhaLista.forEach((e) => {
      (mapa[e.linha] ||= []).push(e);
    });
    return mapa;
  }, [errosPorLinhaLista]);

  const linhasComErroCount = Object.keys(errosAgrupados).length;
  const tudoValido = !!contexto && totalLinhas > 0 && erros.length === 0;
  const totalLotes = Math.max(1, Math.ceil(totalLinhas / LIMITE_NOTAS_POR_LOTE));

  if (!contexto) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">
          {erros[0]?.mensagem || 'Não foi possível identificar este ficheiro como um modelo do Spuri.'}
        </p>
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onNovoUpload}>
            Enviar outro ficheiro
          </Button>
        </div>
      </div>
    );
  }

  if (totalLinhas === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Nenhuma nota foi preenchida nesta planilha. Preencha a coluna &quot;Valor da Nota&quot; para pelo menos um
          estudante e envie novamente.
        </p>
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onNovoUpload}>
            Enviar outro ficheiro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:clipboard-check-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">3. Revisão e confirmação</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {contexto.anoAcademicoLabel} — Turma {contexto.turmaLabel ?? contexto.codigoTurma} — {contexto.periodoLabel} —{' '}
            {contexto.materiaNome} — {contexto.categoriaNome}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{nomeArquivo}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-white/5 dark:text-gray-300">
          {totalLinhas} nota(s) preenchida(s) na planilha
        </span>
        {totalLinhasIgnoradas > 0 && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            {totalLinhasIgnoradas} estudante(s) sem nota serão ignorados
          </span>
        )}
        {erros.length === 0 ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Todos validados
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {erros.length} erro(s) encontrado(s)
          </span>
        )}
      </div>

      {errosGerais.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 mb-4 space-y-1.5">
          {errosGerais.map((e, i) => (
            <p key={i}>{e.mensagem}</p>
          ))}
        </div>
      )}

      {linhasComErroCount > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 overflow-hidden mb-4">
          <div className="bg-red-50 dark:bg-red-900/10 px-4 py-2.5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Corrija os erros abaixo e envie novamente</p>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30">
            {Object.entries(errosAgrupados).map(([linha, listaErros]) => (
              <div key={linha} className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Linha {linha} da planilha</p>
                <ul className="space-y-1">
                  {listaErros.map((e, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">
                        Coluna {e.coluna} — {e.campo}:
                      </span>{' '}
                      {e.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-transparent px-4 py-3 border-t border-red-100 dark:border-red-900/30 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => baixarLinhasComErroNotas(contexto, linhas, errosPorLinhaLista, nomeArquivo)}
            >
              Baixar planilha apenas com as notas com erros
            </Button>
            <Button size="sm" variant="outline" onClick={onNovoUpload}>
              Enviar outro ficheiro
            </Button>
          </div>
        </div>
      )}

      {tudoValido && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 mb-4">
          Todos os dados foram validados com sucesso.{' '}
          {totalLotes > 1
            ? `Como são ${totalLinhas} notas, o sistema vai enviar automaticamente em ${totalLotes} grupos de até ${LIMITE_NOTAS_POR_LOTE} notas cada.`
            : 'Confirme abaixo para iniciar o lançamento.'}{' '}
          A integração destas notas na base de dados pode demorar alguns minutos — não é preciso permanecer nesta tela à espera.
        </div>
      )}

      {erroEnvio && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 mb-4">
          {erroEnvio}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="sm" variant="outline" onClick={onNovoUpload} disabled={enviando}>
          Enviar outro ficheiro
        </Button>
        <Button size="sm" onClick={onConfirmar} disabled={!tudoValido || enviando}>
          {enviando
            ? 'Enviando...'
            : totalLotes > 1
            ? `Confirmar lançamento de ${totalLinhas} nota(s) em ${totalLotes} grupos`
            : `Confirmar lançamento de ${totalLinhas} nota(s)`}
        </Button>
      </div>
    </div>
  );
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/RelatorioValidacaoFaltas.tsx` por:**

```tsx
// src/app/(painel)/faltas/lancar/RelatorioValidacaoFaltas.tsx
"use client";
import { useMemo } from 'react';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { ResultadoAnaliseFaltas, ErroValidacao } from './faltasTypes';
import { baixarLinhasComErroFaltas } from './faltasErrorExport';

export const LIMITE_FALTAS_POR_LOTE = 2000;

interface RelatorioValidacaoFaltasProps {
  resultado: ResultadoAnaliseFaltas;
  nomeArquivo: string;
  enviando: boolean;
  erroEnvio?: string;
  onConfirmar: () => void;
  onNovoUpload: () => void;
}

export default function RelatorioValidacaoFaltas({
  resultado,
  nomeArquivo,
  enviando,
  erroEnvio,
  onConfirmar,
  onNovoUpload,
}: RelatorioValidacaoFaltasProps) {
  const { contexto, linhas, erros, totalLinhas, totalLinhasIgnoradas } = resultado;

  const errosGerais = useMemo(() => erros.filter((e) => e.linha === 0), [erros]);
  const errosPorLinhaLista = useMemo(() => erros.filter((e) => e.linha > 0), [erros]);
  const errosAgrupados = useMemo(() => {
    const mapa: Record<number, ErroValidacao[]> = {};
    errosPorLinhaLista.forEach((e) => {
      (mapa[e.linha] ||= []).push(e);
    });
    return mapa;
  }, [errosPorLinhaLista]);

  const linhasComErroCount = Object.keys(errosAgrupados).length;
  const tudoValido = !!contexto && totalLinhas > 0 && erros.length === 0;
  const totalLotes = Math.max(1, Math.ceil(totalLinhas / LIMITE_FALTAS_POR_LOTE));

  if (!contexto) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">
          {erros[0]?.mensagem || 'Não foi possível identificar este ficheiro como um modelo do Spuri.'}
        </p>
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onNovoUpload}>
            Enviar outro ficheiro
          </Button>
        </div>
      </div>
    );
  }

  if (totalLinhas === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Nenhuma falta foi preenchida nesta planilha. Preencha a &quot;Data da Falta&quot; e a &quot;Quantidade&quot; para
          pelo menos um estudante e envie novamente.
        </p>
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onNovoUpload}>
            Enviar outro ficheiro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:clipboard-check-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">3. Revisão e confirmação</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {contexto.anoAcademicoLabel} — Turma {contexto.turmaLabel ?? contexto.codigoTurma} — {contexto.periodoLabel} —{' '}
            {contexto.materiaNome}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{nomeArquivo}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-white/5 dark:text-gray-300">
          {totalLinhas} falta(s) preenchida(s) na planilha
        </span>
        {totalLinhasIgnoradas > 0 && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            {totalLinhasIgnoradas} estudante(s) sem falta serão ignorados
          </span>
        )}
        {erros.length === 0 ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Todos validados
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {erros.length} erro(s) encontrado(s)
          </span>
        )}
      </div>

      {errosGerais.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 mb-4 space-y-1.5">
          {errosGerais.map((e, i) => (
            <p key={i}>{e.mensagem}</p>
          ))}
        </div>
      )}

      {linhasComErroCount > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 overflow-hidden mb-4">
          <div className="bg-red-50 dark:bg-red-900/10 px-4 py-2.5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Corrija os erros abaixo e envie novamente</p>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30">
            {Object.entries(errosAgrupados).map(([linha, listaErros]) => (
              <div key={linha} className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Linha {linha} da planilha</p>
                <ul className="space-y-1">
                  {listaErros.map((e, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">
                        Coluna {e.coluna} — {e.campo}:
                      </span>{' '}
                      {e.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-transparent px-4 py-3 border-t border-red-100 dark:border-red-900/30 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => baixarLinhasComErroFaltas(contexto, linhas, errosPorLinhaLista, nomeArquivo)}
            >
              Baixar planilha apenas com as faltas com erros
            </Button>
            <Button size="sm" variant="outline" onClick={onNovoUpload}>
              Enviar outro ficheiro
            </Button>
          </div>
        </div>
      )}

      {tudoValido && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 mb-4">
          Todos os dados foram validados com sucesso.{' '}
          {totalLotes > 1
            ? `Como são ${totalLinhas} faltas, o sistema vai enviar automaticamente em ${totalLotes} grupos de até ${LIMITE_FALTAS_POR_LOTE} faltas cada.`
            : 'Confirme abaixo para iniciar o lançamento.'}{' '}
          A integração destas faltas na base de dados pode demorar alguns minutos — não é preciso permanecer nesta tela à espera.
        </div>
      )}

      {erroEnvio && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 mb-4">
          {erroEnvio}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="sm" variant="outline" onClick={onNovoUpload} disabled={enviando}>
          Enviar outro ficheiro
        </Button>
        <Button size="sm" onClick={onConfirmar} disabled={!tudoValido || enviando}>
          {enviando
            ? 'Enviando...'
            : totalLotes > 1
            ? `Confirmar lançamento de ${totalLinhas} falta(s) em ${totalLotes} grupos`
            : `Confirmar lançamento de ${totalLinhas} falta(s)`}
        </Button>
      </div>
    </div>
  );
}
```


---

## 8. Correção 5 (Alta, paleta/dark-mode) — `UploadPlanilhaNotas.tsx` e `UploadPlanilhaFaltas.tsx`

Mesmo padrão de correção de paleta/dark-mode/badge do restante — comportamento funcional (upload, dupla leitura para validar contra a turma atual) mantido sem alterações.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/UploadPlanilhaNotas.tsx` por:**

```tsx
// src/app/(painel)/notas/lancar/UploadPlanilhaNotas.tsx
"use client";
import { useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { useUserCookie } from '@/hooks/useUserCookie';
import { academiaService, consultasService, tokenStorage } from '@/lib/api';
import type { ResultadoAnaliseNotas } from './notasTypes';
import { analisarPlanilhaNotas } from './notasParser';

interface UploadPlanilhaNotasProps {
  onResultado: (resultado: ResultadoAnaliseNotas, nomeArquivo: string) => void;
}

export default function UploadPlanilhaNotas({ onResultado }: UploadPlanilhaNotasProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useUserCookie();
  const [analisando, setAnalisando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erroLeitura, setErroLeitura] = useState('');

  const handleFile = async (file: File) => {
    setErroLeitura('');
    setAnalisando(true);
    setNomeArquivo(file.name);
    const token = tokenStorage.get() || undefined;
    try {
      // 1ª leitura: só para descobrir o codigo_turma do _meta do modelo.
      const turmasResp = (await academiaService.listarTurmas(token)) as any;
      const turmasAtivas = (turmasResp?.turmas ?? []).filter((t: any) => t.status === 'ativo');
      const analisePrelim = await analisarPlanilhaNotas(file, user?.academia?.codigo_academia, turmasAtivas, []);

      // 2ª leitura: agora com a lista atual de estudantes da turma, para
      // validar se os códigos da planilha ainda pertencem à turma.
      let estudantesAtuais: any[] = [];
      if (analisePrelim.contexto) {
        const estResp = (await consultasService.listarEstudantes({
          token,
          codigo_turma: analisePrelim.contexto.codigoTurma,
        } as any)) as any;
        estudantesAtuais = estResp?.estudantes ?? [];
      }

      const analise = await analisarPlanilhaNotas(file, user?.academia?.codigo_academia, turmasAtivas, estudantesAtuais);
      onResultado(analise, file.name);
    } catch (err: any) {
      setErroLeitura(
        err?.message || 'Não foi possível ler este ficheiro. Confirme que é um Excel (.xlsx) exportado pelo Spuri.'
      );
    } finally {
      setAnalisando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:cloud-upload-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">2. Enviar a planilha preenchida</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Envie o modelo já preenchido. Todos os dados são validados antes de qualquer lançamento.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={analisando}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-6 text-center transition hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10"
      >
        {analisando ? (
          <span className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            A validar planilha...
          </span>
        ) : (
          <span className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
            <Icon icon="mdi:file-excel-outline" width={32} className="text-green-600" />
            <span className="font-medium">Toque para escolher o ficheiro Excel (.xlsx)</span>
            <span className="text-xs text-gray-400">{nomeArquivo || 'Nenhum ficheiro selecionado ainda'}</span>
          </span>
        )}
      </button>

      {erroLeitura && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {erroLeitura}
        </div>
      )}
    </div>
  );
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/UploadPlanilhaFaltas.tsx` por:**

```tsx
// src/app/(painel)/faltas/lancar/UploadPlanilhaFaltas.tsx
"use client";
import { useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { useUserCookie } from '@/hooks/useUserCookie';
import { academiaService, consultasService, tokenStorage } from '@/lib/api';
import type { ResultadoAnaliseFaltas } from './faltasTypes';
import { analisarPlanilhaFaltas } from './faltasParser';

interface UploadPlanilhaFaltasProps {
  onResultado: (resultado: ResultadoAnaliseFaltas, nomeArquivo: string) => void;
}

export default function UploadPlanilhaFaltas({ onResultado }: UploadPlanilhaFaltasProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useUserCookie();
  const [analisando, setAnalisando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erroLeitura, setErroLeitura] = useState('');

  const handleFile = async (file: File) => {
    setErroLeitura('');
    setAnalisando(true);
    setNomeArquivo(file.name);
    const token = tokenStorage.get() || undefined;
    try {
      // 1ª leitura: só para descobrir o codigo_turma do _meta do modelo.
      const turmasResp = (await academiaService.listarTurmas(token)) as any;
      const turmasAtivas = (turmasResp?.turmas ?? []).filter((t: any) => t.status === 'ativo');
      const analisePrelim = await analisarPlanilhaFaltas(file, user?.academia?.codigo_academia, turmasAtivas, []);

      // 2ª leitura: agora com a lista atual de estudantes da turma, para
      // validar se os códigos da planilha ainda pertencem à turma.
      let estudantesAtuais: any[] = [];
      if (analisePrelim.contexto) {
        const estResp = (await consultasService.listarEstudantes({
          token,
          codigo_turma: analisePrelim.contexto.codigoTurma,
        } as any)) as any;
        estudantesAtuais = estResp?.estudantes ?? [];
      }

      const analise = await analisarPlanilhaFaltas(file, user?.academia?.codigo_academia, turmasAtivas, estudantesAtuais);
      onResultado(analise, file.name);
    } catch (err: any) {
      setErroLeitura(
        err?.message || 'Não foi possível ler este ficheiro. Confirme que é um Excel (.xlsx) exportado pelo Spuri.'
      );
    } finally {
      setAnalisando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon icon="mdi:cloud-upload-outline" width={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">2. Enviar a planilha preenchida</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Envie o modelo já preenchido. Todos os dados são validados antes de qualquer lançamento.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={analisando}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-6 text-center transition hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10"
      >
        {analisando ? (
          <span className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            A validar planilha...
          </span>
        ) : (
          <span className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
            <Icon icon="mdi:file-excel-outline" width={32} className="text-green-600" />
            <span className="font-medium">Toque para escolher o ficheiro Excel (.xlsx)</span>
            <span className="text-xs text-gray-400">{nomeArquivo || 'Nenhum ficheiro selecionado ainda'}</span>
          </span>
        )}
      </button>

      {erroLeitura && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {erroLeitura}
        </div>
      )}
    </div>
  );
}
```


---

## 9. Ajuste de integração — `LancamentoNotasForm.tsx` e `LancamentoFaltasForm.tsx`

Precisaram ser atualizados para (a) construir o mapa `nomesPorCodigo` (código do estudante → nome, extraído das próprias linhas da planilha enviada) e repassá-lo à nova tela de progresso da Correção 1, e (b) reformatar para o estilo padrão do projeto (estavam minificados). O comportamento de negócio (verificação de job em andamento, envio em lotes, rascunho) não mudou.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/LancamentoNotasForm.tsx` por:**

```tsx
// src/app/(painel)/notas/lancar/LancamentoNotasForm.tsx
"use client";
import { useCallback, useEffect, useState } from 'react';
import { jobApiService, tokenStorage } from '@/lib/api';
import SelecaoContextoNotas from './SelecaoContextoNotas';
import UploadPlanilhaNotas from './UploadPlanilhaNotas';
import RelatorioValidacaoNotas, { LIMITE_NOTAS_POR_LOTE } from './RelatorioValidacaoNotas';
import BatchProgressScreenNotas from './BatchProgressScreenNotas';
import type { ContextoModeloNotas, ResultadoAnaliseNotas } from './notasTypes';
import { construirPayloadNota } from './notasPayload';
import { registrarNotasBatch } from './notasApi';
import { lerRascunhoNotas, salvarRascunhoNotas } from './notasDraft';
import { dividirEmLotes } from '../../estudantes/cadastrar/massaHelpers';

type Fase =
  | { tipo: 'verificando' }
  | { tipo: 'progresso'; jobIds: string[]; contexto: ContextoModeloNotas | null; avisoSubmissao?: string | null; nomesPorCodigo: Record<string, string> }
  | { tipo: 'normal' };

export default function LancamentoNotasForm() {
  const [fase, setFase] = useState<Fase>({ tipo: 'verificando' });
  const [contextoBaixado, setContextoBaixado] = useState<ContextoModeloNotas | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnaliseNotas | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Ao montar, verifica se já existe um lançamento de notas em massa em
  // andamento para esta academia (pode haver mais de um job, quando um envio
  // anterior foi dividido em vários lotes).
  useEffect(() => {
    let ativo = true;
    (async () => {
      const token = tokenStorage.get();
      if (!token) {
        if (ativo) setFase({ tipo: 'normal' });
        return;
      }
      try {
        const { jobs } = await jobApiService.list(token);
        const jobsAtivos = (jobs || []).filter(
          (j) => j.type === 'registrar_nota_batch' && (j.status === 'pending' || j.status === 'processing')
        );
        if (ativo) {
          const rascunho = lerRascunhoNotas();
          setFase(
            jobsAtivos.length > 0
              ? {
                  tipo: 'progresso',
                  jobIds: jobsAtivos.map((j) => j.id),
                  contexto: rascunho?.contexto ?? null,
                  nomesPorCodigo: {},
                }
              : { tipo: 'normal' }
          );
        }
      } catch {
        if (ativo) setFase({ tipo: 'normal' });
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const reiniciar = useCallback(() => {
    setContextoBaixado(null);
    setResultado(null);
    setNomeArquivo('');
    setErroEnvio('');
    setFase({ tipo: 'normal' });
  }, []);

  const handleConfirmar = async () => {
    if (!resultado?.contexto) return;
    setEnviando(true);
    setErroEnvio('');

    const contexto = resultado.contexto;
    const payloadCompleto = resultado.linhas.map((linha) => construirPayloadNota(linha, contexto));
    const nomesPorCodigo: Record<string, string> = {};
    resultado.linhas.forEach((linha) => {
      if (linha.codigoEstudante) nomesPorCodigo[linha.codigoEstudante.trim().toLowerCase()] = linha.nome;
    });
    const lotes = dividirEmLotes(payloadCompleto, LIMITE_NOTAS_POR_LOTE);

    const jobIds: string[] = [];
    let itensEnviados = 0;
    let avisoSubmissao: string | null = null;

    salvarRascunhoNotas({ contexto, nomeArquivo, jobIds, itensPendentes: payloadCompleto });

    // Envia lote a lote — se um lote falhar ao ser submetido, os lotes já
    // enviados continuam normalmente e a academia é avisada sobre o restante.
    for (let i = 0; i < lotes.length; i++) {
      try {
        const resposta = await registrarNotasBatch(lotes[i], tokenStorage.get() || undefined);
        jobIds.push(resposta.job_id);
        itensEnviados += lotes[i].length;
        salvarRascunhoNotas({ contexto, nomeArquivo, jobIds, itensPendentes: payloadCompleto });
      } catch (err: any) {
        avisoSubmissao = `Foram enviadas ${itensEnviados} de ${payloadCompleto.length} nota(s) com sucesso. Não foi possível enviar as demais: ${
          err?.message || 'erro desconhecido'
        }. Quando o lançamento em andamento terminar, pode tentar novamente — as notas já lançadas não serão repetidas.`;
        break;
      }
    }

    setEnviando(false);

    if (jobIds.length > 0) {
      setFase({ tipo: 'progresso', jobIds, contexto, avisoSubmissao, nomesPorCodigo });
    } else {
      setErroEnvio(avisoSubmissao || 'Não foi possível iniciar o lançamento de notas. Tente novamente.');
    }
  };

  if (fase.tipo === 'verificando') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A verificar se já existe um lançamento de notas em andamento...
          </p>
        </div>
      </div>
    );
  }

  if (fase.tipo === 'progresso') {
    return (
      <BatchProgressScreenNotas
        jobIds={fase.jobIds}
        contexto={fase.contexto}
        avisoSubmissao={fase.avisoSubmissao}
        nomesPorCodigo={fase.nomesPorCodigo}
        onConcluido={reiniciar}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SelecaoContextoNotas onModeloGerado={setContextoBaixado} />

      {contextoBaixado && !resultado && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          Modelo baixado para{' '}
          <strong>
            Turma {contextoBaixado.turmaLabel ?? contextoBaixado.codigoTurma} — {contextoBaixado.periodoLabel} —{' '}
            {contextoBaixado.materiaNome} — {contextoBaixado.categoriaNome}
          </strong>
          . Preencha e envie o ficheiro logo abaixo.
        </div>
      )}

      <UploadPlanilhaNotas
        onResultado={(analise, nome) => {
          setResultado(analise);
          setNomeArquivo(nome);
          setErroEnvio('');
        }}
      />

      {resultado && (
        <RelatorioValidacaoNotas
          resultado={resultado}
          nomeArquivo={nomeArquivo}
          enviando={enviando}
          erroEnvio={erroEnvio}
          onConfirmar={handleConfirmar}
          onNovoUpload={() => {
            setResultado(null);
            setNomeArquivo('');
            setErroEnvio('');
          }}
        />
      )}
    </div>
  );
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx` por:**

```tsx
// src/app/(painel)/faltas/lancar/LancamentoFaltasForm.tsx
"use client";
import { useCallback, useEffect, useState } from 'react';
import { jobApiService, tokenStorage } from '@/lib/api';
import SelecaoContextoFaltas from './SelecaoContextoFaltas';
import UploadPlanilhaFaltas from './UploadPlanilhaFaltas';
import RelatorioValidacaoFaltas, { LIMITE_FALTAS_POR_LOTE } from './RelatorioValidacaoFaltas';
import BatchProgressScreenFaltas from './BatchProgressScreenFaltas';
import type { ContextoModeloFaltas, ResultadoAnaliseFaltas } from './faltasTypes';
import { construirPayloadFalta } from './faltasPayload';
import { registrarFaltasBatch } from './faltasApi';
import { lerRascunhoFaltas, salvarRascunhoFaltas } from './faltasDraft';
import { dividirEmLotes } from '../../estudantes/cadastrar/massaHelpers';

type Fase =
  | { tipo: 'verificando' }
  | { tipo: 'progresso'; jobIds: string[]; contexto: ContextoModeloFaltas | null; avisoSubmissao?: string | null; nomesPorCodigo: Record<string, string> }
  | { tipo: 'normal' };

export default function LancamentoFaltasForm() {
  const [fase, setFase] = useState<Fase>({ tipo: 'verificando' });
  const [contextoBaixado, setContextoBaixado] = useState<ContextoModeloFaltas | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnaliseFaltas | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Ao montar, verifica se já existe um lançamento de faltas em massa em
  // andamento para esta academia (pode haver mais de um job, quando um envio
  // anterior foi dividido em vários lotes).
  useEffect(() => {
    let ativo = true;
    (async () => {
      const token = tokenStorage.get();
      if (!token) {
        if (ativo) setFase({ tipo: 'normal' });
        return;
      }
      try {
        const { jobs } = await jobApiService.list(token);
        const jobsAtivos = (jobs || []).filter(
          (j) => j.type === 'registrar_faltas_batch' && (j.status === 'pending' || j.status === 'processing')
        );
        if (ativo) {
          const rascunho = lerRascunhoFaltas();
          setFase(
            jobsAtivos.length > 0
              ? {
                  tipo: 'progresso',
                  jobIds: jobsAtivos.map((j) => j.id),
                  contexto: rascunho?.contexto ?? null,
                  nomesPorCodigo: {},
                }
              : { tipo: 'normal' }
          );
        }
      } catch {
        if (ativo) setFase({ tipo: 'normal' });
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const reiniciar = useCallback(() => {
    setContextoBaixado(null);
    setResultado(null);
    setNomeArquivo('');
    setErroEnvio('');
    setFase({ tipo: 'normal' });
  }, []);

  const handleConfirmar = async () => {
    if (!resultado?.contexto) return;
    setEnviando(true);
    setErroEnvio('');

    const contexto = resultado.contexto;
    const payloadCompleto = resultado.linhas.map((linha) => construirPayloadFalta(linha, contexto));
    const nomesPorCodigo: Record<string, string> = {};
    resultado.linhas.forEach((linha) => {
      if (linha.codigoEstudante) nomesPorCodigo[linha.codigoEstudante.trim().toLowerCase()] = linha.nome;
    });
    const lotes = dividirEmLotes(payloadCompleto, LIMITE_FALTAS_POR_LOTE);

    const jobIds: string[] = [];
    let itensEnviados = 0;
    let avisoSubmissao: string | null = null;

    salvarRascunhoFaltas({ contexto, nomeArquivo, jobIds, itensPendentes: payloadCompleto });

    // Envia lote a lote — se um lote falhar ao ser submetido, os lotes já
    // enviados continuam normalmente e a academia é avisada sobre o restante.
    for (let i = 0; i < lotes.length; i++) {
      try {
        const resposta = await registrarFaltasBatch(lotes[i], tokenStorage.get() || undefined);
        jobIds.push(resposta.job_id);
        itensEnviados += lotes[i].length;
        salvarRascunhoFaltas({ contexto, nomeArquivo, jobIds, itensPendentes: payloadCompleto });
      } catch (err: any) {
        avisoSubmissao = `Foram enviadas ${itensEnviados} de ${payloadCompleto.length} falta(s) com sucesso. Não foi possível enviar as demais: ${
          err?.message || 'erro desconhecido'
        }. Quando o lançamento em andamento terminar, pode tentar novamente — as faltas já lançadas não serão repetidas.`;
        break;
      }
    }

    setEnviando(false);

    if (jobIds.length > 0) {
      setFase({ tipo: 'progresso', jobIds, contexto, avisoSubmissao, nomesPorCodigo });
    } else {
      setErroEnvio(avisoSubmissao || 'Não foi possível iniciar o lançamento de faltas. Tente novamente.');
    }
  };

  if (fase.tipo === 'verificando') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A verificar se já existe um lançamento de faltas em andamento...
          </p>
        </div>
      </div>
    );
  }

  if (fase.tipo === 'progresso') {
    return (
      <BatchProgressScreenFaltas
        jobIds={fase.jobIds}
        contexto={fase.contexto}
        avisoSubmissao={fase.avisoSubmissao}
        nomesPorCodigo={fase.nomesPorCodigo}
        onConcluido={reiniciar}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SelecaoContextoFaltas onModeloGerado={setContextoBaixado} />

      {contextoBaixado && !resultado && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          Modelo baixado para{' '}
          <strong>
            Turma {contextoBaixado.turmaLabel ?? contextoBaixado.codigoTurma} — {contextoBaixado.periodoLabel} —{' '}
            {contextoBaixado.materiaNome}
          </strong>
          . Preencha e envie o ficheiro logo abaixo.
        </div>
      )}

      <UploadPlanilhaFaltas
        onResultado={(analise, nome) => {
          setResultado(analise);
          setNomeArquivo(nome);
          setErroEnvio('');
        }}
      />

      {resultado && (
        <RelatorioValidacaoFaltas
          resultado={resultado}
          nomeArquivo={nomeArquivo}
          enviando={enviando}
          erroEnvio={erroEnvio}
          onConfirmar={handleConfirmar}
          onNovoUpload={() => {
            setResultado(null);
            setNomeArquivo('');
            setErroEnvio('');
          }}
        />
      )}
    </div>
  );
}
```


---

## 10. Correção 5 (Alta, paleta/dark-mode) — `PageContent.tsx` (notas/lancar e faltas/lancar)

O link "Voltar" estava sem `focus:outline-none focus:ring-2 focus:ring-brand-500/20` e sem os estados `dark:hover:*` que o mesmo link tem em `/estudantes/cadastrar/PageContent.tsx`.


**Substitua todo o conteúdo de `src/app/(painel)/notas/lancar/PageContent.tsx` por:**

```tsx
// src/app/(painel)/notas/lancar/PageContent.tsx
"use client";
import Link from 'next/link';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import Icon from '@/components/ui/Icon';
import { useUserCookie } from '@/hooks/useUserCookie';
import { useUserType } from '@/hooks/useRoutePermission';
import UnauthorizedAccess from '@/components/guards/UnauthorizedAccess';
import LancamentoNotasForm from './LancamentoNotasForm';

export default function PageContent() {
  const { user, loading } = useUserCookie();
  const { isAcademia } = useUserType();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!user || !isAcademia) {
    return <UnauthorizedAccess requiredTypes={['academia']} message="Esta página está disponível apenas para academias." />;
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Lançar Notas" />

      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/notas"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
          >
            <Icon icon="mdi:arrow-left" width={18} /> Voltar para notas
          </Link>
        </div>

        <LancamentoNotasForm />
      </div>
    </div>
  );
}
```


**Substitua todo o conteúdo de `src/app/(painel)/faltas/lancar/PageContent.tsx` por:**

```tsx
// src/app/(painel)/faltas/lancar/PageContent.tsx
"use client";
import Link from 'next/link';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import Icon from '@/components/ui/Icon';
import { useUserCookie } from '@/hooks/useUserCookie';
import { useUserType } from '@/hooks/useRoutePermission';
import UnauthorizedAccess from '@/components/guards/UnauthorizedAccess';
import LancamentoFaltasForm from './LancamentoFaltasForm';

export default function PageContent() {
  const { user, loading } = useUserCookie();
  const { isAcademia } = useUserType();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!user || !isAcademia) {
    return <UnauthorizedAccess requiredTypes={['academia']} message="Esta página está disponível apenas para academias." />;
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Lançar Faltas" />

      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/faltas"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
          >
            <Icon icon="mdi:arrow-left" width={18} /> Voltar para faltas
          </Link>
        </div>

        <LancamentoFaltasForm />
      </div>
    </div>
  );
}
```


---

## 11. Correção 6 (Média) — `src/components/notas/NotasAcademia.tsx`

Três alterações pontuais neste arquivo (não precisa reescrever o arquivo inteiro — aplique estes três `str_replace`):

**11.1 — Remover import não utilizado** (`RegistrarNotasRequest` deixou de ser usado depois da remoção do
`handleRegistrar` de página):

```diff
 import type {
   MeuPerfilResponse, Nota, Turma, EstudanteDetalhado, Curso,
-  TipoNota, RegistrarNotasRequest, CriarCategoriaNotaRequest, CategoriaNotaItem,
+  TipoNota, CriarCategoriaNotaRequest, CategoriaNotaItem,
 } from "@/types/api";
```

**11.2 — Exportar `CATEGORIAS_ESCOLAR`** (para servir de fonte única de verdade, reaproveitada pela Correção 4 em
`SelecaoContextoNotas.tsx`):

```diff
 const ANOS_COM_EXAME = ["6_ano_fundamental", "9_ano_fundamental", "3_ano_medio"];
-const CATEGORIAS_ESCOLAR = [
+// Exportado para ser reaproveitado como fonte única de verdade pela tela de
+// lançamento de notas em massa (src/app/(painel)/notas/lancar), evitando que
+// as duas listas de categorias fixas fiquem dessincronizadas com o tempo.
+export const CATEGORIAS_ESCOLAR = [
   { label: "Nota do professor", value: "nota_professor", anos_academicos: ANOS_COM_NOTAS_REGULARES },
   { label: "Prova do trimestre", value: "prova_trimestral", anos_academicos: ANOS_COM_NOTAS_REGULARES },
   { label: "Exame final", value: "exame_final", anos_academicos: ANOS_COM_EXAME },
   { label: "Exame de recurso", value: "exame_recurso", anos_academicos: ANOS_COM_EXAME },
   { label: "Prova de Aptidão Profissional", value: "nota_pap", anos_academicos: ["4_ano_medio"] },
 ];
```

**11.3 — Remover a função `handleRegistrar` de página**, que ficou órfã depois que `ModalGestao` perdeu a aba
"Registar" (seu único chamador era `onRegistrar` no modal, que foi removido pela implementação original desta
tarefa):

```diff
   // ─── handlers de escrita ────────────────────────────────────────────────────
 
-  async function handleRegistrar(d: RegistrarNotasRequest) {
-    await academiaService.registrarNota(d, token);
-    showAlert("success", "Nota registada com sucesso.");
-    const turmaAtual = (layer.type === "periodos" || layer.type === "notas") ? (layer as any).turma : null;
-    if (turmaAtual) {
-      const l = layer as any;
-      await carregarNotasDosEstudantesDaTurma(turmaAtual, true, l.type === "notas" ? { nivel: l.nivel, periodo: l.periodo, superior: l.mode === "sup" } : undefined);
-    }
-  }
-
   async function handleCorrigirNota(id: string, data: { nota: number; observacao?: string; motivo: string }) {
```

Confirme com `grep -n "RegistrarNotasRequest\|handleRegistrar\b" src/components/notas/NotasAcademia.tsx` que sobrou
apenas a referência a `handleCorrigirNota` (não relacionada) — `handleRegistrar` e o import não devem mais
aparecer.

---

## 12. Item opcional (baixa prioridade) — reformatação dos arquivos ainda minificados

Estes arquivos **funcionam corretamente** (validados por `tsc`/`eslint`/teste funcional) e **não precisam de
nenhuma mudança de comportamento** — só estão formatados em uma única linha densa, fora do padrão de indentação do
resto do projeto:

- `src/app/(painel)/notas/lancar/notasTemplate.ts`
- `src/app/(painel)/faltas/lancar/faltasTemplate.ts`
- `src/app/(painel)/notas/lancar/notasParser.ts`
- `src/app/(painel)/faltas/lancar/faltasParser.ts`
- `src/app/(painel)/notas/lancar/notasTypes.ts`
- `src/app/(painel)/faltas/lancar/faltasTypes.ts`
- `src/app/(painel)/notas/lancar/notasPayload.ts`
- `src/app/(painel)/faltas/lancar/faltasPayload.ts`
- `src/app/(painel)/notas/lancar/notasApi.ts`
- `src/app/(painel)/faltas/lancar/faltasApi.ts`

**Se sobrar tempo:** reformate estes arquivos para múltiplas linhas com indentação de 2 espaços, chaves/parênteses
em linhas próprias, seguindo o estilo do restante do projeto (ex.: `massaTemplate.ts`, `massaParser.ts`). **Regra
inegociável:** é uma reformatação pura — **nenhuma linha de lógica pode mudar de comportamento**. Depois de
reformatar, rode `npx tsc --noEmit` e `npx eslint` nos arquivos tocados e confirme que continuam limpos. Se não
sobrar tempo, pule este item sem problema — não bloqueia a aceitação da correção.

---

## 13. Checklist de aceitação da correção

- [ ] `BatchProgressScreenNotas.tsx`/`Faltas.tsx` não importam mais nada de `estudantes/cadastrar/BatchProgressScreen`
      nem usam `as any` para repassar props entre domínios diferentes.
- [ ] Ao concluir um lançamento de notas/faltas com pelo menos uma falha, o botão "Baixar notas/faltas com falha"
      gera um `.xlsx` com as colunas do domínio certo (Nome do Estudante, Código do Estudante, Valor da
      Nota/Data da Falta/Quantidade) — nunca colunas de cadastro de estudante (BI, Género, etc.).
- [ ] O rascunho local (`localStorage`) do lançamento de notas usa a chave `spuri:lancamento-notas:rascunho:v1`, e
      o de faltas usa `spuri:lancamento-faltas:rascunho:v1` — nenhum dos dois lê/escreve a chave do cadastro de
      estudantes.
- [ ] Ao concluir um lote com sucesso, o rascunho correspondente é atualizado (itens lançados somem da lista de
      pendentes) — não fica um contador de "pendentes" desatualizado para sempre.
- [ ] No relatório de validação (`RelatorioValidacaoNotas.tsx`/`Faltas.tsx`), o botão "Baixar planilha apenas com
      as notas/faltas com erros" existe e funciona quando há pelo menos uma linha com erro.
- [ ] Em `/notas/lancar`, para uma academia de ensino escolar (não superior), o seletor de Categoria mostra as 5
      categorias reais (Nota do Professor, Prova do Trimestre, Exame Final, Exame de Recurso, Prova de Aptidão
      Profissional), filtradas corretamente pelo ano acadêmico selecionado — não apenas as 2 anteriores.
- [ ] Todos os componentes novos em `notas/lancar`/`faltas/lancar` usam o badge circular de ícone
      (`h-10 w-10 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300`), a tipografia
      de heading (`text-base font-semibold text-gray-800 dark:text-white/90`) e têm classes `dark:` em todas as
      caixas de alerta (vermelho/âmbar/verde/azul), consistente com `/estudantes/cadastrar`.
- [ ] O link "Voltar" em `/notas/lancar` e `/faltas/lancar` tem o mesmo `focus:` e `dark:hover:` do link
      equivalente em `/estudantes/cadastrar`.
- [ ] Trocar a turma selecionada em `/notas/lancar` ou `/faltas/lancar` também limpa a matéria (e, para notas, a
      categoria) selecionada — não só ao trocar o período.
- [ ] `NotasAcademia.tsx` não tem mais a função `handleRegistrar` de página nem o import não utilizado de
      `RegistrarNotasRequest`.
- [ ] `SelecaoContextoFaltas.tsx` não referencia mais `cats`, `CATEGORIAS_ESCOLAR` local nem
      `academiaService.listarCategoriasNota`.
- [ ] Nenhum arquivo novo/editado tem `/* eslint-disable ... */` no topo do arquivo inteiro.

---

## 14. Validação — comandos a rodar e o que esperar

Estes comandos **já foram executados com sucesso** neste ambiente de orquestração depois de aplicar exatamente as
correções acima — o Codex deve reproduzi-los e confirmar que obtém os mesmos resultados:

1. `npx tsc --noEmit` → **esperado: 0 erros** (saída vazia).
2. `npx eslint "src/app/(painel)/notas/lancar" "src/app/(painel)/faltas/lancar" "src/components/notas/NotasAcademia.tsx" "src/components/faltas/FaltasAcademia.tsx" "src/lib/route-guards.ts"` →
   **esperado: 0 erros, 0 warnings** (saída vazia).
3. `grep -n "handleRegistrar\b" src/components/notas/NotasAcademia.tsx` → **esperado: nenhuma ocorrência** (a
   função de página foi removida; se aparecer alguma linha, é porque a Correção 6.3 não foi aplicada corretamente).
4. `grep -rn "estudantes/cadastrar/BatchProgressScreen\|as any}" "src/app/(painel)/notas/lancar/BatchProgressScreenNotas.tsx" "src/app/(painel)/faltas/lancar/BatchProgressScreenFaltas.tsx"` →
   **esperado: nenhuma ocorrência** (confirma que o wrapper problemático foi substituído por um componente
   próprio).
5. `npm run build` → esperado continuar falhando **apenas** no download da fonte `Outfit` via `next/font` (erro de
   rede ao buscar `fonts.googleapis.com`/`fonts.gstatic.com`), exatamente como antes da correção. Se o erro for
   diferente disso (ex.: erro de compilação em algum dos arquivos tocados), a correção não foi aplicada
   corretamente — investigue antes de prosseguir.
6. Repita o teste funcional feito na correção original (ver relatório do Codex, item `node /tmp/test-xlsx.mjs`) —
   ele não foi afetado por nenhuma destas correções (não tocamos em `notasTemplate.ts`, `notasParser.ts`,
   `faltasTemplate.ts`, `faltasParser.ts`), mas vale re-executar para confirmar que continua passando.

---

## 15. O que fica para o orquestrador (Claude) validar depois

Não tente fazer nada disto — apenas aplique a correção e devolva o relatório da Seção 16:

- Testar visualmente (e em dark mode) as telas `/notas/lancar` e `/faltas/lancar` com `npm run dev` conectado ao
  back-end real, incluindo o novo badge de ícone e as caixas de alerta com `dark:`.
- Confirmar, com uma conta de teste de ensino escolar não-superior, que as 5 categorias de nota agora aparecem
  corretamente filtradas por ano acadêmico ao lançar notas em massa.
- Testar o fluxo completo de uma falha parcial: lançar um lote onde alguma linha falha no servidor, confirmar que
  o botão "Baixar notas/faltas com falha" baixa um Excel com as colunas certas e o nome do estudante certo.
- Confirmar que o rascunho em `localStorage` (chave `spuri:lancamento-notas:rascunho:v1` /
  `spuri:lancamento-faltas:rascunho:v1`) é atualizado corretamente após cada lote concluído.

---

## 16. Formato do relatório final que o Codex deve entregar

```
## Resumo da correção aplicada
- Confirmação de que os 16 arquivos da Seção 3–10 foram substituídos integralmente
- Confirmação de que as 3 edições pontuais da Seção 11 foram aplicadas em NotasAcademia.tsx
- Item 12 (reformatação opcional): feito / não feito (e por quê)

## Resultado da validação (Seção 14)
1. npx tsc --noEmit: OK / X erro(s) (colar)
2. npx eslint (conjunto tocado): OK / X erro(s)/warning(s) (colar)
3. grep handleRegistrar órfão: OK (nada encontrado) / encontrado (colar)
4. grep BatchProgressScreen/estudantes ou "as any}": OK (nada encontrado) / encontrado (colar)
5. npm run build: falhou só na fonte Outfit (esperado) / falhou por outro motivo (colar erro)
6. Teste funcional xlsx: OK / FALHOU (colar)

## Itens da checklist (Seção 13) não concluídos, se houver

## Divergências encontradas em relação a este documento

## Perguntas em aberto para o orquestrador
```
