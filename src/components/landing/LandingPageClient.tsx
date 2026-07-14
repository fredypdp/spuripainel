"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { tokenStorage } from "@/lib/api";
import ProfileGate from "./ProfileGate";
import LandingContent from "./LandingContent";
import { profileContent, type Profile } from "@/data/landingProfiles";

const STORAGE_KEY = "spuri_landing_profile";
const VALID_PROFILES = Object.keys(profileContent) as Profile[];

function isValidProfile(value: string | null): value is Profile {
  return value !== null && (VALID_PROFILES as string[]).includes(value);
}

export default function LandingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tokenStorage.get()) {
      router.replace("/painel");
      return;
    }

    const fromUrl = searchParams.get("perfil");
    if (isValidProfile(fromUrl)) {
      setProfile(fromUrl);
      setReady(true);
      return;
    }

    let fromStorage: string | null = null;
    try {
      fromStorage = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      fromStorage = null;
    }
    if (isValidProfile(fromStorage)) {
      setProfile(fromStorage);
    }
    setReady(true);
    // Executa apenas uma vez, na montagem — leitura inicial de estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = useCallback(
    (next: Profile) => {
      setProfile(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // armazenamento indisponível (modo privado, por exemplo) — sem impacto funcional
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("perfil", next);
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleChangeProfile = useCallback(() => {
    setProfile(null);
  }, []);

  // Evita mostrar o portão por uma fração de segundo a quem já tem perfil
  // guardado (ou vem de link direto) — só renderiza depois de resolver isso.
  if (!ready) return null;

  return (
    <AnimatePresence mode="wait">
      {profile ? (
        <LandingContent key="content" profile={profile} onChangeProfile={handleChangeProfile} />
      ) : (
        <ProfileGate key="gate" onComplete={handleComplete} />
      )}
    </AnimatePresence>
  );
}
