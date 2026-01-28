import PageContent from "./PageContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esqueci a senha",
  description: "Recuperar senha da conta no Spuri",
};

export default function login() {
  return <PageContent />;
}