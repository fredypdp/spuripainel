import React from "react";
import { Metadata } from "next";
import PersonalizarPageContent from "./PageContent";

export const metadata: Metadata = { title: "Personalizar" };

export default function PersonalizarPage() {
  return <PersonalizarPageContent />;
}
