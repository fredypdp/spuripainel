
"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import { academiaService, adminService, estudanteService, perfilService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { setCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";
import PasswordSettingsCard from "../PasswordSettingsCard";

type DadosForm = { nome: string; telefone_encarregado: string; bilhete_identidade: string; bilhete_identidade_encarregado: string; data_nascimento: string; provincia: string; endereco: string; website: string; };
type ContatoForm = { email: string; telefone: string; };

const emptyDados: DadosForm = { nome: "", telefone_encarregado: "", bilhete_identidade: "", bilhete_identidade_encarregado: "", data_nascimento: "", provincia: "", endereco: "", website: "" };

function onlyDigits(value: string): string { return value.replace(/\D/g, "").slice(0, 9); }
function getDadosInitial(user: MeuPerfilResponse): DadosForm {
  if (user.estudante) return { ...emptyDados, nome: user.estudante.nome ?? "", telefone_encarregado: user.estudante.telefone_encarregado ?? "", bilhete_identidade: user.estudante.bilhete_identidade ?? "", bilhete_identidade_encarregado: user.estudante.bilhete_identidade_encarregado ?? "", data_nascimento: user.estudante.data_nascimento?.slice(0, 10) ?? "" };
  if (user.academia) return { ...emptyDados, nome: user.academia.nome ?? "", provincia: user.academia.provincia ?? "", endereco: user.academia.endereco ?? "", website: user.academia.website ?? "" };
  return { ...emptyDados, nome: user.admin?.nome ?? "" };
}
function getContatoInitial(user: MeuPerfilResponse): ContatoForm { return { email: user.estudante?.email ?? user.academia?.email ?? user.admin?.email ?? "", telefone: user.estudante?.telefone ?? user.academia?.telefone ?? user.admin?.telefone ?? "" }; }

function ProfileSkeleton() { return <div className="space-y-6">{["h-44", "h-52", "h-56"].map((height, index) => <div key={index} className={`rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 ${height}`}><div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /><div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"><div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /><div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></div></div>)}</div>; }
function CardHeader({ icon, title, description }: { icon: string; title: string; description: string }) { return <div className="mb-5"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10"><Icon icon={icon} width="18px" className="text-brand-500" /></span>{title}</h2><p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{description}</p></div>; }
function Field({ id, label, type = "text", value, disabled, onChange }: { id: string; label: string; type?: string; value: string; disabled: boolean; onChange: (value: string) => void; }) { return <div><label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label><input id={id} type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>; }

function DadosPessoaisSection({ user, onUpdated }: { user: MeuPerfilResponse; onUpdated: () => Promise<unknown> | void }) {
  const initial = useMemo(() => getDadosInitial(user), [user]);
  const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false); const [success, setSuccess] = useState(""); const [error, setError] = useState("");
  useEffect(() => setForm(initial), [initial]);
  const isEstudante = user.tipo === "estudante"; const isAcademia = user.tipo === "academia"; const isAdmin = user.tipo === "admin";
  function setField(field: keyof DadosForm, value: string) { setForm((current) => ({ ...current, [field]: field === "telefone_encarregado" ? onlyDigits(value) : value })); }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setSuccess(""); setError("");
    const nome = form.nome.trim(); const biEstudante = form.bilhete_identidade.trim(); const biEncarregado = form.bilhete_identidade_encarregado.trim();
    if (!nome) return setError("Nome é obrigatório.");
    if (form.telefone_encarregado.trim() && form.telefone_encarregado.trim().length !== 9) return setError("Telefone do encarregado deve ter exatamente 9 dígitos locais.");
    if (biEstudante && biEncarregado && biEstudante.toLowerCase() === biEncarregado.toLowerCase()) return setError("O BI do estudante não pode ser igual ao BI do encarregado de educação.");
    setSaving(true);
    try {
      if (isEstudante) await estudanteService.atualizarDadosPessoais({ nome, telefone_encarregado: form.telefone_encarregado.trim() || undefined, bilhete_identidade: biEstudante || undefined, bilhete_identidade_encarregado: biEncarregado || undefined, data_nascimento: form.data_nascimento || undefined });
      if (isAcademia) await academiaService.atualizarDados({ nome, provincia: form.provincia.trim() || undefined, endereco: form.endereco.trim() || undefined, website: form.website.trim() || undefined });
      if (isAdmin && user.admin?.id) await adminService.atualizarDadosAdmin(user.admin.id, { nome });
      await onUpdated(); setSuccess("Dados pessoais atualizados com sucesso.");
    } catch (err) { setError(formatApiError(err, "Não foi possível atualizar os dados pessoais.")); } finally { setSaving(false); }
  }
  return <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><CardHeader icon="mdi:account-edit-outline" title="Dados pessoais" description="Agrupa as alterações feitas pela rota de dados do seu tipo de usuário." /><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field id="personalizar-nome" label="Nome" value={form.nome} disabled={saving} onChange={(value) => setField("nome", value)} />{isEstudante && <Field id="personalizar-data-nascimento" label="Data de nascimento" type="date" value={form.data_nascimento} disabled={saving} onChange={(value) => setField("data_nascimento", value)} />}{isEstudante && <Field id="personalizar-telefone-encarregado" label="Telefone do encarregado" type="tel" value={form.telefone_encarregado} disabled={saving} onChange={(value) => setField("telefone_encarregado", value)} />}{isEstudante && <Field id="personalizar-bi" label="BI do estudante" value={form.bilhete_identidade} disabled={saving} onChange={(value) => setField("bilhete_identidade", value)} />}{isEstudante && <Field id="personalizar-bi-encarregado" label="BI do encarregado" value={form.bilhete_identidade_encarregado} disabled={saving} onChange={(value) => setField("bilhete_identidade_encarregado", value)} />}{isAcademia && <Field id="personalizar-provincia" label="Província" value={form.provincia} disabled={saving} onChange={(value) => setField("provincia", value)} />}{isAcademia && <Field id="personalizar-endereco" label="Endereço" value={form.endereco} disabled={saving} onChange={(value) => setField("endereco", value)} />}{isAcademia && <Field id="personalizar-website" label="Website" type="url" value={form.website} disabled={saving} onChange={(value) => setField("website", value)} />}</div>{error && <Alert title="Erro ao atualizar dados" message={error} variant="error" />}{success && <Alert title="Dados atualizados" message={success} variant="success" />}<div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "A guardar..." : "Guardar dados"}</button></div></form></section>;
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
  return <div><PageBreadcrumb pageTitle="Personalizar" />{loading && !profile ? <ProfileSkeleton /> : error ? <Alert title="Não foi possível carregar seu perfil" message="Tente atualizar a página. Se o problema continuar, entre novamente na sua conta." variant="error" /> : profile ? <div className="space-y-6"><DadosPessoaisSection user={profile} onUpdated={loadProfile} /><ContatoSection user={profile} onUpdated={loadProfile} /><PasswordSettingsCard /></div> : null}</div>;
}
