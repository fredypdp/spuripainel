import type { Metadata } from "next";
import { Suspense } from "react";
import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Gestão académica eficiente, dados invioláveis",
  description: "O Spuri centraliza matrículas, notas, faltas e pagamentos numa única plataforma para escolas e universidades, com registos auditáveis e invioláveis.",
  openGraph: {
    title: "Spuri — Gestão académica eficiente, dados invioláveis",
    description: "Matrículas digitais, pagamentos, notificações, relatórios e auditoria inviolável para instituições de ensino.",
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
