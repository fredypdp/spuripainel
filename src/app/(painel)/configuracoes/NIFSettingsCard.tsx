"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useUserType } from "@/hooks/useRoutePermission";
import { academiaService } from "@/lib/api/services";
import { formatApiError } from "@/lib/api/client";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/button/Button";
import type { SolicitacaoAlteracaoNIFAcademia } from "@/types/api";

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
};

const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reprovada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// NIF deixou de ser único entre academias — a mesma entidade fiscal pode
// estar associada a mais de uma academia na plataforma. Por isso, alterar o
// NIF não é mais um PUT direto: a academia solicita e só um Admin (role
// 'adm' ou 'fpp') pode aprovar. Este card cobre o lado da própria academia:
// ver o NIF atual, ver o estado do último pedido, e criar um novo pedido
// quando não há nenhum pendente.
export default function NIFSettingsCard() {
  const { user } = useUserType();
  const nifAtual = user?.academia?.nif;

  const [ultima, setUltima] = useState<SolicitacaoAlteracaoNIFAcademia | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroCarregar, setErroCarregar] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novoNif, setNovoNif] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucessoEnvio, setSucessoEnvio] = useState(false);

  const carregarUltima = useCallback(async () => {
    setCarregando(true);
    setErroCarregar("");
    try {
      const response = await academiaService.listarSolicitacoesAlteracaoNIF({ limit: 1, offset: 0 });
      setUltima(response.solicitacoes?.[0] ?? null);
    } catch (err) {
      setErroCarregar(formatApiError(err, "Não foi possível carregar o estado da solicitação de NIF."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarUltima();
  }, [carregarUltima]);

  const pendente = ultima?.status === "pendente";

  const enviarSolicitacao = async (e: FormEvent) => {
    e.preventDefault();
    setErroEnvio("");
    setSucessoEnvio(false);
    setEnviando(true);
    try {
      await academiaService.criarSolicitacaoAlteracaoNIF({ novo_nif: novoNif.replace(/\D/g, "") });
      setSucessoEnvio(true);
      setMostrarFormulario(false);
      setNovoNif("");
      await carregarUltima();
    } catch (err) {
      setErroEnvio(formatApiError(err, "Não foi possível enviar a solicitação de alteração de NIF."));
    } finally {
      setEnviando(false);
    }
  };

  if (!nifAtual) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center gap-3">
        <Icon icon="mdi:card-account-details-outline" width={22} className="text-brand-500" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">NIF</h3>
      </div>
      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">NIF atual</p>
      <p className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">{nifAtual}</p>

      {carregando && <p className="text-sm text-gray-500 dark:text-gray-400">A verificar solicitações...</p>}
      {erroCarregar && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroCarregar}</p>}

      {ultima && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Última solicitação: <b>{ultima.nif_solicitado}</b>
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[ultima.status]}`}>
              {statusLabel[ultima.status] ?? ultima.status}
            </span>
          </div>
          {ultima.status === "reprovada" && ultima.motivo_reprovacao && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">Motivo: {ultima.motivo_reprovacao}</p>
          )}
        </div>
      )}

      {pendente ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Já existe uma solicitação de alteração de NIF pendente. Aguarde a decisão de um administrador antes de enviar outra.
        </p>
      ) : mostrarFormulario ? (
        <form onSubmit={enviarSolicitacao} className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Novo NIF
            <input
              value={novoNif}
              onChange={(e) => setNovoNif(e.target.value)}
              maxLength={10}
              inputMode="numeric"
              required
              placeholder="10 dígitos"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 dark:border-gray-700"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={enviando}>{enviando ? "A enviar..." : "Enviar solicitação"}</Button>
            <Button size="sm" type="button" variant="outline" onClick={() => { setMostrarFormulario(false); setNovoNif(""); }}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" onClick={() => setMostrarFormulario(true)} startIcon={<Icon icon="mdi:pencil-outline" width={16} />}>
          Solicitar alteração de NIF
        </Button>
      )}

      {erroEnvio && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvio}</p>}
      {sucessoEnvio && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Solicitação enviada. A alteração só é aplicada após aprovação de um administrador.</p>}
    </div>
  );
}
