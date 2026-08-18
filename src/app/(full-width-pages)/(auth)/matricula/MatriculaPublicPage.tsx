"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/form/input/InputField";
import SearchableSelect from "@/components/form/SearchableSelect";
import Select from "@/components/form/Select";
import BirthDatePicker from "@/components/form/BirthDatePicker";
import DocumentUpload from "@/components/form/DocumentUpload";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Qr, money } from "@/components/paineis/financeiroShared";
import { academiaService, consultasService, solicitacaoMatriculaService } from "@/lib/api/services";
import type { AcademiaDetalhada, CriarSolicitacaoMatriculaRequest, Curso, FinanceiroMetodoPagamento, Genero, SolicitacaoMatriculaResumo, SolicitacaoMatriculaStatusResponse } from "@/types/api";

type StepId = 0 | 1 | 2 | 3 | 4;
type FileKey = "bi_estudante" | "bi_encarregado" | "cedula_estudante" | "declaracao" | "certificado_6_ano_fundamental" | "certificado_9_ano_fundamental" | "certificado_ensino_medio";
type MatriculaForm = Partial<CriarSolicitacaoMatriculaRequest> & { genero: Genero };

interface AnoOpcao { label: string; value: string }
interface DocumentoOpcao { key: FileKey; label: string; obrigatorio: boolean }

const steps = ["1º Passo", "2º Passo", "3º Passo", "4º Passo", "5º Passo"];
const emptyForm: MatriculaForm = { genero: "masculino" };

function normalizarAcademia(response: unknown): AcademiaDetalhada {
  const data = response as { academia?: AcademiaDetalhada; data?: AcademiaDetalhada } & AcademiaDetalhada;
  return data.academia ?? data.data ?? data;
}

function getAnoLabel(value?: string) {
  if (!value) return "-";
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return value.replace(/_/g, " ");
  const nivel = match[2] === "medio" ? "Médio" : match[2] === "superior" ? "Superior" : "Fundamental";
  return `${match[1]}º Ano ${nivel}`;
}

function getAnoAcademicoAnterior(value?: string | null) {
  const match = value?.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return undefined;

  const ano = Number(match[1]);
  const nivel = match[2];

  if (nivel === "fundamental") return ano > 1 ? `${ano - 1}_ano_fundamental` : undefined;
  if (nivel === "medio") return ano === 1 ? "9_ano_fundamental" : `${ano - 1}_ano_medio`;
  if (nivel === "superior") return ano === 1 ? "3_ano_medio" : `${ano - 1}_ano_superior`;
  return undefined;
}

function anoOrder(value: string) {
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  const nivel = match?.[2] === "fundamental" ? 0 : match?.[2] === "medio" ? 1 : 2;
  return nivel * 100 + Number(match?.[1] ?? 0);
}

function toAnoOptions(anos?: string[]): AnoOpcao[] {
  return [...(anos ?? [])]
    .sort((a, b) => anoOrder(a) - anoOrder(b))
    .map((value) => ({ value, label: getAnoLabel(value) }));
}

function isFundamental(ano?: string) { return !!ano && ano.includes("fundamental"); }
function isMedio(ano?: string) { return !!ano && ano.includes("medio"); }
function isSuperior(ano?: string) { return !!ano && ano.includes("superior"); }

