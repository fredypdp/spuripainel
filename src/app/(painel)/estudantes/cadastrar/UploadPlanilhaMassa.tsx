// src/app/(painel)/estudantes/cadastrar/UploadPlanilhaMassa.tsx
"use client";
import { useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import type { ResultadoAnalise } from './massaTypes';
import { analisarPlanilha } from './massaParser';

interface UploadPlanilhaMassaProps {
  codigoAcademiaAtual?: string;
  /**
   * Modo de cadastro (turma/geral) selecionado no passo 1 — repassado ao
   * parser para rejeitar um modelo gerado no outro modo (ver
   * massaParser.analisarPlanilha e SelecaoContextoMassa).
   */
  modoCadastroSelecionado: 'turma' | 'geral';
  onResultado: (resultado: ResultadoAnalise, nomeArquivo: string) => void;
}

export default function UploadPlanilhaMassa({ codigoAcademiaAtual, modoCadastroSelecionado, onResultado }: UploadPlanilhaMassaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analisando, setAnalisando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erroLeitura, setErroLeitura] = useState('');

  const handleFile = async (file: File) => {
    setErroLeitura('');
    setAnalisando(true);
    setNomeArquivo(file.name);
    try {
      const analise = await analisarPlanilha(file, codigoAcademiaAtual, modoCadastroSelecionado);
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
            Envie o modelo já preenchido. Todos os dados são validados antes de qualquer cadastro.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Modo selecionado no passo 1:{' '}
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {modoCadastroSelecionado === 'turma' ? 'Cadastrar por turma' : 'Cadastrar de forma geral'}
            </span>
            . Só é aceite um modelo gerado neste mesmo modo.
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
