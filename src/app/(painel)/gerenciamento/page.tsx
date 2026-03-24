// src/app/(painel)/gerenciamento/page.tsx
import React from "react";
import { Metadata } from "next";
import GerenciamentoIndex from "./GerenciamentoIndex";

export const metadata: Metadata = {
  title: "Gerenciamento",
};

export default function GerenciamentoPage() {
  return <GerenciamentoIndex />;
}