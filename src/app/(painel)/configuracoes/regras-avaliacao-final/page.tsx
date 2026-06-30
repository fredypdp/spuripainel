import React from "react";
import { Metadata } from "next";
import PageContent from "../PageContent";

export const metadata: Metadata = { title: "Regras de avaliação final" };

export default function RegrasAvaliacaoFinalPage() {
  return <PageContent section="regras-avaliacao-final" />;
}
