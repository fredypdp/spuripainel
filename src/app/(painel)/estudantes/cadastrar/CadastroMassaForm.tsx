// src/app/(painel)/estudantes/cadastrar/CadastroMassaForm.tsx
"use client";
import { useCallback, useEffect, useState } from 'react';
import { jobApiService, tokenStorage } from '@/lib/api';
import { useUserCookie } from '@/hooks/useUserCookie';
import SelecaoContextoMassa from './SelecaoContextoMassa';
import UploadPlanilhaMassa from './UploadPlanilhaMassa';
import RelatorioValidacaoMassa from './RelatorioValidacaoMassa';
import BatchProgressScreen from './BatchProgressScreen';
import type { ContextoModelo, ResultadoAnalise } from './massaTypes';
import { labelNivel } from './massaHelpers';
import { construirPayloadEstudante } from './massaPayload';
import { registrarEstudantesBatchSemArquivo } from './massaApi';

type Fase =
  | { tipo: 'verificando' }
  | { tipo: 'progresso'; jobId: string; contexto: ContextoModelo | null }
  | { tipo: 'normal' };

export default function CadastroMassaForm() {
  const { user } = useUserCookie();

  const [fase, setFase] = useState<Fase>({ tipo: 'verificando' });
  const [contextoBaixado, setContextoBaixado] = useState<ContextoModelo | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Ao montar, verifica se já existe um cadastro em massa em andamento para
  // esta academia. Se existir, a tela mostra apenas o progresso dessa
  // requisição — impedindo iniciar um novo cadastro em massa em paralelo.
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
        const jobAtivo = (jobs || []).find(
          (j) => j.type === 'register_estudante_batch' && (j.status === 'pending' || j.status === 'processing')
        );
        if (ativo) {
          setFase(jobAtivo ? { tipo: 'progresso', jobId: jobAtivo.id, contexto: null } : { tipo: 'normal' });
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
    try {
      const payload = resultado.linhas.map((linha) => construirPayloadEstudante(linha, resultado.contexto!));
      const resposta = await registrarEstudantesBatchSemArquivo(payload);
      setFase({ tipo: 'progresso', jobId: resposta.job_id, contexto: resultado.contexto });
    } catch (err: any) {
      setErroEnvio(err?.message || 'Não foi possível iniciar o cadastro em massa. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (fase.tipo === 'verificando') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">A verificar se já existe um cadastro em massa em andamento...</p>
        </div>
      </div>
    );
  }

  if (fase.tipo === 'progresso') {
    return <BatchProgressScreen jobId={fase.jobId} contexto={fase.contexto} onConcluido={reiniciar} />;
  }

  return (
    <div className="space-y-5">
      <SelecaoContextoMassa onModeloGerado={setContextoBaixado} />

      {contextoBaixado && !resultado && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          Modelo baixado para{' '}
          <strong>
            {labelNivel(contextoBaixado.nivel)}
            {contextoBaixado.cursoNome ? ` — ${contextoBaixado.cursoNome}` : ''} — {contextoBaixado.anoAcademicoLabel}
          </strong>
          . Preencha e envie o ficheiro logo abaixo.
        </div>
      )}

      <UploadPlanilhaMassa
        codigoAcademiaAtual={user?.academia?.codigo_academia}
        onResultado={(analise, nome) => {
          setResultado(analise);
          setNomeArquivo(nome);
          setErroEnvio('');
        }}
      />

      {resultado && (
        <RelatorioValidacaoMassa
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
