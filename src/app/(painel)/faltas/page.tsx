// src/app/(painel)/faltas/page.tsx
import React from "react";
import { Metadata } from "next";
import PageContent from "./PageContent";

export const metadata: Metadata = {
  title: "Faltas",
};

export default function FaltasPage() {
  return <PageContent />;
}