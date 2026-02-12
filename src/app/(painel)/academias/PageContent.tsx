"use client"
import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, academiaService, adminService, tokenStorage } from '@/lib/api';
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useUserCookie } from "@/hooks/useUserCookie";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from 'primereact/dropdown';
import { NivelEscolar, Provincias, Provincia, AcademiaDetalhada } from '@/types/api';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NivelAcademico {
  nome: string;
  nivel: NivelEscolar;
  id: number;
}

export default function Academias() {
  const { user, loading: loadingUser } = useUserCookie();
  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();
  const { isOpen: isDesativarOpen, openModal: openDesativarModal, closeModal: closeDesativarModal } = useModal();
  const [carregado, setCarregado] = useState(false);
  
  const { data: dataAcademias, loading: carregandoAcademias, error: erroAcademias, execute: carregarAcademias } = useApi(consultasService.listarAcademias);
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(academiaService.criarEscola);
  const { loading: carregandoAtivar, error: erroAtivarAcademia, execute: executarAtivar } = useApi(adminService.ativarAcademia);
  const { loading: carregandoDesativar, error: erroDesativarAcademia, execute: executarDesativar } = useApi(adminService.desativarAcademia);
  
  const [showSenha, setShowSenha] = useState(false);
  const [academiaSelecionada, setAcademiaSelecionada] = useState<AcademiaDetalhada | null>(null);
  const [academiaParaDesativar, setAcademiaParaDesativar] = useState<AcademiaDetalhada | null>(null);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');
  
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [numeroTelefone, setNumeroTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [website, setWebsite] = useState('');
  const [provinciaSelecionada, setProvinciaSelecionada] = useState<Provincia | null>(null);
  const [nivelEscolarSelecionado, setNivelEscolarSelecionado] = useState<NivelAcademico | null>(null);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const NiveisAcademicos: NivelAcademico[] = [
    { nome: "Ensino Fundamental (1ª-9ª)", nivel: "fundamental", id: 1 },
    { nome: "Ensino Médio", nivel: "medio", id: 2 },
    { nome: "Fundamental e Médio", nivel: "misto", id: 3 },
  ];

  const carregarLista = async () => {
    try {
      const token = tokenStorage.get();
      await carregarAcademias(token || undefined);
      setCarregado(true);
    } catch (err) {
    }
  };

  // ✅ Corrigido: useEffect agora apenas agenda a execução
  useEffect(() => {
    const loadData = async () => {
      await carregarLista();
    };
    loadData();
  }, []);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) erros.push('Nome da escola é obrigatório');
    if (!senha || senha.length < 6) erros.push('Senha deve ter no mínimo 6 caracteres');
    if (!nivelEscolarSelecionado) erros.push('Selecione o nível acadêmico');
    if (!provinciaSelecionada) erros.push('Selecione a província');
    if (!numeroTelefone.trim()) {
      erros.push('Número de telefone é obrigatório');
    } else {
      const telefoneNumerico = numeroTelefone.replace(/\D/g, '');
      if (telefoneNumerico.length < 9) erros.push('Número de telefone inválido (mínimo 9 dígitos)');
    }
    if (!email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) erros.push('E-mail inválido');
    }
    if (!endereco.trim()) erros.push('Endereço é obrigatório');
    if (website && website.trim()) {
      try {
        new URL(website);
      } catch {
        erros.push('Website inválido (deve incluir http:// ou https://)');
      }
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
    setWebsite('');
    setProvinciaSelecionada(null);
    setNivelEscolarSelecionado(null);
    setValidationErrors([]);
    setSuccessMessage('');
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessMessage('');

    if (!validarFormulario()) return;

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
        website: website.trim() || undefined,
        nivel_escolar: nivelEscolarSelecionado!.nivel,
      });

      if (result?.data) {
        setSuccessMessage(`Academia cadastrada com sucesso! Código: ${result.data.codigo_academia}`);
        
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

  const handleVerDetalhes = (academia: AcademiaDetalhada) => {
    setAcademiaSelecionada(academia);
    openDetailsModal();
  };

  // ✅ Função para ativar academia
  const handleAtivar = async (academia: AcademiaDetalhada) => {
    if (!confirm(`Tem certeza que deseja ativar a academia "${academia.nome}"?`)) {
      return;
    }

    try {
      const token = tokenStorage.get();
      await executarAtivar(academia.codigo_academia, token || undefined);
      
      alert('Academia ativada com sucesso!');
      carregarLista();
    } catch (err) {
      alert('Erro ao ativar academia. Tente novamente.');
    }
  };

  // ✅ Função para abrir modal de desativação
  const handleAbrirDesativar = (academia: AcademiaDetalhada) => {
    setAcademiaParaDesativar(academia);
    setMotivoDesativacao('');
    openDesativarModal();
  };

  // ✅ Função para desativar academia
  const handleDesativar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivoDesativacao.trim()) {
      alert('Por favor, informe o motivo da desativação.');
      return;
    }

    if (!academiaParaDesativar) return;

    try {
      const token = tokenStorage.get();
      await executarDesativar(
        academiaParaDesativar.codigo_academia,
        { motivo: motivoDesativacao.trim() },
        token || undefined
      );
      
      alert('Academia desativada com sucesso!');
      closeDesativarModal();
      setAcademiaParaDesativar(null);
      setMotivoDesativacao('');
      carregarLista();
    } catch (err) {
      alert('Erro ao desativar academia. Tente novamente.');
    }
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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
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
            {carregandoAcademias ? 'Carregando...' : 'Atualizar lista'}
          </Button>
          
          {dataAcademias && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{dataAcademias.total}</span>
              <span className="ml-1">academias encontradas</span>
            </div>
          )}
          
          {/* Modal de Cadastro */}
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[640px] p-5 lg:p-10">
            <form onSubmit={handleCadastro}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar escola</h4>
              
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>Nome da escola *</Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o nome da escola"
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
                  <Label>Telefone *</Label>
                  <Input 
                    type="text" 
                    placeholder="+244 900 000 000"
                    onChange={(e) => setNumeroTelefone(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>E-mail *</Label>
                  <Input 
                    type="email" 
                    placeholder="email@escola.ao"
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>Endereço *</Label>
                  <Input 
                    type="text" 
                    placeholder="Rua, Bairro, Município"
                    onChange={(e) => setEndereco(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Website (opcional)</Label>
                  <Input 
                    type="text" 
                    placeholder="https://escola.ao"
                    onChange={(e) => setWebsite(e.target.value)} 
                    disabled={carregandoCadastro}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nível acadêmico *
                  </span>
                  <Dropdown 
                    value={nivelEscolarSelecionado} 
                    onChange={(e) => setNivelEscolarSelecionado(e.value)} 
                    options={NiveisAcademicos} 
                    optionLabel="nome"
                    placeholder="Selecione o nível escolar" 
                    className="w-full"
                    disabled={carregandoCadastro}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Província *
                  </span>
                  <Dropdown 
                    value={provinciaSelecionada} 
                    onChange={(e) => setProvinciaSelecionada(e.value)} 
                    options={Provincias} 
                    optionLabel="nome"
                    filter
                    placeholder="Selecione a província" 
                    className="w-full"
                    disabled={carregandoCadastro}
                    emptyFilterMessage="Nenhuma província encontrada"
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
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroCadastro}</p>
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
          <Modal isOpen={isDetailsOpen} onClose={closeDetailsModal} className="max-w-[640px] p-5 lg:p-10">
            {academiaSelecionada && (
              <div>
                <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                  Detalhes da Academia
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</p>
                      <p className="text-sm text-gray-900 dark:text-white">{academiaSelecionada.codigo_academia}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nível Escolar</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.nivel_escolar || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Província</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{academiaSelecionada.provincia}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(academiaSelecionada.status)}`}>
                        {academiaSelecionada.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Estudantes</p>
                      <p className="text-sm text-gray-900 dark:text-white">{academiaSelecionada.total_estudantes}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inscrições Pendentes</p>
                      <p className="text-sm text-gray-900 dark:text-white">{academiaSelecionada.total_inscricoes_pendentes}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</p>
                      <p className="text-sm text-gray-900 dark:text-white">{formatarData(academiaSelecionada.created_at)}</p>
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

          {/* Modal de Desativar Academia */}
          <Modal isOpen={isDesativarOpen} onClose={closeDesativarModal} className="max-w-[520px] p-5 lg:p-10">
            <form onSubmit={handleDesativar}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Desativar Academia</h4>
              
              {academiaParaDesativar && (
                <div className="mb-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <span className="font-semibold">Academia:</span> {academiaParaDesativar.nome}
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <span className="font-semibold">Código:</span> {academiaParaDesativar.codigo_academia}
                  </p>
                </div>
              )}

              <div>
                <Label>Motivo da desativação *</Label>
                <textarea
                  className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-white dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Descreva o motivo da desativação..."
                  rows={4}
                  value={motivoDesativacao}
                  onChange={(e) => setMotivoDesativacao(e.target.value)}
                  disabled={carregandoDesativar}
                  required
                />
              </div>

              {erroAtivarAcademia && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroAtivarAcademia}</p>
                </div>
              )}

              {erroDesativarAcademia && (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroDesativarAcademia}</p>
                </div>
              )}

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button size="sm" variant="outline" onClick={closeDesativarModal} disabled={carregandoDesativar}>Cancelar</Button>
                <Button size="sm" variant="danger" disabled={carregandoDesativar}>
                  {carregandoDesativar ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Desativando...
                    </>
                  ) : (
                    'Desativar Academia'
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        </div>

        {erroAcademias && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{erroAcademias}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="w-full overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tipo</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nível</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Província</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Estudantes</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Pendentes</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="whitespace-nowrap px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
                </TableRow>
              </TableHeader>

              {carregandoAcademias && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9}>
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
                    <TableCell colSpan={9}>
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
                    <TableCell colSpan={9}>
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
                    <TableRow key={academia.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <TableCell className="max-w-[200px] capitalize truncate px-5 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">
                        {academia.nome || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {academia.codigo_academia || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap capitalize px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {academia.type || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap capitalize px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {academia.nivel_escolar || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap capitalize px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {academia.provincia || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-center text-theme-sm dark:text-gray-400">
                        {academia.total_estudantes}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-gray-500 text-center text-theme-sm dark:text-gray-400">
                        {academia.total_inscricoes_pendentes > 0 ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                            {academia.total_inscricoes_pendentes}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(academia.status)}`}>
                          {academia.status || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-5 py-3 text-start text-theme-sm">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleVerDetalhes(academia)}>Ver detalhes</Button>
                          {!loadingUser && user?.tipo === "admin" && (
                            <>
                              {academia.status === "inativo" && (
                                <Button 
                                  size="sm" 
                                  variant="primary" 
                                  onClick={() => handleAtivar(academia)}
                                  disabled={carregandoAtivar}
                                >
                                  {carregandoAtivar ? 'Ativando...' : 'Ativar'}
                                </Button>
                              )}
                              {academia.status === "ativo" && (
                                <Button 
                                  size="sm" 
                                  variant="danger" 
                                  onClick={() => handleAbrirDesativar(academia)}
                                  disabled={carregandoDesativar}
                                >
                                  Desativar
                                </Button>
                              )}
                            </>
                          )}
                        </div>
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