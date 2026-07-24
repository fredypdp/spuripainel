"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import { academiaService, adminService, estudanteService, perfilService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { setCookie } from "@/lib/utils/cookies";
import type { CampoEdicaoDadoEstudante, MeuPerfilResponse } from "@/types/api";

type DadosForm = {
  nome: string;
  telefone_encarregado: string;
  bilhete_identidade: string;
  bilhete_identidade_encarregado: string;
  data_nascimento: string;
  provincia: string;
  endereco: string;
  website: string;
};
type ContatoForm = { email: string; telefone: string };

const emptyDados: DadosForm = {
  nome: "",
  telefone_encarregado: "",
  bilhete_identidade: "",
  bilhete_identidade_encarregado: "",
  data_nascimento: "",
  provincia: "",
  endereco: "",
  website: "",
};

const sensitiveStudentFields: Array<{ campo: CampoEdicaoDadoEstudante; key: keyof DadosForm; label: string; type?: string }> = [
  { campo: "nome", key: "nome", label: "Nome" },
  { campo: "data_nascimento", key: "data_nascimento", label: "Data de nascimento", type: "date" },
  { campo: "bilhete_identidade", key: "bilhete_identidade", label: "BI do estudante" },
  { campo: "bilhete_identidade_encarregado", key: "bilhete_identidade_encarregado", label: "BI do encarregado" },
];

function onlyDigits(value: string): string { return value.replace(/\D/g, "").slice(0, 9); }
function getDadosInitial(user: MeuPerfilResponse): DadosForm {
  if (user.estudante) return { ...emptyDados, nome: user.estudante.nome ?? "", telefone_encarregado: user.estudante.telefone_encarregado ?? "", bilhete_identidade: user.estudante.bilhete_identidade ?? "", bilhete_identidade_encarregado: user.estudante.bilhete_identidade_encarregado ?? "", data_nascimento: user.estudante.data_nascimento?.slice(0, 10) ?? "" };
  if (user.academia) return { ...emptyDados, nome: user.academia.nome ?? "", provincia: user.academia.provincia ?? "", endereco: user.academia.endereco ?? "", website: user.academia.website ?? "" };
  return { ...emptyDados, nome: user.admin?.nome ?? "" };
}
function getContatoInitial(user: MeuPerfilResponse): ContatoForm { return { email: user.estudante?.email ?? user.academia?.email ?? user.admin?.email ?? "", telefone: user.estudante?.telefone ?? user.academia?.telefone ?? user.admin?.telefone ?? "" }; }

function ProfileSkeleton() { return <div className="space-y-6">{["h-44", "h-52"].map((height, index) => <div key={index} className={`rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 ${height}`}><div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /><div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"><div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /><div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></div></div>)}</div>; }
function CardHeader({ icon, title, description }: { icon: string; title: string; description: string }) { return <div className="mb-5"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10"><Icon icon={icon} width="18px" className="text-brand-500" /></span>{title}</h2><p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{description}</p></div>; }
function Field({ id, label, type = "text", value, disabled, onChange }: { id: string; label: string; type?: string; value: string; disabled: boolean; onChange: (value: string) => void; }) { return <div><label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label><input id={id} type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>; }

function StudentEditRequestCard({ field, initialValue, onCreated }: { field: (typeof sensitiveStudentFields)[number]; initialValue: string; onCreated: () => Promise<unknown> | void }) {
  const [value, setValue] = useState(initialValue);
  const [documento, setDocumento] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setValue(initialValue); setDocumento(null); }, [initialValue]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSuccess(""); setError("");
    const novoValor = value.trim();
    if (!novoValor) return setError(`${field.label} é obrigatório.`);
    if (novoValor === initialValue.trim()) return setError("Altere o valor antes de enviar a solicitação.");
    if (!documento) return setError("Anexe um PDF comprovativo para enviar a solicitação.");
    setSaving(true);
    try {
      await estudanteService.criarSolicitacaoEdicao(field.campo, { novo_valor: novoValor, documento });
      await onCreated();
      setSuccess("Solicitação enviada para aprovação da academia.");
    } catch (err) { setError(formatApiError(err, "Não foi possível enviar a solicitação.")); } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field id={`personalizar-${field.campo}`} label={field.label} type={field.type} value={value} disabled={saving} onChange={setValue} /><div className="flex flex-col gap-2 md:w-64"><input aria-label={`Documento comprovativo para ${field.label}`} type="file" accept="application/pdf,.pdf" disabled={saving} onChange={(event) => setDocumento(event.target.files?.[0] ?? null)} className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-600 hover:file:bg-brand-100 disabled:opacity-60 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-300" /><button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Enviando..." : "Enviar solicitação"}</button></div></div>{error && <div className="mt-3"><Alert title="Erro" message={error} variant="error" /></div>}{success && <div className="mt-3"><Alert title="Solicitação enviada" message={success} variant="success" /></div>}</form>;
}

function StudentGuardianPhoneCard({ initialValue, onUpdated }: { initialValue: string; onUpdated: () => Promise<unknown> | void }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setValue(initialValue), [initialValue]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSuccess(""); setError("");
    const telefone = value.trim();
    if (telefone === initialValue.trim()) return setError("Altere o telefone antes de guardar.");
    if (telefone.length !== 9) return setError("Telefone do encarregado deve ter exatamente 9 dígitos locais.");
    setSaving(true);
    try {
      await estudanteService.atualizarTelefoneEncarregado({ telefone_encarregado: telefone });
      await onUpdated();
      setSuccess("Telefone do encarregado atualizado com sucesso.");
    } catch (err) { setError(formatApiError(err, "Não foi possível atualizar o telefone do encarregado.")); } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field id="personalizar-telefone-encarregado" label="Telefone do encarregado" type="tel" value={value} disabled={saving} onChange={(next) => setValue(onlyDigits(next))} /><button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "A guardar..." : "Guardar telefone"}</button></div>{error && <div className="mt-3"><Alert title="Erro" message={error} variant="error" /></div>}{success && <div className="mt-3"><Alert title="Telefone atualizado" message={success} variant="success" /></div>}</form>;
}

function DadosPessoaisSection({ user, onUpdated }: { user: MeuPerfilResponse; onUpdated: () => Promise<unknown> | void }) {
  const initial = useMemo(() => getDadosInitial(user), [user]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setForm(initial), [initial]);

  const isEstudante = user.tipo === "estudante";
  const isAcademia = user.tipo === "academia";
  const isAdmin = user.tipo === "admin";

  function setField(field: keyof DadosForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setSuccess(""); setError("");
    const nome = form.nome.trim();
    if (isAdmin && !nome) return setError("Nome é obrigatório.");
    setSaving(true);
    try {
      if (isAcademia) await academiaService.atualizarDados({ nome: nome || undefined, provincia: form.provincia.trim() || undefined, endereco: form.endereco.trim() || undefined, website: form.website.trim() || undefined });
      if (isAdmin && user.admin?.id) await adminService.atualizarDadosAdmin(user.admin.id, { nome });
      await onUpdated(); setSuccess("Dados atualizados com sucesso.");
    } catch (err) { setError(formatApiError(err, "Não foi possível atualizar os dados.")); } finally { setSaving(false); }
  }

  if (isEstudante) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><CardHeader icon="mdi:account-edit-outline" title="Dados do estudante" description="Cada dado é editado em uma seção separada. Dados sensíveis criam solicitações com PDF comprovativo para aprovação da academia." /><div className="space-y-4"><StudentGuardianPhoneCard initialValue={initial.telefone_encarregado} onUpdated={onUpdated} />{sensitiveStudentFields.map((field) => <StudentEditRequestCard key={field.campo} field={field} initialValue={initial[field.key]} onCreated={onUpdated} />)}</div></section>;
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><CardHeader icon="mdi:account-edit-outline" title="Dados pessoais" description="Atualize apenas os campos aceitos pela rota de dados do seu tipo de usuário." /><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field id="personalizar-nome" label="Nome" value={form.nome} disabled={saving} onChange={(value) => setField("nome", value)} />{isAcademia && <Field id="personalizar-provincia" label="Província" value={form.provincia} disabled={saving} onChange={(value) => setField("provincia", value)} />}{isAcademia && <Field id="personalizar-endereco" label="Endereço" value={form.endereco} disabled={saving} onChange={(value) => setField("endereco", value)} />}{isAcademia && <Field id="personalizar-website" label="Website" type="url" value={form.website} disabled={saving} onChange={(value) => setField("website", value)} />}</div>{error && <Alert title="Erro ao atualizar dados" message={error} variant="error" />}{success && <Alert title="Dados atualizados" message={success} variant="success" />}<div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "A guardar..." : "Guardar dados"}</button></div></form></section>;
}

