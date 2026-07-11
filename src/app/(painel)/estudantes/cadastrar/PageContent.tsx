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
import BirthDateInput from "@/components/form/BirthDateInput";
import DocumentUpload from "@/components/form/DocumentUpload";
import SmartSelect from "@/components/form/SmartSelect";
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

type FileKey = "bi_estudante" | "bi_responsavel" | "cedula_estudante" | "declaracao" | "certificado_6_ano_fundamental" | "certificado_9_ano_fundamental" | "certificado_ensino_medio";
interface DocumentoOpcao { key: FileKey; label: string; obrigatorio: boolean }

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

const documentLabels: Record<FileKey, string> = {
  bi_estudante: 'Bilhete de identidade do estudante',
  bi_responsavel: 'Bilhete de identidade do responsável',
  cedula_estudante: 'Cédula do estudante',
  declaracao: 'Declaração',
  certificado_6_ano_fundamental: 'Certificado da 6.ª classe',
  certificado_9_ano_fundamental: 'Certificado da 9.ª classe',
  certificado_ensino_medio: 'Certificado do ensino médio',
};

function onlyDigits(value: string) { return value.replace(/\D/g, ''); }
function normalizePhone(value: string) { return onlyDigits(value).slice(0, 9); }
function maskTelefone(value: string) { return normalizePhone(value).replace(/(\d{3})(?=\d)/g, '$1 ').trim(); }
function normalizeBi(value: string) { return value.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, 14); }
function isBiValido(value?: string) { return !value || /^\d{9}[A-Z]{2}\d{3}$/.test(value); }
function isBeforeToday(value?: string) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}
function anoOrder(value: string) {
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  const nivel = match?.[2] === 'fundamental' ? 0 : match?.[2] === 'medio' ? 1 : 2;
  return nivel * 100 + Number(match?.[1] ?? 0);
}
function isAnoFundamental(v?: string | null) { return !!v && /^\d+_ano_fundamental$/.test(v); }
function isAnoMedioValue(v?: string | null) { return !!v && /^\d+_ano_medio$/.test(v); }
function isAnoSuperiorValue(v?: string | null) { return !!v && /^\d+_ano_superior$/.test(v); }
function getAnoLabel(value?: string | null) {
  if (!value) return '-';
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return value.replace(/_/g, ' ');
  const nivel = match[2] === 'medio' ? 'Médio' : match[2] === 'superior' ? 'Superior' : 'Fundamental';
  return `${match[1]}º Ano ${nivel}`;
}
function getAnoAcademicoAnterior(value?: string | null) {
  const match = value?.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return undefined;
  const ano = Number(match[1]);
  const nivel = match[2];

  if (nivel === 'fundamental') return ano > 1 ? `${ano - 1}_ano_fundamental` : undefined;
  if (nivel === 'medio') return ano === 1 ? '9_ano_fundamental' : `${ano - 1}_ano_medio`;
  if (nivel === 'superior') return ano === 1 ? '3_ano_medio' : `${ano - 1}_ano_superior`;
  return undefined;
}

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
  const [dataNascimento, setDataNascimento] = useState('');
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

  const isAnoMedio = isAnoMedioValue;
  const isAnoSuperior = isAnoSuperiorValue;
  const isEstudanteSuperior = (ano?: string | null) => isSuperior || isAnoSuperior(ano);

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
    return (cursoSelecionado.anos_academicos as string[]).filter(isAnoMedioValue).sort((a, b) => anoOrder(a) - anoOrder(b)).map((v: string) => {
      const m = v.match(/^(\d+)_ano_medio$/);
      return { value: v, label: m ? `${m[1]}º Ano Médio` : v.replace(/_/g, ' ') };
    });
  };

  const getAnosDisponiveis = (): AnoEscolar[] => {
    if (isSuperior) {
      if (!cursoSelecionado?.anos_academicos) return [];
      return cursoSelecionado.anos_academicos.filter(isAnoSuperiorValue).sort((a, b) => anoOrder(a) - anoOrder(b)).map((v: string) => {
        const m = v.match(/^(\d+)_ano_superior$/);
        return { value: v, label: m ? `${m[1]}º Ano` : v.replace(/_/g, ' ') };
      });
    }
    if (nivelEscolar === 'fundamental') {
      const ativos = user?.academia?.anos_academicos?.filter(isAnoFundamental) ?? [];
      return ativos.length ? ANOS_FUNDAMENTAL_LIST.filter((ano) => ativos.includes(ano.value)) : ANOS_FUNDAMENTAL_LIST;
    }
    if (nivelEscolar === 'medio') return getAnosMedioFromCurso();
    if (nivelEscolar === 'misto') {
      const ativos = user?.academia?.anos_academicos?.filter(isAnoFundamental) ?? [];
      const anosFundamentais = ativos.length ? ANOS_FUNDAMENTAL_LIST.filter((ano) => ativos.includes(ano.value)) : ANOS_FUNDAMENTAL_LIST;
      return [...anosFundamentais, ...getAnosMedioFromCurso()];
    }
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
  const declaracaoAnoAcademico = getAnoAcademicoAnterior(anoEscolarSelecionado);
  const documentos: DocumentoOpcao[] = (() => {
    const anoAtual = anoEscolarSelecionado ?? undefined;
    const estudanteSuperior = isEstudanteSuperior(anoAtual);
    const temBiEstudanteTexto = !!bilheteIdentidade.trim();
    const docs: DocumentoOpcao[] = [];

    if (estudanteSuperior) {
      docs.push({ key: 'bi_estudante', label: documentLabels.bi_estudante, obrigatorio: true });
      if (bilheteResponsavel.trim() || biResponsavelFile) docs.push({ key: 'bi_responsavel', label: documentLabels.bi_responsavel, obrigatorio: !!bilheteResponsavel.trim() });
    } else {
      docs.push({ key: 'bi_responsavel', label: documentLabels.bi_responsavel, obrigatorio: true });
      if (anoAtual === '1_ano_fundamental') {
        docs.push({ key: 'cedula_estudante', label: documentLabels.cedula_estudante, obrigatorio: true });
      } else {
        if (!cedulaEstudanteFile) {
          docs.push({ key: 'bi_estudante', label: documentLabels.bi_estudante, obrigatorio: temBiEstudanteTexto || !!biEstudanteFile });
        }
        if (!biEstudanteFile) {
          docs.push({ key: 'cedula_estudante', label: documentLabels.cedula_estudante, obrigatorio: !temBiEstudanteTexto });
        }
      }
    }

    const anoAnterior = getAnoAcademicoAnterior(anoAtual);
    const declaracaoAplicavel: DocumentoOpcao | null = anoAnterior
      ? { key: 'declaracao', label: `Declaração escolar do ${getAnoLabel(anoAnterior)}`, obrigatorio: false }
      : null;
    let certificadoAplicavel: DocumentoOpcao | null = null;
    if (anoAtual === '7_ano_fundamental') {
      certificadoAplicavel = { key: 'certificado_6_ano_fundamental', label: documentLabels.certificado_6_ano_fundamental, obrigatorio: !declaracaoFile };
    } else if (anoAtual === '1_ano_medio') {
      certificadoAplicavel = { key: 'certificado_9_ano_fundamental', label: documentLabels.certificado_9_ano_fundamental, obrigatorio: !declaracaoFile };
    } else if (anoAtual === '1_ano_superior') {
      certificadoAplicavel = { key: 'certificado_ensino_medio', label: documentLabels.certificado_ensino_medio, obrigatorio: !declaracaoFile };
    }

    if (certificadoAplicavel) {
      if (declaracaoAplicavel && !({ certificado_6_ano_fundamental: certificado6File, certificado_9_ano_fundamental: certificado9File, certificado_ensino_medio: certificadoMedioFile }[certificadoAplicavel.key as 'certificado_6_ano_fundamental' | 'certificado_9_ano_fundamental' | 'certificado_ensino_medio'])) {
        docs.push(declaracaoAplicavel);
      }
      if (!declaracaoFile) docs.push(certificadoAplicavel);
    } else if (declaracaoAplicavel) {
      docs.push({ ...declaracaoAplicavel, obrigatorio: true });
    }

    return docs;
  })();

  const getDocumentoFile = (key: FileKey): File | undefined => ({
    bi_estudante: biEstudanteFile,
    bi_responsavel: biResponsavelFile,
    cedula_estudante: cedulaEstudanteFile,
    declaracao: declaracaoFile,
    certificado_6_ano_fundamental: certificado6File,
    certificado_9_ano_fundamental: certificado9File,
    certificado_ensino_medio: certificadoMedioFile,
  }[key]);

  const limparDocumentos = () => {
    setBiEstudanteFile(undefined);
    setBiResponsavelFile(undefined);
    setCedulaEstudanteFile(undefined);
    setDeclaracaoFile(undefined);
    setCertificado6File(undefined);
    setCertificado9File(undefined);
    setCertificadoMedioFile(undefined);
  };

  const setDocumentoFile = (key: FileKey, file?: File) => {
    const setters: Record<FileKey, (file?: File) => void> = {
      bi_estudante: setBiEstudanteFile,
      bi_responsavel: setBiResponsavelFile,
      cedula_estudante: setCedulaEstudanteFile,
      declaracao: setDeclaracaoFile,
      certificado_6_ano_fundamental: setCertificado6File,
      certificado_9_ano_fundamental: setCertificado9File,
      certificado_ensino_medio: setCertificadoMedioFile,
    };

    setters[key](file);

    if (file && key === 'bi_estudante') setCedulaEstudanteFile(undefined);
    if (file && key === 'cedula_estudante') {
      setBiEstudanteFile(undefined);
      setBilheteIdentidade('');
    }
    if (file && key === 'declaracao') {
      setCertificado6File(undefined);
      setCertificado9File(undefined);
      setCertificadoMedioFile(undefined);
    }
    if (file && (key === 'certificado_6_ano_fundamental' || key === 'certificado_9_ano_fundamental' || key === 'certificado_ensino_medio')) {
      setDeclaracaoFile(undefined);
    }
  };


  const validarFormulario = (): boolean => {
    const erros: string[] = [];
    if (!nome.trim()) erros.push('Nome do estudante é obrigatório');
    if (!dataNascimento) erros.push('Data de nascimento é obrigatória');
    else if (!isBeforeToday(dataNascimento)) erros.push('Data de nascimento deve ser anterior à data atual');
    if (!genero) erros.push('Gênero é obrigatório');
    if (!anoEscolarSelecionado) erros.push('Ano escolar é obrigatório');
    if (isEstudanteSuperior(anoEscolarSelecionado) && !bilheteIdentidade.trim()) {
      erros.push('BI do estudante é obrigatório no ensino superior');
    }
    if (!isEstudanteSuperior(anoEscolarSelecionado) && !bilheteResponsavel.trim()) {
      erros.push('BI do responsável é obrigatório para estudantes escolares');
    }
    if (isEstudanteSuperior(anoEscolarSelecionado) && !telefone.trim()) {
      erros.push('Telefone do estudante é obrigatório no ensino superior');
    }
    if (!isEstudanteSuperior(anoEscolarSelecionado) && !telefoneResponsavel.trim()) {
      erros.push('Telefone do responsável é obrigatório para estudantes escolares');
    }
    if (bilhetesIdentidadeIguais()) {
      erros.push('O BI do estudante não pode ser igual ao BI do responsável');
    }
    if (deveMostrarCurso() && !cursoSelecionado) {
      erros.push('Para este nível, o curso é obrigatório');
    }
    if (deveMostrarCurso() && cursoSelecionado && anoEscolarSelecionado && !cursoSelecionado.anos_academicos.includes(anoEscolarSelecionado)) {
      erros.push('O curso selecionado não possui o ano acadêmico escolhido');
    }
    if (cursoSelecionado && isAnoMedio(anoEscolarSelecionado) && cursoSelecionado.type !== 'medio') {
      erros.push('O curso selecionado deve ser do tipo médio');
    }
    if (cursoSelecionado && isAnoSuperior(anoEscolarSelecionado) && cursoSelecionado.type !== 'superior') {
      erros.push('O curso selecionado deve ser do tipo superior');
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      erros.push('E-mail inválido');
    }
    if (telefone.trim() && normalizePhone(telefone).length !== 9) erros.push('Telefone do estudante deve ter exatamente 9 dígitos locais');
    if (telefoneResponsavel.trim() && normalizePhone(telefoneResponsavel).length !== 9) erros.push('Telefone do responsável deve ter exatamente 9 dígitos locais');
    if (telefone.trim() && telefoneResponsavel.trim() && normalizePhone(telefone) === normalizePhone(telefoneResponsavel)) erros.push('Os telefones do estudante e do responsável não podem ser iguais');
    if (anoEscolarSelecionado !== '1_ano_fundamental' && !isBiValido(bilheteIdentidade)) erros.push('BI do estudante deve usar o formato 123456789LA041');
    if (!isBiValido(bilheteResponsavel)) erros.push('BI do responsável deve usar o formato 123456789LA041');
    if (bilheteIdentidade.trim() && !biEstudanteFile) erros.push('Anexe o documento: Bilhete de identidade do estudante');
    if (bilheteResponsavel.trim() && !biResponsavelFile) erros.push('Anexe o documento: Bilhete de identidade do responsável');
    if (!isEstudanteSuperior(anoEscolarSelecionado) && anoEscolarSelecionado !== '1_ano_fundamental') {
      const temBiEstudanteCompleto = !!bilheteIdentidade.trim() && !!biEstudanteFile;
      const temCedulaEstudante = !!cedulaEstudanteFile;
      if (temBiEstudanteCompleto && temCedulaEstudante) erros.push('Anexe apenas BI do estudante ou cédula do estudante, nunca os dois');
      if (!temBiEstudanteCompleto && !temCedulaEstudante) erros.push('Anexe o BI do estudante com o número informado ou a cédula do estudante');
    }
    documentos.forEach((doc) => {
      if (doc.obrigatorio && !getDocumentoFile(doc.key)) erros.push(`Anexe o documento: ${doc.label}`);
    });
    if (declaracaoFile && !declaracaoAnoAcademico) {
      erros.push('A declaração só pode ser enviada quando existe um ano acadêmico anterior imediato válido');
    }
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
    setDataNascimento('');
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

    const dataNascimentoISO = dataNascimento;

    const payload = {
      nome: nome.trim(),
      genero,
      data_nascimento: dataNascimentoISO,
      email: email.trim() || undefined,
      telefone: normalizePhone(telefone) || undefined,
      telefone_responsavel: normalizePhone(telefoneResponsavel) || undefined,
      bilhete_identidade: anoEscolarSelecionado === '1_ano_fundamental' ? undefined : bilheteIdentidade.trim().toUpperCase() || undefined,
      bilhete_identidade_responsavel: bilheteResponsavel.trim().toUpperCase() || undefined,
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
        isAnoSuperior(anoEscolarSelecionado) && cursoSelecionado ? cursoSelecionado.id : undefined,
      declaracao_ano_academico: declaracaoFile ? declaracaoAnoAcademico : undefined,
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
                  value={nome}
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
                <BirthDateInput
                  id="data-nascimento-cadastrar"
                  label="Data de nascimento"
                  required
                  value={dataNascimento}
                  onChange={setDataNascimento}
                />
              </div>

              {/* Curso — médio / misto / superior */}
              {(isSuperior || nivelEscolar === 'medio' || nivelEscolar === 'misto') && (
                <div className="col-span-2 sm:col-span-1">
                  <Label>
                    Curso {(isSuperior || nivelEscolar === 'medio') ? '* (Obrigatório)' : '(Opcional)'}
                  </Label>
                  <SmartSelect
                    value={cursoSelecionado?.id ?? ''}
                    options={cursosAtivos.filter((curso) => isSuperior ? curso.type === 'superior' : curso.type === 'medio').map((curso) => ({ value: curso.id, label: `${curso.nome} (${curso.type})` }))}
                    onChange={(value) => {
                      setCursoSelecionado(cursosAtivos.find((curso) => curso.id === value) ?? null);
                      if (isAnoMedio(anoEscolarSelecionado) || isAnoSuperior(anoEscolarSelecionado)) {
                        setAnoEscolarSelecionado(null);
                        limparDocumentos();
                      }
                    }}
                    searchable
                    placeholder="Selecione o curso"
                    disabled={carregandoCadastro}
                  />
                </div>
              )}

              {/* Ano Escolar */}
              <div className="col-span-2 sm:col-span-1">
                <Label>Ano Escolar *</Label>
                <SmartSelect
                  value={anoEscolarSelecionado ?? ''}
                  options={getAnosDisponiveis()}
                  onChange={(value) => {
                    setAnoEscolarSelecionado(value || null);
                    if (value === '1_ano_fundamental') setBilheteIdentidade('');
                    limparDocumentos();
                  }}
                  searchable
                  placeholder={
                    deveMostrarCurso() && !cursoSelecionado
                      ? 'Selecione o curso primeiro'
                      : 'Selecione o ano'
                  }
                  disabled={carregandoCadastro || (deveMostrarCurso() && !cursoSelecionado)}
                />
              </div>

              {/* Email */}
              <div className="col-span-2 sm:col-span-1">
                <Label>E-mail (opcional)</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
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
                  value={maskTelefone(telefone)}
                  onChange={e => setTelefone(normalizePhone(e.target.value))}
                  disabled={carregandoCadastro}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label>Telefone do responsável</Label>
                <Input type="text" placeholder="Ex: 923456789" value={maskTelefone(telefoneResponsavel)} onChange={e => setTelefoneResponsavel(normalizePhone(e.target.value))} disabled={carregandoCadastro} />
              </div>

              {/* Bilhetes */}
              {anoEscolarSelecionado !== '1_ano_fundamental' && (
                <div className="col-span-2 sm:col-span-1">
                  <Label>Bilhete de Identidade do estudante{isEstudanteSuperior(anoEscolarSelecionado) ? ' *' : ' (opcional)'}</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 123456789LA041"
                    value={bilheteIdentidade}
                    onChange={e => {
                      setBilheteIdentidade(normalizeBi(e.target.value));
                      setCedulaEstudanteFile(undefined);
                    }}
                    disabled={carregandoCadastro}
                    hint={isEstudanteSuperior(anoEscolarSelecionado) ? 'Obrigatório no ensino superior.' : 'Opcional para escola; se preencher, anexe também o BI do estudante.'}
                  />
                </div>
              )}
              <div className="col-span-2 sm:col-span-1">
                <Label>Bilhete de Identidade do responsável{isEstudanteSuperior(anoEscolarSelecionado) ? ' (opcional)' : ' *'}</Label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789012AB"
                  value={bilheteResponsavel}
                  onChange={e => setBilheteResponsavel(normalizeBi(e.target.value))}
                  disabled={carregandoCadastro}
                />
              </div>

              {/* Documentos */}
              {anoEscolarSelecionado && (
                <div className="col-span-2 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-2">
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Documentos</p>
                  </div>
                  {anoEscolarSelecionado === '1_ano_fundamental' && (
                    <div className="col-span-1 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300 sm:col-span-2">
                      O 1.º Ano Fundamental exige apenas a cédula do estudante como documento do estudante.
                    </div>
                  )}
                  {documentos.map((doc) => (
                    <DocumentUpload
                      key={doc.key}
                      id={`estudante-${doc.key}`}
                      label={doc.label}
                      required={doc.obrigatorio}
                      file={getDocumentoFile(doc.key)}
                      onChange={(file, error) => {
                        setDocumentoFile(doc.key, file);
                        if (error) setValidationErrors([error]);
                        else setValidationErrors((prev) => prev.filter((item) => !item.includes(doc.label)));
                      }}
                    />
                  ))}
                </div>
              )}
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
