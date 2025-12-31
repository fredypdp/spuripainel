import CadastroForm from "@/components/auth/CadastroForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro de estudante",
  description: "Cadastre sua conta de estudante no Spuri"
};

export default function cadastro() {
  return <CadastroForm />;
}
