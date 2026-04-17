// src/components/faltas/FaltasAdmin.tsx
"use client"
import { useState, useEffect } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Pagination from "@/components/common/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ITEMS_PER_PAGE = 50;

export default function FaltasAdmin() {
  const [filtroAcademia, setFiltroAcademia] = useState("");
  const [filtroEstudante, setFiltroEstudante] = useState("");
  const [pagina, setPagina] = useState(1);

  const {
    data: dataFaltas,
    loading: carregandoFaltas,
    error: erroFaltas,
    execute: carregarFaltas,
  } = useApi(consultasService.listarFaltas);

  useEffect(() => {
    const token = tokenStorage.get();
    carregarFaltas({
      limit: ITEMS_PER_PAGE,
      offset: (pagina - 1) * ITEMS_PER_PAGE,
      token: token || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  const faltas = dataFaltas?.faltas ?? [];
  const totalGeral = dataFaltas?.total_geral ?? 0;
  const totalPaginas = Math.ceil(totalGeral / ITEMS_PER_PAGE);

  const faltasFiltradas = faltas.filter(falta => {
    const matchAcademia =
      !filtroAcademia ||
      falta.codigo_academia.toLowerCase().includes(filtroAcademia.toLowerCase());
    const matchEstudante =
      !filtroEstudante ||
      falta.codigo_estudante.toLowerCase().includes(filtroEstudante.toLowerCase());
    return matchAcademia && matchEstudante;
  });

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getFaltasColor = (quantidade: number) => {
    if (quantidade >= 5) return "text-red-600 dark:text-red-400";
    if (quantidade >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const handleAtualizar = () => {
    const token = tokenStorage.get();
    carregarFaltas({
      limit: ITEMS_PER_PAGE,
      offset: (pagina - 1) * ITEMS_PER_PAGE,
      token: token || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Todas as Faltas do Sistema
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visualize todas as faltas registradas no sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dataFaltas && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm text-red-700 dark:text-red-300">
                <strong>{totalGeral}</strong> faltas no total
              </span>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleAtualizar}
            disabled={carregandoFaltas}
          >
            <Icon icon="mdi:refresh" width={16} className="mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {erroFaltas && (
        <Alert variant="error" title="Erro" message={erroFaltas} />
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por Academia
            </label>
            <input
              type="text"
              placeholder="Ex: LDA001"
              value={filtroAcademia}
              onChange={(e) => setFiltroAcademia(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por Estudante
            </label>
            <input
              type="text"
              placeholder="Ex: EST001"
              value={filtroEstudante}
              onChange={(e) => setFiltroEstudante(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Estudante
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Academia
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Matéria
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                  Quantidade
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Data
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Ano
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Observação
                </TableCell>
              </TableRow>
            </TableHeader>

            {carregandoFaltas && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Carregando faltas...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoFaltas && faltasFiltradas.length === 0 && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Icon
                        icon={totalGeral === 0 ? "mdi:check-circle" : "mdi:filter-outline"}
                        width={64}
                        className={totalGeral === 0 ? "text-green-400 dark:text-green-500 mb-4" : "text-gray-400 dark:text-gray-500 mb-4"}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {totalGeral === 0
                          ? "Nenhuma falta registrada no sistema"
                          : "Nenhuma falta encontrada com os filtros aplicados"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoFaltas && faltasFiltradas.length > 0 && (
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {faltasFiltradas.map((falta) => (
                  <TableRow
                    key={falta.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">
                      {falta.codigo_estudante}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {falta.codigo_academia}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 capitalize">
                      {falta.materia_nome}
                    </TableCell>
                    <TableCell
                      className={`px-5 py-3 text-center text-theme-lg font-bold ${getFaltasColor(falta.quantidade)}`}
                    >
                      {falta.quantidade}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatarData(falta.data)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {falta.ano_lectivo}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {falta.observacao || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <Pagination
          currentPage={pagina}
          totalPages={totalPaginas}
          totalItems={totalGeral}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPagina}
          loading={carregandoFaltas}
        />
      )}

      {/* Estatísticas da página atual */}
      {faltasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Icon
                  icon="mdi:calendar-remove"
                  width={24}
                  className="text-red-600 dark:text-red-400"
                />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Faltas (página)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {faltasFiltradas.reduce((acc, f) => acc + f.quantidade, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Icon
                  icon="mdi:calendar"
                  width={24}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Registros (página)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {faltasFiltradas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Icon
                  icon="mdi:account-group"
                  width={24}
                  className="text-yellow-600 dark:text-yellow-400"
                />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Estudantes Únicos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(faltasFiltradas.map((f) => f.codigo_estudante)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}