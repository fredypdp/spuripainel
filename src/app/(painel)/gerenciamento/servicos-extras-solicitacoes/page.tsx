import type { Metadata } from "next";
import ServicosExtrasSolicitacoesPainel from "@/components/paineis/ServicosExtrasSolicitacoesPainel";
export const metadata: Metadata = { title: "Solicitações de Serviços Extras" };
export default function Page() { return <ServicosExtrasSolicitacoesPainel />; }
