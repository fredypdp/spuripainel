// src/app/(painel)/estudantes/PageContent.tsx
"use client"
import { useState, useEffect, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Genero } from '@/types/api';
import { useApi, consultasService, estudanteService, tokenStorage, academiaService } from '@/lib/api';

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { EstudanteDetalhado, formatAnoAcademico } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';
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
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(academiaService.cadastrarEstudante);  
  const { data: dataCursos, execute: carregarCursos, error: erroListarCuros } = useApi(academiaService.listarCursos);  
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhado | null>(null);
  
  // Campos do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bilheteIdentidade, setBilheteIdentidade] = useState('');
  const [bilheteResponsavel, setBilheteResponsavel] = useState('');
  const [anoEscolarSelecionado, setAnoEscolarSelecionado] = useState<string | null>(null);
  const [genero, setGenero] = useState<Genero>('masculino')
  const [cursoSelecionado, setCursoSelecionado] = useState<any>(null);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Anos fundamentais são FIXOS
  const anosFundamental: AnoEscolar[] = [
    { label: '1º Ano Fundamental', value: '1_ano_fundamental' },
    { label: '2º Ano Fundamental', value: '2_ano_fundamental' },
    { label: '3º Ano Fundamental', value: '3_ano_fundamental' },
    { label: '4º Ano Fundamental', value: '4_ano_fundamental' },
    { label: '5º Ano Fundamental', value: '5_ano_fundamental' },
    { label: '6º Ano Fundamental', value: '6_ano_fundamental' },
    { label: '7º Ano Fundamental', value: '7_ano_fundamental' },
    { label: '8º Ano Fundamental', value: '8_ano_fundamental' },
    { label: '9º Ano Fundamental', value: '9_ano_fundamental' },
  ];

  /**
   * Anos do médio são DINÂMICOS — vêm de curso.anos_academicos do curso selecionado.
   * Se não houver curso selecionado, retorna lista vazia.
   */
  const getAnosMedioFromCurso = (): AnoEscolar[] => {
    if (!cursoSelecionado?.anos_academicos) return [];
    return (cursoSelecionado.anos_academicos as string[]).map((v: string) => {
      const m = v.match(/^(\d+)_ano_medio$/);
      return { value: v, label: m ? `${m[1]}º Ano Médio` : v.replace(/_/g, ' ') };
    });
  };

  /**
   * Verifica se um valor de ano pertence ao médio (formato n_ano_medio).
   * Dinâmico — não precisa de array fixo.
   */
  const isAnoMedio = (anoValue: string | undefined): boolean => {
    if (!anoValue) return false;
    return /^\d+_ano_medio$/.test(anoValue);
  };

  /**
   * Retorna os anos disponíveis para seleção no cadastro de estudante.
   * - fundamental: lista fixa
   * - medio: deriva de curso.anos_academicos (requer curso selecionado)
   * - misto: fundamental fixo + médio do curso (se selecionado)
   */
  const getAnosDisponiveis = (): AnoEscolar[] => {
    const nivelAcademia = user?.academia?.nivel_escolar;
    const anosMedioFromCurso = getAnosMedioFromCurso();

    if (nivelAcademia === 'fundamental') {
      return anosFundamental;
    }

    if (nivelAcademia === 'medio') {
      // Só mostra anos do médio se um curso estiver selecionado
      return anosMedioFromCurso;
    }

    if (nivelAcademia === 'misto') {
      return [...anosFundamental, ...anosMedioFromCurso];
    }

    return anosFundamental;
  };


  const deveMostrarCurso = (): boolean => {
    const nivelAcademia = user?.academia?.nivel_escolar;

    if (nivelAcademia === 'medio') return true;

    if (nivelAcademia === 'misto' && anoEscolarSelecionado) {
      return isAnoMedio(anoEscolarSelecionado);
    }

    return false;
  };

  const carregarLista = useCallback(async () => {
    try {
      const token = tokenStorage.get();
      await carregarEstudantes(token || undefined);
      setCarregado(true);
    } catch (err) {
    }
  }, [carregarEstudantes]);

  useEffect(() => {
    if (isOpen && isAcademia) {
      const nivelAcademia = user?.academia?.nivel_escolar;
      if (nivelAcademia === 'medio' || nivelAcademia === 'misto') {
        const token = tokenStorage.get();
        carregarCursos(token || undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (anoEscolarSelecionado && !isAnoMedio(anoEscolarSelecionado)) {
      setCursoSelecionado(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoEscolarSelecionado]);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nome.trim()) {
      erros.push('Nome do estudante é obrigatório');
    }

    if (!anoEscolarSelecionado) {
      erros.push('Ano escolar é obrigatório');
    }

    if (!bilheteIdentidade.trim() && !bilheteResponsavel.trim()) {
      erros.push('Pelo menos um bilhete (estudante ou responsável) deve ser preenchido');
    }

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
    setEmail('');
    setTelefone('');
    setBilheteIdentidade('');
    setBilheteResponsavel('');
    setAnoEscolarSelecionado(null);
    setCursoSelecionado(null);
    setValidationErrors([]);
    setSuccessMessage('');
  };

  // 🔥 CORRIGIDO: Conversão de strings vazias para undefined
  const handleCadastroIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) {
      return;
    }

    setCadastrandoIndividual(true);
    setValidationErrors([]);
    setSuccessMessage('');

    // 🔥 CORRIGIDO: Enviar undefined em vez de strings vazias
    const payload = {
      nome: nome.trim(),
      email: email.trim() || undefined,
      telefone: telefone.trim() || undefined,
      bilhete_identidade: bilheteIdentidade.trim(),
      bilhete_identidade_responsavel: bilheteResponsavel.trim() || undefined,
      ano_escolar: isAnoMedio(anoEscolarSelecionado ?? '') ? undefined : (anoEscolarSelecionado || undefined),
      ano_escolar_medio: isAnoMedio(anoEscolarSelecionado ?? '') ? (anoEscolarSelecionado || undefined) : undefined,
      curso_medio_id: cursoSelecionado?.id || undefined,
      status_escolar_fundamental: 'em_andamento' as const,
      genero: genero,
    };

    try {
      await executarCadastro(payload);
      setSuccessMessage('Estudante cadastrado com sucesso!');
      
      // Limpar campos
      setNome('');
      setEmail('');
      setTelefone('');
      setBilheteIdentidade('');
      setBilheteResponsavel('');
      setAnoEscolarSelecionado(null);
      setCursoSelecionado(null);
      
      // Fechar modal após 2s
      setTimeout(() => {
        closeModal();
        setSuccessMessage('');
      }, 2000);
    } catch (err: any) {
      const mensagemErro = err?.response?.data?.error || err?.message || 'Erro ao cadastrar estudante';
      setValidationErrors([mensagemErro]);
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
    <div>
      <PageBreadcrumb pageTitle="Estudantes" />
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {isAcademia && (
            <>
              <Button size="sm" onClick={openModal}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Cadastrar Individual
              </Button>
              <Button disabled size="sm" variant="outline" onClick={openMassaModal}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cadastro em Massa
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={carregarLista} disabled={carregandoEstudantes}>
            {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
          </Button>
          
          
          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{dataEstudantes.total}</span>
              <span className="ml-1">estudantes encontrados</span>
            </div>
          )}
          
          {/* Modal de Cadastro Individual */}
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[640px] p-5 lg:p-10">
            <form onSubmit={handleCadastroIndividual}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar estudante</h4>
              
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>Nome completo *</Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o nome do estudante"
                    onChange={(e) => setNome(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Género *
                  </label>
                  <div className="flex gap-3">
                    {(['masculino', 'feminino'] as const).map(g => (
                      <button
                        key={g} type="button"
                        onClick={() => setGenero(g)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          genero === g
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {g === 'masculino' ? 'Masculino' : 'Feminino'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Curso — para médio/misto deve vir ANTES do ano escolar */}
                {(user?.academia?.nivel_escolar === 'medio' || user?.academia?.nivel_escolar === 'misto') && (
                  <div className="col-span-2 sm:col-span-1">
                    <Label>Curso {user?.academia?.nivel_escolar === 'medio' ? '* (Obrigatório)' : '(Opcional - para alunos do Médio)'}</Label>
                    <Dropdown
                      value={cursoSelecionado}
                      options={dataCursos?.cursos || []}
                      onChange={(e) => {
                        setCursoSelecionado(e.value);
                        // Limpar ano quando o curso muda (anos são dependentes do curso)
                        if (isAnoMedio(anoEscolarSelecionado ?? '')) {
                          setAnoEscolarSelecionado(null);
                        }
                      }}
                      optionLabel="nome"
                      placeholder="Selecione o curso"
                      disabled={cadastrandoIndividual}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="col-span-2 sm:col-span-1">
                  <Label>Ano Escolar *</Label>
                  <Dropdown
                    value={anoEscolarSelecionado}
                    options={getAnosDisponiveis()}
                    onChange={(e) => setAnoEscolarSelecionado(e.value)}
                    placeholder={
                      (user?.academia?.nivel_escolar === 'medio' || (user?.academia?.nivel_escolar === 'misto' && deveMostrarCurso()))
                        && !cursoSelecionado
                        ? "Selecione o curso primeiro"
                        : "Selecione o ano"
                    }
                    disabled={
                      cadastrandoIndividual ||
                      (
                        (user?.academia?.nivel_escolar === 'medio' ||
                          (user?.academia?.nivel_escolar === 'misto' && deveMostrarCurso()))
                        && !cursoSelecionado
                      )
                    }
                    className="w-full"
                  />
                  {user?.academia?.nivel_escolar === 'medio' && !cursoSelecionado && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Selecione o curso para ver os anos disponíveis
                    </p>
                  )}
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>E-mail (opcional)</Label>
                  <Input 
                    type="email" 
                    placeholder="email@exemplo.com"
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>Telefone (opcional)</Label>
                  <Input 
                    type="text" 
                    placeholder="Ex: 923456789"
                    onChange={(e) => setTelefone(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Bilhete do Estudante *</Label>
                  <Input 
                    type="text" 
                    placeholder="Ex: 123456789012AB"
                    onChange={(e) => setBilheteIdentidade(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Bilhete do Responsável</Label>
                  <Input 
                    type="text" 
                    placeholder="Ex: 123456789012AB"
                    onChange={(e) => setBilheteResponsavel(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>
              </div>

              {successMessage && (
                <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium whitespace-pre-line">
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

              <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Informação:</strong> A senha padrão será o <strong>código do estudante</strong> gerado no cadastro. O estudante pode alterá-la no primeiro login.
                </p>
              </div>

              <div className="flex items-center justify-end w-full gap-3 mt-6">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCloseModal}
                  disabled={cadastrandoIndividual}
                >
                  Fechar
                </Button>
                <Button 
                  size="sm"
                  disabled={cadastrandoIndividual}
                >
                  {cadastrandoIndividual ? (
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
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{estudanteSelecionado.ano_escolar ? formatAnoAcademico(estudanteSelecionado.ano_escolar) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Notas</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.total_notas}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Faltas</p>
                      <p className="text-sm text-gray-900 dark:text-white">{estudanteSelecionado.total_faltas}</p>
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
            <p className="text-sm text-red-700 dark:text-red-400">{erroEstudantes}</p>
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
                          {(estudante.total_faltas ?? 0) > 0 ? (
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