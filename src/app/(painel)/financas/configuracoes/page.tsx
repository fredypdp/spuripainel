import type { Metadata } from "next";
import FinanceiroConfiguracoesPainel from "@/components/paineis/FinanceiroConfiguracoesPainel";

export const metadata: Metadata = {
  title: "Finanças — Configurações",
  description: "Configure propinas, matrículas, regras de cobrança e obrigações financeiras da academia no Spuri.",
};

export default function FinanceiroConfiguracoesPage() {
  return <FinanceiroConfiguracoesPainel />;
}
