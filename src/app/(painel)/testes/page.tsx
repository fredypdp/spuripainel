// src/app/(painel)/dev/seed/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import PageContent from "./PageContent";
import { isTestesPageEnabled } from "@/lib/app-env";

export const metadata: Metadata = {
  title: "Painel de Testes",
};

export default function DevSeedPage() {
  if (!isTestesPageEnabled()) {
    redirect("/painel");
  }

  return <PageContent />;
}
