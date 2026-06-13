"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { academiaService } from "@/lib/api/services";
import Icon from "@/components/ui/Icon";

const FUNDAMENTAL = Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental`);
const MEDIO = Array.from({ length: 4 }, (_, i) => `${i + 1}_ano_medio`);
const SUPERIOR = Array.from({ length: 6 }, (_, i) => `${i + 1}_ano_superior`);
const OPCOES = [...FUNDAMENTAL, ...MEDIO, ...SUPERIOR];

function labelAno(ano: string) {
  return ano.replace(/_/g, " ").replace(/^\d+/, (n) => `${n}.º`);
}

export default function DocumentosObrigatoriosSection() {
  const { data, loading, execute: carregar } = useApi(academiaService.getDocumentosObrigatorios);
  const { loading: salvando, error, execute: salvar } = useApi(academiaService.atualizarDocumentosObrigatorios);
  const [declaracao, setDeclaracao] = useState<Set<string>>(new Set());
  const [certificado, setCertificado] = useState<Set<string>>(new Set());
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!data?.documentos_obrigatorios) return;
    // Sincroniza o formulário local quando a configuração chega da API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeclaracao(new Set(data.documentos_obrigatorios.declaracao ?? []));
    setCertificado(new Set(data.documentos_obrigatorios.certificado ?? []));
  }, [data]);

  const alterado = useMemo(() => {
    const atualDec = (data?.documentos_obrigatorios.declaracao ?? []).join("|");
    const atualCert = (data?.documentos_obrigatorios.certificado ?? []).join("|");
    return [...declaracao].sort().join("|") !== atualDec || [...certificado].sort().join("|") !== atualCert;
  }, [certificado, data, declaracao]);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, ano: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(ano)) next.delete(ano);
      else next.add(ano);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    await salvar({
      declaracao: [...declaracao].sort(),
      certificado: [...certificado].sort(),
    });
    setSucesso(true);
    await carregar();
    setTimeout(() => setSucesso(false), 3500);
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10">
          <Icon icon="mdi:file-document-check-outline" width="20px" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Documentos obrigatórios para matrícula</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Configure em quais anos a declaração e o certificado devem ser exigidos no novo fluxo público de solicitação de matrícula.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[
              { titulo: "Declaração", set: declaracao, setter: setDeclaracao },
              { titulo: "Certificado", set: certificado, setter: setCertificado },
            ].map((grupo) => (
              <div key={grupo.titulo} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{grupo.titulo}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {OPCOES.map((ano) => (
                    <label key={`${grupo.titulo}-${ano}`} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={grupo.set.has(ano)}
                        onChange={() => toggle(grupo.setter, ano)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="capitalize">{labelAno(ano)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {sucesso && <p className="text-sm text-green-600 dark:text-green-400">Configuração atualizada com sucesso.</p>}

          <button
            type="submit"
            disabled={salvando || !alterado}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar documentos obrigatórios"}
          </button>
        </form>
      )}
    </section>
  );
}
