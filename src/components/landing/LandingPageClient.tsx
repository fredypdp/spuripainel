"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { tokenStorage } from "@/lib/api";

type Profile = "estudante" | "colegio-pequeno-medio" | "colegio-grande-porte" | "ensino-superior";
type PrimaryProfile = "estudante" | "colegio" | "ensino-superior";

const EMAIL = "spuriartipan@gmail.com";

const profileContent: Record<Profile, { label: string; headline: string; subheadline: string; problems: string[]; solutions: string[]; highlights: string; cta: string; href: string; steps: string[] }> = {
  estudante: {
    label: "Estudante / Encarregado",
    headline: "A matrícula do seu educando, sem filas nem deslocações.",
    subheadline: "Peça a matrícula em qualquer colégio ou universidade parceira do Spuri, direto do telemóvel ou computador — envie os documentos online e acompanhe o pedido em tempo real.",
    problems: ["Filas longas e deslocações para tratar de matrícula", "Ter de se deslocar só para pagar propinas ou material", "Não saber a tempo quando sai uma nota, falta ou o seu certificado", "Perder ou danificar documentos físicos importantes", "Falta de visibilidade sobre o estado do pedido de matrícula"],
    solutions: ["Matrícula 100% online, a qualquer hora", "Pagamento de propinas e material sem sair de casa", "Documentos enviados digitalmente, sem burocracia", "Notificações imediatas sobre notas, faltas e atualizações da matrícula", "Histórico académico seguro, protegido contra fraude e sempre acessível"],
    highlights: "pedido de matrícula com envio de documentos · notificações em tempo real · pagamentos digitais · painel do estudante com notas, faltas e avaliações.",
    cta: "Fazer Matrícula",
    href: "/matricula",
    steps: ["Escolha uma instituição parceira.", "Envie documentos e solicite a matrícula online.", "Acompanhe respostas, pagamentos, notas e faltas no seu painel."],
  },
  "colegio-pequeno-medio": {
    label: "Colégio — Pequena/Média",
    headline: "Tecnologia de ponta, ao alcance do seu colégio — mesmo sem grande estrutura.",
    subheadline: "Não precisa de equipa de TI nem de servidores próprios: o Spuri funciona a partir de qualquer computador ou telemóvel com internet, e coloca o seu colégio ao mesmo nível tecnológico das maiores instituições do país.",
    problems: ["Filas e atendimento lento no secretariado", "Cobrança de propinas feita à mão, sem controlo centralizado", "Registos manuais em papel ou em folhas de Excel dispersas", "Risco de fraude documental sem qualquer mecanismo de controlo", "Dependência de uma única pessoa para aceder à informação da escola", "Dificuldade em responder a auditorias e inspeções de órgãos reguladores", "Risco de fraude em certificados e históricos recebidos dos estudantes na hora da matrícula"],
    solutions: ["Diferencial competitivo imediato frente a colégios ainda 100% manuais", "Cobrança de propinas e material simplificada, com registo digital de pagamentos", "Imagem mais moderna e profissional junto de pais e encarregados de educação", "Sem necessidade de investimento em infraestrutura de TI", "Menos tempo a atender encarregados de educação, porque já recebem notificações automáticas", "Auditoria e conformidade facilitadas perante o Ministério da Educação", "Fazendo parte do nosso ecossistema, a instituição poderá consultar todo o histórico do estudante na hora da matrícula"],
    highlights: "matrículas digitais · registo de notas e faltas por trimestre · gestão financeira digital · notificações automáticas · avaliação final automática · IA institucional contextualizada (em desenvolvimento).",
    cta: "Fale Connosco",
    href: `mailto:${EMAIL}?subject=${encodeURIComponent("Spuri — Colégio – Pequena/Média")}`,
    steps: ["Mapeamos os processos essenciais do colégio.", "A equipa passa a operar matrículas, notas, faltas e finanças no Spuri.", "Relatórios e auditoria ficam prontos para gestão e inspeções."],
  },
  "colegio-grande-porte": {
    label: "Colégio — Grande Porte",
    headline: "Gerir milhares de estudantes sem perder o controlo — nem o rigor.",
    subheadline: "Processos em massa, gestão financeira centralizada e auditoria completa para colégios com centenas ou milhares de estudantes, várias turmas e cursos.",
    problems: ["Volume elevado de dados académicos difícil de manter consistente", "Falta de visibilidade em tempo real sobre o desempenho da escola", "Processos manuais que não escalam com o crescimento da instituição", "Cobrança de propinas e taxas dispersas por vários canais, difícil de reconciliar", "Risco de fraude documental a uma escala que pode manchar a reputação", "Auditorias e inspeções mais complexas quanto maior a instituição", "Risco de fraude em certificados e históricos recebidos dos estudantes na hora da matrícula"],
    solutions: ["Registo em massa de estudantes, notas e faltas, com acompanhamento em tempo real", "Gestão financeira centralizada — propinas e material cobrados e conciliados na mesma plataforma", "Dashboard com dados académicos sempre atualizados", "Avaliação final do estudante feita automaticamente", "Auditoria e cadeia de integridade prontas para qualquer inspeção", "Estrutura preparada para múltiplos cursos, turmas e turnos", "Fazendo parte do nosso ecossistema, a instituição poderá consultar todo o histórico do estudante na hora da matrícula"],
    highlights: "processos em lote · gestão financeira digital · filtros avançados · relatórios e estatísticas · gestão completa de cursos e matérias disciplinares · IA institucional contextualizada (em desenvolvimento).",
    cta: "Fale Connosco",
    href: `mailto:${EMAIL}?subject=${encodeURIComponent("Spuri — Colégio – Grande Porte")}`,
    steps: ["Centralize dados de cursos, turmas e estudantes.", "Execute operações em massa com acompanhamento em tempo real.", "Use dashboards, relatórios e auditoria para decisões e inspeções."],
  },
  "ensino-superior": {
    label: "Instituição de Ensino Superior",
    headline: "Gestão académica completa, do primeiro semestre ao milésimo estudante.",
    subheadline: "Cursos, semestres, propinas, avaliações — tudo configurável ao vosso modelo, quer estejam a começar, quer já giram milhares de estudantes em vários cursos.",
    problems: ["Falta de um sistema de gestão académica formal e credível", "Processos manuais de matrícula, lançamento de notas e cobrança de propinas por semestre", "Estudantes com cadeiras em atraso sem controlo centralizado", "Falta de auditoria robusta para processos de acreditação", "Dificuldade em escalar processos manuais à medida que o número de estudantes cresce", "Risco de fraude em certificados e históricos recebidos dos estudantes na hora da matrícula"],
    solutions: ["Estrutura de cursos e semestres configurável ao vosso modelo, desde o primeiro dia", "Categorias de avaliação e fórmulas de avaliação final configuráveis", "Gestão financeira digital de propinas, adequada a qualquer volume", "Motor de avaliação final automático, por matéria disciplinar/cadeira, com gestão de pendências académicas", "Credenciais verificáveis que reforçam a reputação institucional", "Processos em massa prontos para quando o volume crescer, sem trocar de plataforma", "Fazendo parte do nosso ecossistema, a instituição poderá consultar todo o histórico do estudante na hora da matrícula"],
    highlights: "configuração de cursos por número de semestres · fórmulas de avaliação configuráveis · gestão financeira digital · processos em massa · IA institucional contextualizada (em desenvolvimento).",
    cta: "Fale Connosco",
    href: `mailto:${EMAIL}?subject=${encodeURIComponent("Spuri — Instituição de Ensino Superior")}`,
    steps: ["Configure cursos, semestres e regras de avaliação.", "Digitalize matrículas, propinas, notas e pendências académicas.", "Acompanhe crescimento com relatórios, processos em massa e auditoria."],
  },
};

