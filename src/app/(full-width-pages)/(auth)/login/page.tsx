import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fazer login",
  description: "Entrar na sua conta no Spuri",
};

export default function login() {
  return <LoginForm />;
}