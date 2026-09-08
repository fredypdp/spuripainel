import type { ReactNode } from "react";

/**
 * Primitivos de texto com a cor já resolvida para os dois temas.
 *
 * Por que isto existe: `body` (src/app/globals.css) não define uma cor de
 * texto padrão, e o tema escuro só troca o fundo (`dark:bg-gray-900`, em
 * src/app/layout.tsx). Qualquer texto sem classe de cor explícita nos DOIS
 * temas herda o preto padrão do navegador e fica ilegível sobre fundo
 * escuro — foi exatamente isso que quebrou as telas de Serviços Extras.
 *
 * Use estes componentes em vez de escrever `text-gray-*` à mão em títulos e
 * textos de apoio de telas do painel. Eles já usam o mesmo par claro/escuro
 * do resto do app (CursosPainel.tsx, TurmasPainel.tsx, MateriaPainel.tsx).
 */

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
      {children}
    </h1>
  );
}

export function PageDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
    </p>
  );
}

export function SectionDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400">{children}</p>
  );
}

/** Card de seção com borda/padding padrão, usado nos formulários do painel. */
export function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 ${className}`.trim()}
    >
      {children}
    </section>
  );
}
