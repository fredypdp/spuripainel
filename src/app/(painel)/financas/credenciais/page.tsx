import type { Metadata } from "next";
import FinanceiroCredenciaisPainel from "@/components/paineis/FinanceiroCredenciaisPainel";

export const metadata: Metadata = {
  title: "Finanças - Credenciais",
  description: "Configure credenciais AppyPay e segredo de webhook para habilitar cobranças financeiras no Spuri.",
};

export default function FinanceiroCredenciaisPage() {
  return <FinanceiroCredenciaisPainel />;
}
