import type { Metadata } from "next";
import { Suspense } from "react";
import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Plataforma de Gestão Académica para Escolas e Universidades | Spuri",
  description: "Centralize matrículas, notas, faltas, avaliações e pagamentos numa única plataforma. Gestão académica digital com auditoria, rastreabilidade e maior confiança para instituições de ensino.",
  openGraph: {
    title: "Plataforma de Gestão Académica para Escolas e Universidades | Spuri",
    description:
      "Digitalize matrículas, notas, faltas, pagamentos e gestão académica numa plataforma moderna, segura e preparada para escolas e universidades.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageClient />
    </Suspense>
  );
}
