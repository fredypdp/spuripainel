// src/app/(painel)/estudantes/cadastrar/BatchProgressScreen.tsx
"use client";
import { useEffect, useRef, useState } from 'react';
import { pollJob, jobApiService } from '@/lib/api';
import type { JobSummary, JobDetail } from '@/lib/api';
import Button from '@/components/ui/button/Button';
import { baixarEstudantesComFalha, baixarRascunhoEstudantesPendentes } from './massaErrorExport';
import { lerRascunhoCadastroMassa, removerEstudantesCadastradosDoRascunho } from './massaDraft';
import type { ContextoModelo } from './massaTypes';

interface BatchProgressScreenProps {
  /** Um cadastro em massa pode gerar vários lotes (jobs) quando ultrapassa o
   * limite de estudantes por requisição da API. Esta tela acompanha todos em
   * paralelo e agrega o progresso. */
  jobIds: string[];
  contexto?: ContextoModelo | null;
  /** Aviso opcional quando algum lote não foi sequer submetido ao servidor. */
  avisoSubmissao?: string | null;
  onConcluido: () => void;
}

interface EstadoLote {
  summary: JobSummary | null;
  detail: JobDetail | null;
  erro?: string;
}

export default function BatchProgressScreen({ jobIds, contexto, avisoSubmissao, onConcluido }: BatchProgressScreenProps) {
  const [estadoLotes, setEstadoLotes] = useState<Record<string, EstadoLote>>(() =>
    Object.fromEntries(jobIds.map((id) => [id, { summary: null, detail: null }]))
  );
  const canceladoRef = useRef(false);
  const [totalRascunho, setTotalRascunho] = useState(0);

  useEffect(() => {
    setTotalRascunho(lerRascunhoCadastroMassa()?.estudantesPendentes.length ?? 0);
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
          const cadastrados = d.results.filter((r) => r.sucesso).map((r) => r.payload);
          const rascunhoAtualizado = removerEstudantesCadastradosDoRascunho(cadastrados);
          setTotalRascunho(rascunhoAtualizado?.estudantesPendentes.length ?? 0);
          setEstadoLotes((prev) => ({ ...prev, [jobId]: { ...prev[jobId], summary: d, detail: d } }));
        },
        onError: () => {},
      }).catch((err) => {
        if (canceladoRef.current) return;
        setEstadoLotes((prev) => ({
          ...prev,
          [jobId]: { ...prev[jobId], erro: err instanceof Error ? err.message : 'Erro ao acompanhar este lote.' },
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

  const handleBaixarFalhas = () => {
    if (falhas.length === 0) return;
    const resultados = falhas.map((f) => ({ payload: f.payload, erro: f.erro }));
    baixarEstudantesComFalha(contexto ?? null, resultados, `cadastro-em-massa-${jobIds[0]?.slice(0, 8) || 'lote'}`);
  };

  const handleBaixarRascunho = () => {
    const rascunho = lerRascunhoCadastroMassa();
    if (!rascunho?.estudantesPendentes.length) return;
    baixarRascunhoEstudantesPendentes(
      rascunho.contexto ?? contexto ?? null,
      rascunho.estudantesPendentes,
      jobIds[0]?.slice(0, 8) || 'lote'
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
          {concluido ? 'Cadastro em massa concluído' : 'Cadastrando estudantes...'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {concluido
            ? 'Veja abaixo o resultado do processamento.'
            : multiploLotes
            ? `Este cadastro foi dividido em ${jobIds.length} lotes para respeitar o limite da plataforma. Isto pode demorar alguns instantes. `
            : 'Isto pode demorar alguns instantes. '}
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
                  Lote {i + 1}: {label}
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
            <p>Não é necessário permanecer nesta tela — o cadastro continua a ser processado no servidor.</p>
            {totalRascunho > 0 && (
              <p>
                Um rascunho local mantém {totalRascunho} estudante(s) desta planilha ainda sem confirmação de cadastro,
                para reutilização em caso de erro ou interrupção.
              </p>
            )}
          </div>
        )}
      </div>

      {concluido && totalRascunho > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Rascunho atualizado com {totalRascunho} estudante(s) desta planilha ainda não confirmado(s) como cadastrado(s).
          Pode corrigir/reutilizar esses dados se precisar retomar o cadastro.
        </div>
      )}

      {concluido && falhas.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Estudantes que não foram cadastrados ({falhas.length})
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30 bg-white dark:bg-transparent">
            {falhas.map((f, i) => {
              const nome = (f.payload as any)?.nome || `Item #${(f.index ?? i) + 1}`;
              return (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {f.erro || 'Falha não especificada pelo servidor.'}
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
              Baixar rascunho pendente ({totalRascunho})
            </Button>
          )}
          {falhas.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBaixarFalhas}>
              Baixar estudantes com falha ({falhas.length})
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
