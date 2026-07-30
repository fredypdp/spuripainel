// src/app/(painel)/estudantes/cadastrar/RelatorioValidacaoMassa.tsx
"use client";
import { useMemo } from 'react';
import Button from '@/components/ui/button/Button';
import Icon from '@/components/ui/Icon';
import type { ResultadoAnalise, ErroValidacao } from './massaTypes';
import { baixarLinhasComErro } from './massaErrorExport';
import { labelNivel, LIMITE_ESTUDANTES_POR_LOTE } from './massaHelpers';

interface RelatorioValidacaoMassaProps {
  resultado: ResultadoAnalise;
  nomeArquivo: string;
  enviando: boolean;
  erroEnvio?: string;
  onConfirmar: () => void;
  onNovoUpload: () => void;
}

export default function RelatorioValidacaoMassa({
  resultado,
  nomeArquivo,
  enviando,
  erroEnvio,
  onConfirmar,
  onNovoUpload,
}: RelatorioValidacaoMassaProps) {
  const { contexto, linhas, erros, totalLinhas } = resultado;

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
  const totalLotes = Math.max(1, Math.ceil(totalLinhas / LIMITE_ESTUDANTES_POR_LOTE));

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
          Nenhuma linha de estudante foi encontrada na folha &quot;Estudantes&quot;. Preencha os dados a partir da linha 2 e
          envie novamente.
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
            {labelNivel(contexto.nivel)}
            {contexto.cursoNome ? ` — ${contexto.cursoNome}` : ''} — {contexto.anoAcademicoLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-white/5 dark:text-gray-300">
          {totalLinhas} estudante(s) na planilha
        </span>
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
              onClick={() => baixarLinhasComErro(contexto, linhas, errosPorLinhaLista, nomeArquivo)}
            >
              Baixar apenas as linhas com erro
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
            ? `Como são ${totalLinhas} estudantes, o sistema vai enviar automaticamente em ${totalLotes} grupos de até ${LIMITE_ESTUDANTES_POR_LOTE} estudantes cada.`
            : 'Confirme abaixo para iniciar o cadastro em massa.'}
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
            ? `Confirmar cadastro de ${totalLinhas} estudante(s) em ${totalLotes} grupos`
            : `Confirmar cadastro de ${totalLinhas} estudante(s)`}
        </Button>
      </div>
    </div>
  );
}
