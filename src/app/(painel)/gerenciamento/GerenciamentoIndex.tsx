// src/app/(painel)/gerenciamento/GerenciamentoIndex.tsx
"use client"

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { getCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";
import Icon from "@/components/ui/Icon";

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  const c = getCookie("user");
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
};

type CardItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
};

export default function GerenciamentoIndex() {
  const router = useRouter();
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  const isFundamental =
    user?.academia?.type === "escola" &&
    user?.academia?.nivel_escolar === "fundamental";

  const cards = useMemo((): CardItem[] => {
    const base: CardItem[] = [
      {
        id: "materias",
        label: "Matérias disciplinares",
        description: "Gerencie as matérias da sua academia, defina anos e períodos.",
        href: "/gerenciamento/materias",
        icon: "mdi:book-open-variant",
      },
      {
        id: "turmas",
        label: "Turmas",
        description: "Crie e organize turmas, adicione e remova estudantes.",
        href: "/gerenciamento/turmas",
        icon: "mdi:google-classroom",
      },
    ];

    if (!isFundamental) {
      base.unshift({
        id: "cursos",
        label: "Cursos",
        description: "Defina os cursos, anos académicos e semestres da sua academia.",
        href: "/gerenciamento/cursos",
        icon: "mdi:book-education",
      });
    }

    return base;
  }, [isFundamental]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Selecione uma área para gerir
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => router.push(card.href)}
            className="flex flex-col gap-4 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
              <Icon icon={card.icon} width={26} className="text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {card.label}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-brand-500 group-hover:text-brand-600 transition-colors mt-auto">
              Aceder
              <Icon icon="mdi:arrow-right" width={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}