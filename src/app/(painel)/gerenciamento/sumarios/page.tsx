import React from "react";
import { Metadata } from "next";
import SumarioPainel from "@/components/paineis/SumarioPainel";

export const metadata: Metadata = { title: "Gerenciamento de Sumários de Aula" };

export default function SumariosPage() {
  return <SumarioPainel />;
}
