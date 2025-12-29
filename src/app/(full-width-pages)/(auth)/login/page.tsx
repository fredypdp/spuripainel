import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js login Page | Spuri - Next.js Dashboard Template",
  description: "This is Next.js login Page Spuri Dashboard Template",
};

export default function login() {
  return <LoginForm />;
}
