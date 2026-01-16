"use client"
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApiQuery, consultasService } from '@/lib/api';
import type { AnoEscolar, AnoSuperior } from '@/types/api';

import Button from "@/components/ui/button/Button";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Estudantes() {
  const {data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, refetch} = useApiQuery(() => consultasService.listarEstudantes());

  // Função para formatar ano escolar
  const formatarAnoEscolar = (ano: string | null | undefined): string => {
    if (!ano) return '-';

    const mapeamento: Record<string, string> = {
      // Fundamental
      'primeiro_fundamental': '1ª Classe',
      'segundo_fundamental': '2ª Classe',
      'terceiro_fundamental': '3ª Classe',
      'quarto_fundamental': '4ª Classe',
      'quinto_fundamental': '5ª Classe',
      'sexto_fundamental': '6ª Classe',
      'setimo_fundamental': '7ª Classe',
      'oitavo_fundamental': '8ª Classe',
      'nono_fundamental': '9ª Classe',
      // Médio
      'primeiro_medio': '1º Ano Médio',
      'segundo_medio': '2º Ano Médio',
      'terceiro_medio': '3º Ano Médio',
      'quarto_medio': '4º Ano Médio',
      // Superior
      'primeiro_superior': '1º Ano Superior',
      'segundo_superior': '2º Ano Superior',
      'terceiro_superior': '3º Ano Superior',
      'quarto_superior': '4º Ano Superior',
      'quinto_superior': '5º Ano Superior',
    };

    return mapeamento[ano] || ano;
  };

  return (
    <div className="">
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={refetch}>Carregar estudantes</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-[1200px] w-full overflow-x-auto">
          <div>
            <Table className="w-full">
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Bilhete de identidade</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">B.I do responsavel</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código da academia</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível (escolar)</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível (superior)</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total de faltas</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total de notas</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total de inscrições</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Data de criação</TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              {carregandoEstudantes && (
                <TableBody>
                  <TableRow className="">
                    <TableCell colSpan={12}>
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
                
              {!carregandoEstudantes && dataEstudantes && dataEstudantes.total > 0 && (
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {dataEstudantes.estudantes.map((estudante) => (
                    <TableRow key={estudante.id}>
                      <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.nome}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.codigo_estudante}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.bilhete_identidade || '-'}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.bilhete_identidade_responsavel || '-'}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.codigo_academia || '-'}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatarAnoEscolar(estudante.ano_escolar)}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatarAnoEscolar(estudante.ano_superior)}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.total_faltas}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.total_notas}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.total_inscricoes}
                      </TableCell>
                      <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.status_escolar || estudante.status_superior || '-'}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {new Date(estudante.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}