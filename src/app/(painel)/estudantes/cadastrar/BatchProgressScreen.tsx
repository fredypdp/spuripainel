// src/app/(painel)/estudantes/cadastrar/BatchProgressScreen.tsx
"use client";
import { useEffect, useRef, useState } from 'react';
import { pollJob, jobApiService } from '@/lib/api';
import type { JobSummary, JobDetail } from '@/lib/api';
import Button from '@/components/ui/button/Button';
import { baixarEstudantesComFalha } from './massaErrorExport';
import type { ContextoModelo } from './massaTypes';

interface BatchProgressScreenProps {
  jobId: string;
  contexto?: ContextoModelo | null;
  onConcluido: () => void;
}

export default function BatchProgressScreen({ jobId, contexto, onConcluido }: BatchProgressScreenProps) {
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [erro, setErro] = useState('');
  const canceladoRef = useRef(false);

  useEffect(() => {
    canceladoRef.current = false;

    jobApiService
      .getStatus(jobId)
      .then((s) => {
        if (!canceladoRef.current) setSummary(s);
      })
      .catch(() => {});

    pollJob(jobId, {
      onProgress: (s) => {
        if (!canceladoRef.current) setSummary(s);
      },
      onComplete: (d) => {
        if (!canceladoRef.current) {
          setDetail(d);
          setSummary(d);
        }
      },
      onError: () => {},
    }).catch((err) => {
      if (!canceladoRef.current) {
        setErro(err instanceof Error ? err.message : 'Erro ao acompanhar o processamento deste cadastro.');
      }
    });

    return () => {
      canceladoRef.current = true;
    };
  }, [jobId]);

  const total = summary?.total_items ?? 0;
  const feitos = (summary?.done_items ?? 0) + (summary?.fail_items ?? 0);
  const progresso = total > 0 ? Math.round((feitos / total) * 100) : summary?.progress ?? 0;
  const concluido = summary?.status === 'done' || summary?.status === 'failed';
  const falhas = detail?.results?.filter((r) => !r.sucesso) ?? [];

  const handleBaixarFalhas = () => {
    if (!detail) return;
    const resultados = falhas.map((f) => ({ payload: f.payload, erro: f.erro }));
    baixarEstudantesComFalha(contexto ?? null, resultados, `cadastro-em-massa-${jobId.slice(0, 8)}`);
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
            : 'Isto pode demorar alguns instantes. Pode navegar para outra página — ao voltar aqui, o progresso continua a ser mostrado.'}
        </p>

        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              summary?.status === 'failed' ? 'bg-orange-500' : 'bg-brand-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(concluido ? 100 : 4, progresso))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span>
            {feitos} de {total || '...'} processados
          </span>
          {!!summary?.done_items && (
            <span className="text-green-600 dark:text-green-400">{summary.done_items} com sucesso</span>
          )}
          {!!summary?.fail_items && <span className="text-red-600 dark:text-red-400">{summary.fail_items} com falha</span>}
        </div>

        {erro && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {erro}
          </div>
        )}

        {!concluido && (
          <p className="mt-4 text-xs text-gray-400">
            Não é necessário permanecer nesta tela — o cadastro continua a ser processado no servidor.
          </p>
        )}
      </div>

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
