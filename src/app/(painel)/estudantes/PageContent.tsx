"use client"
import { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, academiaService, tokenStorage } from '@/lib/api';
import { EyeCloseIcon, EyeIcon } from "@/icons";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from 'primereact/dropdown';
import { NivelEscolar, Provincias, Provincia } from '@/types/api';

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
  const [carregado, setCarregado] = useState(false);
  
  const { data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, execute: carregarAcademias } = useApi(consultasService.listarAcademias);
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(academiaService.criarEscola);
  
  const [showSenha, setShowSenha] = useState(false);
  
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('')
  const [numeroTelefone, setNumeroTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [provinciaSelecionada, setProvinciaSelecionada] = useState<Provincia | null>(null);
  const [nivelEscolarSelecionado, setNivelEscolarSelecionado] = useState<NivelAcademico | null>(null);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const NiveisAcademicos: NivelAcademico[] = [
    {nome: "Ensino Fundamental (1ª-9ª)", nivel: "fundamental", id: 1},
    {nome: "Ensino Médio", nivel: "medio", id: 2},
    {nome: "Fundamental e Médio", nivel: "misto", id: 3},
  ];

  const carregarLista = async () => {
    await carregarAcademias({ token: tokenStorage.get() || undefined });
    setCarregado(true);
  };

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) {
      erros.push('Nome da escola é obrigatório');
    }

    if (!senha || senha.length < 6) {
      erros.push('Senha deve ter no mínimo 6 caracteres');
    }

    if (!nivelEscolarSelecionado) {
      erros.push('Selecione o nível acadêmico');
    }

    if (!provinciaSelecionada) {
      erros.push('Selecione a província');
    }

    if (!numeroTelefone.trim()) {
      erros.push('Número de telefone é obrigatório');
    } else {
      const telefoneNumerico = numeroTelefone.replace(/\D/g, '');
      if (telefoneNumerico.length < 9) {
        erros.push('Número de telefone inválido (mínimo 9 dígitos)');
      }
    }

    if (!email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        erros.push('E-mail inválido');
      }
    }

    if (!endereco.trim()) {
      erros.push('Endereço é obrigatório');
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

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

    setValidationErrors([]);

    if (!validarFormulario()) {
      return;
    }

    try {
      const result = await executarCadastro({
        senha,
        nome: nome.trim(),
        type: "escola",
        cursos: [],
        provincia: provinciaSelecionada!.nome,
        endereco: endereco.trim(),
        numero_telefone: numeroTelefone.trim(),
        email: email.trim(),
        nivel_escolar: nivelEscolarSelecionado!.nivel,
      });

      if (result?.data) {
        limparFormulario();
        closeModal();
        carregarLista();
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
          <Button 
            variant="outline" 
            size="sm" 
            disabled={carregandoAcademias} 
            onClick={carregarLista}
          >
            {carregandoAcademias ? 'Carregando...' : 'Carregar academias'}
          </Button>
          
          {dataAcademias && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{dataAcademias.total}</span>
              <span className="ml-1">academias encontradas</span>
            </div>
          )}
          
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[584px] p-5 lg:p-10">
            <form onSubmit={handleCadastro}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar escola</h4>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>Nome da escola</Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o nome da escola"
                    onChange={(e) => setNome(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Senha</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Digite a sua senha (mín. 6 caracteres)"
                      type={showSenha ? "text" : "password"}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={carregandoCadastro}
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

                <div className="col-span-2 sm:col-span-1">
                  <Label>Número de telefone</Label>
                  <Input 
                    type="text" 
                    placeholder="+244 900 000 000"
                    onChange={(e) => setNumeroTelefone(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>E-mail</Label>
                  <Input 
                    type="email" 
                    placeholder="Digite o e-mail da escola"
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>Endereço</Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o endereço da escola"
                    onChange={(e) => setEndereco(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nível acadêmico
                  </span>
                  <Dropdown 
                    value={nivelEscolarSelecionado} 
                    onChange={(e) => setNivelEscolarSelecionado(e.value)} 
                    options={NiveisAcademicos} 
                    optionLabel="nome"
                    placeholder="Selecione o nível escolar da instituição" 
                    className="w-full md:w-14rem"
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Província
                  </span>
                  <Dropdown 
                    value={provinciaSelecionada} 
                    onChange={(e) => setProvinciaSelecionada(e.value)} 
                    options={Provincias} 
                    optionLabel="nome"
                    filter
                    placeholder="Selecione a província da instituição" 
                    className="w-full md:w-14rem"
                    disabled={carregandoCadastro}
                  />
                </div>
              </div>

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

              {erroCadastro && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">
                    {erroCadastro}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCloseModal}
                  disabled={carregandoCadastro}
                >
                  Fechar
                </Button>
                <Button 
                  size="sm"
                  disabled={carregandoCadastro}
                >
                  {carregandoCadastro ? (
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

        {erroAcademias && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              Erro ao carregar academias: {erroAcademias}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-[1200px] w-full overflow-x-auto">
            <Table className="w-full">
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

              {carregandoAcademias && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando academias...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {!carregandoAcademias && !carregado && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-gray-400 dark:text-gray-500 mb-4">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Clique em &ldquo;Carregar academias&rdquo; para visualizar
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {!carregandoAcademias && carregado && dataAcademias && dataAcademias.total === 0 && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-gray-400 dark:text-gray-500 mb-2">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Nenhuma academia encontrada
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
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
  );
}