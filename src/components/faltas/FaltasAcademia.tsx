// src/components/faltas/FaltasAcademia.tsx
"use client"
import { useState, useEffect, useCallback } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import type { Falta, AtualizarFaltaRequest, RegistrarFaltasRequest } from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from "primereact/dropdown";
import DatePicker from "@/components/form/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FaltaComNome extends Falta {
  nome_estudante?: string;
}

// ─── Modal: Excluir Falta ───────────────────────────────────────────────────

function ModalExcluirFalta({
  falta,
  nomeEstudante,
  onConfirm,
  onClose,
}: {
  falta: Falta;
  nomeEstudante: string;
  onConfirm: (motivo: string) => Promise<void>;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!motivo.trim()) { setError("Motivo é obrigatório"); return; }
    setLoading(true);
    try {
      await onConfirm(motivo);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao excluir falta");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Excluir Falta</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Excluir falta de{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">{nomeEstudante}</span>?
          O histórico é preservado no ledger para auditoria.
        </p>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}
        <div className="mb-4">
          <Label>Motivo *</Label>
          <Input
            type="text"
            placeholder="Informe o motivo da exclusão"
            onChange={e => setMotivo(e.target.value)}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <button
            onClick={handle}
            disabled={loading || !motivo.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Editar Falta ────────────────────────────────────────────────────

function ModalEditarFalta({
  isOpen,
  falta,
  materias,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  falta: FaltaComNome;
  materias: { id: string; nome: string }[];
  onConfirm: (data: AtualizarFaltaRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState(falta.data);
  const [materiaId, setMateriaId] = useState(falta.materia_disciplinar_id);
  const [quantidade, setQuantidade] = useState(falta.quantidade.toString());
  const [observacao, setObservacao] = useState(falta.observacao || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd < 1) { setError("Quantidade deve ser no mínimo 1"); return; }
    setLoading(true);
    try {
      await onConfirm({
        id: falta.id,
        data: data || undefined,
        materia_disciplinar_id: materiaId || undefined,
        quantidade: qtd,
        observacao: observacao || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao atualizar falta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-5 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-2">
          <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Editar Falta</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Estudante:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {falta.nome_estudante || falta.codigo_estudante}
            </span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Quantidade de Aulas *</Label>
            <Input
              type="number"
              min="1"
              defaultValue={quantidade}
              onChange={e => setQuantidade(e.target.value)}
            />
          </div>
          <DatePicker
            id={`edit-falta-data-${falta.id}`}
            label="Data da Falta"
            placeholder="Selecione a data"
            defaultDate={data}
            onChange={(selectedDates) => {
              if (selectedDates && selectedDates.length > 0) {
                setData(selectedDates[0].toISOString().split("T")[0]);
              }
            }}
          />
        </div>

        <div>
          <Label>Matéria</Label>
          <Dropdown
            value={materiaId}
            options={materias.map(m => ({ label: m.nome, value: m.id }))}
            onChange={e => setMateriaId(e.value)}
            filter
            placeholder="Selecione a matéria"
            className="w-full"
            emptyMessage="Nenhuma matéria encontrada"
          />
        </div>

        <div>
          <Label>Observação</Label>
          <Input
            type="text"
            placeholder="Ex: Falta justificada"
            defaultValue={observacao}
            onChange={e => setObservacao(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

const MAX_LIMIT = 1000;

export default function FaltasAcademia() {
  const { isOpen, openModal, closeModal } = useModal();
  const [alert, setAlert] = useState<{
    variant: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // Register form state
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [dataFalta, setDataFalta] = useState(new Date().toISOString().split("T")[0]);
  const [materiaId, setMateriaId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");

  // Faltas list state
  const [todasFaltas, setTodasFaltas] = useState<FaltaComNome[]>([]);
  const [carregandoFaltas, setCarregandoFaltas] = useState(false);
  const [faltasCarregadas, setFaltasCarregadas] = useState(false);

  // Edit / Delete state
  const [editingFalta, setEditingFalta] = useState<FaltaComNome | null>(null);
  const [deletingFalta, setDeletingFalta] = useState<FaltaComNome | null>(null);

  // Filters
  const [filtroAno, setFiltroAno] = useState("todos");
  const [filtroEstudante, setFiltroEstudante] = useState("");

  // API hooks
  const { execute: executarRegistrar, loading: registrando } = useApi(academiaService.registrarFaltas);
  const { execute: executarAtualizar } = useApi(academiaService.atualizarFalta);
  const { execute: executarDeletar } = useApi(academiaService.deletarFalta);
  const { data: dataMaterias, execute: carregarMaterias } = useApi(academiaService.listarMaterias);
  const { data: dataEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { execute: carregarFaltasPage } = useApi(consultasService.listarFaltas);

  const token = tokenStorage.get() || undefined;

  useEffect(() => {
    carregarMaterias(token);
    carregarEstudantes(undefined, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAlert = (
    variant: "success" | "error" | "warning" | "info",
    message: string
  ) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Mapa codigo_estudante -> nome para enriquecer as faltas
  const estudantesMap = new Map<string, string>();
  ((dataEstudantes as any)?.estudantes ?? []).forEach((e: any) => {
    estudantesMap.set(e.codigo_estudante, e.nome);
  });

  // Carrega todas as faltas da academia via GET /faltas (escopo por academia no backend)
  const carregarTodasFaltas = useCallback(async () => {
    setCarregandoFaltas(true);
    try {
      // Primeira página para saber o total
      const primeira = await carregarFaltasPage({ limit: MAX_LIMIT, offset: 0, token });
      if (!primeira) { setCarregandoFaltas(false); return; }

      const totalGeral = primeira.total_geral ?? primeira.total ?? 0;
      let acumulado: Falta[] = [...(primeira.faltas ?? [])];

      // Buscar páginas restantes se necessário
      if (totalGeral > MAX_LIMIT) {
        const paginas = Math.ceil(totalGeral / MAX_LIMIT);
        const promises = [];
        for (let p = 1; p < paginas; p++) {
          promises.push(carregarFaltasPage({ limit: MAX_LIMIT, offset: p * MAX_LIMIT, token }));
        }
        const resultados = await Promise.all(promises);
        resultados.forEach(r => { if (r) acumulado = [...acumulado, ...(r.faltas ?? [])]; });
      }

      // Enriquecer com nome do estudante
      const faltasComNome: FaltaComNome[] = acumulado.map(f => ({
        ...f,
        nome_estudante: estudantesMap.get(f.codigo_estudante),
      }));

      faltasComNome.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setTodasFaltas(faltasComNome);
      setFaltasCarregadas(true);
    } catch (err: any) {
      showAlert("error", err?.message ?? "Erro ao carregar faltas");
    } finally {
      setCarregandoFaltas(false);
    }
  }, [token, estudantesMap, carregarFaltasPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // POST /academia/faltas-aluno
  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoEstudante || !dataFalta || !materiaId || !quantidade) {
      showAlert("error", "Preencha todos os campos obrigatórios");
      return;
    }
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd < 1) {
      showAlert("error", "Quantidade deve ser um número positivo");
      return;
    }
    try {
      const payload: RegistrarFaltasRequest = {
        codigo_estudante: codigoEstudante,
        data: dataFalta,
        materia_disciplinar_id: materiaId,
        quantidade: qtd,
        observacao: observacao || undefined,
      };
      await executarRegistrar(payload, token);
      showAlert("success", "Falta registrada com sucesso!");
      setCodigoEstudante("");
      setDataFalta(new Date().toISOString().split("T")[0]);
      setMateriaId("");
      setQuantidade("");
      setObservacao("");
      closeModal();
      if (faltasCarregadas) await carregarTodasFaltas();
    } catch (err: any) {
      showAlert("error", err?.message || "Erro ao registrar falta");
    }
  };

  // PUT /academia/atualizar-falta
  const handleAtualizar = async (data: AtualizarFaltaRequest) => {
    await executarAtualizar(data, token);
    showAlert("success", "Falta atualizada com sucesso!");
    if (faltasCarregadas) await carregarTodasFaltas();
  };

  // DELETE /academia/falta/:id
  const handleDeletar = async (faltaId: string, motivo: string) => {
    await executarDeletar(faltaId, motivo, token);
    showAlert("success", "Falta excluída com sucesso!");
    setDeletingFalta(null);
    if (faltasCarregadas) await carregarTodasFaltas();
  };

  const handleOpenModal = () => {
    setCodigoEstudante("");
    setDataFalta(new Date().toISOString().split("T")[0]);
    setMateriaId("");
    setQuantidade("");
    setObservacao("");
    openModal();
  };

  // Derived
  const materiasAtivas = (dataMaterias as any)?.materias?.filter((m: any) => m.status === "ativo") ?? [];
  const estudantes = (dataEstudantes as any)?.estudantes ?? [];

  const anosDisponiveis = Array.from(
    new Set(todasFaltas.map(f => f.ano_lectivo))
  ).sort().reverse();

  const faltasFiltradas = todasFaltas.filter(f => {
    const matchAno = filtroAno === "todos" || f.ano_lectivo === filtroAno;
    const term = filtroEstudante.toLowerCase();
    const matchEst =
      !term ||
      f.nome_estudante?.toLowerCase().includes(term) ||
      f.codigo_estudante.toLowerCase().includes(term);
    return matchAno && matchEst;
  });

  const totalFaltas = faltasFiltradas.reduce((acc, f) => acc + f.quantidade, 0);

  const formatarData = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const corQuantidade = (q: number) => {
    if (q >= 5) return "text-red-600 dark:text-red-400";
    if (q >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-700 dark:text-gray-300";
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alert && (
        <Alert
          variant={alert.variant}
          title={
            alert.variant === "success"
              ? "Sucesso"
              : alert.variant === "error"
              ? "Erro"
              : "Aviso"
          }
          message={alert.message}
        />
      )}

      {/* Delete modal */}
      {deletingFalta && (
        <ModalExcluirFalta
          falta={deletingFalta}
          nomeEstudante={deletingFalta.nome_estudante || deletingFalta.codigo_estudante}
          onConfirm={(motivo) => handleDeletar(deletingFalta.id, motivo)}
          onClose={() => setDeletingFalta(null)}
        />
      )}

      {/* Edit modal */}
      {editingFalta && (
        <ModalEditarFalta
          isOpen
          falta={editingFalta}
          materias={materiasAtivas.map((m: any) => ({ id: m.id, nome: m.nome }))}
          onConfirm={async (data) => {
            await handleAtualizar(data);
            setEditingFalta(null);
          }}
          onClose={() => setEditingFalta(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gerenciar Faltas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Registre e gerencie as faltas dos estudantes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            startIcon={<Icon icon="mdi:refresh" />}
            onClick={carregarTodasFaltas}
            disabled={carregandoFaltas}
          >
            {carregandoFaltas
              ? "Carregando..."
              : faltasCarregadas
              ? "Atualizar Faltas"
              : "Carregar Faltas"}
          </Button>
          <Button
            size="sm"
            startIcon={<Icon icon="mdi:plus" />}
            onClick={handleOpenModal}
          >
            Registrar Falta
          </Button>
        </div>
      </div>

      {/* Info banner — shown only before first load */}
      {!faltasCarregadas && !carregandoFaltas && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon
              icon="mdi:information"
              width={20}
              className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300 text-sm">
                Clique em "Carregar Faltas" para visualizar os registros existentes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {carregandoFaltas && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Carregando faltas...
          </p>
        </div>
      )}

      {/* Stats + Filters + Table */}
      {faltasCarregadas && !carregandoFaltas && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                <Icon icon="mdi:format-list-bulleted" width={20} className="text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Registros</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {faltasFiltradas.length}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                <Icon icon="mdi:calendar-remove" width={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total de Faltas</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {totalFaltas}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex-shrink-0">
                <Icon icon="mdi:account-group" width={20} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Estudantes Afetados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(faltasFiltradas.map(f => f.codigo_estudante)).size}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ano Lectivo
                </label>
                <select
                  value={filtroAno}
                  onChange={e => setFiltroAno(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="todos">Todos os anos</option>
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>
                      {ano.replace("_", "/")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar Estudante
                </label>
                <input
                  type="text"
                  placeholder="Nome ou código"
                  value={filtroEstudante}
                  onChange={e => setFiltroEstudante(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Estudante
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Matéria
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Qtd
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Data
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Ano Lectivo
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Observação
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {faltasFiltradas.length === 0 ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <Icon
                            icon={todasFaltas.length === 0 ? "mdi:check-circle" : "mdi:filter-outline"}
                            width={48}
                            className="text-gray-300 dark:text-gray-600 mb-3"
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {todasFaltas.length === 0
                              ? "Nenhuma falta registrada"
                              : "Nenhuma falta com os filtros aplicados"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {faltasFiltradas.map(falta => (
                      <TableRow
                        key={falta.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <TableCell className="px-5 py-3 text-start">
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {falta.nome_estudante || falta.codigo_estudante}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {falta.codigo_estudante}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-start text-theme-sm capitalize">
                          {falta.materia_nome || falta.materia_disciplinar_id}
                        </TableCell>
                        <TableCell
                          className={`px-5 py-3 text-center font-bold text-theme-lg ${corQuantidade(falta.quantidade)}`}
                        >
                          {falta.quantidade}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {formatarData(falta.data)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {falta.ano_lectivo?.replace("_", "/")}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {falta.observacao || "—"}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingFalta(falta)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                              title="Editar"
                            >
                              <Icon icon="mdi:pencil" width={16} />
                            </button>
                            <button
                              onClick={() => setDeletingFalta(falta)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Excluir"
                            >
                              <Icon icon="mdi:delete-outline" width={16} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Register Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[640px] p-5 lg:p-10">
        <form onSubmit={handleRegistrar}>
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            Registrar Nova Falta
          </h4>

          <div className="space-y-4">
            <div>
              <Label>Estudante *</Label>
              <Dropdown
                value={codigoEstudante}
                options={estudantes.map((e: any) => ({
                  label: `${e.nome} (${e.codigo_estudante})`,
                  value: e.codigo_estudante,
                }))}
                onChange={e => setCodigoEstudante(e.value)}
                filter
                placeholder="Selecione o estudante"
                className="w-full"
                emptyMessage="Nenhum estudante encontrado"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantidade de Aulas *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 2"
                  defaultValue={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                />
              </div>
              <DatePicker
                id="registrar-falta-data"
                label="Data da Falta *"
                placeholder="Selecione a data"
                defaultDate={dataFalta}
                onChange={(selectedDates) => {
                  if (selectedDates && selectedDates.length > 0) {
                    setDataFalta(selectedDates[0].toISOString().split("T")[0]);
                  }
                }}
              />
            </div>

            <div>
              <Label>Matéria *</Label>
              <Dropdown
                value={materiaId}
                options={materiasAtivas.map((m: any) => ({ label: m.nome, value: m.id }))}
                onChange={e => setMateriaId(e.value)}
                filter
                placeholder="Selecione a matéria"
                className="w-full"
                emptyMessage="Nenhuma matéria ativa encontrada"
              />
            </div>

            <div>
              <Label>Observação</Label>
              <Input
                type="text"
                placeholder="Ex: Falta justificada"
                onChange={e => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Button variant="outline" onClick={closeModal} disabled={registrando}>
              Cancelar
            </Button>
            <Button disabled={registrando}>
              {registrando ? "Registrando..." : "Registrar Falta"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
