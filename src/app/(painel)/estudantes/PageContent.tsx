"use client"
import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, estudanteService, tokenStorage } from '@/lib/api';
import { EyeCloseIcon, EyeIcon } from "@/icons";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { EstudanteDetalhado } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Estudantes() {
  const { isAcademia } = useUserType();
  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();
  const [carregado, setCarregado] = useState(false);
  
  const { data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(estudanteService.criar);
  
  const [showSenha, setShowSenha] = useState(false);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
  
  // Campos do formulário
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bilheteIdentidade, setBilheteIdentidade] = useState('');
  const [bilheteResponsavel, setBilheteResponsavel] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const carregarLista = async () => {
    try {
      const token = tokenStorage.get();
      await carregarEstudantes(token || undefined);
      setCarregado(true);
    } catch (err) {
    }
  };

  // ✅ CORREÇÃO: Usar useEffect corretamente
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const token = tokenStorage.get();
        await carregarEstudantes(token || undefined);
        if (isMounted) {
          setCarregado(true);
        }
      } catch (err) {
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) {
      erros.push('Nome do estudante é obrigatório');
    }

    if (!senha || senha.length < 6) {
      erros.push('Senha deve ter no mínimo 6 caracteres');
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        erros.push('E-mail inválido');
      }
    }

    if (telefone && telefone.trim()) {
      const telefoneNumerico = telefone.replace(/\D/g, '');
      if (telefoneNumerico.length < 9) {
        erros.push('Número de telefone inválido (mínimo 9 dígitos)');
      }
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  const limparFormulario = () => {
    setNome('');
    setSenha('');
    setEmail('');
    setTelefone('');
    setBilheteIdentidade('');
    setBilheteResponsavel('');
    setValidationErrors([]);
    setSuccessMessage('');
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();

    setValidationErrors([]);
    setSuccessMessage('');

    if (!validarFormulario()) {
      return;
    }

    try {
      const result = await executarCadastro({
        senha,
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        bilhete_identidade: bilheteIdentidade.trim() || undefined,
        bilhete_identidade_responsavel: bilheteResponsavel.trim() || undefined,
      });

      if (result?.data) {
        setSuccessMessage(`Estudante cadastrado com sucesso! Código: ${result.data.codigo_estudante}`);
        
        setTimeout(() => {
          limparFormulario();
          closeModal();
          carregarLista();
        }, 2000);
      }
    } catch (err) {
    }
  };

  const handleCloseModal = () => {
    limparFormulario();
    closeModal();
  };

  const handleVerDetalhes = (estudante: EstudanteDetalhado) => {
    setEstudanteSelecionado(estudante);
    openDetailsModal();
  };

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

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inativo':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'finalizado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusEscolarBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'finalizado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inativo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {isAcademia && (
            <Button size="sm" onClick={openModal}>Cadastrar estudante</Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            disabled={carregandoEstudantes} 
            onClick={carregarLista}
          >
            {carregandoEstudantes ? 'Carregando...' : 'Carregar estudantes'}
          </Button>
          
          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{dataEstudantes.total}</span>
              <span className="ml-1">estudantes encontrados</span>
            </div>
          )}
          
          {/* Modal de Cadastro */}
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[640px] p-5 lg:p-10">
            <form onSubmit={handleCadastro}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar estudante</h4>
              
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>Nome completo *</Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o nome completo"
                    onChange={(e) => setNome(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Senha *</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Mínimo 6 caracteres"
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
                  <Label>E-mail (opcional)</Label>
                  <Input 
                    type="email" 
                    placeholder="email@exemplo.com"
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>Telefone (opcional)</Label>
                  <Input 
                    type="text" 
                    placeholder="+244 900 000 000"
                    onChange={(e) => setTelefone(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Bilhete de Identidade</Label>
                  <Input 
                    type="text" 
                    placeholder="000000000XX000"
                    onChange={(e) => setBilheteIdentidade(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Bilhete do Responsável</Label>
                  <Input 
                    type="text" 
                    placeholder="000000000XX000"
                    onChange={(e) => setBilheteResponsavel(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>
              </div>

              {successMessage && (
                <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    {successMessage}
                  </p>
                </div>
              )}

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

              {erroCadastro && !successMessage && (
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

          {/* Modal de Detalhes */}
          <Modal isOpen={isDetailsOpen} onClose={closeDetailsModal} className="max-w-[700px] p-5 lg:p-10">
            {estudanteSelecionado && (
              <div>
                <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                  Detalhes do Estudante
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{estudanteSelecionado.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.codigo_estudante}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.telefone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">BI</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.bilhete_identidade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Geral</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudanteSelecionado.status)}`}>
                        {estudanteSelecionado.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Escolar</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusEscolarBadge(estudanteSelecionado.status_escolar)}`}>
                        {estudanteSelecionado.status_escolar.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Superior</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusEscolarBadge(estudanteSelecionado.status_superior)}`}>
                        {estudanteSelecionado.status_superior.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código Academia</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.codigo_academia || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ano Escolar</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{estudanteSelecionado.ano_escolar?.replace('_', ' ') || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Notas</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.total_notas}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Faltas</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.total_faltas}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Inscrições</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.total_inscricoes}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</p>
                      <p className="text-sm text-gray-900 dark:text-white">{formatarData(estudanteSelecionado.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button size="sm" variant="outline" onClick={closeDetailsModal}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>

        {erroEstudantes && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              Erro ao carregar estudantes: {erroEstudantes}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="w-full overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Academia</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Notas</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Faltas</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
                </TableRow>
              </TableHeader>

              {carregandoEstudantes && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando estudantes...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {!carregandoEstudantes && !carregado && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-gray-400 dark:text-gray-500 mb-4">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Clique em &ldquo;Carregar estudantes&rdquo; para visualizar
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {!carregandoEstudantes && carregado && dataEstudantes && dataEstudantes.total === 0 && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-gray-400 dark:text-gray-500 mb-2">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Nenhum estudante encontrado
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
                
              {!carregandoEstudantes && dataEstudantes && dataEstudantes.total > 0 && (
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {dataEstudantes.estudantes.map((estudante) => (
                    <TableRow key={estudante.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <TableCell className="max-w-[200px] capitalize truncate px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">
                        {estudante.nome || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.codigo_estudante || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.email || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {estudante.codigo_academia || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-center text-theme-sm dark:text-gray-400">
                        {estudante.total_notas}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-center text-theme-sm dark:text-gray-400">
                        {estudante.total_faltas > 0 ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {estudante.total_faltas}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudante.status)}`}>
                          {estudante.status || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerDetalhes(estudante)}
                        >
                          Ver detalhes
                        </Button>
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