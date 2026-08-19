import type { Metadata } from "next";
import FinanceiroPagamentosPainel from "@/components/paineis/FinanceiroPagamentosPainel";

export const metadata: Metadata = {
  title: "Finanças — Pagamentos",
  description: "Acompanhe cobranças, referências e pagamentos financeiros dos estudantes no Spuri.",
};

export default function FinanceiroPagamentosPage() {
  return <FinanceiroPagamentosPainel />;
}
