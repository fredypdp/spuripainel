"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/form/input/InputField";
import FileInput from "@/components/form/input/FileInput";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { academiaService, consultasService, solicitacaoMatriculaService } from "@/lib/api/services";
import type { AcademiaDetalhada, CriarSolicitacaoMatriculaRequest, Curso, Genero } from "@/types/api";

const generos = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
];

const steps = [
  "Instituição",
  "Ano e curso",
  "Dados pessoais",
  "Identificação",
  "Documentos",
  "Resumo",
];

const anoLabels: Record<string, string> = {
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`${i + 1}_ano_fundamental`, `${i + 1}.º ano fundamental`])),
  ...Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`${i + 1}_ano_medio`, `${i + 1}.º ano médio`])),
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`${i + 1}_ano_superior`, `${i + 1}.º ano superior`])),
};

type Modo = "codigo" | "lista";
type EnsinoEscolhido = "fundamental" | "medio" | "superior";
type FileKey = "bi_estudante" | "bi_responsavel" | "cedula" | "declaracao" | "certificado";

type MatriculaForm = Partial<CriarSolicitacaoMatriculaRequest> & { genero: Genero };

const emptyForm: MatriculaForm = { genero: "masculino" };

function normalizarAcademia(response: unknown): AcademiaDetalhada {
  const data = response as { academia?: AcademiaDetalhada; data?: AcademiaDetalhada } & AcademiaDetalhada;
  return data.academia ?? data.data ?? data;
}

function labelAno(ano?: string) {
  return ano ? anoLabels[ano] ?? ano.replace(/_/g, " ") : "-";
}

function nomeArquivo(file?: File) {
  return file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "Não anexado";
}

function opcoesAnos(anos: string[]) {
  return anos.map((ano) => ({ value: ano, label: labelAno(ano) }));
}