export default function MatriculaPublicPage() {
  const [step, setStep] = useState<StepId>(0);
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [academia, setAcademia] = useState<AcademiaDetalhada | null>(null);
  const [codigoAcademia, setCodigoAcademia] = useState("");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [anoSelecionado, setAnoSelecionado] = useState<string | null>(null);
  const [form, setForm] = useState<MatriculaForm>(emptyForm);
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAcademia, setLoadingAcademia] = useState(false);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState({ codigo: "", telefone: "", email: "", bi: "" });
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMatriculaResumo[]>([]);
  const [solicitacao, setSolicitacao] = useState<SolicitacaoMatriculaResumo | null>(null);
  const [statusSolicitacao, setStatusSolicitacao] = useState<SolicitacaoMatriculaStatusResponse | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<FinanceiroMetodoPagamento>("GPO");
  const [telefonePagamento, setTelefonePagamento] = useState("");
  const [resultadoPagamento, setResultadoPagamento] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    consultasService
      .listarAcademias({ status: "ativo", limit: 300 })
      .then((res) => setAcademias(res.academias ?? []))
      .catch(() => setAcademias([]));
  }, []);

  useEffect(() => {
    if (!academia) {
      setCursos([]);
      return;
    }

    setLoadingCursos(true);
    academiaService
      .listarCursos({ codigo_academia: academia.codigo_academia })
      .then((res) => setCursos((res.cursos ?? []).filter((item) => item.status === "ativo")))
      .catch(() => setCursos([]))
      .finally(() => setLoadingCursos(false));
  }, [academia]);

  const academiaFundamental = academia?.nivel !== "superior" && academia?.nivel_escolar === "fundamental";
  const academiaMedia = academia?.nivel !== "superior" && academia?.nivel_escolar === "medio";
  const academiaMista = academia?.nivel !== "superior" && academia?.nivel_escolar === "misto";
  const academiaSuperior = academia?.nivel === "superior";

  const cursosAtivos = useMemo(() => cursos.filter((item) => item.status === "ativo"), [cursos]);
  const cursosMedio = useMemo(() => cursosAtivos.filter((item) => item.type === "medio"), [cursosAtivos]);
  const cursosSuperior = useMemo(() => cursosAtivos.filter((item) => item.type === "superior"), [cursosAtivos]);
  const anosFundamental = useMemo(() => academia?.anos_academicos?.filter(isFundamental) ?? [], [academia]);

  const cursoObrigatorio = academiaSuperior || academiaMedia || (academiaMista && isMedio(anoSelecionado ?? undefined));
  const cursosDisponiveis = academiaSuperior ? cursosSuperior : cursosMedio;

  const anosDisponiveis = useMemo(() => {
    if (academiaFundamental) return toAnoOptions(anosFundamental);
    if (academiaSuperior) return toAnoOptions(curso?.anos_academicos?.filter(isSuperior));
    if (academiaMedia) return toAnoOptions(curso?.anos_academicos?.filter(isMedio));
    if (academiaMista) {
      const anosMedio = curso?.anos_academicos?.filter(isMedio) ?? cursosMedio.flatMap((item) => item.anos_academicos.filter(isMedio));
      return toAnoOptions([...anosFundamental, ...Array.from(new Set(anosMedio))]);
    }
    return [];
  }, [academiaFundamental, academiaMedia, academiaMista, academiaSuperior, anosFundamental, curso, cursosMedio]);

  // Documentos de identificação (BI do estudante, BI do encarregado, cédula) — exibidos no passo "Dados pessoais"
  const documentosIdentificacao = useMemo<DocumentoOpcao[]>(() => {
    const anoAtual = anoSelecionado ?? undefined;
    const estudanteSuperior = isSuperior(anoAtual);
    const temBilheteEstudante = !!form.bilhete_identidade?.trim();
    const docs: DocumentoOpcao[] = [];

    if (estudanteSuperior) {
      docs.push({ key: "bi_estudante", label: "Cópia do BI do estudante", obrigatorio: true });
      if (form.bilhete_identidade_encarregado?.trim() || files.bi_encarregado) docs.push({ key: "bi_encarregado", label: "Cópia do BI do encarregado de educação", obrigatorio: !!form.bilhete_identidade_encarregado?.trim() });
    } else {
      docs.push({ key: "bi_encarregado", label: "Cópia do BI do encarregado de educação", obrigatorio: true });
      if (anoAtual === "1_ano_fundamental") {
        docs.push({ key: "cedula_estudante", label: "Cédula do estudante", obrigatorio: true });
      } else {
        if (!files.cedula_estudante) {
          docs.push({ key: "bi_estudante", label: "Cópia do BI do estudante", obrigatorio: temBilheteEstudante || !!files.bi_estudante });
        }
        if (!temBilheteEstudante) {
          docs.push({ key: "cedula_estudante", label: "Cédula do estudante", obrigatorio: true });
        }
      }
    }

    return docs;
  }, [anoSelecionado, files, form.bilhete_identidade, form.bilhete_identidade_encarregado]);

  // Documentos acadêmicos (declaração e certificados) — exibidos no passo "Selecionar ano"
  const documentosAcademicos = useMemo<DocumentoOpcao[]>(() => {
    const anoAtual = anoSelecionado ?? undefined;
    const docs: DocumentoOpcao[] = [];

    const anoAnterior = getAnoAcademicoAnterior(anoAtual);
    const declaracaoAplicavel: DocumentoOpcao | null = anoAnterior
      ? { key: "declaracao", label: `Declaração escolar do ${getAnoLabel(anoAnterior)}`, obrigatorio: false }
      : null;
    let certificadoAplicavel: DocumentoOpcao | null = null;
    if (anoAtual === "7_ano_fundamental") {
      certificadoAplicavel = { key: "certificado_6_ano_fundamental", label: "Certificado da 6.ª classe", obrigatorio: !files.declaracao };
    } else if (anoAtual === "1_ano_medio") {
      certificadoAplicavel = { key: "certificado_9_ano_fundamental", label: "Certificado da 9.ª classe", obrigatorio: !files.declaracao };
    } else if (anoAtual === "1_ano_superior") {
      certificadoAplicavel = { key: "certificado_ensino_medio", label: "Certificado do ensino médio", obrigatorio: !files.declaracao };
    }

    if (certificadoAplicavel) {
      if (declaracaoAplicavel && !files[certificadoAplicavel.key]) docs.push(declaracaoAplicavel);
      if (!files.declaracao) docs.push(certificadoAplicavel);
    } else if (declaracaoAplicavel) {
      docs.push({ ...declaracaoAplicavel, obrigatorio: true });
    }

    return docs;
  }, [anoSelecionado, files]);

  // Lista combinada — usada apenas no resumo final
  const documentos = useMemo<DocumentoOpcao[]>(
    () => [...documentosIdentificacao, ...documentosAcademicos],
    [documentosIdentificacao, documentosAcademicos]
  );

  const declaracaoAnoAcademico = getAnoAcademicoAnterior(anoSelecionado);
  const estudanteSuperiorSelecionado = isSuperior(anoSelecionado ?? undefined);
  const estudantePrimeiroFundamental = anoSelecionado === "1_ano_fundamental";
  const estudanteEscolarSelecionado = !!anoSelecionado && !estudanteSuperiorSelecionado;

  const certificadoAlternativoKey = documentosAcademicos.find((doc) =>
    doc.key === "certificado_6_ano_fundamental" ||
    doc.key === "certificado_9_ano_fundamental" ||
    doc.key === "certificado_ensino_medio"
  )?.key;
  const mostrarAlternativaDocumentoEstudante = documentosIdentificacao.some((doc) => doc.key === "bi_estudante") && documentosIdentificacao.some((doc) => doc.key === "cedula_estudante");
  const mostrarAlternativaAcademica = documentosAcademicos.some((doc) => doc.key === "declaracao") && !!certificadoAlternativoKey;

  const documentosIdentificacaoSemAlternativas = documentosIdentificacao.filter((doc) => {
    if (mostrarAlternativaDocumentoEstudante && (doc.key === "bi_estudante" || doc.key === "cedula_estudante")) return false;
    return true;
  });
  const documentosEstudanteAlternativos = documentosIdentificacao.filter((doc) => doc.key === "bi_estudante" || doc.key === "cedula_estudante");

  const documentosAcademicosSemAlternativas = documentosAcademicos.filter((doc) => {
    if (mostrarAlternativaAcademica && (doc.key === "declaracao" || doc.key === certificadoAlternativoKey)) return false;
    return true;
  });
  const documentosAcademicosAlternativos = documentosAcademicos.filter((doc) => doc.key === "declaracao" || doc.key === certificadoAlternativoKey);

  const documentosIdentificacaoEstudante = documentosIdentificacaoSemAlternativas.filter((doc) => doc.key !== "bi_encarregado");
  const documentosIdentificacaoEncarregado = documentosIdentificacaoSemAlternativas.filter((doc) => doc.key === "bi_encarregado");

  function setField(key: keyof CriarSolicitacaoMatriculaRequest, value: string) {
    setForm((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function setTelefone(key: "telefone" | "telefone_encarregado", value: string) {
    setField(key, onlyDigits(value).slice(0, 9));
  }

  function setBilheteIdentidade(key: "bilhete_identidade" | "bilhete_identidade_encarregado", value: string) {
    setField(key, maskBilheteIdentidade(value));
  }

  function resetAcademico() {
    setCurso(null);
    setAnoSelecionado(null);
    setFiles({});
    setForm(emptyForm);
  }

  function selecionarAcademia(value: AcademiaDetalhada | null) {
    setAcademia(value);
    setCodigoAcademia(value?.codigo_academia ?? "");
    resetAcademico();
  }

  async function buscarPorCodigo() {
    const codigo = codigoAcademia.trim();
    setErro("");
    if (!codigo) {
      setErro("Informe o código da instituição.");
      return;
    }

    setLoadingAcademia(true);
    try {
      const res = await consultasService.academia(codigo);
      selecionarAcademia(normalizarAcademia(res));
    } catch {
      setErro("Instituição não encontrada ou indisponível.");
    } finally {
      setLoadingAcademia(false);
    }
  }

  function handleAnoChange(value: string) {
    setAnoSelecionado(value);
    setFiles({});
    setForm((prev) => ({
      ...prev,
      bilhete_identidade: value === "1_ano_fundamental" ? undefined : prev.bilhete_identidade,
      ano_escolar_fundamental: isFundamental(value) ? value : undefined,
      ano_escolar_medio: isMedio(value) ? value : undefined,
      ano_superior: isSuperior(value) ? value : undefined,
      curso_medio_id: isMedio(value) && curso ? curso.id : undefined,
      curso_superior_id: isSuperior(value) && curso ? curso.id : undefined,
    }));
  }

  function handleCursoChange(value: Curso | null) {
    setCurso(value);
    setAnoSelecionado(null);
    setForm((prev) => ({ ...prev, ano_escolar_medio: undefined, ano_superior: undefined, curso_medio_id: undefined, curso_superior_id: undefined }));
  }

  function validarStep(current = step) {
    if (current === 0 && !academia) return "Selecione uma instituição pelo código ou pela lista.";
    if (current === 1) {
      if (cursoObrigatorio && !curso) return "Selecione o curso para continuar.";
      if (!anoSelecionado) return "Selecione o ano acadêmico.";
      if (cursoObrigatorio && curso && !curso.anos_academicos.includes(anoSelecionado)) return "O curso selecionado não possui o ano acadêmico escolhido.";
      const faltandoAcademico = documentosAcademicos.find((doc) => doc.obrigatorio && !files[doc.key]);
      if (faltandoAcademico) return `Anexe o documento: ${faltandoAcademico.label}.`;
      if (files.declaracao && !declaracaoAnoAcademico) return "A declaração só pode ser enviada quando existe um ano acadêmico anterior imediato válido.";
    }
    if (current === 2) {
      if (!form.nome?.trim()) return "Informe o nome completo.";
      if (!form.genero) return "Selecione o gênero.";
      if (!form.data_nascimento) return "Informe a data de nascimento.";
      if (!isBeforeToday(form.data_nascimento)) return "A data de nascimento deve ser anterior à data atual.";
      if (isSuperior(anoSelecionado ?? undefined) && !form.bilhete_identidade?.trim()) return "Informe o Bilhete de Identidade do estudante para o ensino superior.";
      if (!estudantePrimeiroFundamental && form.bilhete_identidade && !isBilheteIdentidadeValido(form.bilhete_identidade)) return "Informe um BI do estudante válido no formato 123456789LA041.";
      if (!isSuperior(anoSelecionado ?? undefined) && !form.bilhete_identidade_encarregado?.trim()) return "Informe o Bilhete de Identidade do encarregado de educação.";
      if (form.bilhete_identidade_encarregado && !isBilheteIdentidadeValido(form.bilhete_identidade_encarregado)) return "Informe um BI do encarregado de educação válido no formato 123456789LA041.";
      if (bilhetesIdentidadeIguais(form.bilhete_identidade, form.bilhete_identidade_encarregado)) return "O BI do estudante não pode ser igual ao BI do encarregado de educação.";
      const faltandoIdentificacao = documentosIdentificacao.find((doc) => doc.obrigatorio && !files[doc.key]);
      if (faltandoIdentificacao) return `Anexe o documento: ${faltandoIdentificacao.label}.`;
      if (form.bilhete_identidade?.trim() && !files.bi_estudante) return "Anexe o BI do estudante informado.";
      if (form.bilhete_identidade_encarregado?.trim() && !files.bi_encarregado) return "Anexe o BI do encarregado de educação informado.";
      if (!isSuperior(anoSelecionado ?? undefined) && anoSelecionado !== "1_ano_fundamental") {
        const temBiEstudanteCompleto = !!form.bilhete_identidade?.trim() && !!files.bi_estudante;
        const temCedulaEstudante = !!files.cedula_estudante;
        if (temBiEstudanteCompleto && temCedulaEstudante) return "Anexe apenas BI do estudante ou cédula do estudante, nunca os dois.";
        if (!temBiEstudanteCompleto && !temCedulaEstudante) return "Anexe o BI do estudante com o número informado ou a cédula do estudante.";
      }
    }
    if (current === 3) {
      if (isSuperior(anoSelecionado ?? undefined) && !form.telefone?.trim()) return "Informe o telefone do estudante para o ensino superior.";
      if (!isSuperior(anoSelecionado ?? undefined) && !form.telefone_encarregado?.trim()) return "Informe o telefone do encarregado de educação para estudantes escolares.";
      if (form.telefone && onlyDigits(form.telefone).length !== 9) return "Telefone do estudante deve ter exatamente 9 dígitos locais.";
      if (form.telefone_encarregado && onlyDigits(form.telefone_encarregado).length !== 9) return "Telefone do encarregado de educação deve ter exatamente 9 dígitos locais.";
      if (form.telefone && form.telefone_encarregado && onlyDigits(form.telefone) === onlyDigits(form.telefone_encarregado)) return "Os telefones do estudante e do encarregado de educação não podem ser iguais.";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Informe um email válido.";
    }
    return "";
  }

  function avancar() {
    const msg = validarStep();
    if (msg) {
      setErro(msg);
      return;
    }
    setErro("");
    setStep((prev) => Math.min(prev + 1, 4) as StepId);
  }

  function voltar() {
    setErro("");
    setStep((prev) => Math.max(prev - 1, 0) as StepId);
  }

  async function submit() {
    setErro("");
    setSucesso("");
    for (let i = 0; i <= 3; i += 1) {
      const msg = validarStep(i as StepId);
      if (msg) {
        setStep(i as StepId);
        setErro(msg);
        return;
      }
    }
    if (!academia || !anoSelecionado) return;

    setLoading(true);
    try {
      const payload: CriarSolicitacaoMatriculaRequest = {
        ...(form as CriarSolicitacaoMatriculaRequest),
        codigo_academia: academia.codigo_academia,
        ano_escolar_fundamental: isFundamental(anoSelecionado) ? anoSelecionado : undefined,
        ano_escolar_medio: isMedio(anoSelecionado) ? anoSelecionado : undefined,
        ano_superior: isSuperior(anoSelecionado) ? anoSelecionado : undefined,
        curso_medio_id: isMedio(anoSelecionado) ? curso?.id : undefined,
        curso_superior_id: isSuperior(anoSelecionado) ? curso?.id : undefined,
        telefone: onlyDigits(form.telefone ?? "") || undefined,
        telefone_encarregado: onlyDigits(form.telefone_encarregado ?? "") || undefined,
        bilhete_identidade: estudantePrimeiroFundamental ? undefined : form.bilhete_identidade?.toUpperCase(),
        bilhete_identidade_encarregado: form.bilhete_identidade_encarregado?.toUpperCase(),
        declaracao_ano_academico: files.declaracao ? declaracaoAnoAcademico : undefined,
        ...files,
      };
      const res = await solicitacaoMatriculaService.criar(payload);
      setSucesso(res.codigo_solicitacao);
    } catch (err: any) {
      setErro(err?.message ?? "Não foi possível enviar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  async function consultarSolicitacao(codigoParam?: string) {
    const codigo = (codigoParam ?? busca.codigo).trim();
    setErro(""); setResultadoPagamento(null);
    if (!codigo) { setErro("Informe o código da solicitação."); return; }
    setLoadingStatus(true);
    try {
      const status = await solicitacaoMatriculaService.consultarStatus(codigo);
      setStatusSolicitacao(status);
      setSolicitacao((prev) => prev?.codigo_solicitacao === codigo ? prev : { codigo_solicitacao: codigo, nome_estudante: "Solicitação", academia: status.codigo_academia, data_submissao: "", status: status.status });
      setBusca((prev) => ({ ...prev, codigo }));
      setMetodoPagamento((status.metodos_pagamento?.[0] ?? "GPO") as FinanceiroMetodoPagamento);
    } catch (err: any) { setErro(err?.message ?? "Não foi possível consultar a solicitação."); }
    finally { setLoadingStatus(false); }
  }

  async function buscarSolicitacoes() {
    setErro(""); setSolicitacoes([]);
    const params = { telefone: busca.telefone, email: busca.email, bilhete_identidade: busca.bi, bilhete_identidade_encarregado: busca.bi };
    if (!params.telefone && !params.email && !params.bilhete_identidade) { setErro("Informe telefone, email ou BI para buscar solicitações."); return; }
    setLoadingStatus(true);
    try { const res = await solicitacaoMatriculaService.buscar(params); setSolicitacoes(res.solicitacoes ?? []); }
    catch (err: any) { setErro(err?.message ?? "Não foi possível buscar solicitações."); }
    finally { setLoadingStatus(false); }
  }

  async function iniciarPagamentoMatricula() {
    if (!solicitacao) return;
    if (metodoPagamento === "GPO" && !telefonePagamento.trim()) { setErro("Informe o telefone para pagamento GPO."); return; }
    setErro(""); setLoadingStatus(true);
    try {
      const res = await solicitacaoMatriculaService.iniciarPagamento(solicitacao.codigo_solicitacao, { metodo_pagamento: metodoPagamento, telefone: metodoPagamento === "GPO" ? onlyDigits(telefonePagamento) : undefined });
      setResultadoPagamento(res);
      await consultarSolicitacao(solicitacao.codigo_solicitacao);
    } catch (err: any) { setErro(err?.message ?? "Não foi possível iniciar o pagamento."); }
    finally { setLoadingStatus(false); }
  }

  function setDocumentoFile(key: FileKey, file?: File) {
    if (file && key === "cedula_estudante") setField("bilhete_identidade", "");

    setFiles((prev) => {
      const next = { ...prev, [key]: file };

      if (file && key === "bi_estudante") delete next.cedula_estudante;
      if (file && key === "cedula_estudante") {
        delete next.bi_estudante;
      }
      if (file && key === "declaracao") {
        delete next.certificado_6_ano_fundamental;
        delete next.certificado_9_ano_fundamental;
        delete next.certificado_ensino_medio;
      }
      if (file && (key === "certificado_6_ano_fundamental" || key === "certificado_9_ano_fundamental" || key === "certificado_ensino_medio")) {
        delete next.declaracao;
      }

      return next;
    });
  }

  const resumo = [
    ["Instituição", academia ? `${academia.nome} (${academia.codigo_academia})` : "-"],
    ["Curso", curso?.nome ?? "Não se aplica"],
    ["Ano acadêmico", getAnoLabel(anoSelecionado ?? undefined)],
    ["Nome", form.nome ?? "-"],
    ["Gênero", form.genero === "feminino" ? "Feminino" : "Masculino"],
    ["Data de nascimento", form.data_nascimento ?? "-"],
    ["Telefone", form.telefone ?? "-"],
    ["Telefone do encarregado de educação", form.telefone_encarregado ?? "-"],
    ["Email", form.email ?? "-"],
    ["BI estudante", form.bilhete_identidade ?? "-"],
    ["BI encarregado de educação", form.bilhete_identidade_encarregado ?? "-"],
    ...(files.declaracao ? [["Ano da declaração", getAnoLabel(declaracaoAnoAcademico)]] : []),
  ];

  return (
    <div className="flex min-h-screen w-full flex-1 justify-center overflow-y-auto bg-gray-50 px-4 py-6 dark:bg-gray-950 lg:w-1/2 lg:px-8">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Fazer matrícula</h1>
          </div>
          <Link href="/login" className="text-sm font-medium text-brand-500 hover:text-brand-600">Voltar</Link>
        </div>

        <section className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-900/20">
          <h2 className="font-semibold text-brand-700 dark:text-brand-200">Acompanhar solicitação e pagar matrícula</h2>
          <p className="mt-1 text-sm text-brand-700/90 dark:text-brand-300">Se já enviou a matrícula, informe o código recebido ou busque por telefone, email ou BI para consultar o estado e pagar a taxa quando ela existir.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><Input placeholder="Código da solicitação" defaultValue={busca.codigo} onChange={(e)=>setBusca((prev)=>({...prev,codigo:e.target.value}))}/><Button onClick={()=>consultarSolicitacao()} disabled={loadingStatus}>Consultar status</Button></div>
          <div className="mt-3 grid gap-3 md:grid-cols-4"><Input placeholder="Telefone" defaultValue={busca.telefone} onChange={(e)=>setBusca((prev)=>({...prev,telefone:e.target.value}))}/><Input placeholder="Email" defaultValue={busca.email} onChange={(e)=>setBusca((prev)=>({...prev,email:e.target.value}))}/><Input placeholder="BI" defaultValue={busca.bi} onChange={(e)=>setBusca((prev)=>({...prev,bi:e.target.value}))}/><Button variant="outline" onClick={buscarSolicitacoes} disabled={loadingStatus}>Buscar solicitações</Button></div>
          {solicitacoes.length > 0 && <div className="mt-3 space-y-2">{solicitacoes.map((item)=><button key={item.codigo_solicitacao} type="button" onClick={()=>{setSolicitacao(item); void consultarSolicitacao(item.codigo_solicitacao);}} className="block w-full rounded-lg border bg-white p-3 text-left text-sm hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900"><b>{item.codigo_solicitacao}</b> · {item.nome_estudante} · {item.status}</button>)}</div>}
          {statusSolicitacao && solicitacao && <div className="mt-4 rounded-lg bg-white p-4 text-sm dark:bg-gray-900"><p><b>Solicitação:</b> {solicitacao.codigo_solicitacao}</p><p><b>Estado:</b> {statusSolicitacao.status}</p><p><b>Instituição:</b> {statusSolicitacao.codigo_academia}</p>{statusSolicitacao.valor_matricula != null && <p><b>Taxa de matrícula:</b> {money(statusSolicitacao.valor_matricula)}</p>}{statusSolicitacao.valor_matricula != null && statusSolicitacao.metodos_pagamento?.length ? <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Select key={metodoPagamento} defaultValue={metodoPagamento} options={statusSolicitacao.metodos_pagamento.map((m)=>({value:m,label:m}))} onChange={(v)=>setMetodoPagamento(v as FinanceiroMetodoPagamento)}/>{metodoPagamento === "GPO" && <Input placeholder="Telefone para GPO" defaultValue={telefonePagamento} onChange={(e)=>setTelefonePagamento(e.target.value)}/>}<Button onClick={iniciarPagamentoMatricula} disabled={loadingStatus}>Pagar taxa</Button></div> : <p className="mt-2 text-gray-500">Nenhum pagamento de matrícula está pendente para esta solicitação.</p>}{resultadoPagamento?.cobranca && <div className="mt-3 space-y-2"><p><b>Status da cobrança:</b> {resultadoPagamento.cobranca.status}</p>{metodoPagamento === "GPO" && <p>Confirme a notificação no telefone informado.</p>}{metodoPagamento === "REF" && <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(resultadoPagamento.cobranca.response ?? {}, null, 2)}</pre>}{metodoPagamento === "GPO_QR" && <Qr value={resultadoPagamento.cobranca.qrCodeArr}/>}<Button size="sm" variant="outline" onClick={()=>consultarSolicitacao(solicitacao.codigo_solicitacao)}>Verificar status</Button></div>}</div>}
        </section>

        <div className="mb-5 flex flex-wrap gap-2">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => index < step && setStep(index as StepId)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${index === step ? "bg-brand-500 text-white" : index < step ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {step === 0 && (
            <section className="space-y-4">
              <StepTitle title="1. Escolher a instituição" description="Pesquise na lista pública ou informe o código da instituição." />
              <SearchableSelect
                value={academia?.codigo_academia ?? ""}
                options={academias.map((item) => ({ value: item.codigo_academia, label: `${item.nome} · ${item.provincia}` }))}
                onChange={(value) => selecionarAcademia(academias.find((item) => item.codigo_academia === value) ?? null)}
                searchable
                placeholder="Pesquisar instituição por nome"
              />
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input placeholder="Ou digite o código da instituição" defaultValue={codigoAcademia} onChange={(e) => setCodigoAcademia(e.target.value)} />
                <button type="button" onClick={buscarPorCodigo} disabled={loadingAcademia} className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-gray-900">
                  {loadingAcademia ? "Buscando..." : "Buscar código"}
                </button>
              </div>
              {academia && <InfoCard title={academia.nome} lines={[academia.codigo_academia, `${academia.endereco} — ${academia.provincia}`, academiaSuperior ? "Ensino superior" : `Escola ${academia.nivel_escolar ?? ""}`]} />}
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <StepTitle title={academiaSuperior || academiaMedia ? "2. Selecionar curso e ano acadêmico" : "2. Selecionar ano acadêmico"} description={academiaSuperior || academiaMedia ? "Escolha primeiro um curso ativo e depois o ano acadêmico." : "Escolha um dos anos acadêmicos ativos da instituição."} />
              {loadingCursos && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">Carregando cursos...</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                {(academiaSuperior || academiaMedia) && (
                  <div className="sm:col-span-2">
                    <Label>Curso *</Label>
                    <SearchableSelect value={curso?.id ?? ""} options={cursosDisponiveis.map((item) => ({ value: item.id, label: item.nome }))} onChange={(value) => handleCursoChange(cursosDisponiveis.find((item) => item.id === value) ?? null)} searchable placeholder="Selecione o curso" />
                  </div>
                )}
                {academiaMista && (
                  <div className="sm:col-span-2">
                    <Label>Curso médio (se for matrícula no médio)</Label>
                    <SearchableSelect value={curso?.id ?? ""} options={cursosMedio.map((item) => ({ value: item.id, label: item.nome }))} onChange={(value) => handleCursoChange(cursosMedio.find((item) => item.id === value) ?? null)} searchable placeholder="Selecione somente se o ano for do médio" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label>Ano acadêmico *</Label>
                  <SearchableSelect
                    value={anoSelecionado ?? ""}
                    options={anosDisponiveis}
                    onChange={(value) => handleAnoChange(value)}
                    searchable
                    placeholder={(academiaSuperior || academiaMedia) && !curso ? "Selecione o curso primeiro" : "Selecione o ano acadêmico"}
                    disabled={(academiaSuperior || academiaMedia) && !curso}
                  />
                </div>
              </div>

              {anoSelecionado && (
                <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Documentos para {getAnoLabel(anoSelecionado)}</p>
                  {estudantePrimeiroFundamental && (
                    <InfoCard title="Não é necessário nenhum comprovativo anterior" lines={["Para o 1.º Ano Fundamental, não pedimos documentos de anos anteriores."]} />
                  )}
                  {(documentosAcademicosSemAlternativas.length > 0 || mostrarAlternativaAcademica) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {documentosAcademicosSemAlternativas.map((doc) => (
                        <DocumentUpload
                          key={doc.key}
                          id={`matricula-${doc.key}`}
                          label={doc.label}
                          required={doc.obrigatorio}
                          file={files[doc.key]}
                          onChange={(file, error) => { if (error) setErro(error); else setErro(""); setDocumentoFile(doc.key, file); }}
                        />
                      ))}
                      {mostrarAlternativaAcademica && (
                        <div className="grid gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800 sm:col-span-2 sm:grid-cols-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Envie um destes dois documentos:</p>
                          {documentosAcademicosAlternativos.map((doc) => (
                            <DocumentUpload
                              key={doc.key}
                              id={`matricula-${doc.key}`}
                              label={doc.label}
                              required={doc.obrigatorio}
                              file={files[doc.key]}
                              onChange={(file, error) => { if (error) setErro(error); else setErro(""); setDocumentoFile(doc.key, file); }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <StepTitle title="3. Dados pessoais" description="Informe os dados principais do estudante e anexe os documentos de identificação pedidos." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Nome completo *</Label><Input placeholder="Nome completo do estudante" defaultValue={form.nome} onChange={(e) => setField("nome", e.target.value)} /></div>
                <div><Label>Gênero *</Label><div className="flex gap-2">{(["masculino", "feminino"] as Genero[]).map((item) => <button key={item} type="button" onClick={() => setField("genero", item)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.genero === item ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"}`}>{item === "masculino" ? "Masculino" : "Feminino"}</button>)}</div></div>
                <BirthDatePicker id="matricula-data-nascimento" required value={form.data_nascimento} onChange={(value) => setField("data_nascimento", value)} />
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Identificação</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!estudantePrimeiroFundamental ? (
                    <div>
                      <Label>Bilhete de Identidade do estudante{estudanteSuperiorSelecionado ? " *" : " (opcional)"}</Label>
                      <Input
                        placeholder="Ex: 123456789LA041"
                        value={form.bilhete_identidade ?? ""}
                        onChange={(e) => { setBilheteIdentidade("bilhete_identidade", e.target.value); setFiles((prev) => ({ ...prev, cedula_estudante: undefined })); }}
                        hint={estudanteEscolarSelecionado ? "Opcional para escola; se preencher o número, anexe também a cópia do BI abaixo." : "Obrigatório no ensino superior. Use 9 números, 2 letras e 3 números."}
                      />
                    </div>
                  ) : (
                    <InfoCard title="Documento do estudante" lines={["Para o 1.º Ano Fundamental, pedimos apenas a cédula do estudante."]} />
                  )}
                  <div>
                    <Label>Bilhete de Identidade do encarregado de educação</Label>
                    <Input placeholder="Ex: 123456789LA041" value={form.bilhete_identidade_encarregado ?? ""} onChange={(e) => setBilheteIdentidade("bilhete_identidade_encarregado", e.target.value)} hint="Obrigatório fora do ensino superior." />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Anexar documentos</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...documentosIdentificacaoEstudante, ...documentosIdentificacaoEncarregado].map((doc) => (
                    <DocumentUpload
                      key={doc.key}
                      id={`matricula-${doc.key}`}
                      label={doc.label}
                      required={doc.obrigatorio}
                      file={files[doc.key]}
                      onChange={(file, error) => { if (error) setErro(error); else setErro(""); setDocumentoFile(doc.key, file); }}
                    />
                  ))}
                  {mostrarAlternativaDocumentoEstudante && (
                    <div className="grid gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800 sm:col-span-2 sm:grid-cols-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Envie um destes dois documentos:</p>
                      {documentosEstudanteAlternativos.map((doc) => (
                        <DocumentUpload
                          key={doc.key}
                          id={`matricula-${doc.key}`}
                          label={doc.label}
                          required={doc.obrigatorio}
                          file={files[doc.key]}
                          onChange={(file, error) => { if (error) setErro(error); else setErro(""); setDocumentoFile(doc.key, file); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <StepTitle title="4. Telefone e email" description="Informe contactos válidos para a instituição responder à solicitação." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Telefone do estudante</Label><Input type="tel" placeholder="923 456 789" value={maskTelefoneAngola(form.telefone ?? "")} onChange={(e) => setTelefone("telefone", e.target.value)} /></div>
                <div><Label>Telefone do encarregado de educação</Label><Input type="tel" placeholder="923 456 789" value={maskTelefoneAngola(form.telefone_encarregado ?? "")} onChange={(e) => setTelefone("telefone_encarregado", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" defaultValue={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <StepTitle title="5. Solicitar matrícula" description="Revise o resumo geral e envie a solicitação." />
              <div className="grid gap-2 sm:grid-cols-2">{resumo.map(([label, value]) => <div key={label} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"><span className="block text-xs text-gray-500">{label}</span><b className="text-gray-800 dark:text-white/90">{value}</b></div>)}</div>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"><h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">Documentos anexados</h3><div className="grid gap-1 text-sm sm:grid-cols-2">{documentos.map((doc) => <p key={doc.key} className="text-gray-600 dark:text-gray-300"><b>{doc.label}:</b> {files[doc.key] ? "✓ anexado" : doc.obrigatorio ? "Ainda falta" : "Não anexado"}</p>)}</div></div>
              {sucesso && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(sucesso)}
                  className="w-full rounded-lg bg-green-50 p-3 text-left text-sm text-green-700 transition hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/15"
                  title="Clique para copiar o código da solicitação"
                >
                  Solicitação enviada com sucesso. Código: <b>{sucesso}</b> <span className="text-xs">(clique para copiar)</span>
                </button>
              )}
            </section>
          )}
        </div>

        {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{erro}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={voltar} disabled={step === 0 || loading} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300">Voltar</button>
          {step < 4 ? <Button onClick={avancar}>Continuar</Button> : <Button disabled={loading || !!sucesso} onClick={submit}>{loading ? "Enviando..." : sucesso ? "Solicitação enviada" : "Solicitar matrícula"}</Button>}
        </div>
      </div>
    </div>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isBeforeToday(value?: string) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function maskTelefoneAngola(value: string) {
  const digits = onlyDigits(value).slice(0, 9);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function maskBilheteIdentidade(value: string) {
  return value.replace(/[^0-9a-z]/gi, "").toUpperCase().slice(0, 14);
}

function isBilheteIdentidadeValido(value?: string) {
  return !!value && /^\d{9}[A-Z]{2}\d{3}$/.test(value);
}

function bilhetesIdentidadeIguais(estudante?: string, encarregado?: string) {
  return !!estudante && !!encarregado && estudante.trim().toLowerCase() === encarregado.trim().toLowerCase();
}

function StepTitle({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p></div>;
}

function AcademiaOption({ academia, compact = false }: { academia: AcademiaDetalhada; compact?: boolean }) {
  return <div className={compact ? "leading-tight" : "py-1"}><span className="block font-medium text-gray-800 dark:text-white/90">{academia.nome}</span><span className="text-xs text-gray-500">{academia.codigo_academia} · {academia.provincia}</span></div>;
}

function InfoCard({ title, lines }: { title: string; lines: Array<string | undefined> }) {
  return <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20"><b>{title}</b>{lines.filter(Boolean).map((line) => <span key={line} className="block">{line}</span>)}</div>;
}
