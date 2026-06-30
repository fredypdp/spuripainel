import React from "react";
import { Metadata } from "next";
import PageContent from "../PageContent";

export const metadata: Metadata = { title: "Anos acadêmicos" };

export default function AnosAcademicosPage() {
  return <PageContent section="anos-academicos" />;
}
