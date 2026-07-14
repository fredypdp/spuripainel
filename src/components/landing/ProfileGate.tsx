"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Profile, PrimaryProfile } from "@/data/landingProfiles";
import { GraduationCapIcon, SchoolBuildingIcon, UniversityIcon } from "./LandingIcons";

interface ProfileGateProps {
  onComplete: (profile: Profile) => void;
}

const PRIMARY_OPTIONS: { key: PrimaryProfile; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "estudante", label: "Sou Estudante ou Encarregado de Educação", icon: GraduationCapIcon },
  { key: "colegio", label: "Somos um Colégio (Público ou Privado)", icon: SchoolBuildingIcon },
  { key: "ensino-superior", label: "Somos uma Instituição de Ensino Superior", icon: UniversityIcon },
];

export default function ProfileGate({ onComplete }: ProfileGateProps) {
  const [primary, setPrimary] = useState<PrimaryProfile | null>(null);

  const choosePrimary = (key: PrimaryProfile) => {
    if (key === "colegio") {
      setPrimary("colegio");
      return;
    }
    onComplete(key === "estudante" ? "estudante" : "ensino-superior");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.35 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10 overflow-y-auto"
    >
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-10"
        >
          <Image src="/images/logo/logo-icon.svg" alt="Spuri" width={48} height={48} priority />
          <h1 className="mt-5 text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-white/90">
            Antes de continuar, diga-nos quem é
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
            Assim mostramos-lhe exatamente o que interessa ao seu perfil.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {PRIMARY_OPTIONS.map((option, i) => {
            const Icon = option.icon;
            const active = primary === option.key;
            return (
              <motion.button
                key={option.key}
                type="button"
                onClick={() => choosePrimary(option.key)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
                  active
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 group-hover:text-brand-500 dark:bg-white/5 dark:text-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-medium text-gray-800 dark:text-white/90">{option.label}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {primary === "colegio" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <p className="mt-6 mb-3 text-sm lg:text-base font-medium text-gray-500 dark:text-gray-400">
                Qual é o porte do vosso colégio?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onComplete("colegio-pequeno-medio")}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left font-medium text-gray-800 hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:hover:border-brand-500/50"
                >
                  Pequeno/Médio Porte
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onComplete("colegio-grande-porte")}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left font-medium text-gray-800 hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:hover:border-brand-500/50"
                >
                  Colégio de Grande Porte
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
