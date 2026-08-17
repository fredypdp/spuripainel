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
