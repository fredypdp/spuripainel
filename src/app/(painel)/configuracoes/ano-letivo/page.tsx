import React from "react";
import { Metadata } from "next";
import PageContent from "../PageContent";

export const metadata: Metadata = { title: "Ano Letivo" };

export default function AnoLetivoPage() {
  return <PageContent section="ano-letivo" />;
}