export default function MatriculaPublicPage() {
  const [step, setStep] = useState(0);
  const [modo, setModo] = useState<Modo>("codigo");
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [busca, setBusca] = useState("");
  const [codigo, setCodigo] = useState("");
  const [academia, setAcademia] = useState<AcademiaDetalhada | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [ensino, setEnsino] = useState<EnsinoEscolhido | "">("");
  const [form, setForm] = useState<MatriculaForm>(emptyForm);
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    consultasService
      .listarAcademias({ status: "ativo", limit: 200 })
      .then((r) => setAcademias(r.academias ?? []))
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
      .then((r) => setCursos((r.cursos ?? []).filter((curso) => curso.status === "ativo")))
      .catch(() => setCursos([]))
      .finally(() => setLoadingCursos(false));
  }, [academia]);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return academias
      .filter((a) => !q || a.nome.toLowerCase().includes(q) || a.codigo_academia.toLowerCase().includes(q))
      .slice(0, 50);
  }, [academias, busca]);

  const cursosMedio = useMemo(() => cursos.filter((c) => c.type === "medio"), [cursos]);
  const cursosSuperior = useMemo(() => cursos.filter((c) => c.type === "superior"), [cursos]);
  const anosFundamental = useMemo(() => academia?.anos_academicos?.filter((ano) => ano.includes("fundamental")) ?? [], [academia]);

  const tiposDisponiveis = useMemo(() => {
    const opcoes: { value: EnsinoEscolhido; label: string }[] = [];
    if (academia?.nivel !== "superior" && anosFundamental.length > 0) opcoes.push({ value: "fundamental", label: "Ensino fundamental" });
    if (academia?.nivel !== "superior" && cursosMedio.length > 0) opcoes.push({ value: "medio", label: "Ensino médio" });
    if (academia?.nivel === "superior" || cursosSuperior.length > 0) opcoes.push({ value: "superior", label: "Ensino superior" });
    return opcoes;
  }, [academia, anosFundamental.length, cursosMedio.length, cursosSuperior.length]);

  const cursoSelecionado = useMemo(() => {
    const id = ensino === "medio" ? form.curso_medio_id : form.curso_superior_id;
    return cursos.find((curso) => curso.id === id);
  }, [cursos, ensino, form.curso_medio_id, form.curso_superior_id]);

  const anoAlvo = form.ano_escolar_fundamental || form.ano_escolar_medio || form.ano_superior;
  const exigeDeclaracao = !!anoAlvo && !!academia?.documentos_obrigatorios?.declaracao?.includes(anoAlvo);
  const exigeCertificado = !!anoAlvo && !!academia?.documentos_obrigatorios?.certificado?.includes(anoAlvo);
  const documentos: Array<{ key: FileKey; label: string; required: boolean; hint: string }> = [
    { key: "bi_estudante", label: "Bilhete de Identidade do estudante", required: true, hint: "Documento PDF do estudante." },
    { key: "bi_responsavel", label: "Bilhete de Identidade do responsável", required: true, hint: "Documento PDF do encarregado/responsável." },
    { key: "cedula", label: "Cédula / documento complementar", required: true, hint: "Anexe a cédula ou documento equivalente solicitado pela instituição." },
    { key: "declaracao", label: "Declaração", required: exigeDeclaracao, hint: exigeDeclaracao ? "Obrigatória para o ano selecionado." : "Opcional para o ano selecionado." },
    { key: "certificado", label: "Certificado", required: exigeCertificado, hint: exigeCertificado ? "Obrigatório para o ano selecionado." : "Opcional para o ano selecionado." },
  ];

  function resetEscolhaAcademica() {
    setEnsino("");
    setForm(emptyForm);
    setFiles({});
  }

  function selecionarAcademia(novaAcademia: AcademiaDetalhada | null) {
    setAcademia(novaAcademia);
    resetEscolhaAcademica();
  }

  async function confirmarCodigo() {
    setErro("");
    selecionarAcademia(null);
    const cod = codigo.trim();
    if (!cod) return setErro("Digite o código da instituição.");
    try {
      const res = await consultasService.academia(cod);
      selecionarAcademia(normalizarAcademia(res));
    } catch {
      setErro("Instituição não encontrada ou indisponível.");
    }
  }

  const setField = (key: keyof CriarSolicitacaoMatriculaRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value || undefined }));
  };

  function escolherEnsino(value: string) {
    const tipo = value as EnsinoEscolhido;
    setEnsino(tipo);
    setForm((prev) => ({
      genero: prev.genero,
      nome: prev.nome,
      data_nascimento: prev.data_nascimento,
      email: prev.email,
      telefone: prev.telefone,
      bilhete_identidade: prev.bilhete_identidade,
      bilhete_identidade_responsavel: prev.bilhete_identidade_responsavel,
    }));
  }

  function escolherCurso(id: string) {
    const curso = cursos.find((c) => c.id === id);
    setForm((prev) => ({
      ...prev,
      curso_medio_id: ensino === "medio" ? id : undefined,
      curso_superior_id: ensino === "superior" ? id : undefined,
      ano_escolar_medio: undefined,
      ano_superior: ensino === "superior" && curso?.anos_academicos.length === 1 ? curso.anos_academicos[0] : undefined,
    }));
  }

  function escolherAno(ano: string) {
    setForm((prev) => ({
      ...prev,
      ano_escolar_fundamental: ensino === "fundamental" ? ano : undefined,
      ano_escolar_medio: ensino === "medio" ? ano : undefined,
      ano_superior: ensino === "superior" ? ano : undefined,
    }));
  }

  function validarStep(atual = step) {
    if (atual === 0 && !academia) return "Selecione ou confirme uma instituição para continuar.";
    if (atual === 1) {
      if (!ensino) return "Selecione o nível de ensino.";
      if ((ensino === "medio" || ensino === "superior") && !cursoSelecionado) return "Selecione o curso.";
      if (!anoAlvo) return "Selecione o ano acadêmico.";
    }
    if (atual === 2) {
      if (!form.nome?.trim()) return "Informe o nome completo.";
      if (!form.genero) return "Selecione o gênero.";
      if (!form.data_nascimento) return "Informe a data de nascimento.";
    }
    if (atual === 3) {
      if (!form.bilhete_identidade?.trim()) return "Informe o Bilhete de Identidade do estudante.";
      if (!form.bilhete_identidade_responsavel?.trim()) return "Informe o Bilhete de Identidade do responsável.";
    }
    if (atual === 4) {
      const faltando = documentos.find((doc) => doc.required && !files[doc.key]);
      if (faltando) return `Anexe: ${faltando.label}.`;
    }
    return "";
  }

  function avancar() {
    const msg = validarStep();
    if (msg) return setErro(msg);
    setErro("");
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function voltar() {
    setErro("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setErro("");
    setSucesso("");
    for (let i = 0; i <= 4; i += 1) {
      const msg = validarStep(i);
      if (msg) {
        setStep(i);
        setErro(msg);
        return;
      }
    }
    if (!academia) return;
    setLoading(true);
    try {
      const payload: CriarSolicitacaoMatriculaRequest = {
        ...(form as CriarSolicitacaoMatriculaRequest),
        codigo_academia: academia.codigo_academia,
        ...files,
      };
      const res = await solicitacaoMatriculaService.criar(payload);
      setSucesso(`Solicitação enviada com sucesso. Código: ${res.codigo_solicitacao}`);
      setStep(5);
    } catch (err: any) {
      setErro(err?.message ?? "Não foi possível enviar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  const anosDoCurso = cursoSelecionado?.anos_academicos ?? [];
  const anosParaEnsino = ensino === "fundamental" ? anosFundamental : anosDoCurso;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-brand-500">Matrícula pública</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fazer matrícula</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Preencha em etapas, consulte instituições e cursos públicos, anexe os documentos exigidos e revise tudo antes de solicitar a matrícula.
            </p>
          </div>
          <Link href="/login" className="text-sm font-medium text-brand-500 hover:text-brand-600">Voltar ao login</Link>
        </div>

        <div className="mb-8 grid gap-2 sm:grid-cols-6">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => index < step && setStep(index)}
              className={`rounded-2xl border p-3 text-left text-xs transition ${index === step ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : index < step ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" : "border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400"}`}
            >
              <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm dark:bg-gray-800">{index + 1}</span>
              {item}
            </button>
          ))}
        </div>

        <div className="min-h-[420px] rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
          {step === 0 && (
            <section className="space-y-5">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Escolha a instituição</h2><p className="text-sm text-gray-500">Use o código fornecido pela academia ou escolha uma instituição ativa na lista pública.</p></div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => { setModo("codigo"); selecionarAcademia(null); }} className={`rounded-xl px-4 py-2 text-sm font-medium ${modo === "codigo" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>Digitar código</button>
                <button type="button" onClick={() => { setModo("lista"); selecionarAcademia(null); }} className={`rounded-xl px-4 py-2 text-sm font-medium ${modo === "lista" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>Selecionar na lista</button>
              </div>
              {modo === "codigo" ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input placeholder="Código da instituição" onChange={(e) => setCodigo(e.target.value)} /><button type="button" onClick={confirmarCodigo} className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600">Confirmar</button></div>
              ) : (
                <div className="space-y-3"><Input placeholder="Pesquisar por código ou nome" onChange={(e) => setBusca(e.target.value)} /><Select key={filtradas.length} placeholder="Selecione uma instituição" options={filtradas.map((a) => ({ value: a.codigo_academia, label: `${a.codigo_academia} — ${a.nome}` }))} onChange={(value) => selecionarAcademia(academias.find((a) => a.codigo_academia === value) ?? null)} /></div>
              )}
              {academia && <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20"><b>{academia.nome}</b><br />{academia.codigo_academia} · {academia.endereco} — {academia.provincia}<br />Nível: {academia.nivel === "superior" ? "Ensino superior" : academia.nivel_escolar ?? "Escola"}</div>}
            </section>
          )}

          {step === 1 && (
            <section className="space-y-5">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Selecione ano e curso</h2><p className="text-sm text-gray-500">Cursos e anos são carregados publicamente com base na instituição selecionada.</p></div>
              {loadingCursos && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">Carregando cursos...</p>}
              <div className="grid gap-4 md:grid-cols-2"><div><Label>Nível de ensino</Label><Select key={`ensino-${tiposDisponiveis.length}`} placeholder="Escolha o nível" options={tiposDisponiveis} onChange={escolherEnsino} /></div>
                {(ensino === "medio" || ensino === "superior") && <div><Label>Curso</Label><Select key={`curso-${ensino}-${cursos.length}`} placeholder="Selecione o curso" options={(ensino === "medio" ? cursosMedio : cursosSuperior).map((curso) => ({ value: curso.id, label: curso.nome }))} onChange={escolherCurso} /></div>}
                {!!ensino && <div><Label>Ano acadêmico</Label><Select key={`ano-${ensino}-${cursoSelecionado?.id ?? "fund"}`} placeholder="Selecione o ano" options={opcoesAnos(anosParaEnsino)} onChange={escolherAno} /></div>}
              </div>
              {ensino && anosParaEnsino.length === 0 && !loadingCursos && <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">Não há anos disponíveis para esta opção. Selecione outro nível/curso ou confirme com a instituição.</p>}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Dados pessoais</h2><p className="text-sm text-gray-500">Informe os dados básicos do estudante.</p></div>
              <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Label>Nome completo *</Label><Input defaultValue={form.nome} onChange={(e) => setField("nome", e.target.value)} /></div><div><Label>Gênero *</Label><Select defaultValue={form.genero} options={generos} onChange={(v) => setField("genero", v)} /></div><div><Label>Data de nascimento *</Label><Input type="date" defaultValue={form.data_nascimento} onChange={(e) => setField("data_nascimento", e.target.value)} /></div><div><Label>Email</Label><Input type="email" defaultValue={form.email} onChange={(e) => setField("email", e.target.value)} /></div><div><Label>Telefone</Label><Input defaultValue={form.telefone} onChange={(e) => setField("telefone", e.target.value)} /></div></div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Identificação</h2><p className="text-sm text-gray-500">Os números ajudam a academia a validar a documentação anexada na próxima etapa.</p></div>
              <div className="grid gap-4 md:grid-cols-2"><div><Label>Bilhete de Identidade do estudante *</Label><Input defaultValue={form.bilhete_identidade} onChange={(e) => setField("bilhete_identidade", e.target.value)} /></div><div><Label>Bilhete de Identidade do responsável *</Label><Input defaultValue={form.bilhete_identidade_responsavel} onChange={(e) => setField("bilhete_identidade_responsavel", e.target.value)} /></div></div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-5">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Anexar documentos</h2><p className="text-sm text-gray-500">Envie PDFs. Declaração e certificado são cobrados apenas quando obrigatórios para {labelAno(anoAlvo)}.</p></div>
              <div className="grid gap-4 md:grid-cols-2">{documentos.map((doc) => <div key={doc.key} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"><Label>{doc.label}{doc.required ? " *" : ""}</Label><FileInput className="mt-2" onChange={(e) => setFiles((prev) => ({ ...prev, [doc.key]: e.target.files?.[0] }))} /><p className="mt-2 text-xs text-gray-500">{doc.hint}</p>{files[doc.key] && <p className="mt-1 text-xs font-medium text-green-600">{nomeArquivo(files[doc.key])}</p>}</div>)}</div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-5">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Solicitar matrícula</h2><p className="text-sm text-gray-500">Revise o resumo geral antes de enviar.</p></div>
              <div className="grid gap-4 md:grid-cols-2">
                {[ ["Instituição", academia ? `${academia.nome} (${academia.codigo_academia})` : "-"], ["Nível", ensino || "-"], ["Curso", cursoSelecionado?.nome ?? (ensino === "fundamental" ? "Não se aplica" : "-")], ["Ano", labelAno(anoAlvo)], ["Nome", form.nome ?? "-"], ["Gênero", form.genero], ["Nascimento", form.data_nascimento ?? "-"], ["BI estudante", form.bilhete_identidade ?? "-"], ["BI responsável", form.bilhete_identidade_responsavel ?? "-"] ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800"><span className="block text-xs text-gray-500">{label}</span><b className="text-gray-800 dark:text-white/90">{value}</b></div>)}
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"><h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Documentos</h3><div className="grid gap-2 text-sm md:grid-cols-2">{documentos.filter((d) => d.required || files[d.key]).map((d) => <p key={d.key} className="text-gray-600 dark:text-gray-300"><b>{d.label}:</b> {nomeArquivo(files[d.key])}</p>)}</div></div>
              {sucesso && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">{sucesso}</p>}
            </section>
          )}
        </div>

        {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{erro}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={voltar} disabled={step === 0 || loading} className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-300">Voltar</button>
          {step < 5 ? <Button onClick={avancar}>Continuar</Button> : <Button disabled={loading || !!sucesso} onClick={submit}>{loading ? "Enviando..." : sucesso ? "Solicitação enviada" : "Solicitar matrícula"}</Button>}
        </div>
      </div>
    </div>
  );
}
