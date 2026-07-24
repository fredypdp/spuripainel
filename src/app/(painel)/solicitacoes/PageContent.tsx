"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SearchableSelect from "@/components/form/SearchableSelect";
import { useUserType } from "@/hooks/useRoutePermission";
import { academiaService, adminService, consultasService, estudanteService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { AcademiaDetalhada, SolicitacaoEdicaoDadoEstudante, SolicitacaoStatusAcademico, SolicitacaoStatusAcademicoTipo, TipoEnsino } from "@/types/api";

const tipos: { value: SolicitacaoStatusAcademicoTipo; label: string }[] = [
  { value: "interrupcao", label: "Interrupção" },
  { value: "desvinculacao", label: "Desvinculação" },
  { value: "revinculacao", label: "Revinculação" },
];

const camposEdicaoLabel: Record<string, string> = {
  nome: "Nome",
  bilhete_identidade: "BI do estudante",
  bilhete_identidade_encarregado: "BI do encarregado",
  data_nascimento: "Data de nascimento",
};

const tiposEnsino: { value: TipoEnsino | ""; label: string }[] = [
  { value: "", label: "Usar histórico" },
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
  { value: "superior", label: "Superior" },
];

const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reprovada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelada: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function tipoLabel(tipo: SolicitacaoStatusAcademicoTipo) {
  return tipos.find((item) => item.value === tipo)?.label ?? tipo;
}

export default function SolicitacoesPageContent() {
  const { isEstudante, isAcademia, isAdmin, loading } = useUserType();
  const [items, setItems] = useState<SolicitacaoStatusAcademico[]>([]);
  const [editItems, setEditItems] = useState<SolicitacaoEdicaoDadoEstudante[]>([]);
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [academiaSelecionada, setAcademiaSelecionada] = useState("");
  const [tipo, setTipo] = useState<SolicitacaoStatusAcademicoTipo>("interrupcao");
  const [motivo, setMotivo] = useState("");
  const [codigoAcademia, setCodigoAcademia] = useState("");
  const [tipoEnsino, setTipoEnsino] = useState<TipoEnsino | "">("");
  const [cursoMedioId, setCursoMedioId] = useState("");
  const [cursoSuperiorId, setCursoSuperiorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDecide = isAcademia;

  const load = useCallback(async () => {
    if (!isEstudante && !isAcademia && !isAdmin) return;
    if (isAdmin && !academiaSelecionada) return;
    setRefreshing(true);
    setError(null);
    try {
      const response = isEstudante
        ? await estudanteService.listarMinhasSolicitacoesStatusAcademico()
        : isAcademia
          ? await academiaService.listarSolicitacoesStatusAcademico()
          : await adminService.listarSolicitacoesStatusAcademico({ codigo_academia: academiaSelecionada });
      setItems(response.solicitacoes ?? []);

      if (isEstudante) {
        const editResponse = await estudanteService.listarMinhasSolicitacoesEdicao();
        setEditItems(editResponse.solicitacoes ?? []);
      } else if (isAcademia) {
        const editResponse = await academiaService.listarSolicitacoesEdicaoEstudante();
        setEditItems(editResponse.solicitacoes ?? []);
      } else {
        setEditItems([]);
      }
    } catch (err) {
      setError(formatApiError(err, "Não foi possível carregar as solicitações."));
    } finally {
      setRefreshing(false);
    }
  }, [academiaSelecionada, isAcademia, isAdmin, isEstudante]);

  useEffect(() => {
    if (!loading && !isAdmin) void load();
  }, [isAdmin, load, loading]);

  useEffect(() => {
    if (!loading && isAdmin) {
      setItems([]);
      setEditItems([]);
      setError(null);
      consultasService
        .listarAcademias({ status: "ativo" })
        .then((response) => setAcademias(response.academias ?? []))
        .catch((err) => setError(formatApiError(err, "Não foi possível carregar as academias.")));
    }
  }, [isAdmin, loading]);

  const pendentes = useMemo(() => items.filter((item) => item.status === "pendente").length, [items]);
  const edicoesPendentes = useMemo(() => editItems.filter((item) => item.status === "pendente").length, [editItems]);

  async function submitStudentRequest(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (tipo === "interrupcao") await estudanteService.solicitarInterrupcao({ motivo });
      if (tipo === "desvinculacao") await estudanteService.solicitarDesvinculacao({ motivo });
      if (tipo === "revinculacao") {
        await estudanteService.solicitarRevinculacao(codigoAcademia, {
          motivo,
          tipo_ensino: tipoEnsino || undefined,
          curso_medio_id: cursoMedioId || null,
          curso_superior_id: cursoSuperiorId || null,
        });
      }
      setMessage("Solicitação criada com sucesso.");
      setMotivo("");
      setCodigoAcademia("");
      setTipoEnsino("");
      setCursoMedioId("");
      setCursoSuperiorId("");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Não foi possível criar a solicitação."));
    } finally {
      setSaving(false);
    }
  }

  async function decidir(item: SolicitacaoStatusAcademico, action: "aprovar" | "reprovar") {
    const texto = action === "aprovar" ? "Observação da academia (opcional)" : "Motivo da reprovação";
    const resposta = window.prompt(texto, "");
    if (action === "reprovar" && !resposta?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const codigo = item.codigo_estudante;
      if (action === "aprovar") {
        const data = { solicitacao_id: item.codigo_solicitacao, observacao_academia: resposta?.trim() || undefined };
        if (item.tipo === "interrupcao") await academiaService.aprovarInterrupcaoPercurso(codigo, data);
        if (item.tipo === "desvinculacao") await academiaService.aprovarDesvinculacao(codigo, data);
        if (item.tipo === "revinculacao") await academiaService.aprovarRevinculacao(codigo, data);
      } else {
        const data = { solicitacao_id: item.codigo_solicitacao, motivo_reprovacao: resposta!.trim() };
        if (item.tipo === "interrupcao") await academiaService.reprovarInterrupcaoPercurso(codigo, data);
        if (item.tipo === "desvinculacao") await academiaService.reprovarDesvinculacao(codigo, data);
        if (item.tipo === "revinculacao") await academiaService.reprovarRevinculacao(codigo, data);
      }
      setMessage(action === "aprovar" ? "Solicitação aprovada." : "Solicitação reprovada.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Não foi possível decidir a solicitação."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Carregando...</div>;

  return (
    <div>
      <PageBreadcrumb pageTitle="Solicitações" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status acadêmico</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isEstudante ? "Crie e acompanhe suas solicitações." : isAcademia ? "Analise solicitações pendentes da sua academia." : "Consulte solicitações por instituição."}</p>
            </div>
            <button onClick={load} disabled={refreshing || (isAdmin && !academiaSelecionada)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-gray-700 dark:text-gray-200">{refreshing ? "Atualizando..." : `Atualizar (${pendentes + edicoesPendentes} pendentes)`}</button>
          </div>
        </section>

        {isAdmin && (
          <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:grid-cols-[1fr_auto] md:items-end">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Academia
              <div className="mt-1">
                <SearchableSelect
                  value={academiaSelecionada}
                  options={academias.map((academia) => ({ value: academia.codigo_academia, label: `${academia.nome} · ${academia.codigo_academia}` }))}
                  onChange={(value) => {
                    setAcademiaSelecionada(value);
                    setItems([]);
                  }}
                  placeholder="Selecione a academia"
                  isSearchable={false}
                />
              </div>
            </label>
            <button type="button" onClick={load} disabled={refreshing || !academiaSelecionada} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
              {refreshing ? "Consultando..." : "Consultar solicitações"}
            </button>
          </section>
        )}

        {message && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300">{message}</div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

        {isEstudante && (
          <form onSubmit={submitStudentRequest} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo
              <div className="mt-1">
                <SearchableSelect value={tipo} options={tipos} onChange={(value) => setTipo(value as SolicitacaoStatusAcademicoTipo)} isSearchable={false} />
              </div>
            </label>
            {tipo === "revinculacao" && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Código da academia<input value={codigoAcademia} onChange={(e) => setCodigoAcademia(e.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 dark:border-gray-700" /></label>}
            {tipo === "revinculacao" && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de ensino<div className="mt-1"><SearchableSelect value={tipoEnsino} options={tiposEnsino} onChange={(value) => setTipoEnsino(value as TipoEnsino | "")} isSearchable={false} /></div></label>}
            {tipo === "revinculacao" && tipoEnsino === "medio" && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Curso médio (opcional)<input value={cursoMedioId} onChange={(e) => setCursoMedioId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 dark:border-gray-700" /></label>}
            {tipo === "revinculacao" && tipoEnsino === "superior" && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Curso superior (opcional)<input value={cursoSuperiorId} onChange={(e) => setCursoSuperiorId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 dark:border-gray-700" /></label>}
            <label className="md:col-span-2 text-sm font-medium text-gray-700 dark:text-gray-300">Motivo<textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} required rows={3} className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 dark:border-gray-700" /></label>
            <button disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Enviando..." : "Criar solicitação"}</button>
          </form>
        )}

        {(isEstudante || isAcademia) && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Solicitações de edição de dados</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Listagem somente para acompanhamento. Novas solicitações devem ser enviadas pela página Personalizar.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{["Código", "Campo", "Status", "Estudante", "Academia", "Valor solicitado", "Criada em"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {editItems.map((item) => <tr key={item.codigo_solicitacao}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.codigo_solicitacao}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{camposEdicaoLabel[item.campo] ?? item.campo}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[item.status] ?? statusClass.cancelada}`}>{item.status}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_estudante}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_academia}</td>
                    <td className="max-w-xs px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.valor_solicitado}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(item.created_at)}</td>
                  </tr>)}
                  {editItems.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma solicitação de edição encontrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/40"><tr>{["Código", "Tipo", "Status", "Estudante", "Academia", "Motivo", "Criada em", "Ações"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => <tr key={item.codigo_solicitacao}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.codigo_solicitacao}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{tipoLabel(item.tipo)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[item.status] ?? statusClass.cancelada}`}>{item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.estudante_nome ?? item.codigo_estudante}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.academia_nome ?? item.codigo_academia}</td>
                  <td className="max-w-xs px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.motivo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3 text-sm">{canDecide && item.status === "pendente" ? <div className="flex gap-2"><button onClick={() => decidir(item, "aprovar")} disabled={saving} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white">Aprovar</button><button onClick={() => decidir(item, "reprovar")} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white">Reprovar</button></div> : "—"}</td>
                </tr>)}
                {items.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma solicitação encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
