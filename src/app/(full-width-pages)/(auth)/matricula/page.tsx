import MatriculaPublicPage from "./MatriculaPublicPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Fazer matrícula", description: "Solicite a sua matrícula numa instituição" };

export default function Page() { return <MatriculaPublicPage />; }
