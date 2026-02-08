// src/components/notas/NotasEstudante.tsx
"use client"
import { useState, useEffect } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import { Nota } from "@/types/api";
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

export default function NotasEstudante() {
  const { user } = useUserCookie();
  const [anoFiltro, setAnoFiltro] = useState<string>("todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("todos");
  
  const { 
    data: dataNotas, 
    loading: carregandoNotas, 
    error: erroNotas, 
    execute: carregarNotas 
  } = useApi(consultasService.notasEstudante);

  useEffect(() => {
    if (user?.estudante?.codigo_estudante) {
      const token = tokenStorage.get();
      carregarNotas(user.estudante.codigo_estudante, token || undefined);
    }
  }, [user]);

  const notasFiltradas = dataNotas?.notas.filter(nota => {
    const matchAno = anoFiltro === "todos" || nota.ano_lectivo === anoFiltro;
    const matchPeriodo = periodoFiltro === "todos" || nota.periodo === periodoFiltro;
    return matchAno && matchPeriodo;
  }) || [];

  const anosDisponiveis = Array.from(
    new Set(dataNotas?.notas.map(n => n.ano_lectivo) || [])
  ).sort().reverse();

  const periodosDisponiveis = Array.from(
    new Set(dataNotas?.notas.map(n => n.periodo) || [])
  );

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

  const getNotaColor = (nota: number) => {
    if (nota >= 14) return "text-green-600 dark:text-green-400";
    if (nota >= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const calcularMedia = () => {
    if (notasFiltradas.length === 0) return 0;
    const soma = notasFiltradas.reduce((acc, nota) => acc + nota.nota, 0);
    return (soma / notasFiltradas.length).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Minhas Notas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visualize seu desempenho acadêmico
          </p>
        </div>

        {dataNotas && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Média Geral:</strong> {calcularMedia()}
              </span>
            </div>
            <Button size="sm" onClick={() => carregarNotas(user!.estudante!.codigo_estudante)}>
              <Icon icon="mdi:refresh" width={16} className="mr-2" />
              Atualizar
            </Button>
          </div>
        )}
      </div>

      {erroNotas && (
        <Alert variant="error" title="Erro" message={erroNotas} />
      )}

      {/* Filtros */}
      {dataNotas && dataNotas.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
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

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Período
              </label>
              <select
                value={periodoFiltro}
                onChange={(e) => setPeriodoFiltro(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="todos">Todos os períodos</option>
                {periodosDisponiveis.map(periodo => (
                  <option key={periodo} value={periodo}>
                    {formatarPeriodo(periodo)}
                  </option>
                ))}
              </select>
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
                  Matéria
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                  Nota
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Período
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Ano Lectivo
                </TableCell>
                <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Observação
                </TableCell>
              </TableRow>
            </TableHeader>

            {carregandoNotas && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
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

            {!carregandoNotas && (!dataNotas || dataNotas.total === 0) && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Icon icon="mdi:file-document-outline" width={64} className="text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Nenhuma nota registrada ainda
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {!carregandoNotas && notasFiltradas.length === 0 && dataNotas && dataNotas.total > 0 && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
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

            {!carregandoNotas && notasFiltradas.length > 0 && (
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {notasFiltradas.map((nota) => (
                  <TableRow key={nota.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium capitalize">
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
                    <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {nota.observacao || "-"}
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
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Icon icon="mdi:chart-line" width={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Média</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {calcularMedia()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Icon icon="mdi:file-document" width={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Notas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {notasFiltradas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Icon icon="mdi:star" width={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Melhor Nota</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.max(...notasFiltradas.map(n => n.nota)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}