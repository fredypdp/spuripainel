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
import { labelNivel, LIMITE_ESTUDANTES_POR_LOTE, dividirEmLotes } from './massaHelpers';
import { construirPayloadEstudante } from './massaPayload';
import { registrarEstudantesBatchSemArquivo } from './massaApi';
import { lerRascunhoCadastroMassa, salvarRascunhoCadastroMassa } from './massaDraft';

type Fase =
  | { tipo: 'verificando' }
  | { tipo: 'progresso'; jobIds: string[]; contexto: ContextoModelo | null; avisoSubmissao?: string | null }
  | { tipo: 'normal' };

export default function CadastroMassaForm() {
  const { user } = useUserCookie();

  const [fase, setFase] = useState<Fase>({ tipo: 'verificando' });
  const [contextoBaixado, setContextoBaixado] = useState<ContextoModelo | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Ao montar, verifica se já existem lotes de cadastro em massa em andamento
  // para esta academia (pode haver mais de um, quando um envio anterior foi
  // dividido em vários lotes). Se existirem, a tela mostra apenas o
  // progresso dessa requisição — impedindo iniciar um novo cadastro em massa
  // em paralelo.
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
          (j) => j.type === 'register_estudante_batch' && (j.status === 'pending' || j.status === 'processing')
        );
        if (ativo) {
          const rascunho = lerRascunhoCadastroMassa();
          setFase(
            jobsAtivos.length > 0
              ? { tipo: 'progresso', jobIds: jobsAtivos.map((j) => j.id), contexto: rascunho?.contexto ?? null }
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
    const payloadCompleto = resultado.linhas.map((linha) => construirPayloadEstudante(linha, contexto));
    const lotes = dividirEmLotes(payloadCompleto, LIMITE_ESTUDANTES_POR_LOTE);

    const jobIds: string[] = [];
    let itensEnviados = 0;
    let avisoSubmissao: string | null = null;

    salvarRascunhoCadastroMassa({
      contexto,
      nomeArquivo,
      jobIds,
      estudantesPendentes: payloadCompleto,
    });

    // Envia lote a lote — se um lote falhar ao ser submetido, os lotes já
    // enviados continuam normalmente e o utilizador é avisado sobre o
    // restante, podendo reenviar a mesma planilha depois (estudantes já
    // cadastrados não são duplicados pelo backend).
    for (let i = 0; i < lotes.length; i++) {
      try {
        const resposta = await registrarEstudantesBatchSemArquivo(lotes[i]);
        jobIds.push(resposta.job_id);
        itensEnviados += lotes[i].length;
        salvarRascunhoCadastroMassa({
          contexto,
          nomeArquivo,
          jobIds,
          estudantesPendentes: payloadCompleto,
        });
      } catch (err: any) {
        avisoSubmissao = `Foram enviados ${itensEnviados} de ${payloadCompleto.length} estudante(s) com sucesso. Não foi possível enviar os demais: ${
          err?.message || 'erro desconhecido'
        }. Quando o cadastro em andamento terminar, pode tentar novamente — os estudantes já cadastrados não serão repetidos.`;
        break;
      }
    }

    setEnviando(false);

    if (jobIds.length > 0) {
      setFase({ tipo: 'progresso', jobIds, contexto, avisoSubmissao });
    } else {
      setErroEnvio(avisoSubmissao || 'Não foi possível iniciar o cadastro em massa. Tente novamente.');
    }
  };

  if (fase.tipo === 'verificando') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A verificar se já existe um cadastro em massa em andamento...
          </p>
        </div>
      </div>
    );
  }

  if (fase.tipo === 'progresso') {
    return (
      <BatchProgressScreen
        jobIds={fase.jobIds}
        contexto={fase.contexto}
        avisoSubmissao={fase.avisoSubmissao}
        onConcluido={reiniciar}
      />
    );
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
            {contextoBaixado.modoCadastro === 'turma' ? ` — Turma ${contextoBaixado.turmaLabel ?? contextoBaixado.codigoTurma}` : ''}
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
