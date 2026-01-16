"use client"
import { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApiQuery, consultasService } from '@/lib/api';
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from 'primereact/dropdown';
import { NivelEscolar, Provincias, Provincia } from '@/types/api';
import { useApi, academiaService } from '@/lib/api';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NivelAcademico {
  nome: string,
  nivel: NivelEscolar,
  id: number
}

export default function Academias() {
  const { isOpen, openModal, closeModal } = useModal();
  const {data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, refetch} = useApiQuery(() => consultasService.listarAcademias());
  
  const [showSenha, setShowSenha] = useState(false);
  
  const criarEscola = useApi(academiaService.criarEscola);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [Email, setEmail] = useState('')
  const [NumeroTelefone, setNumeroTelefone] = useState('')
  const [Endereco, setEndereco] = useState('')
  const [ProvinciaSelecionada, setProvinciaSelecionada] = useState<Provincia | null>(null);
  const [NivelEscolarSelecionado, setNivelEscolarSelecionado] = useState<NivelAcademico | null>(null);
  
  // Erros de validação
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const NiveisAcademicos: NivelAcademico[] = [
    {nome: "Ensino Fundamental - 1ª-9ª", nivel: "fundamental", id: 1},
    {nome: "Ensino Médio", nivel: "medio", id: 2},
  ];

  // Função de validação
  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    // Validações obrigatórias
    if (!nome.trim()) {
      erros.push('Nome da escola é obrigatório');
    }

    if (!senha || senha.length < 6) {
      erros.push('Senha deve ter no mínimo 6 caracteres');
    }

    if (!NivelEscolarSelecionado) {
      erros.push('Selecione o nível acadêmico');
    }

    if (!ProvinciaSelecionada) {
      erros.push('Selecione a província');
    }

    if (!NumeroTelefone.trim()) {
      erros.push('Número de telefone é obrigatório');
    } else {
      // Remove espaços e caracteres especiais para validar
      const telefoneNumerico = NumeroTelefone.replace(/\D/g, '');
      if (telefoneNumerico.length < 9) {
        erros.push('Número de telefone inválido (mínimo 9 dígitos)');
      }
    }

    if (!Email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(Email)) {
        erros.push('E-mail inválido');
      }
    }

    if (!Endereco.trim()) {
      erros.push('Endereço é obrigatório');
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  // Limpar formulário
  const limparFormulario = () => {
    setNome('');
    setSenha('');
    setEmail('');
    setNumeroTelefone('');
    setEndereco('');
    setProvinciaSelecionada(null);
    setNivelEscolarSelecionado(null);
    setValidationErrors([]);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpar erros anteriores
    setValidationErrors([]);

    // Validar formulário
    if (!validarFormulario()) {
      return;
    }

    let result;

    try {
      result = await criarEscola.execute({
        senha,
        nome: nome.trim(),
        type: "escola",
        cursos: [],
        provincia: ProvinciaSelecionada?.nome,
        endereco: Endereco.trim(),
        numero_telefone: NumeroTelefone.trim(),
        email: Email.trim(),
        nivel_escolar: NivelEscolarSelecionado?.nivel,
      });

      if (result?.data) {
        limparFormulario();
        closeModal();
        refetch();
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
    }
  };

  const handleCloseModal = () => {
    limparFormulario();
    closeModal();
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Academias" />
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openModal}>Cadastrar uma academia</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Carregar academias</Button>
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[584px] p-5 lg:p-10">
            <form onSubmit={handleCadastro}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar escola</h4>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>
                    Nome da escola<span className="text-error-500">*</span>
                  </Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o nome da escola"
                    onChange={(e) => setNome(e.target.value)} 
                    disabled={criarEscola.loading}
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label>
                    Senha<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      placeholder="Digite a sua senha (mín. 6 caracteres)"
                      type={showSenha ? "text" : "password"}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={criarEscola.loading}
                    />
                    <span
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showSenha ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label>
                    Número de telefone<span className="text-error-500">*</span>
                  </Label>
                  <Input 
                    type="text" 
                    placeholder="+244 900 000 000"
                    onChange={(e) => setNumeroTelefone(e.target.value)} 
                    disabled={criarEscola.loading}
                  />
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <Label>
                    E-mail<span className="text-error-500">*</span>
                  </Label>
                  <Input 
                    type="email" 
                    placeholder="Digite o e-mail da escola"
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={criarEscola.loading}
                  />
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <Label>
                    Endereço<span className="text-error-500">*</span>
                  </Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o endereço da escola"
                    onChange={(e) => setEndereco(e.target.value)} 
                    disabled={criarEscola.loading}
                  />
                </div>

                <div className="sm:col-span-1 sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nível acadêmico<span className="text-error-500">*</span>
                  </span>
                  <Dropdown 
                    value={NivelEscolarSelecionado} 
                    onChange={(e) => {
                      setNivelEscolarSelecionado(e.value);
                    }} 
                    options={NiveisAcademicos} 
                    optionLabel="nome"
                    placeholder="Selecione o nível escolar da instituição" 
                    className="w-full md:w-14rem"
                    disabled={criarEscola.loading}
                  />
                </div>
                
                <div className="sm:col-span-1 sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Província<span className="text-error-500">*</span>
                  </span>
                  <Dropdown 
                    value={ProvinciaSelecionada} 
                    onChange={(e) => {
                      setProvinciaSelecionada(e.value);
                    }} 
                    options={Provincias} 
                    optionLabel="nome"
                    filter
                    placeholder="Selecione a província da instituição" 
                    className="w-full md:w-14rem"
                    disabled={criarEscola.loading}
                  />
                </div>
              </div>

              {/* Erros de validação */}
              {validationErrors.length > 0 && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                    Corrija os seguintes erros:
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((erro, index) => (
                      <li key={index} className="text-sm text-red-700 dark:text-red-400">
                        {erro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Erro da API */}
              {criarEscola.error && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">
                    {criarEscola.error}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCloseModal}
                  disabled={criarEscola.loading}
                >
                  Fechar
                </Button>
                <Button 
                  size="sm"
                  disabled={criarEscola.loading}
                >
                  {criarEscola.loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-[1200px] w-full overflow-x-auto">
            <div className="">
              <Table className="w-full">
                {/* Table Header */}
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tipo</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível escolar</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Provincia</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total de estudantes</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Data de criação</TableCell>
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
                          {academia.nome || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.codigo_academia || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.type || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.nivel_escolar || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.provincia || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.total_estudantes || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {academia.status || '-'}
                        </TableCell>
                        <TableCell className="max-w-[280px] capitalize truncate px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {new Date(academia.created_at).toLocaleDateString("pt-BR") || '-'}
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