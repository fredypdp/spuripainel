import type { Metadata } from "next";
import CategoriasServicoPainel from "@/components/paineis/CategoriasServicoPainel";
export const metadata: Metadata = { title: "Categorias de Serviço" };
export default function Page() { return <CategoriasServicoPainel />; }
