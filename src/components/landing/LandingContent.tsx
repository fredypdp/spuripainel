"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Badge from "@/components/ui/badge/Badge";
import TrilhaAnimation from "./TrilhaAnimation";
import {
  GraduationCapIcon,
  WalletIcon,
  CoinsDownIcon,
  BellIcon,
  ShieldCheckIcon,
  RocketIcon,
  LinkGlobeIcon,
  LockChainIcon,
  ChevronDownSmallIcon,
  CheckCircleIcon,
} from "./LandingIcons";
import {
  profileContent,
  featureCategories,
  differentiators,
  type Profile,
} from "@/data/landingProfiles";

const CATEGORY_ICON: Record<string, React.FC<{ className?: string }>> = {
  "Gestão Académica": GraduationCapIcon,
  "Gestão Financeira": WalletIcon,
  "Redução de Custos": CoinsDownIcon,
  Comunicação: BellIcon,
  "Confiança e Prestação de Contas": ShieldCheckIcon,
  "Em Desenvolvimento": RocketIcon,
};

const DIFFERENTIATOR_ICON: React.FC<{ className?: string }>[] = [LinkGlobeIcon, LockChainIcon];

const HERO_HIGHLIGHTS: { text: string; icon: React.FC<{ className?: string }> }[] = [
  { text: "Menos filas, menos papel, menos burocracia", icon: CheckCircleIcon },
  { text: "Registos protegidos com auditoria e rastreabilidade", icon: ShieldCheckIcon },
  { text: "Pagamentos digitais e notificações em tempo real", icon: WalletIcon },
];

/** Para o perfil Estudante/Encarregado, a secção de Funcionalidades mostra só
 * os itens marcados como `studentRelevant`, sem o agrupamento por categoria —
 * é um resumo curado, não a grelha institucional completa. */
function getStudentFeatures() {
  const result: {
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
  }[] = [];

  featureCategories.forEach((category) => {
    category.items.forEach((item) => {
      if (item.studentRelevant) {
        result.push({
          title: item.title,
          description: item.description,
          icon: CATEGORY_ICON[category.title] ?? GraduationCapIcon,
        });
      }
    });
  });

  return result;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="text-center mb-10">
      {eyebrow && (
        <p className="mb-2 text-sm lg:text-base font-semibold uppercase tracking-wider text-brand-500">{eyebrow}</p>
      )}
      <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-white/90">{title}</h2>
    </div>
  );
}

function CtaButton({ profile }: { profile: Profile }) {
  const content = profileContent[profile];
  const isMailto = content.href.startsWith("mailto:");

  const classes =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 font-semibold text-white shadow-theme-xs transition hover:bg-brand-600";

  if (isMailto) {
    return (
      <a href={content.href} className={classes}>
        {content.cta}
      </a>
    );
  }
  return (
    <Link href={content.href} className={classes}>
      {content.cta}
    </Link>
  );
}

