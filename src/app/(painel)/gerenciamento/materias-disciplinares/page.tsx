// src/app/(painel)/gerenciamento/materias-disciplinares/page.tsx
import React from "react";
import { Metadata } from "next";
import MateriaPainel from "@/components/paineis/MateriaPainel";

export const metadata: Metadata = {
  title: "Gerenciamento de Matérias Disciplinares",
};

export default function MateriasDisciplinaresPage() {
  return <MateriaPainel />;
}