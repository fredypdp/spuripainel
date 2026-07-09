"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/form/input/InputField";
import SmartSelect from "@/components/form/SmartSelect";
import BirthDateInput from "@/components/form/BirthDateInput";
import DocumentUpload from "@/components/form/DocumentUpload";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { academiaService, consultasService, solicitacaoMatriculaService } from "@/lib/api/services";
import type { AcademiaDetalhada, CriarSolicitacaoMatriculaRequest, Curso, Genero } from "@/types/api";

type StepId = 0 | 1 | 2 | 3 | 4 | 5;
type FileKey = "bi_estudante" | "bi_responsavel" | "cedula_estudante" | "declaracao" | "certificado_6_ano_fundamental" | "certificado_9_ano_fundamental" | "certificado_ensino_medio";
type MatriculaForm = Partial<CriarSolicitacaoMatriculaRequest> & { genero: Genero };

interface AnoOpcao { label: string; value: string }
interface DocumentoOpcao { key: FileKey; label: string; obrigatorio: boolean }

const steps = ["1º Passo", "2º Passo", "3º Passo", "4º Passo", "5º Passo", "6º Passo"];
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

  const documentos = useMemo<DocumentoOpcao[]>(() => {
    const anoAtual = anoSelecionado ?? undefined;
    const estudanteSuperior = isSuperior(anoAtual);
    const temBilheteEstudante = !!form.bilhete_identidade?.trim();
    const docs: DocumentoOpcao[] = [];

    if (estudanteSuperior) {
      docs.push({ key: "bi_estudante", label: "Cópia do BI do estudante", obrigatorio: true });
      if (form.bilhete_identidade_responsavel?.trim() || files.bi_responsavel) docs.push({ key: "bi_responsavel", label: "Cópia do BI do responsável", obrigatorio: false });
    } else {
      docs.push({ key: "bi_responsavel", label: "Cópia do BI do responsável", obrigatorio: true });
      if (!files.cedula_estudante && (temBilheteEstudante || files.bi_estudante)) {
        docs.push({ key: "bi_estudante", label: "Cópia do BI do estudante", obrigatorio: true });
      }
      if (!files.bi_estudante) {
        docs.push({ key: "cedula_estudante", label: "Cédula do estudante", obrigatorio: !temBilheteEstudante });
      }
    }

    let certificadoAplicavel: DocumentoOpcao | null = null;
    if (anoAtual === "7_ano_fundamental") {
      certificadoAplicavel = { key: "certificado_6_ano_fundamental", label: "Certificado da 6.ª classe", obrigatorio: !files.declaracao };
    } else if (anoAtual === "1_ano_medio") {
      certificadoAplicavel = { key: "certificado_9_ano_fundamental", label: "Certificado da 9.ª classe", obrigatorio: !files.declaracao };
    } else if (anoAtual === "1_ano_superior") {
      certificadoAplicavel = { key: "certificado_ensino_medio", label: "Certificado do ensino médio", obrigatorio: !files.declaracao };
    }

    if (certificadoAplicavel) {
      if (!files[certificadoAplicavel.key]) docs.push({ key: "declaracao", label: "Declaração da escola", obrigatorio: false });
      if (!files.declaracao) docs.push(certificadoAplicavel);
    }

    return docs;
  }, [anoSelecionado, files, form.bilhete_identidade, form.bilhete_identidade_responsavel]);

  function setField(key: keyof CriarSolicitacaoMatriculaRequest, value: string) {
    setForm((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function setTelefone(key: "telefone" | "telefone_responsavel", value: string) {
    setField(key, onlyDigits(value).slice(0, 9));
  }

  function setBilheteIdentidade(key: "bilhete_identidade" | "bilhete_identidade_responsavel", value: string) {
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
    }
    if (current === 2) {
      if (!form.nome?.trim()) return "Informe o nome completo.";
      if (!form.genero) return "Selecione o gênero.";
      if (!form.data_nascimento) return "Informe a data de nascimento.";
      if (isSuperior(anoSelecionado ?? undefined) && !form.bilhete_identidade?.trim()) return "Informe o Bilhete de Identidade do estudante para o ensino superior.";
      if (form.bilhete_identidade && !isBilheteIdentidadeValido(form.bilhete_identidade)) return "Informe um BI do estudante válido no formato 123456789LA041.";
      if (!isSuperior(anoSelecionado ?? undefined) && !form.bilhete_identidade_responsavel?.trim()) return "Informe o Bilhete de Identidade do responsável.";
      if (form.bilhete_identidade_responsavel && !isBilheteIdentidadeValido(form.bilhete_identidade_responsavel)) return "Informe um BI do responsável válido no formato 123456789LA041.";
      if (bilhetesIdentidadeIguais(form.bilhete_identidade, form.bilhete_identidade_responsavel)) return "O BI do estudante não pode ser igual ao BI do responsável.";
    }
    if (current === 3) {
      if (!form.telefone?.trim() && !form.telefone_responsavel?.trim()) return "Informe pelo menos um telefone do estudante ou do responsável.";
      if (form.telefone && onlyDigits(form.telefone).length !== 9) return "Telefone do estudante deve ter exatamente 9 dígitos locais.";
      if (form.telefone_responsavel && onlyDigits(form.telefone_responsavel).length !== 9) return "Telefone do responsável deve ter exatamente 9 dígitos locais.";
      if (form.telefone && form.telefone_responsavel && onlyDigits(form.telefone) === onlyDigits(form.telefone_responsavel)) return "Os telefones do estudante e do responsável não podem ser iguais.";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Informe um email válido.";
    }
    if (current === 4) {
      const faltando = documentos.find((doc) => doc.obrigatorio && !files[doc.key]);
      if (faltando) return `Anexe o documento: ${faltando.label}.`;
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
    setStep((prev) => Math.min(prev + 1, 5) as StepId);
  }

  function voltar() {
    setErro("");
    setStep((prev) => Math.max(prev - 1, 0) as StepId);
  }

  async function submit() {
    setErro("");
    setSucesso("");
    for (let i = 0; i <= 4; i += 1) {
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
        telefone_responsavel: onlyDigits(form.telefone_responsavel ?? "") || undefined,
        bilhete_identidade: form.bilhete_identidade?.toUpperCase(),
        bilhete_identidade_responsavel: form.bilhete_identidade_responsavel?.toUpperCase(),
        ...files,
      };
      const res = await solicitacaoMatriculaService.criar(payload);
      setSucesso(`Solicitação enviada com sucesso. Código: ${res.codigo_solicitacao}`);
    } catch (err: any) {
      setErro(err?.message ?? "Não foi possível enviar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  const resumo = [
    ["Instituição", academia ? `${academia.nome} (${academia.codigo_academia})` : "-"],
    ["Curso", curso?.nome ?? "Não se aplica"],
    ["Ano acadêmico", getAnoLabel(anoSelecionado ?? undefined)],
    ["Nome", form.nome ?? "-"],
    ["Gênero", form.genero === "feminino" ? "Feminino" : "Masculino"],
    ["Data de nascimento", form.data_nascimento ?? "-"],
    ["Telefone", form.telefone ?? "-"],
    ["Telefone do responsável", form.telefone_responsavel ?? "-"],
    ["Email", form.email ?? "-"],
    ["BI estudante", form.bilhete_identidade ?? "-"],
    ["BI responsável", form.bilhete_identidade_responsavel ?? "-"],
  ];

  return (
    <div className="flex min-h-screen w-full flex-1 justify-center overflow-y-auto bg-gray-50 px-4 py-6 dark:bg-gray-950 lg:w-1/2 lg:px-8">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Fazer matrícula</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Preencha os dados em poucos passos e revise antes de enviar.</p>
          </div>
          <Link href="/login" className="text-sm font-medium text-brand-500 hover:text-brand-600">Voltar</Link>
        </div>

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
              <SmartSelect
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
                    <SmartSelect value={curso?.id ?? ""} options={cursosDisponiveis.map((item) => ({ value: item.id, label: item.nome }))} onChange={(value) => handleCursoChange(cursosDisponiveis.find((item) => item.id === value) ?? null)} searchable placeholder="Selecione o curso" />
                  </div>
                )}
                {academiaMista && (
                  <div className="sm:col-span-2">
                    <Label>Curso médio (se for matrícula no médio)</Label>
                    <SmartSelect value={curso?.id ?? ""} options={cursosMedio.map((item) => ({ value: item.id, label: item.nome }))} onChange={(value) => handleCursoChange(cursosMedio.find((item) => item.id === value) ?? null)} searchable placeholder="Selecione somente se o ano for do médio" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label>Ano acadêmico *</Label>
                  <SmartSelect
                    value={anoSelecionado ?? ""}
                    options={anosDisponiveis}
                    onChange={(value) => handleAnoChange(value)}
                    searchable
                    placeholder={(academiaSuperior || academiaMedia) && !curso ? "Selecione o curso primeiro" : "Selecione o ano acadêmico"}
                    disabled={(academiaSuperior || academiaMedia) && !curso}
                  />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <StepTitle title="3. Dados pessoais" description="Informe os dados principais do estudante." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Nome completo *</Label><Input placeholder="Nome completo do estudante" defaultValue={form.nome} onChange={(e) => setField("nome", e.target.value)} /></div>
                <div><Label>Gênero *</Label><div className="flex gap-2">{(["masculino", "feminino"] as Genero[]).map((item) => <button key={item} type="button" onClick={() => setField("genero", item)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.genero === item ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"}`}>{item === "masculino" ? "Masculino" : "Feminino"}</button>)}</div></div>
                <BirthDateInput id="matricula-data-nascimento" required value={form.data_nascimento} onChange={(value) => setField("data_nascimento", value)} />
                <div><Label>Bilhete de Identidade do estudante</Label><Input placeholder="Ex: 123456789LA041" value={form.bilhete_identidade ?? ""} onChange={(e) => setBilheteIdentidade("bilhete_identidade", e.target.value)} hint="Use 9 números, 2 letras e 3 números." /></div>
                <div><Label>Bilhete de Identidade do responsável</Label><Input placeholder="Ex: 123456789LA041" value={form.bilhete_identidade_responsavel ?? ""} onChange={(e) => setBilheteIdentidade("bilhete_identidade_responsavel", e.target.value)} hint="Obrigatório fora do ensino superior." /></div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <StepTitle title="4. Telefone e email" description="Informe contactos válidos para a instituição responder à solicitação." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Telefone do estudante</Label><Input type="tel" placeholder="923 456 789" value={maskTelefoneAngola(form.telefone ?? "")} onChange={(e) => setTelefone("telefone", e.target.value)} /></div>
                <div><Label>Telefone do responsável</Label><Input type="tel" placeholder="923 456 789" value={maskTelefoneAngola(form.telefone_responsavel ?? "")} onChange={(e) => setTelefone("telefone_responsavel", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" defaultValue={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <StepTitle title="5. Anexar documentos" description={`Anexe os PDFs pedidos para ${getAnoLabel(anoSelecionado ?? undefined)}. Cada arquivo pode ter até 10MB.`} />
              <div className="grid gap-3 sm:grid-cols-2">
                {documentos.map((doc) => <DocumentUpload key={doc.key} id={`matricula-${doc.key}`} label={doc.label} required={doc.obrigatorio} file={files[doc.key]} onChange={(file, error) => { if (error) setErro(error); else setErro(""); setFiles((prev) => ({ ...prev, [doc.key]: file })); }} />)}
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4">
              <StepTitle title="6. Solicitar matrícula" description="Revise o resumo geral e envie a solicitação." />
              <div className="grid gap-2 sm:grid-cols-2">{resumo.map(([label, value]) => <div key={label} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"><span className="block text-xs text-gray-500">{label}</span><b className="text-gray-800 dark:text-white/90">{value}</b></div>)}</div>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"><h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">Documentos anexados</h3><div className="grid gap-1 text-sm sm:grid-cols-2">{documentos.map((doc) => <p key={doc.key} className="text-gray-600 dark:text-gray-300"><b>{doc.label}:</b> {files[doc.key] ? "✓ anexado" : doc.obrigatorio ? "Ainda falta" : "Não anexado"}</p>)}</div></div>
              {sucesso && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">{sucesso}</p>}
            </section>
          )}
        </div>

        {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{erro}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={voltar} disabled={step === 0 || loading} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300">Voltar</button>
          {step < 5 ? <Button onClick={avancar}>Continuar</Button> : <Button disabled={loading || !!sucesso} onClick={submit}>{loading ? "Enviando..." : sucesso ? "Solicitação enviada" : "Solicitar matrícula"}</Button>}
        </div>
      </div>
    </div>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
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

function bilhetesIdentidadeIguais(estudante?: string, responsavel?: string) {
  return !!estudante && !!responsavel && estudante.trim().toLowerCase() === responsavel.trim().toLowerCase();
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
