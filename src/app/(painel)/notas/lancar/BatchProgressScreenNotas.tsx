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
