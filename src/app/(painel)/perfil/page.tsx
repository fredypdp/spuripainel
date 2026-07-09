import PerfilPageContent from "./PageContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meu Perfil",
};

export default function Perfil() {
  return <PerfilPageContent />;
}
