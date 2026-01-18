"use client"
import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import { useApiQuery, inscricoesService } from '@/lib/api';
import type { Inscricao, StatusInscricao } from '@/types/api';

import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ITEMS_PER_PAGE = 20;

export default function Inscricoes() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusInscricao | undefined>(undefined);
  
  // Calcular offset baseado na página atual
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  
  const {
    data: dataInscricoes, 
    loading: carregandoInscricoes, 
    error: erroInscricoes, 
    refetch
  } = useApiQuery(() => 
    inscricoesService.listarInscricoes({
      status: statusFilter,
      limit: ITEMS_PER_PAGE,
      offset: offset
    })
  );

  // Refetch quando mudar página ou filtro
  useEffect(() => {
    refetch();
  }, [currentPage, statusFilter]);

  // Calcular total de páginas
  const totalPages = dataInscricoes 
    ? Math.ceil(dataInscricoes.total_geral / ITEMS_PER_PAGE)
    : 0;

  // Handler de mudança de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handler de filtro de status
  const handleStatusFilter = (status: StatusInscricao | undefined) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  };

  // Função para formatar status
  const formatarStatus = (status: StatusInscricao) => {
    const statusMap = {
      'espera': { label: 'Em Espera', color: 'warning' as const },
      'aprovado': { label: 'Aprovado', color: 'success' as const },
      'reprovado': { label: 'Reprovado', color: 'danger' as const },
    };
    return statusMap[status] || { label: status, color: 'default' as const };
  };

  // Função para formatar data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="">
      <PageBreadcrumb pageTitle="Inscrições" />
      
      <div className="space-y-6">
        {/* Filtros e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              disabled={carregandoInscricoes} 
              size="sm" 
              onClick={() => refetch()}
            >
              Atualizar
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === undefined ? "primary" : "outline"}
              onClick={() => handleStatusFilter(undefined)}
            >
              Todas
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === 'espera' ? "primary" : "outline"}
              onClick={() => handleStatusFilter('espera')}
            >
              Em Espera
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === 'aprovado' ? "primary" : "outline"}
              onClick={() => handleStatusFilter('aprovado')}
            >
              Aprovadas
            </Button>
            
            <Button 
              size="sm" 
              variant={statusFilter === 'reprovado' ? "primary" : "outline"}
              onClick={() => handleStatusFilter('reprovado')}
            >
              Reprovadas
            </Button>
          </div>

          {/* Info de Resultados */}
          {dataInscricoes && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{dataInscricoes.total_geral}</span> inscrições encontradas
              {dataInscricoes.user_type && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  Visualização: {dataInscricoes.user_type}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table className="w-full">
              {/* Table Header */}
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

              {/* Loading State */}
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

              {/* Error State */}
              {erroInscricoes && !carregandoInscricoes && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-red-500 mb-2">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Erro ao carregar inscrições
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{erroInscricoes}</p>
                        <Button size="sm" onClick={() => refetch()} className="mt-4">
                          Tentar novamente
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {/* Empty State */}
              {!carregandoInscricoes && dataInscricoes && dataInscricoes.inscricoes && dataInscricoes.inscricoes && dataInscricoes.inscricoes.length === 0 && (
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
                            ? `Não há inscrições com status "${formatarStatus(statusFilter).label}"`
                            : "Ainda não há inscrições registradas"
                          }
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {/* Data */}
              {!carregandoInscricoes && dataInscricoes && dataInscricoes.inscricoes && dataInscricoes.inscricoes.length > 0 && (
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {dataInscricoes.inscricoes.map((inscricao) => {
                    const statusInfo = formatarStatus(inscricao.status);
                    
                    return (
                      <TableRow 
                        key={inscricao.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="max-w-[200px] truncate px-4 py-3 text-gray-700 dark:text-gray-300 text-start text-theme-sm font-medium">
                          {inscricao.codigo_estudante}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate px-4 py-3 text-gray-600 dark:text-gray-400 text-start text-theme-sm">
                          {inscricao.codigo_academia}
                        </TableCell>
                        <TableCell className="max-w-[150px] capitalize truncate px-4 py-3 text-gray-600 dark:text-gray-400 text-start text-theme-sm">
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-white/[0.05] rounded">
                            {inscricao.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate px-4 py-3 text-gray-600 dark:text-gray-400 text-start text-theme-sm">
                          {inscricao.ano_inscricao}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate px-4 py-3 text-gray-600 dark:text-gray-400 text-start text-theme-sm">
                          {inscricao.curso || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge color={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate px-4 py-3 text-gray-600 dark:text-gray-400 text-start text-theme-sm">
                          {formatarData(inscricao.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </div>
        </div>

        {/* Paginação */}
        {dataInscricoes && dataInscricoes.total_geral > 0 && (
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