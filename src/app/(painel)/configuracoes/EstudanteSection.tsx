"use client";

import React, { useMemo, useState } from "react";
import { estudanteService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";
import PasswordSettingsCard from "./PasswordSettingsCard";

export default function EstudanteSection() {
  const { user } = useUserType();
  const estudante = user?.estudante;

  const initial = useMemo(
    () => ({
      nome: estudante?.nome ?? "",
      bilhete_identidade: estudante?.bilhete_identidade ?? "",
      bilhete_identidade_encarregado: estudante?.bilhete_identidade_encarregado ?? "",
      data_nascimento: estudante?.data_nascimento?.slice(0, 10) ?? "",
    }),
    [estudante]
  );

  const [form, setForm] = useState(initial);
  const [sucesso, setSucesso] = useState(false);
  const [erroValidacao, setErroValidacao] = useState("");

  const {
    loading,
    error,
    execute: atualizarDados,
  } = useApi(estudanteService.atualizarDadosPessoais);

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    setErroValidacao("");

    const biEstudante = form.bilhete_identidade.trim();
    const biEncarregado = form.bilhete_identidade_encarregado.trim();
    if (biEstudante && biEncarregado && biEstudante.toLowerCase() === biEncarregado.toLowerCase()) {
      setErroValidacao("O BI do estudante não pode ser igual ao BI do encarregado de educação.");
      return;
    }

    try {
      await atualizarDados({
        nome: form.nome || undefined,
        bilhete_identidade: biEstudante || undefined,
        bilhete_identidade_encarregado: biEncarregado || undefined,
        data_nascimento: form.data_nascimento || undefined,
      });
      setSucesso(true);
      setTimeout(() => setSucesso(false), 5000);
    } catch {
      // erro disponível via hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
              <Icon icon="mdi:account-edit-outline" width="16px" className="text-brand-500" />
            </span>
            Dados pessoais
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            O estudante pode atualizar os próprios dados pessoais. E-mail e telefone são alterados na página de perfil pelas rotas dedicadas de contato.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["nome", "Nome", "text"],
              ["data_nascimento", "Data de nascimento", "date"],
              ["bilhete_identidade", "Bilhete de identidade", "text"],
              ["bilhete_identidade_encarregado", "BI do encarregado de educação", "text"],
            ].map(([field, label, type]) => (
              <div key={field}>
                <label htmlFor={`est-${field}`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </label>
                <input
                  id={`est-${field}`}
                  type={type}
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setField(field as keyof typeof form, e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            ))}
          </div>

          {(erroValidacao || error) && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
              <Icon icon="mdi:alert-circle-outline" width="18px" className="shrink-0 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400">{erroValidacao || error}</p>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
              <Icon icon="mdi:check-circle-outline" width="18px" className="shrink-0 text-green-500" />
              <p className="text-sm text-green-700 dark:text-green-400">Dados pessoais atualizados com sucesso.</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />A guardar...</> : <><Icon icon="mdi:content-save-outline" width="18px" />Guardar dados</>}
            </button>
          </div>
        </form>
      </div>

      <PasswordSettingsCard />
    </div>
  );
}
