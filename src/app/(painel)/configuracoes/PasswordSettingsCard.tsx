"use client";

import React, { useState } from "react";
import { perfilService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import Icon from "@/components/ui/Icon";

export default function PasswordSettingsCard() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [validacao, setValidacao] = useState<string | null>(null);

  const {
    loading: alterando,
    error,
    execute: alterarSenha,
  } = useApi(perfilService.alterarSenha);

  const podeGuardar = !alterando && senhaAtual.trim().length > 0 && novaSenha.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    setValidacao(null);

    if (!senhaAtual.trim()) {
      setValidacao("Informe a senha atual.");
      return;
    }

    if (novaSenha.length < 6) {
      setValidacao("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (senhaAtual === novaSenha) {
      setValidacao("A nova senha deve ser diferente da senha atual.");
      return;
    }

    try {
      await alterarSenha({ senha_atual: senhaAtual, nova_senha: novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setSucesso(true);
      setTimeout(() => setSucesso(false), 5000);
    } catch {
      // erro disponível via hook
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <Icon icon="mdi:lock-reset" width="18px" className="text-gray-600 dark:text-gray-400" />
          </span>
          Alterar senha
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Disponível para todos os perfis autenticados, conforme a documentação.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="senha-atual-config" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha atual
            </label>
            <input
              id="senha-atual-config"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              disabled={alterando}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Digite a senha atual"
            />
          </div>
          <div>
            <label htmlFor="nova-senha-config" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nova senha
            </label>
            <input
              id="nova-senha-config"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              disabled={alterando}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        {(validacao || error) && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <Icon icon="mdi:alert-circle-outline" width="18px" className="shrink-0 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{validacao || error}</p>
          </div>
        )}

        {sucesso && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
            <Icon icon="mdi:check-circle-outline" width="18px" className="shrink-0 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">Senha alterada com sucesso.</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!podeGuardar}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {alterando ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                A guardar...
              </>
            ) : (
              <>
                <Icon icon="mdi:content-save-outline" width="18px" />
                Guardar senha
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
