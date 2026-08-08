import React from "react";
import { Metadata } from "next";
import FinanceiroCredenciaisPainel from "@/components/paineis/FinanceiroCredenciaisPainel";

export const metadata: Metadata = { title: "Finanças — Credenciais" };

export default function FinanceiroCredenciaisPage() {
  return <FinanceiroCredenciaisPainel />;
}