function ContatoSection({ user, onUpdated }: { user: MeuPerfilResponse; onUpdated: () => Promise<unknown> | void }) {
  const initial = useMemo(() => getContatoInitial(user), [user]); const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false); const [success, setSuccess] = useState(""); const [error, setError] = useState("");
  useEffect(() => setForm(initial), [initial]);
  async function handleSubmit(event: React.FormEvent) { event.preventDefault(); setSuccess(""); setError(""); const email = form.email.trim(); const telefone = form.telefone.trim(); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Informe um email válido."); if (telefone && telefone.length !== 9) return setError("Telefone deve ter exatamente 9 dígitos locais."); setSaving(true); try { if (email !== initial.email.trim()) await perfilService.atualizarEmail({ email }); if (telefone !== initial.telefone.trim()) await perfilService.atualizarTelefone({ telefone }); await onUpdated(); setSuccess("Contato atualizado com sucesso."); } catch (err) { setError(formatApiError(err, "Não foi possível atualizar email ou telefone.")); } finally { setSaving(false); } }
  return <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><CardHeader icon="mdi:card-account-mail-outline" title="Email e telefone" description="Agrupa as alterações das rotas dedicadas de contato do perfil." /><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field id="personalizar-email" label="Email" type="email" value={form.email} disabled={saving} onChange={(value) => setForm((current) => ({ ...current, email: value }))} /><Field id="personalizar-telefone" label="Telefone" type="tel" value={form.telefone} disabled={saving} onChange={(value) => setForm((current) => ({ ...current, telefone: onlyDigits(value) }))} /></div>{error && <Alert title="Erro ao atualizar contato" message={error} variant="error" />}{success && <Alert title="Contato atualizado" message={success} variant="success" />}<div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "A guardar..." : "Guardar contato"}</button></div></form></section>;
}

export default function PersonalizarPageContent() {
  const { data: profile, loading, error, execute: loadProfile } = useApi(perfilService.meuPerfil);
  useEffect(() => { loadProfile().catch(() => undefined); }, [loadProfile]);
  useEffect(() => { if (profile) setCookie("user", JSON.stringify(profile), 1); }, [profile]);
  return <div><PageBreadcrumb pageTitle="Personalizar" />{loading && !profile ? <ProfileSkeleton /> : error ? <Alert title="Não foi possível carregar seu perfil" message="Tente atualizar a página. Se o problema continuar, entre novamente na sua conta." variant="error" /> : profile ? <div className="space-y-6"><DadosPessoaisSection user={profile} onUpdated={loadProfile} /><ContatoSection user={profile} onUpdated={loadProfile} /></div> : null}</div>;
}
