// src/app/(painel)/gerenciamento/page.tsx
import { redirect } from "next/navigation";

// /gerenciamento não tem conteúdo próprio — redireciona para a primeira sub-página.
// A sub-página correta (com ou sem Cursos) é tratada no layout e na sidebar.
// Usamos /gerenciamento/turmas como destino neutro (existe para todos os tipos de academia).
export default function GerenciamentoPage() {
  redirect("/gerenciamento/turmas");
}