function FeatureCategoryBlock({
  title,
  items,
}: {
  title: string;
  items: { title: string; description: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICON[title] ?? GraduationCapIcon;
  const isLong = items.length > 4;
  const visibleItems = isLong && !expanded ? items.slice(0, 4) : items;
  const isRoadmap = title === "Em Desenvolvimento";

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
          <Icon className="w-5 h-5" />
        </span>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      </div>

      <ul className="space-y-4">
        {visibleItems.map((item) => (
          <li key={item.title}>
            <div className="flex items-start gap-2">
              <p className="font-medium text-gray-800 dark:text-white/90">{item.title}</p>
              {isRoadmap && (
                <Badge size="sm" color="warning">
                  Em Desenvolvimento
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm lg:text-base text-gray-500 dark:text-gray-400">{item.description}</p>
          </li>
        ))}
      </ul>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-sm lg:text-base font-medium text-brand-500 hover:text-brand-600"
        >
          {expanded ? "Ver menos" : `Ver todos os custos reduzidos (+${items.length - 4})`}
          <ChevronDownSmallIcon className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </motion.div>
  );
}

function StudentFeaturesGrid() {
  const items = getStudentFeatures();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            <item.icon className="w-5 h-5" />
          </span>
          <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">{item.title}</h3>
          <p className="mt-1.5 text-sm lg:text-base text-gray-500 dark:text-gray-400">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function LandingContent({
  profile,
  onChangeProfile,
}: {
  profile: Profile;
  onChangeProfile: () => void;
}) {
  const content = profileContent[profile];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-gray-100"
    >
      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/images/logo/logo-icon.svg" alt="Spuri" width={30} height={30} />
            <span className="text-lg font-bold text-gray-800 dark:text-white/90">Spuri</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm lg:text-base font-medium text-gray-600 dark:text-gray-300 md:flex">
            <a href="#sobre" className="hover:text-brand-500">Sobre</a>
            <a href="#funcionalidades" className="hover:text-brand-500">Funcionalidades</a>
            <a href="#contacto" className="hover:text-brand-500">Contacto</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onChangeProfile}
              className="hidden rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-800 dark:text-gray-300 sm:inline-flex"
            >
              A ver como: {content.label} · Trocar
            </button>
            <Link
              href="/login"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm lg:text-base font-semibold text-white hover:bg-brand-600"
            >
              Entrar
            </Link>
            <button
              type="button"
              className="rounded-lg border border-gray-200 p-2 dark:border-gray-800 md:hidden"
              aria-label="Abrir menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="block h-0.5 w-5 bg-gray-700 dark:bg-gray-200" />
              <span className="mt-1 block h-0.5 w-5 bg-gray-700 dark:bg-gray-200" />
              <span className="mt-1 block h-0.5 w-5 bg-gray-700 dark:bg-gray-200" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="grid gap-3 border-t border-gray-200 px-4 py-4 text-sm lg:text-base font-medium dark:border-gray-800 md:hidden">
            <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre</a>
            <a href="#funcionalidades" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
            <a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
            <button type="button" onClick={onChangeProfile} className="text-left text-brand-500">
              A ver como: {content.label} · Trocar perfil
            </button>
          </nav>
        )}
      </header>

      <main>
        {/* Hero universal */}
        <section id="sobre" className="mx-auto max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-4 text-sm lg:text-base font-bold uppercase tracking-[0.25em] text-brand-500">
              Plataforma de Gestão Académica
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              Gestão académica eficiente e registos protegidos.
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              O Spuri centraliza matrículas, notas, faltas, avaliações e pagamentos numa única
              plataforma para escolas e universidades, com mecanismos de auditoria e
              rastreabilidade que reforçam a confiança, a integridade e a segurança dos registos
              académicos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mx-auto mt-12 max-w-4xl rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-10"
          >
            <TrilhaAnimation />
          </motion.div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {HERO_HIGHLIGHTS.map((item, i) => (
              <motion.div
                key={item.text}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-theme-xs transition-shadow hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:text-left"
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 sm:mx-0">
                  <item.icon className="w-5 h-5" />
                </span>
                <p className="mt-3 text-sm lg:text-base font-semibold text-gray-800 dark:text-white/90">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Proposta de valor dinâmica */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <motion.div
            key={profile}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl bg-white p-6 shadow-theme-sm ring-1 ring-gray-200 dark:bg-white/[0.03] dark:ring-gray-800 sm:p-10"
          >
            <p className="text-sm lg:text-base font-bold uppercase tracking-wide text-brand-500">{content.label}</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{content.headline}</h2>
            <p className="mt-4 max-w-3xl text-gray-600 dark:text-gray-300">{content.subheadline}</p>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-950">
                <h3 className="mb-3 font-semibold text-gray-800 dark:text-white/90">Problemas resolvidos</h3>
                <ul className="space-y-2.5">
                  {content.problems.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm lg:text-base text-gray-600 dark:text-gray-300">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-5 dark:bg-brand-500/10">
                <h3 className="mb-3 font-semibold text-gray-800 dark:text-white/90">Benefícios</h3>
                <ul className="space-y-2.5">
                  {content.solutions.map((s) => (
                    <li key={s} className="flex gap-2.5 text-sm lg:text-base text-gray-700 dark:text-gray-200">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-6 text-sm lg:text-base text-gray-500 dark:text-gray-400">
              <strong className="text-gray-700 dark:text-gray-200">Funcionalidades em destaque:</strong>{" "}
              {content.highlights}
            </p>

            <div className="mt-8">
              <CtaButton profile={profile} />
            </div>
          </motion.div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="O que o Spuri faz"
            title="Funcionalidades pensadas para resolver o dia a dia"
          />
          {profile === "estudante" ? (
            <StudentFeaturesGrid />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featureCategories.map((category) => (
                <FeatureCategoryBlock key={category.title} title={category.title} items={category.items} />
              ))}
            </div>
          )}
        </section>

        {/* Diferenciais */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Porquê o Spuri" title="O que nos torna únicos" />
          <div className="grid gap-6 sm:grid-cols-2">
            {differentiators.map((diff, i) => {
              const Icon = DIFFERENTIATOR_ICON[i] ?? LinkGlobeIcon;
              return (
                <motion.div
                  key={diff.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="rounded-3xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">{diff.title}</h3>
                  <p className="mt-3 text-gray-600 dark:text-gray-300">{diff.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Como funciona" title="Um percurso simples, ajustado ao seu perfil" />
          <div className="grid gap-5 md:grid-cols-3">
            {content.steps.map((step, i) => (
              <motion.div
                key={step}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: i * 0.12 }}
                className="rounded-2xl bg-white p-6 shadow-theme-xs ring-1 ring-gray-200 dark:bg-white/[0.03] dark:ring-gray-800"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-4 font-medium text-gray-800 dark:text-white/90">{step}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Confiança e segurança */}
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <LockChainIcon className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  Confiança, Segurança e Auditoria
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  Cada nota, falta ou matrícula registada no Spuri gera um registo protegido por
                  uma cadeia de verificação criptográfica, reforçando a integridade, a
                  rastreabilidade e a confiança na informação académica. Cada operação relevante
                  fica registada, permitindo auditoria e verificação ao longo do tempo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-brand-500 px-8 py-12 text-center text-white sm:px-14">
            <h2 className="text-2xl font-bold sm:text-3xl">{content.headline}</h2>
            <div className="mt-7">
              <CtaButtonInverse profile={profile} />
            </div>
          </div>
        </section>
      </main>

      {/* CTA fixo no mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 md:hidden">
        <CtaButton profile={profile} />
      </div>

      <footer id="contacto" className="border-t border-gray-200 bg-white px-4 py-10 pb-24 dark:border-gray-800 dark:bg-gray-950 md:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-bold text-gray-800 dark:text-white/90">Spuri</p>
            <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300">
              Confiança e eficiência na gestão académica.
            </p>
            <a href="mailto:spuriartipan@gmail.com" className="text-sm lg:text-base text-brand-500">
              spuriartipan@gmail.com
            </a>
          </div>
          <div className="flex gap-4 text-sm lg:text-base text-gray-600 dark:text-gray-300">
            <a href="#sobre">Sobre</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#contacto">Contacto</a>
          </div>
          <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400">© 2026 Spuri. Todos os direitos reservados.</p>
        </div>
      </footer>
    </motion.div>
  );
}

function CtaButtonInverse({ profile }: { profile: Profile }) {
  const content = profileContent[profile];
  const isMailto = content.href.startsWith("mailto:");
  const classes =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-brand-600 shadow-theme-xs transition hover:bg-gray-100";

  if (isMailto) {
    return (
      <a href={content.href} className={classes}>
        {content.cta}
      </a>
    );
  }
  return (
    <Link href={content.href} className={classes}>
      {content.cta}
    </Link>
  );
}
