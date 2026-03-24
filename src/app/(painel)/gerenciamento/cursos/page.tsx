// src/app/(painel)/gerenciamento/cursos/page.tsx
import React from "react";
import { Metadata } from "next";
import CursosPainel from "@/components/paineis/CursosPainel";

export const metadata: Metadata = {
  title: "Gerenciamento de Cursos",
};

export default function CursosPage() {
  return <CursosPainel />;
}