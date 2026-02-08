// src/components/notas/NotasAdmin.tsx
"use client"
import { useState, useEffect } from "react";
import { useApi, adminService, tokenStorage } from "@/lib/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function NotasAdmin() {
  const [filtroAcademia, setFiltroAcademia] = useState("");
  const [filtroEstudante, setFiltroEstudante] = useState("");
  
  const { 
    data: dataRegistros, 
    loading: carregandoRegistros, 
    error: erroRegistros, 
    execute: carregarRegistros 
  } = useApi(adminService.listarTodosRegistros);

  useEffect(() => {
    const token = tokenStorage.get();
    carregarRegistros({ tipo: "notas", token: token || undefined });
  }, []);

  const notasFiltradas = dataRegistros?.notas?.filter(nota => {
    const matchAcademia = !filtroAcademia || 
      nota.codigo_academia.toLowerCase().includes(filtroAcademia.toLowerCase());
    const matchEstudante = !filtroEstudante || 
      nota.codigo_estudante.toLowerCase().includes(filtroEstudante.toLowerCase());
    return matchAcademia && matchEstudante;
  }) || [];

  const formatarPeriodo = (periodo: string) => {
    const periodos: Record<string, string> = {
      "1_trimestre": "1º Trimestre",
      "2_trimestre": "2º Trimestre",
      "3_trimestre": "3º Trimestre",
      "1_semestre": "1º Semestre",
      "2_semestre": "2º Semestre",
    };
    return periodos[periodo] || periodo;
  };

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const getNotaColor = (nota: number) => {
    if (nota >= 14) return "text-green-600 dark:text-green-400";
    if (nota >= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleAtualizar = () => {
    const token = tokenStorage.get();
    carregarRegistros({ tipo: "notas", token: token || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Todas as Notas do Sistema
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visualize todas as notas registradas no sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dataRegistros && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{dataRegistros.total_notas || 0}</strong> notas registradas
              </span>
            </div>
          )}
          <Button 
            size="sm" 
            onClick={handleAtualizar}
            disabled={carregandoRegistros}
          >
            <Icon icon="mdi:refresh" width={16} className="mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {erroRegistros && (
        <Alert variant="error" title="Erro" message={erroRegistros} />
      )}

      {/* Filtros */}
      {dataRegistros && dataRegistros.total_notas! > 0 && (
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
      )}

      {/* Tabela de Notas */}
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
                  Nota
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Período
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Ano
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Data Registro
                </TableCell>
              </TableRow>
            </TableHeader>

            {carregandoRegistros && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Carregando notas...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoRegistros && (!dataRegistros || !dataRegistros.total_notas || dataRegistros.total_notas === 0) && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Icon icon="mdi:file-document-outline" width={64} className="text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Nenhuma nota registrada no sistema
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoRegistros && notasFiltradas.length === 0 && dataRegistros && dataRegistros.total_notas! > 0 && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Icon icon="mdi:filter-outline" width={64} className="text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Nenhuma nota encontrada com os filtros aplicados
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoRegistros && notasFiltradas.length > 0 && (
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {notasFiltradas.map((nota) => (
                  <TableRow key={nota.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">
                      {nota.codigo_estudante}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {nota.codigo_academia}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 capitalize">
                      {nota.materia_nome}
                    </TableCell>
                    <TableCell className={`px-5 py-3 text-center text-theme-lg font-bold ${getNotaColor(nota.nota)}`}>
                      {nota.nota.toFixed(2)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatarPeriodo(nota.periodo)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {nota.ano_lectivo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatarData(nota.registered_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>
      </div>

      {/* Estatísticas */}
      {notasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Icon icon="mdi:file-document" width={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Filtrado</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {notasFiltradas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Icon icon="mdi:chart-line" width={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Média Geral</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(notasFiltradas.reduce((acc, n) => acc + n.nota, 0) / notasFiltradas.length).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Icon icon="mdi:account-group" width={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estudantes Únicos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(notasFiltradas.map(n => n.codigo_estudante)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}