import type { Metadata } from "next";
import PainelDashboard from "@/components/dashboard/PainelDashboard";

export const metadata: Metadata = {
  title: "Painel",
};

export default function PainelPage() {
  return <PainelDashboard />;
}