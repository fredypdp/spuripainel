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

type NivelEnsino = 'fundamental' | 'medio';

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
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(estudanteService.criar);
  const { execute: executarInscricao } = useApi(estudanteService.solicitarInscricaoEscola);
  const { execute: executarAprovar } = useApi(academiaService.aprovarInscricao);
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
  const [nivelEnsino, setNivelEnsino] = useState<NivelEnsino>('fundamental');
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

  const anosDisponiveis = nivelEnsino === 'fundamental' ? anosFundamental : anosMedio;

  const carregarLista = async () => {
    try {
      const token = tokenStorage.get();
      await carregarEstudantes(token || undefined);
      setCarregado(true);
    } catch (err) {
    }
  };

  // Carregar cursos ao abrir modal
  useEffect(() => {
    if (isOpen && isAcademia) {
      const token = tokenStorage.get();
      carregarCursos(token || undefined);
    }
  }, [isOpen, isAcademia]);

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

  // ✅ Limpar ano escolar ao trocar de nível
  useEffect(() => {
    setAnoEscolar(null);
  }, [nivelEnsino]);

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

    // ✅ Para médio, curso é obrigatório
    if (nivelEnsino === 'medio' && !cursoSelecionado) {
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
    setNivelEnsino('fundamental');
    setAnoEscolar(null);
    setCursoSelecionado(null);
    setValidationErrors([]);
    setSuccessMessage('');
  };

  // ✅ Função para cadastro individual com auto-inscrição
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
      // 1. Cadastrar estudante
      const resultCadastro = await executarCadastro({
        senha,
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        bilhete_identidade: bilheteIdentidade.trim() || undefined,
        bilhete_identidade_responsavel: bilheteResponsavel.trim() || undefined,
        ano_escolar: anoEscolar?.value || undefined,
        curso_medio_id: cursoSelecionado?.id || undefined, // ✅ Agora usa UUID do curso
      });

      if (!resultCadastro?.data) {
        throw new Error('Erro ao cadastrar estudante');
      }

      const codigoEstudante = resultCadastro.data.codigo_estudante;
      let inscricaoId = '';

      try {
        // 2. Criar inscrição automática
        await executarInscricao({
          codigo_academia: user.academia.codigo_academia,
          ano_escolar_inscricao: anoEscolar?.value || 'primeiro_fundamental',
          curso_medio_id: cursoSelecionado?.id || undefined,
        }, tokenStorage.get() || undefined);

        // 3. Buscar inscrição criada
        const token = tokenStorage.get();
        const inscricoesResponse = await inscricoesService.listar({
          status: 'espera',
          limit: 100,
          offset: 0,
          token: token || undefined
        });

        const inscricaoCriada = inscricoesResponse.inscricoes.find(
          (insc) => insc.codigo_estudante === codigoEstudante
        );

        if (inscricaoCriada) {
          inscricaoId = inscricaoCriada.id;

          // 4. Aprovar inscrição automaticamente
          await executarAprovar(
            inscricaoId,
            {
              codigo_estudante: codigoEstudante,
              tipo: 'escola',
              ano_inscricao: anoEscolar?.value || 'primeiro_fundamental',
              curso_id: cursoSelecionado?.id || undefined,
            },
            token || undefined
          );
        }
      } catch (inscricaoError) {
        console.error('Erro na inscrição automática:', inscricaoError);
      }

      setSuccessMessage(
        `✅ Estudante cadastrado com sucesso!\n` +
        `Código: ${codigoEstudante}\n` +
        `Senha padrão: ${codigoEstudante}\n` +
        `${inscricaoId ? 'Inscrição aprovada automaticamente!' : 'Cadastrado, mas inscrição precisa ser feita manualmente.'}`
      );
      
      setTimeout(() => {
        limparFormulario();
        closeModal();
        carregarLista();
      }, 4000);
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
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
            <>
              <Button size="sm" onClick={openModal}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Cadastrar Individual
              </Button>
              <Button size="sm" variant="outline" onClick={openMassaModal}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cadastro em Massa
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            disabled={carregandoEstudantes} 
            onClick={carregarLista}
          >
            {carregandoEstudantes ? 'Carregando...' : 'Atualizar lista'}
          </Button>
          
          {dataEstudantes && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <span className="font-medium">{dataEstudantes.total}</span>
              <span className="ml-1">estudantes encontrados</span>
            </div>
          )}
          
          {/* ✅ Modal de Cadastro Individual Atualizado */}
          <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] p-5 lg:p-10">
            <form onSubmit={handleCadastroIndividual}>
              <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">Cadastrar estudante</h4>
              
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  ℹ️ Cadastro automático
                </h5>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  O estudante será automaticamente inscrito na sua academia e a inscrição será aprovada instantaneamente. A senha padrão será o código do estudante.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="col-span-2">
                  <Label>Nome completo *</Label>
                  <Input 
                    type="text" 
                    placeholder="Digite o nome completo"
                    onChange={(e) => setNome(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Senha *</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Mínimo 6 caracteres"
                      type={showSenha ? "text" : "password"}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={cadastrandoIndividual}
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
                    disabled={cadastrandoIndividual}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>Telefone (opcional)</Label>
                  <Input 
                    type="text" 
                    placeholder="+244 900 000 000"
                    onChange={(e) => setTelefone(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Bilhete do Estudante</Label>
                  <Input 
                    type="text" 
                    placeholder="000000000XX000"
                    onChange={(e) => setBilheteIdentidade(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Pelo menos um bilhete é obrigatório
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Bilhete do Responsável</Label>
                  <Input 
                    type="text" 
                    placeholder="000000000XX000"
                    onChange={(e) => setBilheteResponsavel(e.target.value)} 
                    disabled={cadastrandoIndividual}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Pelo menos um bilhete é obrigatório
                  </p>
                </div>

                {/* ✅ Dropdown de Nível de Ensino */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nível de Ensino *
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm" 
                      variant={nivelEnsino === 'fundamental' ? "primary" : "outline"}
                      onClick={() => setNivelEnsino('fundamental')}
                      disabled={cadastrandoIndividual}
                      className="flex-1"
                    >
                      Fundamental
                    </Button>
                    <Button
                      size="sm" 
                      variant={nivelEnsino === 'medio' ? "primary" : "outline"}
                      onClick={() => setNivelEnsino('medio')}
                      disabled={cadastrandoIndividual}
                      className="flex-1"
                    >
                      Médio
                    </Button>
                  </div>
                </div>

                {/* ✅ Dropdown de Ano Escolar */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Ano Escolar *
                  </span>
                  <Dropdown 
                    value={anoEscolar} 
                    onChange={(e) => setAnoEscolar(e.value)} 
                    options={anosDisponiveis} 
                    optionLabel="label"
                    placeholder="Selecione o ano" 
                    className="w-full"
                    disabled={cadastrandoIndividual}
                  />
                </div>

                {/* ✅ Dropdown de Curso (se médio) */}
                {nivelEnsino === 'medio' && (
                  <div className="col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Curso * (obrigatório para médio)
                    </span>
                    <Dropdown 
                      value={cursoSelecionado} 
                      onChange={(e) => setCursoSelecionado(e.value)} 
                      options={dataCursos?.cursos || []} 
                      optionLabel="nome"
                      placeholder="Selecione o curso" 
                      className="w-full"
                      disabled={cadastrandoIndividual}
                      emptyMessage="Nenhum curso disponível"
                      filter
                    />
                  </div>
                )}
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
                    'Cadastrar e Inscrever'
                  )}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal de Cadastro em Massa */}
          <CadastroMassaEstudantes 
            isOpen={isMassaOpen}
            onClose={closeMassaModal}
            onSuccess={carregarLista}
          />

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