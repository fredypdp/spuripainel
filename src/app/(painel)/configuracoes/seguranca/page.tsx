import React from "react";
import { Metadata } from "next";
import PageContent from "../PageContent";

export const metadata: Metadata = { title: "Segurança" };

export default function SegurancaPage() {
  return <PageContent section="seguranca" />;
}
