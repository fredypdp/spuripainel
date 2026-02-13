"use client"
import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import { useApi, inscricoesService, tokenStorage } from '@/lib/api';
import type { StatusInscricao } from '@/types/api';

import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableScrollWrapper from "@/components/ui/TableScrollWrapper";

const ITEMS_PER_PAGE = 20;

export default function Inscricoes() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusInscricao | undefined>(undefined);
  const [carregado, setCarregado] = useState(false);
  
  const { data: dataInscricoes, loading: carregandoInscricoes, error: erroInscricoes, execute } = useApi(inscricoesService.listar);

  const loadInscricoes = async () => {
    const token = tokenStorage.get();
    if (!token) return;
    
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      
      await execute({
        status: statusFilter,
        limit: ITEMS_PER_PAGE,
        offset: offset,
        token: token || undefined
      });
      
      setCarregado(true);
    } catch (err) {
    }
  };

  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      loadInscricoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const totalPages = dataInscricoes 
    ? Math.ceil(dataInscricoes.total_geral / ITEMS_PER_PAGE)
    : 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilter = (status: StatusInscricao | undefined) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const formatarStatus = (status: StatusInscricao) => {
    const statusMap = {
      'espera': { label: 'Em Espera', color: 'warning' as const },
      'aprovado': { label: 'Aprovado', color: 'success' as const },
      'reprovado': { label: 'Reprovado', color: 'danger' as const },
    };
    return statusMap[status] || { label: status, color: 'default' as const };
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

  return (
    <div>
      <PageBreadcrumb pageTitle="Inscrições" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              disabled={carregandoInscricoes} 
              size="sm" 
              onClick={loadInscricoes}
            >
              {carregandoInscricoes ? 'Carregando...' : 'Atualizar'}
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === undefined ? "primary" : "outline"}
              onClick={() => handleStatusFilter(undefined)}
              disabled={carregandoInscricoes}
            >
              Todas
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === 'espera' ? "primary" : "outline"}
              onClick={() => handleStatusFilter('espera')}
              disabled={carregandoInscricoes}
            >
              Em Espera
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === 'aprovado' ? "primary" : "outline"}
              onClick={() => handleStatusFilter('aprovado')}
              disabled={carregandoInscricoes}
            >
              Aprovadas
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === 'reprovado' ? "primary" : "outline"}
              onClick={() => handleStatusFilter('reprovado')}
              disabled={carregandoInscricoes}
            >
              Reprovadas
            </Button>
          </div>

          {dataInscricoes && (
            <div className="flex items-center gap-3">
              <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
                <span className="font-medium">{dataInscricoes.total_geral}</span>
                <span className="ml-1">inscrições encontradas</span>
              </div>
              
              {dataInscricoes.user_type && (
                <div className="px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                  Visualização: {dataInscricoes.user_type}
                </div>
              )}
            </div>
          )}
        </div>

        {erroInscricoes && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroInscricoes}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="w-full overflow-x-auto">
            <TableScrollWrapper>
              <Table className="w-full">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Código Estudante
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Código Academia
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Tipo
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Ano
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Curso
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Status
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Data Criação
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {carregandoInscricoes && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando inscrições...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}

                {!carregandoInscricoes && !carregado && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="text-gray-400 dark:text-gray-500 mb-4">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Clique em &quot;Atualizar&quot; para visualizar as inscrições
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}

                {!carregandoInscricoes && carregado && dataInscricoes && dataInscricoes.total_geral === 0 && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="text-gray-400 dark:text-gray-500 mb-2">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Nenhuma inscrição encontrada
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {statusFilter 
                              ? `Não há inscrições com status &quot;${formatarStatus(statusFilter).label}&quot;`
                              : "Ainda não há inscrições registradas"
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}

                {!carregandoInscricoes && dataInscricoes && dataInscricoes.inscricoes && dataInscricoes.inscricoes.length > 0 && (
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {dataInscricoes.inscricoes.map((inscricao) => {
                      const statusInfo = formatarStatus(inscricao.status);
                      
                      return (
                        <TableRow 
                          key={inscricao.id}
                          className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <TableCell className="max-w-[200px] truncate px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">
                            {inscricao.codigo_estudante}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate px-5 py-3 text-gray-500 dark:text-gray-400 text-start text-theme-sm">
                            {inscricao.codigo_academia}
                          </TableCell>
                          <TableCell className="whitespace-nowrap capitalize px-5 py-3 text-start text-theme-sm">
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 rounded font-medium">
                              {inscricao.tipo}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400 text-start text-theme-sm">
                            {inscricao.ano_inscricao}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate px-5 py-3 text-gray-500 dark:text-gray-400 text-start text-theme-sm">
                            {inscricao.curso_id || '-'}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-start">
                            <Badge color={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400 text-start text-theme-sm">
                            {formatarData(inscricao.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                )}
              </Table>
            </TableScrollWrapper>
          </div>
        </div>

        {dataInscricoes && dataInscricoes.total_geral > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={dataInscricoes.total_geral}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            loading={carregandoInscricoes}
          />
        )}
      </div>
    </div>
  );
}