const features = [
  { title: "Gestão Académica", items: ["Matrículas 100% digitais — sem filas, sem papel.", "Notas e faltas sempre à mão, com histórico preservado.", "Avaliação final automática, sem cálculos manuais."] },
  { title: "Gestão Financeira", items: ["Pagamentos digitais de propinas, material escolar e outras taxas, confirmados automaticamente."] },
  { title: "Redução de custos", items: ["Tempo, papel, impressões e arquivo físico.", "Reconstituição de documentos extraviados.", "Cobrança manual, comunicação avulsa e horas administrativas repetitivas.", "Ferramentas dispersas e preparação de auditorias."] },
  { title: "Comunicação", items: ["Notificações em tempo real sobre notas, faltas, matrículas e comunicados."] },
  { title: "Confiança e Prestação de Contas", items: ["Auditoria inviolável com rasto de alterações.", "Relatórios e estatísticas automáticas."] },
  { title: "Em Desenvolvimento", items: ["Transferência de estudante entre instituições, com histórico académico portátil.", "IA institucional contextualizada para decisões mais rápidas."] },
];

function LandingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dynamicRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window === "undefined") return null;
    const param = new URLSearchParams(window.location.search).get("perfil") as Profile | null;
    const saved = localStorage.getItem("spuri_landing_profile") as Profile | null;
    return param && profileContent[param] ? param : saved && profileContent[saved] ? saved : null;
  });

  useEffect(() => {
    if (tokenStorage.get()) router.replace("/painel");
  }, [router]);

  const primary: PrimaryProfile | null = useMemo(() => {
    if (!profile) return null;
    if (profile.startsWith("colegio")) return "colegio";
    return profile === "ensino-superior" ? "ensino-superior" : "estudante";
  }, [profile]);

  const chooseProfile = (next: Profile) => {
    setProfile(next);
    localStorage.setItem("spuri_landing_profile", next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("perfil", next);
    router.replace(`/?${params.toString()}`, { scroll: false });
    setTimeout(() => dynamicRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const c = profile ? profileContent[profile] : null;
  const btn = (active: boolean) => `min-h-11 rounded-xl border px-5 py-3 text-sm font-semibold transition ${active ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"}`;

  return <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
    <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3"><Image src="/images/logo/logo-icon.svg" alt="Logótipo Spuri" width={36} height={36}/><span className="text-xl font-bold">Spuri</span></Link>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex"><a href="#sobre">Sobre</a><a href="#funcionalidades">Funcionalidades</a><a href="#contacto">Contacto</a></nav>
        <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Entrar</Link><button className="rounded-lg border p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button></div>
      </div>
      {menuOpen && <nav className="grid gap-2 border-t px-4 py-3 text-sm md:hidden"><a href="#sobre">Sobre</a><a href="#funcionalidades">Funcionalidades</a><a href="#contacto">Contacto</a></nav>}
    </header>

    <main>
      <section id="sobre" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
        <div><p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-blue-600">Gestão académica eficiente, dados invioláveis</p><h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">Gestão académica eficiente, dados invioláveis.</h1><p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">O Spuri centraliza matrículas, notas, faltas e pagamentos numa única plataforma para escolas e universidades — com cada registo protegido por uma cadeia de verificação que torna a fraude documental praticamente impossível.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{["Menos filas, menos papel, menos burocracia", "Zero fraude documental — registos auditáveis e invioláveis", "Notificações e pagamentos digitais, sem sair de casa"].map((x)=><div key={x} className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">✓ {x}</div>)}</div></div>
        <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"><Image src="/images/grid-image/image-01.png" alt="Ilustração de apoio com o padrão visual do Spuri" width={720} height={520} className="h-72 w-full rounded-3xl object-cover"/><div className="mt-5 rounded-2xl bg-blue-50 p-5 dark:bg-blue-950/40"><p className="font-semibold">Auditoria explicável para gestão académica</p><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Cada matrícula, nota ou falta deixa rasto verificável para proteger a reputação da instituição.</p></div></div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8"><div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="text-center text-2xl font-bold">Antes de continuar, diga-nos quem é, para lhe mostrarmos o que interessa:</h2><div className="mt-6 grid gap-3 md:grid-cols-3"><button className={btn(primary==="estudante")} onClick={()=>chooseProfile("estudante")}>Sou Estudante ou Encarregado de Educação</button><button className={btn(primary==="colegio")} onClick={()=>chooseProfile("colegio-pequeno-medio")}>Somos um Colégio (Público ou Privado)</button><button className={btn(primary==="ensino-superior")} onClick={()=>chooseProfile("ensino-superior")}>Somos uma Instituição de Ensino Superior</button></div>{primary==="colegio" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><button className={btn(profile==="colegio-pequeno-medio")} onClick={()=>chooseProfile("colegio-pequeno-medio")}>Pequena/Média Escola</button><button className={btn(profile==="colegio-grande-porte")} onClick={()=>chooseProfile("colegio-grande-porte")}>Colégio de Grande Porte</button></div>}</div></section>

      <section ref={dynamicRef} aria-live="polite" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{c ? <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-200 transition duration-300 dark:bg-gray-900 dark:ring-gray-800"><p className="text-sm font-bold uppercase text-blue-600">{c.label}</p><h2 className="mt-3 text-3xl font-bold">{c.headline}</h2><p className="mt-4 max-w-4xl text-gray-600 dark:text-gray-300">{c.subheadline}</p><div className="mt-8 grid gap-6 lg:grid-cols-2"><InfoCard title="Problemas Frequentes" items={c.problems}/><InfoCard title="Nossas Soluções" items={c.solutions}/></div><div className="mt-6 rounded-2xl bg-blue-50 p-5 dark:bg-blue-950/30"><strong>Funcionalidades em destaque:</strong> {c.highlights}<p className="mt-2 text-sm">Transferência entre instituições, com histórico portátil, está em desenvolvimento.</p></div><Link href={c.href} className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">{c.cta}</Link></div> : <div className="rounded-3xl border border-dashed border-blue-300 p-8 text-center text-gray-600 dark:text-gray-300">Escolha um perfil acima para ver proposta de valor, problemas resolvidos e CTA personalizados.</div>}</section>

      <section id="funcionalidades" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><SectionTitle title="Funcionalidades e serviços" text="Organizadas por benefício, para mostrar rapidamente o impacto real na operação académica."/><div className="mt-8 flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">{features.map((f)=><div key={f.title} className="min-w-[280px] rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="text-lg font-bold">{f.title}</h3><ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">{f.items.map(i=><li key={i}>• {i}</li>)}</ul></div>)}</div></section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><SectionTitle title="Diferenciais" text="O que torna o Spuri único para estudantes, escolas e universidades."/><div className="mt-8 grid gap-5 md:grid-cols-3"><Diff title="Ecossistema Interligado" text="O Spuri reúne escolas e universidades numa única plataforma nacional, com diretório público de instituições sempre disponível para consulta."/><Diff title="Imutabilidade e Auditoria" text="Cada nota, falta ou matrícula gera um registo protegido por uma cadeia de verificação criptográfica — qualquer tentativa de alteração é detectável."/><Diff title="Operação Digital Completa" text="Matrículas, pagamentos, notificações, relatórios e avaliação final trabalham juntos para reduzir burocracia e custos administrativos."/></div></section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><SectionTitle title="Como funciona" text="Um fluxo simples, ajustado ao perfil escolhido."/><div className="mt-8 grid gap-4 md:grid-cols-3">{(c?.steps ?? ["Escolha o seu perfil.", "Veja problemas e soluções relevantes.", "Avance para matrícula ou contacto comercial."]).map((s, idx)=><div key={s} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{idx+1}</span><p className="mt-4 font-medium">{s}</p></div>)}</div></section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><details className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm open:ring-2 open:ring-blue-100 dark:border-gray-800 dark:bg-gray-900" open><summary className="cursor-pointer text-2xl font-bold">Confiança, Segurança e Auditoria</summary><p className="mt-4 text-gray-600 dark:text-gray-300">Cada nota, falta ou matrícula registada no Spuri gera um evento protegido por uma cadeia criptográfica — o mesmo princípio de segurança usado em sistemas financeiros, aplicado à educação. Qualquer tentativa de alteração é imediatamente detectável.</p></details></section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="rounded-[2rem] bg-blue-600 p-8 text-center text-white"><h2 className="text-3xl font-bold">{c ? c.headline : "Pronto para digitalizar a gestão académica?"}</h2><Link href={c?.href ?? `mailto:${EMAIL}?subject=Spuri — Contacto`} className="mt-6 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-blue-700">{c?.cta ?? "Fale Connosco"}</Link></div></section>
    </main>

    {c && <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white p-3 shadow-2xl md:hidden dark:border-gray-800 dark:bg-gray-950"><Link href={c.href} className="flex min-h-11 items-center justify-center rounded-xl bg-blue-600 font-semibold text-white">{c.cta}</Link></div>}
    <footer id="contacto" className="border-t border-gray-200 bg-white px-4 py-10 pb-24 dark:border-gray-800 dark:bg-gray-950 md:pb-10"><div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-lg font-bold">Spuri</p><p className="text-sm text-gray-600 dark:text-gray-300">Confiança e eficiência na gestão académica.</p><a href={`mailto:${EMAIL}`} className="text-sm text-blue-600">{EMAIL}</a></div><div className="flex gap-4 text-sm"><a href="#sobre">Sobre</a><a href="#funcionalidades">Funcionalidades</a><a href="#contacto">Contacto</a></div><p className="text-sm text-gray-500">© 2026 Spuri. Todos os direitos reservados.</p></div></footer>
  </div>;
}

function SectionTitle({ title, text }: { title: string; text: string }) { return <div className="text-center"><h2 className="text-3xl font-bold">{title}</h2><p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-300">{text}</p></div>; }
function InfoCard({ title, items }: { title: string; items: string[] }) { return <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950"><h3 className="text-xl font-bold">{title}</h3><ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">{items.map((item)=><li key={item} className="rounded-2xl bg-white p-3 dark:bg-gray-900">{item}</li>)}</ul></div>; }
function Diff({ title, text }: { title: string; text: string }) { return <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="text-xl font-bold">{title}</h3><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{text}</p></div>; }

export default LandingPageClient;
