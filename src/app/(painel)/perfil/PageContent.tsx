"use client";

import Details from "@/components/user-profile/Details";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import Alert from "@/components/ui/alert/Alert";
import { estudanteService, perfilService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { useModal } from "@/hooks/useModal";
import Link from "next/link";
import { setCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";
import { useEffect, useState } from "react";

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {["h-32", "h-52", "h-56", "h-36"].map((height, index) => (
        <div
          key={index}
          className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 ${height}`}
        >
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PerfilPageContent() {
  const {
    data: profile,
    loading,
    error,
    execute: loadProfile,
  } = useApi(perfilService.meuPerfil);

  useEffect(() => {
    loadProfile().catch(() => undefined);
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      setCookie("user", JSON.stringify(profile), 1);
    }
  }, [profile]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div className="mb-5 lg:mb-7">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Meu Perfil
        </h3>
      </div>

      {loading && !profile ? (
        <ProfileSkeleton />
      ) : error ? (
        <Alert
          title="Não foi possível carregar seu perfil"
          message="Tente atualizar a página. Se o problema continuar, entre novamente na sua conta."
          variant="error"
        />
      ) : profile ? (
        <div className="space-y-6">
          <UserMetaCard user={profile} />
          <UserInfoCard user={profile} />
          <Details user={profile} />
          <DangerZoneEstudante profile={profile} />
        </div>
      ) : null}
    </div>
  );
}


function DangerZoneEstudante({ profile }: { profile: MeuPerfilResponse }) {
  const modal = useModal();
  const { loading, execute } = useApi(estudanteService.deletarContaEstudante);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  if (profile.tipo !== "estudante" || !profile.estudante) return null;
  const vinculado = Boolean(profile.estudante.academia_info || profile.estudante.academia || profile.estudante.codigo_academia);
  async function deletarConta(event: React.FormEvent) {
    event.preventDefault();
    if (!motivo.trim()) return;
    setErro("");
    try {
      await execute({ motivo: motivo.trim() }, tokenStorage.get() || undefined);
      tokenStorage.remove();
      window.location.href = "/signin?conta_deletada=1";
    } catch (err) {
      setErro(formatApiError(err, "Não foi possível deletar sua conta."));
    }
  }
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-900/10 lg:p-6"><h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Zona de Perigo</h4><p className="mt-2 text-sm text-red-700 dark:text-red-300">A deleção desativa sua conta. O histórico acadêmico de notas e faltas permanece preservado para consultas futuras, mas você não conseguirá mais entrar no painel.</p>{vinculado && <p className="mt-3 text-sm text-red-700 dark:text-red-300">Você precisa se desvincular da academia antes de deletar sua conta. Use o fluxo de <Link className="font-medium underline" href="/solicitacoes">solicitação de desvinculação</Link>.</p>}<div className="mt-4"><Button size="sm" variant="danger" disabled={vinculado} onClick={() => { setErro(""); setMotivo(""); modal.openModal(); }}>Deletar minha conta</Button></div><Modal isOpen={modal.isOpen} onClose={modal.closeModal} className="max-w-[540px] p-6 lg:p-10"><form onSubmit={deletarConta} className="space-y-4"><h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Confirmar deleção da conta</h4><p className="text-sm text-gray-600 dark:text-gray-300">Sua conta será desativada e você será redirecionado para o login. Registros acadêmicos já lançados continuarão guardados.</p><Label>Motivo *</Label><textarea className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-white/[0.05] dark:bg-white/[0.03]" rows={4} value={motivo} onChange={(e)=>setMotivo(e.target.value)} required disabled={loading} />{erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}<div className="flex justify-end gap-3"><Button size="sm" variant="outline" onClick={modal.closeModal} disabled={loading}>Cancelar</Button><Button size="sm" variant="danger" disabled={loading}>{loading ? "Deletando..." : "Deletar conta"}</Button></div></form></Modal></div>;
}
