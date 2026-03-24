// src/app/(painel)/gerenciamento/materias/page.tsx
import React from "react";
import { Metadata } from "next";
import MateriaPainel from "@/components/paineis/MateriaPainel";

export const metadata: Metadata = {
  title: "Matérias — Gerenciamento",
};

export default function MateriasPage() {
  return <MateriaPainel />;
}
