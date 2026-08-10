import { Metadata } from "next";
import { redirect } from "next/navigation";
import PageContent from "./PageContent";
import { isTestesPageEnabled } from "@/lib/app-env";

export const metadata: Metadata = {
  title: "Comunicação (Teste Ziett)",
};

export default function ComunicacaoPage() {
  if (!isTestesPageEnabled()) {
    redirect("/painel");
  }

  return <PageContent />;
}
