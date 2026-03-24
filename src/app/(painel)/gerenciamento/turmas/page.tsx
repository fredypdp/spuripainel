// src/app/(painel)/gerenciamento/turmas/page.tsx
import React from "react";
import { Metadata } from "next";
import TurmasPainel from "@/components/paineis/TurmasPainel";

export const metadata: Metadata = {
  title: "Gerenciamento de Turmas",
};

export default function TurmasPage() {
  return <TurmasPainel />;
}