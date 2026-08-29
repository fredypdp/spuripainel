"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useUserCookie } from "@/hooks/useUserCookie";
import { adminService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { AdminDetalhado, AdminRole } from "@/types/api";

const adminHierarchy: Record<AdminRole, number> = { fpp: 3, adm: 2, gerente: 1 };
const roleLabels: Record<AdminRole, string> = { fpp: "FPP", adm: "Administrador", gerente: "Gerente" };

export default function AdministradoresPageContent() {
  const { user } = useUserCookie();
  const criarModal = useModal();
  const desativarModal = useModal();
  const deletarModal = useModal();
  const { data, loading, error, execute: carregar } = useApi(adminService.listarAdmins);
  const criar = useApi(adminService.criarAdmin);
  const ativar = useApi(adminService.ativarAdmin);
  const desativar = useApi(adminService.desativarAdmin);
  const deletar = useApi(adminService.deletarAdmin);

  const [formCriar, setFormCriar] = useState({ nome: "", email: "", role: "gerente" as AdminRole, senha: "" });
  const [selecionado, setSelecionado] = useState<AdminDetalhado | null>(null);
  const [motivo, setMotivo] = useState("");
  const [feedback, setFeedback] = useState("");
  const [erroAcao, setErroAcao] = useState("");

  useEffect(() => { carregar(tokenStorage.get() || undefined).catch(() => undefined); }, [carregar]);

  const admins = useMemo(() => data?.admins ?? [], [data]);
  const currentRole = user?.admin?.role;
  const currentAdminId = user?.admin?.id;
  const canCreate = currentRole === "fpp" || currentRole === "adm";
  const canDelete = (admin: AdminDetalhado) => Boolean(currentRole && admin.id !== currentAdminId && adminHierarchy[currentRole] > adminHierarchy[admin.role]);
  const canChangeStatus = (admin: AdminDetalhado) => Boolean(currentRole && admin.id !== currentAdminId && adminHierarchy[currentRole] > adminHierarchy[admin.role]);

  async function reload() { await carregar(tokenStorage.get() || undefined); }
  async function handleCriar(e: React.FormEvent) {
    e.preventDefault(); setErroAcao(""); setFeedback("");
    try {
      await criar.execute({ nome: formCriar.nome.trim(), email: formCriar.email.trim(), role: formCriar.role, senha: formCriar.senha.trim() || undefined });
      setFeedback("Administrador criado com sucesso."); criarModal.closeModal(); setFormCriar({ nome: "", email: "", role: "gerente", senha: "" }); await reload();
    } catch (err) { setErroAcao(formatApiError(err, "Não foi possível criar o administrador.")); }
  }
  async function handleAtivar(admin: AdminDetalhado) {
    setErroAcao(""); setFeedback("");
    try { await ativar.execute(admin.id); setFeedback("Administrador ativado com sucesso."); await reload(); }
    catch (err) { setErroAcao(formatApiError(err, "Não foi possível ativar o administrador.")); }
  }
  function abrirMotivo(admin: AdminDetalhado, tipo: "desativar" | "deletar") { setSelecionado(admin); setMotivo(""); setErroAcao(""); tipo === "deletar" ? deletarModal.openModal() : desativarModal.openModal(); }
  async function handleDesativar(e: React.FormEvent) { e.preventDefault(); if (!selecionado || !motivo.trim()) return; setErroAcao(""); try { await desativar.execute(selecionado.id, { motivo: motivo.trim() }); setFeedback("Administrador desativado com sucesso."); desativarModal.closeModal(); await reload(); } catch (err) { setErroAcao(formatApiError(err, "Não foi possível desativar o administrador.")); } }
  async function handleDeletar(e: React.FormEvent) { e.preventDefault(); if (!selecionado || !motivo.trim()) return; setErroAcao(""); try { await deletar.execute(selecionado.id, { motivo: motivo.trim() }); setFeedback("Administrador deletado com sucesso."); deletarModal.closeModal(); await reload(); } catch (err) { setErroAcao(formatApiError(err, "Não foi possível deletar o administrador.")); } }

  return <div><PageBreadcrumb pageTitle="Administradores" /><div className="space-y-6">
    <div className="flex flex-wrap items-center gap-3">
      {canCreate && <Button size="sm" onClick={criarModal.openModal}>Criar administrador</Button>}
      <Button size="sm" variant="outline" disabled={loading} onClick={reload}>{loading ? "Carregando..." : "Atualizar lista"}</Button>
      <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">{admins.length} administradores</span>
    </div>
    {(error || erroAcao || feedback) && <div className={`rounded-lg border p-4 text-sm ${erroAcao || error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"}`}>{erroAcao || error || feedback}</div>}
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="w-full overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-gray-100 dark:border-white/[0.05]"><tr>{["Nome","Email","Role","Status","Telefone","Ações"].map(h=><th key={h} className="px-5 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead><tbody>{admins.map((admin)=><tr key={admin.id} className="border-b border-gray-100 dark:border-white/[0.05]"><td className="px-5 py-4 text-gray-800 dark:text-white/90">{admin.nome}</td><td className="px-5 py-4 text-gray-600 dark:text-gray-300">{admin.email}</td><td className="px-5 py-4">{roleLabels[admin.role]}</td><td className="px-5 py-4">{admin.status}</td><td className="px-5 py-4">{admin.telefone || "—"}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{admin.status === "inativo" ? <Button size="sm" variant="outline" disabled={!canChangeStatus(admin) || ativar.loading} onClick={()=>handleAtivar(admin)}>Ativar</Button> : <Button size="sm" variant="outline" disabled={!canChangeStatus(admin) || desativar.loading} onClick={()=>abrirMotivo(admin,"desativar")}>Desativar</Button>}<Button size="sm" variant="danger" disabled={!canDelete(admin) || deletar.loading} onClick={()=>abrirMotivo(admin,"deletar")}>Deletar</Button>{!canDelete(admin) && <span className="text-xs text-gray-400">Sem permissão hierárquica</span>}</div></td></tr>)}{!loading && admins.length===0 && <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={6}>Nenhum administrador encontrado.</td></tr>}</tbody></table></div></div>
  </div>
  <Modal isOpen={criarModal.isOpen} onClose={criarModal.closeModal} className="max-w-[560px] p-6 lg:p-10"><form onSubmit={handleCriar} className="space-y-4"><h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Criar administrador</h4><Label>Nome *</Label><input className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.nome} onChange={e=>setFormCriar({...formCriar,nome:e.target.value})} required/><Label>Email *</Label><input type="email" className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.email} onChange={e=>setFormCriar({...formCriar,email:e.target.value})} required/><Label>Role *</Label><select className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-gray-900" value={formCriar.role} onChange={e=>setFormCriar({...formCriar,role:e.target.value as AdminRole})}><option value="gerente">Gerente</option><option value="adm">Administrador</option>{currentRole === "fpp" && <option value="fpp">FPP</option>}</select><Label>Senha inicial</Label><input type="password" className="w-full rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" value={formCriar.senha} onChange={e=>setFormCriar({...formCriar,senha:e.target.value})}/>{erroAcao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroAcao}</p>}<div className="flex justify-end gap-3"><Button size="sm" variant="outline" onClick={criarModal.closeModal}>Cancelar</Button><Button size="sm" disabled={criar.loading}>{criar.loading?"Criando...":"Criar"}</Button></div></form></Modal>
  <Modal isOpen={desativarModal.isOpen} onClose={desativarModal.closeModal} className="max-w-[520px] p-6 lg:p-10"><MotivoForm titulo="Desativar administrador" admin={selecionado} motivo={motivo} setMotivo={setMotivo} erro={erroAcao} loading={desativar.loading} submitLabel="Desativar" onSubmit={handleDesativar} onCancel={desativarModal.closeModal}/></Modal>
  <Modal isOpen={deletarModal.isOpen} onClose={deletarModal.closeModal} className="max-w-[520px] p-6 lg:p-10"><MotivoForm titulo="Deletar administrador" admin={selecionado} motivo={motivo} setMotivo={setMotivo} erro={erroAcao} loading={deletar.loading} submitLabel="Deletar" danger onSubmit={handleDeletar} onCancel={deletarModal.closeModal}/></Modal>
  </div>;
}
function MotivoForm({ titulo, admin, motivo, setMotivo, erro, loading, submitLabel, onSubmit, onCancel, danger }: { titulo: string; admin: AdminDetalhado | null; motivo: string; setMotivo: (v:string)=>void; erro: string; loading: boolean; submitLabel: string; onSubmit: (e:React.FormEvent)=>void; onCancel:()=>void; danger?: boolean }) { return <form onSubmit={onSubmit} className="space-y-4"><h4 className="text-lg font-medium text-gray-800 dark:text-white/90">{titulo}</h4>{admin && <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-white/[0.05]"><strong>{admin.nome}</strong><br />{admin.email}</div>}<Label>Motivo *</Label><textarea className="w-full resize-none rounded-lg border px-4 py-3 text-sm dark:bg-white/[0.03]" rows={4} value={motivo} onChange={e=>setMotivo(e.target.value)} required />{erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}<div className="flex justify-end gap-3"><Button size="sm" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button><Button size="sm" variant={danger ? "danger" : "primary"} disabled={loading}>{loading ? "Processando..." : submitLabel}</Button></div></form>; }
