// src/app/(painel)/estudantes/cadastrar/PageContent.tsx
"use client"
import { useState, useEffect } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, academiaService, tokenStorage } from '@/lib/api';
import { useUserCookie } from "@/hooks/useUserCookie";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { Dropdown } from 'primereact/dropdown';
import type { Genero, Curso } from '@/types/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AnoEscolar {
  label: string;
  value: string;
}

interface ResultadoCadastro {
  codigo_estudante: string;
  nome: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ANOS_FUNDAMENTAL_LIST: AnoEscolar[] = [
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

// ─── Componente de Sucesso ────────────────────────────────────────────────────

function SuccessState({
  resultado,
  onCadastrarOutro,
}: {
  resultado: ResultadoCadastro;
  onCadastrarOutro: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Estudante cadastrado com sucesso!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1 capitalize">
            {resultado.nome}
          </p>
        </div>

        <div className="bg-white dark:bg-green-900/30 rounded-lg p-4 space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Código do Estudante</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {resultado.codigo_estudante}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Senha padrão</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {resultado.codigo_estudante}
            </span>
          </div>
        </div>

        <p className="text-xs text-green-700 dark:text-green-400">
          A senha padrão é o próprio código do estudante. O estudante deverá alterá-la no primeiro acesso.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onCadastrarOutro}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Cadastrar outro
          </button>
          <Link
            href="/estudantes"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Ver estudantes
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CadastrarEstudantePageContent() {
  const { user, loading: loadingUser } = useUserCookie();
  const { isAcademia } = useUserType();

  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(academiaService.cadastrarEstudante);
  const { data: dataCursos, execute: carregarCursos } = useApi(academiaService.listarCursos);

  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('');
  const [bilheteIdentidade, setBilheteIdentidade] = useState('');
  const [bilheteResponsavel, setBilheteResponsavel] = useState('');
  const [dataNascimento, setDataNascimento] = useState<Date | null>(null);
  const [anoEscolarSelecionado, setAnoEscolarSelecionado] = useState<string | null>(null);
  const [genero, setGenero] = useState<Genero>('masculino');
  const [cursoSelecionado, setCursoSelecionado] = useState<Curso | null>(null);
  const [biEstudanteFile, setBiEstudanteFile] = useState<File | undefined>();
  const [biResponsavelFile, setBiResponsavelFile] = useState<File | undefined>();
  const [cedulaEstudanteFile, setCedulaEstudanteFile] = useState<File | undefined>();
  const [declaracaoFile, setDeclaracaoFile] = useState<File | undefined>();
  const [certificado6File, setCertificado6File] = useState<File | undefined>();
  const [certificado9File, setCertificado9File] = useState<File | undefined>();
  const [certificadoMedioFile, setCertificadoMedioFile] = useState<File | undefined>();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoCadastro | null>(null);

  // nivel === 'escola' → escola; nivel === 'superior' → universidade
  const academiaNivel    = user?.academia?.nivel ?? 'escola';
  const nivelEscolar     = user?.academia?.nivel_escolar ?? 'fundamental';
  const isSuperior       = academiaNivel === 'superior';

  const isAnoMedio    = (v: string | null | undefined): boolean => !!v && /^\d+_ano_medio$/.test(v);
  const isAnoSuperior = (v: string | null | undefined): boolean => !!v && /^\d+_ano_superior$/.test(v);

  // Carrega cursos quando necessário
  useEffect(() => {
    if (nivelEscolar === 'medio' || nivelEscolar === 'misto' || isSuperior) {
      const token = tokenStorage.get();
      carregarCursos(token || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelEscolar, isSuperior]);

  // Guard: apenas academia
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!user || !isAcademia) {
    return (
      <UnauthorizedAccess
        requiredTypes={['academia']}
        message="Esta página está disponível apenas para academias."
      />
    );
  }

  const getAnosMedioFromCurso = (): AnoEscolar[] => {
    if (!cursoSelecionado?.anos_academicos) return [];
    return (cursoSelecionado.anos_academicos as string[]).map((v: string) => {
      const m = v.match(/^(\d+)_ano_medio$/);
      return { value: v, label: m ? `${m[1]}º Ano Médio` : v.replace(/_/g, ' ') };
    });
  };

  const getAnosDisponiveis = (): AnoEscolar[] => {
    if (isSuperior) {
      if (!cursoSelecionado?.anos_academicos) return [];
      return cursoSelecionado.anos_academicos.map((v: string) => {
        const m = v.match(/^(\d+)_ano_superior$/);
        return { value: v, label: m ? `${m[1]}º Ano` : v.replace(/_/g, ' ') };
      });
    }
    if (nivelEscolar === 'fundamental') return ANOS_FUNDAMENTAL_LIST;
    if (nivelEscolar === 'medio') return getAnosMedioFromCurso();
    if (nivelEscolar === 'misto') return [...ANOS_FUNDAMENTAL_LIST, ...getAnosMedioFromCurso()];
    return ANOS_FUNDAMENTAL_LIST;
  };

  const bilhetesIdentidadeIguais = (): boolean => {
    return (
      !!bilheteIdentidade.trim() &&
      !!bilheteResponsavel.trim() &&
      bilheteIdentidade.trim().toLowerCase() === bilheteResponsavel.trim().toLowerCase()
    );
  };

  const deveMostrarCurso = (): boolean => {
    if (isSuperior) return true;
    if (nivelEscolar === 'medio') return true;
    if (nivelEscolar === 'misto' && anoEscolarSelecionado) return isAnoMedio(anoEscolarSelecionado);
    return false;
  };

  const cursosAtivos: Curso[] = dataCursos?.cursos?.filter((c: Curso) => c.status === 'ativo') ?? [];

  const validarFormulario = (): boolean => {
    const erros: string[] = [];
    if (!nome.trim()) erros.push('Nome do estudante é obrigatório');
    if (!dataNascimento) erros.push('Data de nascimento é obrigatória');
    if (!anoEscolarSelecionado) erros.push('Ano escolar é obrigatório');
    if (!isSuperior && !bilheteResponsavel.trim()) {
      erros.push('BI do responsável é obrigatório para estudantes escolares');
    }
    if (!telefone.trim() && !telefoneResponsavel.trim()) {
      erros.push('Informe pelo menos um telefone do estudante ou do responsável');
    }
    if (bilhetesIdentidadeIguais()) {
      erros.push('O BI do estudante não pode ser igual ao BI do responsável');
    }
    if (deveMostrarCurso() && !cursoSelecionado) {
      erros.push('Para este nível, o curso é obrigatório');
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      erros.push('E-mail inválido');
    }
    if (telefone.trim() && telefone.replace(/\D/g, '').length !== 9) erros.push('Telefone do estudante deve ter 9 dígitos');
    if (telefoneResponsavel.trim() && telefoneResponsavel.replace(/\D/g, '').length !== 9) erros.push('Telefone do responsável deve ter 9 dígitos');
    if (telefone.trim() && telefoneResponsavel.trim() && telefone.replace(/\D/g, '') === telefoneResponsavel.replace(/\D/g, '')) erros.push('Os telefones do estudante e do responsável não podem ser iguais');
    if (!isSuperior && !biResponsavelFile) erros.push('PDF do BI do responsável é obrigatório');
    if (bilheteIdentidade.trim() && !biEstudanteFile) erros.push('PDF do BI do estudante é obrigatório quando o BI é informado');
    if (!bilheteIdentidade.trim() && !cedulaEstudanteFile) erros.push('Cédula do estudante é obrigatória quando o BI do estudante não é informado');
    if (!declaracaoFile && !certificado6File && !certificado9File && !certificadoMedioFile) erros.push('Envie uma declaração ou certificado acadêmico aplicável');
    setValidationErrors(erros);
    return erros.length === 0;
  };

  const limparFormulario = () => {
    setNome('');
    setEmail('');
    setTelefone('');
    setTelefoneResponsavel('');
    setBilheteIdentidade('');
    setBilheteResponsavel('');
    setDataNascimento(null);
    setAnoEscolarSelecionado(null);
    setCursoSelecionado(null);
    setGenero('masculino');
    setBiEstudanteFile(undefined); setBiResponsavelFile(undefined); setCedulaEstudanteFile(undefined);
    setDeclaracaoFile(undefined); setCertificado6File(undefined); setCertificado9File(undefined); setCertificadoMedioFile(undefined);
    setValidationErrors([]);
    setResultado(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const dataNascimentoISO = dataNascimento ? dataNascimento.toISOString().slice(0, 10) : '';

    const payload = {
      nome: nome.trim(),
      genero,
      data_nascimento: dataNascimentoISO,
      email: email.trim() || undefined,
      telefone: telefone.replace(/\D/g, '') || undefined,
      telefone_responsavel: telefoneResponsavel.replace(/\D/g, '') || undefined,
      bilhete_identidade: bilheteIdentidade.trim() || undefined,
      bilhete_identidade_responsavel: bilheteResponsavel.trim() || undefined,
      ano_escolar_fundamental:
        isAnoMedio(anoEscolarSelecionado) || isAnoSuperior(anoEscolarSelecionado)
          ? undefined
          : (anoEscolarSelecionado || undefined),
      ano_escolar_medio: isAnoMedio(anoEscolarSelecionado)
        ? (anoEscolarSelecionado || undefined)
        : undefined,
      ano_superior: isAnoSuperior(anoEscolarSelecionado)
        ? (anoEscolarSelecionado || undefined)
        : undefined,
      curso_medio_id:
        (isAnoMedio(anoEscolarSelecionado) || nivelEscolar === 'medio') && cursoSelecionado
          ? cursoSelecionado.id
          : undefined,
      curso_superior_id:
        isSuperior && cursoSelecionado ? cursoSelecionado.id : undefined,
      bi_estudante: biEstudanteFile,
      bi_responsavel: biResponsavelFile,
      cedula_estudante: cedulaEstudanteFile,
      declaracao: declaracaoFile,
      certificado_6_ano_fundamental: certificado6File,
      certificado_9_ano_fundamental: certificado9File,
      certificado_ensino_medio: certificadoMedioFile,
    };

    try {
      const res = await executarCadastro(payload);
      if (res?.data) {
        setResultado({
          codigo_estudante: res.data.codigo_estudante,
          nome: nome.trim(),
        });
      }
    } catch (err) {
      // Erro tratado pelo hook via erroCadastro
    }
  };

  // Estado de sucesso
  if (resultado) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Cadastrar Estudante" />
        <SuccessState resultado={resultado} onCadastrarOutro={limparFormulario} />
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Cadastrar Estudante" />

      <div className="max-w-2xl">
        {/* Voltar */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/estudantes"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Estudantes
          </Link>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
            Cadastrar Novo Estudante
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

              {/* Nome */}
              <div className="col-span-2">
                <Label>Nome completo *</Label>
                <Input
                  type="text"
                  placeholder="Nome do estudante"
                  defaultValue={nome}
                  onChange={e => setNome(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Género */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Género *
                </label>
                <div className="flex gap-3">
                  {(['masculino', 'feminino'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenero(g)}
                      disabled={carregandoCadastro}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        genero === g
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } disabled:opacity-50`}
                    >
                      {g === 'masculino' ? 'Masculino' : 'Feminino'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data de Nascimento */}
              <div className="col-span-2 sm:col-span-1">
                <DatePicker
                  id="data-nascimento-cadastrar"
                  label="Data de Nascimento *"
                  placeholder="Selecione a data de nascimento"
                  onChange={(dates) => setDataNascimento(dates[0] ?? null)}
                />
              </div>

              {/* Curso — médio / misto / superior */}
              {(isSuperior || nivelEscolar === 'medio' || nivelEscolar === 'misto') && (
                <div className="col-span-2 sm:col-span-1">
                  <Label>
                    Curso {(isSuperior || nivelEscolar === 'medio') ? '* (Obrigatório)' : '(Opcional)'}
                  </Label>
                  <Dropdown
                    value={cursoSelecionado}
                    options={cursosAtivos}
                    onChange={e => {
                      setCursoSelecionado(e.value as Curso);
                      if (isAnoMedio(anoEscolarSelecionado) || isAnoSuperior(anoEscolarSelecionado)) {
                        setAnoEscolarSelecionado(null);
                      }
                    }}
                    optionLabel="nome"
                    placeholder="Selecione o curso"
                    disabled={carregandoCadastro}
                    className="w-full"
                    emptyMessage="Nenhum curso ativo"
                  />
                </div>
              )}

              {/* Ano Escolar */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Ano Escolar *</Label>
                <Dropdown
                  value={anoEscolarSelecionado}
                  options={getAnosDisponiveis()}
                  onChange={e => setAnoEscolarSelecionado(e.value as string)}
                  placeholder={
                    deveMostrarCurso() && !cursoSelecionado
                      ? 'Selecione o curso primeiro'
                      : 'Selecione o ano'
                  }
                  disabled={carregandoCadastro || (deveMostrarCurso() && !cursoSelecionado)}
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div className="col-span-2 sm:col-span-1">
                <Label>E-mail (opcional)</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  defaultValue={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Telefone */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Telefone (opcional)</Label>
                <Input
                  type="text"
                  placeholder="Ex: 923456789"
                  defaultValue={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  disabled={carregandoCadastro}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label>Telefone do responsável</Label>
                <Input type="text" placeholder="Ex: 923456789" defaultValue={telefoneResponsavel} onChange={e => setTelefoneResponsavel(e.target.value)} disabled={carregandoCadastro} />
              </div>

              {/* Bilhetes */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Bilhete do Estudante</Label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789012AB"
                  defaultValue={bilheteIdentidade}
                  onChange={e => setBilheteIdentidade(e.target.value.trimStart())}
                  disabled={carregandoCadastro}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Bilhete do Responsável</Label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789012AB"
                  defaultValue={bilheteResponsavel}
                  onChange={e => setBilheteResponsavel(e.target.value.trimStart())}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Documentos */}
              <div className="col-span-2 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-2">
                <p className="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Documentos PDF obrigatórios</p>
                <label className="text-sm text-gray-600 dark:text-gray-300">BI do estudante<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setBiEstudanteFile(e.target.files?.[0])} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">BI do responsável *<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setBiResponsavelFile(e.target.files?.[0])} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">Cédula do estudante<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setCedulaEstudanteFile(e.target.files?.[0])} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">Declaração<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setDeclaracaoFile(e.target.files?.[0])} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">Certificado 6º fundamental<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setCertificado6File(e.target.files?.[0])} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">Certificado 9º fundamental<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setCertificado9File(e.target.files?.[0])} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">Certificado ensino médio<input type="file" accept="application/pdf,.pdf" className="mt-1 block w-full text-sm" onChange={e => setCertificadoMedioFile(e.target.files?.[0])} /></label>
              </div>
            </div>

            {/* Erros de validação */}
            {validationErrors.length > 0 && (
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                  Corrija os seguintes erros:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((erro, i) => (
                    <li key={i} className="text-sm text-red-700 dark:text-red-400">{erro}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Erro da API */}
            {erroCadastro && (
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroCadastro}</p>
              </div>
            )}

            {/* Nota informativa */}
            <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Informação:</strong> A senha padrão será o <strong>código do estudante</strong> gerado no cadastro.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Link
                href="/estudantes"
                className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Cancelar
              </Link>
              <Button size="sm" disabled={carregandoCadastro}>
                {carregandoCadastro ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
