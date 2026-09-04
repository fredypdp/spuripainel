import React from "react";
import { Metadata } from "next";
import PageContent from "../PageContent";

export const metadata: Metadata = { title: "Categorias de nota" };

export default function CategoriasNotaPage() {
  return <PageContent section="categorias-nota" />;
}
