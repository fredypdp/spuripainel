"use client";

import Details from "@/components/user-profile/Details";
import UserConfigCard from "@/components/user-profile/UserConfigCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import Alert from "@/components/ui/alert/Alert";
import { perfilService, useApi } from "@/lib/api";
import { setCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";
import { useEffect, useMemo } from "react";

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

function getProfileLabel(profile?: MeuPerfilResponse | null): string {
  if (profile?.tipo === "admin") return "Administrador";
  if (profile?.tipo === "academia") return "Academia";
  if (profile?.tipo === "estudante") return "Estudante";
  return "Perfil";
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

  const profileLabel = useMemo(() => getProfileLabel(profile), [profile]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div className="mb-5 lg:mb-7">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Meu Perfil
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Confira seus dados cadastrados e mantenha sua senha segura.
        </p>
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
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
            Você está acessando como <strong>{profileLabel}</strong>.
          </div>
          <UserMetaCard user={profile} />
          <UserInfoCard user={profile} />
          <Details user={profile} />
          <UserConfigCard />
        </div>
      ) : null}
    </div>
  );
}
