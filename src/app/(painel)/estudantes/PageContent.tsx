// src/app/(painel)/estudantes/PageContent.tsx
"use client"
import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, consultasService, estudanteService, tokenStorage, academiaService, inscricoesService } from '@/lib/api';
import { EyeCloseIcon, EyeIcon } from "@/icons";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { EstudanteDetalhado } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';
import CadastroMassaEstudantes from "@/components/estudantes/CadastroMassaEstudantes";
import { useUserCookie } from '@/hooks/useUserCookie';
import { Dropdown } from 'primereact/dropdown';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AnoEscolar {
  label: string;
  value: string;
}

export default function Estudantes() {
  const { isAcademia } = useUserType();
  const { user } = useUserCookie();
  
  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isDetailsOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal();
  const { isOpen: isMassaOpen, openModal: openMassaModal, closeModal: closeMassaModal } = useModal();
  
  const [carregado, setCarregado] = useState(false);
  const [cadastrandoIndividual, setCadastrandoIndividual] = useState(false);
  
  const { data: dataEstudantes, loading: carregandoEstudantes, error: erroEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  
  // 🔥 ATUALIZADO: Academia usa endpoint próprio para cadastrar estudantes vinculados
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(
    isAcademia ? academiaService.cadastrarEstudante : estudanteService.criar
  );
  
  const { data: dataCursos, execute: carregarCursos } = useApi(academiaService.listarCursos);
  
  const [showSenha, setShowSenha] = useState(false);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
  
  // ✅ Campos do formulário atualizados
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bilheteIdentidade, setBilheteIdentidade] = useState('');
  const [bilheteResponsavel, setBilheteResponsavel] = useState('');
  const [anoEscolar, setAnoEscolar] = useState<AnoEscolar | null>(null);
  const [cursoSelecionado, setCursoSelecionado] = useState<any>(null);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // ✅ Opções de anos escolares por nível
  const anosFundamental: AnoEscolar[] = [
    { label: '1º Ano Fundamental', value: 'primeiro_fundamental' },
    { label: '2º Ano Fundamental', value: 'segundo_fundamental' },
    { label: '3º Ano Fundamental', value: 'terceiro_fundamental' },
    { label: '4º Ano Fundamental', value: 'quarto_fundamental' },
    { label: '5º Ano Fundamental', value: 'quinto_fundamental' },
    { label: '6º Ano Fundamental', value: 'sexto_fundamental' },
    { label: '7º Ano Fundamental', value: 'setimo_fundamental' },
    { label: '8º Ano Fundamental', value: 'oitavo_fundamental' },
    { label: '9º Ano Fundamental', value: 'nono_fundamental' },
  ];

  const anosMedio: AnoEscolar[] = [
    { label: '1º Ano Médio', value: 'primeiro_medio' },
    { label: '2º Ano Médio', value: 'segundo_medio' },
    { label: '3º Ano Médio', value: 'terceiro_medio' },
    { label: '4º Ano Médio', value: 'quarto_medio' },
  ];

  // ✅ Determinar anos disponíveis baseado na academia
  const getAnosDisponiveis = (): AnoEscolar[] => {
    const nivelAcademia = user?.academia?.nivel_escolar;
    
    if (nivelAcademia === 'fundamental') {
      return anosFundamental;
    }
    
    if (nivelAcademia === 'medio') {
      return anosMedio;
    }
    
    // Se for misto, mostrar ambos
    if (nivelAcademia === 'misto') {
      return [...anosFundamental, ...anosMedio];
    }
    
    // Fallback
    return anosFundamental;
  };

  // ✅ Verificar se o ano selecionado é do médio (para mostrar cursos)
  const isAnoMedio = (anoValue: string | undefined): boolean => {
    if (!anoValue) return false;
    return anosMedio.some(ano => ano.value === anoValue);
  };

  // ✅ Determinar se deve mostrar seleção de curso
  const deveMostrarCurso = (): boolean => {
    const nivelAcademia = user?.academia?.nivel_escolar;
    
    // Se for academia só de médio, sempre mostrar
    if (nivelAcademia === 'medio') return true;
    
    // Se for mista, mostrar apenas se ano selecionado for do médio
    if (nivelAcademia === 'misto') {
      return isAnoMedio(anoEscolar?.value);
    }
    
    // Se for fundamental, não mostrar
    return false;
  };

  const carregarLista = async () => {
    try {
      const token = tokenStorage.get();
      await carregarEstudantes(token || undefined);
      setCarregado(true);
    } catch (err) {
    }
  };

  // Carregar cursos ao abrir modal (apenas se for médio ou misto)
  useEffect(() => {
    if (isOpen && isAcademia) {
      const nivelAcademia = user?.academia?.nivel_escolar;
      if (nivelAcademia === 'medio' || nivelAcademia === 'misto') {
        const token = tokenStorage.get();
        carregarCursos(token || undefined);
      }
    }
  }, [isOpen, isAcademia, user?.academia?.nivel_escolar]);

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

  // ✅ Limpar curso ao mudar ano escolar (se deixar de ser médio)
  useEffect(() => {
    if (anoEscolar && !isAnoMedio(anoEscolar.value)) {
      setCursoSelecionado(null);
    }
  }, [anoEscolar]);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) {
      erros.push('Nome do estudante é obrigatório');
    }

    if (!senha || senha.length < 6) {
      erros.push('Senha deve ter no mínimo 6 caracteres');
    }

    // ✅ Ano escolar é obrigatório
    if (!anoEscolar) {
      erros.push('Ano escolar é obrigatório');
    }

    // ✅ Pelo menos um bilhete deve estar preenchido
    if (!bilheteIdentidade.trim() && !bilheteResponsavel.trim()) {
      erros.push('Pelo menos um bilhete (estudante ou responsável) deve ser preenchido');
    }

    // ✅ Para médio (ou misto com ano médio), curso é obrigatório
    if (deveMostrarCurso() && !cursoSelecionado) {
      erros.push('Para ensino médio, o curso é obrigatório');
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
    setAnoEscolar(null);
    setCursoSelecionado(null);
    setValidationErrors([]);
    setSuccessMessage('');
  };

  // 🔥 ATUALIZADO: Cadastro direto pela academia (já vinculado)
  const handleCadastroIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessMessage('');

    if (!validarFormulario()) {
      return;
    }

    if (!isAcademia || !user?.academia?.codigo_academia) {
      setValidationErrors(['Apenas academias podem cadastrar estudantes']);
      return;
    }

    setCadastrandoIndividual(true);

    try {
      // 🔥 ÚNICO PASSO: Cadastrar estudante já vinculado
      console.log('Cadastrando estudante vinculado à academia...');
      const resultCadastro = await executarCadastro({
        senha,
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        bilhete_identidade: bilheteIdentidade.trim() || undefined,
        bilhete_identidade_responsavel: bilheteResponsavel.trim() || undefined,
        ano_escolar: anoEscolar?.value || undefined,
        curso_medio_id: cursoSelecionado?.id || undefined,
        status_escolar: 'em_andamento', // Define status inicial
      });

      if (!resultCadastro?.data) {
        throw new Error('Erro ao cadastrar estudante');
      }

      const codigoEstudante = resultCadastro.data.codigo_estudante;
      const statusFinal = resultCadastro.data.status;
      
      console.log('✅ Estudante cadastrado e vinculado:', codigoEstudante);

      setSuccessMessage(
        `✅ Estudante cadastrado e vinculado com sucesso!\n` +
        `Código: ${codigoEstudante}\n` +
        `Senha: ${senha}\n` +
        `Status: ${statusFinal}\n` +
        `✅ O estudante já está vinculado à sua academia!`
      );
      
      setTimeout(() => {
        limparFormulario();
        carregarLista();
      }, 4000);
    } catch (err: any) {
      console.error('❌ Erro no cadastro:', err);
      setValidationErrors([err?.data?.error || err?.message || 'Erro ao cadastrar estudante']);
    } finally {
      setCadastrandoIndividual(false);
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

  return (
    <div className="container mx-auto py-6 px-4 lg:px-0 md:px-0">
      <div className="flex flex-col gap-6">        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lista de Estudantes
          </h1>
          
          <div className="ml-auto flex items-center gap-3">
            <Button 
              size="sm" 
              variant="outline"
              onClick={carregarLista}
              disabled={carregandoEstudantes}
            >
              {carregandoEstudantes ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Carregando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Atualizar lista
                </>
              )}
            </Button>
            
            {isAcademia && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={openModal}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Cadastrar Individual
                </Button>
                
                <Button 
                  size="sm"
                  onClick={openMassaModal}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Cadastro em Massa
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Modal de Cadastro Individual */}
        <div>
          <Modal isOpen={isOpen} onClose={handleCloseModal}>
            <form onSubmit={handleCadastroIndividual} className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Cadastrar Estudante
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                        Erro ao cadastrar estudante
                      </p>
                      <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                        {validationErrors.map((erro, index) => (
                          <li key={index}>{erro}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-green-700 dark:text-green-400 whitespace-pre-line">
                      {successMessage}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    placeholder="Nome do estudante"
                    onChange={(e) => setNome(e.target.value)}
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div>
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showSenha ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={cadastrandoIndividual}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showSenha ? <EyeCloseIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="ano-escolar">Ano Escolar *</Label>
                  <Dropdown
                    id="ano-escolar"
                    value={anoEscolar}
                    options={getAnosDisponiveis()}
                    onChange={(e) => setAnoEscolar(e.value)}
                    placeholder="Selecione o ano"
                    disabled={cadastrandoIndividual}
                    className="w-full"
                  />
                </div>

                {deveMostrarCurso() && (
                  <div className="md:col-span-2">
                    <Label htmlFor="curso">Curso * (Obrigatório para Ensino Médio)</Label>
                    <Dropdown
                      id="curso"
                      value={cursoSelecionado}
                      options={dataCursos?.cursos || []}
                      onChange={(e) => setCursoSelecionado(e.value)}
                      optionLabel="nome"
                      placeholder="Selecione o curso"
                      disabled={cadastrandoIndividual}
                      className="w-full"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone (opcional)</Label>
                  <Input
                    id="telefone"
                    placeholder="Ex: 923456789"
                    onChange={(e) => setTelefone(e.target.value)}
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div>
                  <Label htmlFor="bilhete">Bilhete do Estudante *</Label>
                  <Input
                    id="bilhete"
                    placeholder="Ex: 123456789012AB"
                    onChange={(e) => setBilheteIdentidade(e.target.value)}
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div>
                  <Label htmlFor="bilhete-resp">Bilhete do Responsável</Label>
                  <Input
                    id="bilhete-resp"
                    placeholder="Ex: 123456789012AB"
                    onChange={(e) => setBilheteResponsavel(e.target.value)}
                    disabled={cadastrandoIndividual}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  * Campos obrigatórios | O estudante será cadastrado já vinculado à sua academia
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleCloseModal} disabled={cadastrandoIndividual}>Cancelar</Button>
                  <Button disabled={cadastrandoIndividual}>
                    {cadastrandoIndividual ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cadastrando...
                      </>
                    ) : (
                      'Cadastrar Estudante'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Modal>
        </div>

        {/* Modal de Cadastro em Massa */}
        <CadastroMassaEstudantes 
          isOpen={isMassaOpen}
          onClose={closeMassaModal}
          onSuccess={carregarLista}
        />

        {/* Modal de Detalhes */}
        <div>
          <Modal 
            isOpen={isDetailsOpen} 
            onClose={closeDetailsModal}
          >
            {estudanteSelecionado && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Detalhes do Estudante
                  </h2>
                  <button
                    type="button"
                    onClick={closeDetailsModal}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {estudanteSelecionado.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {estudanteSelecionado.nome}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Código: {estudanteSelecionado.codigo_estudante}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.telefone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Academia</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.codigo_academia || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(estudanteSelecionado.status)}`}>
                        {estudanteSelecionado.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ano Escolar</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.ano_escolar || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Escolar</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.status_escolar || '-'}</p>
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
                          Clique em &ldquo;Atualizar lista&rdquo; para visualizar
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
                        {isAcademia && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            Use os botões acima para cadastrar estudantes
                          </p>
                        )}
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