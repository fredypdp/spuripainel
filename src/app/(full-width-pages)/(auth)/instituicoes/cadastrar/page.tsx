import InstituicaoCadastroPublico from "./InstituicaoCadastroPublico";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Cadastrar instituição", description: "Registe a sua instituição de ensino no Spuri" };

export default function Page() { return <InstituicaoCadastroPublico />; }
