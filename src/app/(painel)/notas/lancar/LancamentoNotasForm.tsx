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
