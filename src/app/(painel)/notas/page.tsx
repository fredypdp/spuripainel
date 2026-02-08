// src/app/(painel)/notas/page.tsx
import React from "react";
import { Metadata } from "next";
import PageContent from "./PageContent";

export const metadata: Metadata = {
  title: "Notas",
};

export default function NotasPage() {
  return <PageContent />;
}