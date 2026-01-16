"use client"
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApiQuery, consultasService } from '@/lib/api';

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BasicTables() {
  const { isOpen, openModal, closeModal } = useModal();
  const {data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, refetch} = useApiQuery(() => consultasService.listarAcademias());

  return (
    <div>
      <PageBreadcrumb pageTitle="Academias" />
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled onClick={openModal}>Cadastrar uma academia</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Carregar academias</Button>
          <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[584px] p-5 lg:p-10">
            <form className="">
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                Personal Information
              </h4>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-1">
                  <Label>First Name</Label>
                  <Input type="text" placeholder="Emirhan" />
                </div>

                <div className="col-span-1">
                  <Label>Last Name</Label>
                  <Input type="text" placeholder="Boruch" />
                </div>

                <div className="col-span-1">
                  <Label>Last Name</Label>
                  <Input type="email" placeholder="emirhanboruch55@gmail.com" />
                </div>

                <div className="col-span-1">
                  <Label>Phone</Label>
                  <Input type="text" placeholder="+09 363 398 46" />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label>Bio</Label>
                  <Input type="text" placeholder="Team Manager" />
                </div>
              </div>

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button size="sm" variant="outline" onClick={closeModal}>Fechar</Button>
                <Button size="sm" onClick={() => null}>Cadastrar</Button>
              </div>
            </form>
          </Modal>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1102px]">
              <Table>
                {/* Table Header */}
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tipo</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível escolar</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Provincia</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total de estudantes</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Data de criação</TableCell>
                    </TableRow>
                </TableHeader>

                {/* Table Body */}
                {carregandoAcademias && (
                  <TableRow className="">
                    <TableCell colSpan={8}>
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                  
                {!carregandoAcademias && dataAcademias && dataAcademias.total > 0 && (
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {dataAcademias.academias.map((academia) => (
                      <TableRow key={academia.id}>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.nome}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.codigo_academia}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.type}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.nivel_escolar}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.provincia}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.total_estudantes}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.status}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {new Date(academia.created_at).toLocaleDateString("pt-BR")}
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