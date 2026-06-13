"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { consultasService, solicitacaoMatriculaService } from "@/lib/api/services";
import type { AcademiaDetalhada, CriarSolicitacaoMatriculaRequest } from "@/types/api";

const generos = [ { value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" } ];
const anosFundamental = Array.from({ length: 9 }, (_, i) => ({ value: `${i + 1}_ano_fundamental`, label: `${i + 1}.º ano fundamental` }));
const anosMedio = Array.from({ length: 4 }, (_, i) => ({ value: `${i + 1}_ano_medio`, label: `${i + 1}.º ano médio` }));
const anosSuperior = Array.from({ length: 6 }, (_, i) => ({ value: `${i + 1}_ano_superior`, label: `${i + 1}.º ano superior` }));

type Modo = "codigo" | "lista";

export default function MatriculaPublicPage() {
  const [modo, setModo] = useState<Modo>("codigo");
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [busca, setBusca] = useState("");
  const [codigo, setCodigo] = useState("");
  const [academia, setAcademia] = useState<AcademiaDetalhada | null>(null);
  const [form, setForm] = useState<Partial<CriarSolicitacaoMatriculaRequest>>({ genero: "masculino" as any });
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => { consultasService.listarAcademias({ status: "ativo", limit: 200 }).then(r => setAcademias(r.academias ?? [])).catch(() => {}); }, []);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return academias.filter(a => !q || a.nome.toLowerCase().includes(q) || a.codigo_academia.toLowerCase().includes(q)).slice(0, 30);
  }, [academias, busca]);

  async function confirmarCodigo() {
    setErro(""); setAcademia(null);
    const cod = codigo.trim();
    if (!cod) return setErro("Digite o código da academia.");
    try { const res = await consultasService.academia(cod); setAcademia((res as any).academia ?? (res as any).data ?? res as any); }
    catch { setErro("Academia não encontrada ou indisponível."); }
  }

  const setField = (key: keyof CriarSolicitacaoMatriculaRequest, value: string) => setForm(prev => ({ ...prev, [key]: value || undefined }));
  const obrig = academia?.documentos_obrigatorios;
  const anoAlvo = form.ano_escolar_fundamental || form.ano_escolar_medio || form.ano_superior;
  const exigeDeclaracao = !!anoAlvo && !!obrig?.declaracao?.includes(anoAlvo);
  const exigeCertificado = !!anoAlvo && !!obrig?.certificado?.includes(anoAlvo);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErro(""); setSucesso("");
    if (!academia) return setErro("Selecione ou confirme uma academia.");
    setLoading(true);
    try {
      const payload: CriarSolicitacaoMatriculaRequest = { ...(form as any), codigo_academia: academia.codigo_academia, ...files };
      const res = await solicitacaoMatriculaService.criar(payload);
      setSucesso(`Solicitação enviada com sucesso. Código: ${res.codigo_solicitacao}`);
    } catch (err: any) { setErro(err?.message ?? "Não foi possível enviar a solicitação."); }
    finally { setLoading(false); }
  }

  return <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950"><div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
    <div className="mb-6 flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fazer matrícula</h1><p className="text-sm text-gray-500">Envie seus dados e documentos PDF para a academia analisar.</p></div><Link href="/login" className="text-sm text-brand-500">Voltar ao login</Link></div>
    <div className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800"><Label>Como deseja escolher a academia?</Label><div className="mt-2 flex flex-wrap gap-3"><button type="button" onClick={() => {setModo("codigo"); setAcademia(null);}} className={`rounded-lg px-4 py-2 text-sm ${modo === "codigo" ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}>Digitar código</button><button type="button" onClick={() => {setModo("lista"); setAcademia(null);}} className={`rounded-lg px-4 py-2 text-sm ${modo === "lista" ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}>Selecionar na lista</button></div>
      {modo === "codigo" ? <div className="mt-4 flex gap-2"><Input placeholder="Código da academia" onChange={e => setCodigo(e.target.value)} /><button type="button" onClick={confirmarCodigo} className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white">Confirmar</button></div> : <div className="mt-4 space-y-2"><Input placeholder="Pesquisar por código ou nome" onChange={e => setBusca(e.target.value)} /><select className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700" onChange={e => setAcademia(academias.find(a => a.codigo_academia === e.target.value) ?? null)} defaultValue=""><option value="">Selecione uma academia</option>{filtradas.map(a => <option key={a.codigo_academia} value={a.codigo_academia}>{a.codigo_academia} — {a.nome}</option>)}</select></div>}
      {academia && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300"><b>{academia.nome}</b><br />{academia.endereco} — {academia.provincia}</div>}
    </div>
    <form onSubmit={submit} className="space-y-5"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><Label>Nome</Label><Input onChange={e => setField("nome", e.target.value)} /></div><div><Label>Gênero</Label><Select options={generos} onChange={v => setField("genero", v)} defaultValue="masculino" /></div><div><Label>Data de nascimento</Label><Input type="date" onChange={e => setField("data_nascimento", e.target.value)} /></div><div><Label>Email</Label><Input type="email" onChange={e => setField("email", e.target.value)} /></div><div><Label>Telefone</Label><Input onChange={e => setField("telefone", e.target.value)} /></div><div><Label>BI estudante</Label><Input onChange={e => setField("bilhete_identidade", e.target.value)} /></div><div><Label>BI responsável</Label><Input onChange={e => setField("bilhete_identidade_responsavel", e.target.value)} /></div></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div><Label>Ano fundamental</Label><Select options={[{value:"",label:"Não se aplica"},...anosFundamental]} onChange={v => setForm(p => ({...p, ano_escolar_fundamental:v||undefined, ano_escolar_medio:undefined, curso_medio_id:undefined, ano_superior:undefined, curso_superior_id:undefined}))} /></div><div><Label>Ano médio</Label><Select options={[{value:"",label:"Não se aplica"},...anosMedio]} onChange={v => setForm(p => ({...p, ano_escolar_medio:v||undefined, ano_escolar_fundamental:undefined, ano_superior:undefined}))} /></div><div><Label>Ano superior</Label><Select options={[{value:"",label:"Não se aplica"},...anosSuperior]} onChange={v => setForm(p => ({...p, ano_superior:v||undefined, ano_escolar_fundamental:undefined, ano_escolar_medio:undefined}))} /></div></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{["bi_estudante","bi_responsavel","cedula","declaracao","certificado"].map(k => <div key={k}><Label>{k.replace(/_/g," ")}{(k==="declaracao"&&exigeDeclaracao)||(k==="certificado"&&exigeCertificado)?" *":""}</Label><input type="file" accept="application/pdf" className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700" onChange={e => setFiles(p => ({...p, [k]: e.target.files?.[0]}))} /></div>)}</div>
      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{erro}</p>}{sucesso && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{sucesso}</p>}<Button disabled={loading}>{loading ? "Enviando..." : "Enviar solicitação"}</Button></form>
  </div></div>;
}
