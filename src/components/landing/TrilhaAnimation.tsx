"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * TrilhaAnimation
 * ----------------
 * Elemento-assinatura visual da landing page: um estudante percorre uma trilha
 * tracejada por 5 etapas (Matrícula → Ensino Fundamental → Ensino Médio →
 * Universidade → Licenciatura). Liga-se diretamente à marca: "Spuri" é
 * "rastreio" em esperanto, e a logo já usa uma linha sinuosa terminada num
 * ponto — esta animação é literalmente essa linha, em movimento.
 *
 * Em vez de UM marcador a fazer ping-pong (o que implicaria "desgraduar-se"
 * ao voltar), usa 3 marcadores escalonados que percorrem o percurso uma vez
 * e desaparecem — representando um fluxo contínuo de estudantes a avançar
 * pelo sistema, nunca a andar para trás.
 */

const WAYPOINTS = [
  { x: 60, y: 140, label: "Matrícula" },
  { x: 230, y: 60, label: "Ensino Fundamental" },
  { x: 400, y: 140, label: "Ensino Médio" },
  { x: 570, y: 60, label: "Universidade" },
  { x: 740, y: 140, label: "Licenciatura" },
] as const;

/** Ponto de uma curva cúbica de Bézier em t (0 a 1). */
function cubicAt(p0: number, c1: number, c2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * c1 + 3 * mt * t ** 2 * c2 + t ** 3 * p3;
}

/** Constrói o "d" do SVG e, ao mesmo tempo, os pontos reais da curva (incluindo
 * o meio de cada segmento) para o marcador conseguir seguir a linha de perto,
 * em vez de cortar caminho em linha reta entre as 5 etapas. */
function buildTrilha() {
  let d = `M ${WAYPOINTS[0].x},${WAYPOINTS[0].y}`;
  const travelX: number[] = [WAYPOINTS[0].x];
  const travelY: number[] = [WAYPOINTS[0].y];

  for (let i = 1; i < WAYPOINTS.length; i++) {
    const prev = WAYPOINTS[i - 1];
    const curr = WAYPOINTS[i];
    const midX = (prev.x + curr.x) / 2;
    const c1 = { x: midX, y: prev.y };
    const c2 = { x: midX, y: curr.y };

    d += ` C ${c1.x},${c1.y} ${c2.x},${c2.y} ${curr.x},${curr.y}`;

    travelX.push(cubicAt(prev.x, c1.x, c2.x, curr.x, 0.5));
    travelY.push(cubicAt(prev.y, c1.y, c2.y, curr.y, 0.5));
    travelX.push(curr.x);
    travelY.push(curr.y);
  }

  return { d, travelX, travelY };
}

const { d: PATH_D, travelX, travelY } = buildTrilha();

// opacity: invisível exatamente nas pontas (Matrícula / Licenciatura), visível
// no resto do percurso — "aparece" depois de matriculado, "sai de cena" ao
// concluir a licenciatura. O array tem o mesmo comprimento de travelX/travelY,
// para os três ficarem sincronizados (Framer Motion não alinha arrays de
// tamanhos diferentes automaticamente).
const TRAVEL_OPACITY = travelX.map((_, i) => (i === 0 || i === travelX.length - 1 ? 0 : 1));

const TRAVEL_DURATION = 6; // segundos para uma "viagem" completa de um marcador
const MARKER_COUNT = 3;
const MARKER_GAP = TRAVEL_DURATION / MARKER_COUNT;

const TravellingMarker: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.circle
    r={7}
    className="fill-brand-500"
    style={{ filter: "drop-shadow(0 0 6px var(--color-brand-500, #465fff))" }}
    initial={{ cx: travelX[0], cy: travelY[0], opacity: 0 }}
    animate={{ cx: travelX, cy: travelY, opacity: TRAVEL_OPACITY }}
    transition={{
      duration: TRAVEL_DURATION,
      delay,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: MARKER_GAP * (MARKER_COUNT - 1),
    }}
  />
);

export default function TrilhaAnimation({ className = "" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const reduced = Boolean(prefersReducedMotion);

  const markerDelays = useMemo(
    () => Array.from({ length: MARKER_COUNT }, (_, i) => i * MARKER_GAP),
    []
  );

  return (
    <div className={`w-full ${className}`}>
      <svg
        viewBox="0 0 800 200"
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Trilha do estudante: Matrícula, Ensino Fundamental, Ensino Médio, Universidade e Licenciatura, todos acompanhados na mesma plataforma"
      >
        {/* Linha tracejada de base */}
        <path
          d={PATH_D}
          fill="none"
          className="stroke-gray-300 dark:stroke-gray-700"
          strokeWidth={3}
          strokeDasharray="2 10"
          strokeLinecap="round"
        />

        {/* Marcadores viajantes (fluxo de estudantes) */}
        {!reduced && markerDelays.map((delay) => <TravellingMarker key={delay} delay={delay} />)}

        {/* Nós fixos de cada etapa, com pulso ambiente escalonado */}
        {WAYPOINTS.map((point, i) => (
          <g key={point.label}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={11}
              className="fill-white dark:fill-gray-900 stroke-brand-500"
              strokeWidth={2.5}
              animate={reduced ? undefined : { scale: [1, 1.18, 1], opacity: [0.85, 1, 0.85] }}
              transition={
                reduced
                  ? undefined
                  : {
                      duration: 2,
                      delay: i * 0.4,
                      repeat: Infinity,
                      repeatDelay: TRAVEL_DURATION - 2,
                      ease: "easeInOut",
                    }
              }
              style={{ transformOrigin: `${point.x}px ${point.y}px` }}
            />
            <circle cx={point.x} cy={point.y} r={4} className="fill-brand-500" />
            <text
              x={point.x}
              y={point.y > 100 ? point.y + 30 : point.y - 22}
              textAnchor="middle"
              className="fill-gray-600 dark:fill-gray-300"
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Garante que a mensagem "acompanhamos todo o percurso" não depende só
          do SVG — importante para leitores de ecrã e como reforço em ecrãs
          muito pequenos. */}
      <p className="sr-only">
        Percurso acompanhado pelo Spuri: Matrícula, Ensino Fundamental, Ensino Médio,
        Universidade e Licenciatura.
      </p>
    </div>
  );
}
