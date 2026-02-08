// src/components/faltas/FaltasEstudante.tsx
"use client"
import { useState, useEffect } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import { Falta } from "@/types/api";
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
import { useUserCookie } from "@/hooks/useUserCookie";

export default function FaltasEstudante() {
  const { user } = useUserCookie();
  const [anoFiltro, setAnoFiltro] = useState<string>("todos");
  
  const { 
    data: dataFaltas, 
    loading: carregandoFaltas, 
    error: erroFaltas, 
    execute: carregarFaltas 
  } = useApi(consultasService.faltasEstudante);

  useEffect(() => {
    if (user?.estudante?.codigo_estudante) {
      const token = tokenStorage.get();
      carregarFaltas(user.estudante.codigo_estudante, token || undefined);
    }
  }, [user]);

  const faltasFiltradas = dataFaltas?.faltas.filter(falta => {
    return anoFiltro === "todos" || falta.ano_lectivo === anoFiltro;
  }) || [];

  const anosDisponiveis = Array.from(
    new Set(dataFaltas?.faltas.map(f => f.ano_lectivo) || [])
  ).sort().reverse();

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const calcularTotalFaltas = () => {
    return faltasFiltradas.reduce((acc, falta) => acc + falta.quantidade, 0);
  };

  const getFaltasColor = (quantidade: number) => {
    if (quantidade >= 5) return "text-red-600 dark:text-red-400";
    if (quantidade >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Minhas Faltas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Acompanhe seu registro de faltas
          </p>
        </div>

        {dataFaltas && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm text-red-700 dark:text-red-300">
                <strong>Total de Faltas:</strong> {calcularTotalFaltas()}
              </span>
            </div>
            <Button size="sm" onClick={() => carregarFaltas(user!.estudante!.codigo_estudante)}>
              <Icon icon="mdi:refresh" width={16} className="mr-2" />
              Atualizar
            </Button>
          </div>
        )}
      </div>

      {erroFaltas && (
        <Alert variant="error" title="Erro" message={erroFaltas} />
      )}

      {/* Filtros */}
      {dataFaltas && dataFaltas.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ano Lectivo
              </label>
              <select
                value={anoFiltro}
                onChange={(e) => setAnoFiltro(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="todos">Todos os anos</option>
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Faltas */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
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
                  Ano Lectivo
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Observação
                </TableCell>
              </TableRow>
            </TableHeader>

            {carregandoFaltas && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
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

            {!carregandoFaltas && (!dataFaltas || dataFaltas.total === 0) && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Icon icon="mdi:check-circle" width={64} className="text-green-400 dark:text-green-500 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Nenhuma falta registrada! Continue assim!
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoFaltas && faltasFiltradas.length === 0 && dataFaltas && dataFaltas.total > 0 && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Icon icon="mdi:filter-outline" width={64} className="text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Nenhuma falta encontrada com os filtros aplicados
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoFaltas && faltasFiltradas.length > 0 && (
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {faltasFiltradas.map((falta) => (
                  <TableRow key={falta.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium capitalize">
                      {falta.materia_nome}
                    </TableCell>
                    <TableCell className={`px-5 py-3 text-center text-theme-lg font-bold ${getFaltasColor(falta.quantidade)}`}>
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

      {/* Estatísticas */}
      {faltasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Icon icon="mdi:calendar-remove" width={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Faltas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {calcularTotalFaltas()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Icon icon="mdi:calendar" width={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Registros</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {faltasFiltradas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Icon icon="mdi:alert" width={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Maior Falta</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.max(...faltasFiltradas.map(f => f.quantidade))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aviso */}
      {calcularTotalFaltas() >= 10 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon icon="mdi:alert-circle" width={24} className="text-red-600 dark:text-red-400 mt-1" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-300">
                Atenção!
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                Você já acumulou {calcularTotalFaltas()} faltas. Tenha cuidado com a frequência!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}