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
 *
 * Duas composições, trocadas por breakpoint (não por JS/resize — evita
 * problemas de hidratação): abaixo de `sm`, um traçado VERTICAL, maior e
 * com texto mais legível, pensado para ecrã de telemóvel; a partir de `sm`,
 * o traçado HORIZONTAL original.
 */

type Point = { x: number; y: number; label: string };

const HORIZONTAL_WAYPOINTS: Point[] = [
  { x: 60, y: 140, label: "Matrícula" },
  { x: 230, y: 60, label: "Ensino Fundamental" },
  { x: 400, y: 140, label: "Ensino Médio" },
  { x: 570, y: 60, label: "Universidade" },
  { x: 740, y: 140, label: "Licenciatura" },
];

const VERTICAL_WAYPOINTS: Point[] = [
  { x: 70, y: 70, label: "Matrícula" },
  { x: 250, y: 190, label: "Ensino Fundamental" },
  { x: 70, y: 310, label: "Ensino Médio" },
  { x: 250, y: 430, label: "Universidade" },
  { x: 70, y: 550, label: "Licenciatura" },
];

/** Ponto de uma curva cúbica de Bézier em t (0 a 1). */
function cubicAt(p0: number, c1: number, c2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * c1 + 3 * mt * t ** 2 * c2 + t ** 3 * p3;
}

/**
 * Constrói o "d" do SVG e, ao mesmo tempo, os pontos reais da curva (incluindo
 * o meio de cada segmento) para o marcador conseguir seguir a linha de perto.
 * `axis` indica qual coordenada comanda o fluxo da onda (x = horizontal,
 * y = vertical) — é nessa coordenada que os pontos de controlo da Bézier
 * ficam a meio caminho, criando a curva em "S".
 */
function buildTrilha(points: Point[], axis: "x" | "y") {
  let d = `M ${points[0].x},${points[0].y}`;
  const travelX: number[] = [points[0].x];
  const travelY: number[] = [points[0].y];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    let c1: { x: number; y: number };
    let c2: { x: number; y: number };

    if (axis === "x") {
      const midX = (prev.x + curr.x) / 2;
      c1 = { x: midX, y: prev.y };
      c2 = { x: midX, y: curr.y };
    } else {
      const midY = (prev.y + curr.y) / 2;
      c1 = { x: prev.x, y: midY };
      c2 = { x: curr.x, y: midY };
    }

    d += ` C ${c1.x},${c1.y} ${c2.x},${c2.y} ${curr.x},${curr.y}`;

    travelX.push(cubicAt(prev.x, c1.x, c2.x, curr.x, 0.5));
    travelY.push(cubicAt(prev.y, c1.y, c2.y, curr.y, 0.5));
    travelX.push(curr.x);
    travelY.push(curr.y);
  }

  return { d, travelX, travelY };
}

const HORIZONTAL = buildTrilha(HORIZONTAL_WAYPOINTS, "x");
const VERTICAL = buildTrilha(VERTICAL_WAYPOINTS, "y");

// opacity: invisível exatamente nas pontas (Matrícula / Licenciatura), visível
// no resto do percurso. O array tem sempre o mesmo comprimento de travelX/
// travelY, para os três ficarem sincronizados (Framer Motion não alinha
// arrays de tamanhos diferentes automaticamente).
function opacityFor(travelX: number[]) {
  return travelX.map((_, i) => (i === 0 || i === travelX.length - 1 ? 0 : 1));
}

const TRAVEL_DURATION = 6; // segundos para uma "viagem" completa de um marcador
const MARKER_COUNT = 3;
const MARKER_GAP = TRAVEL_DURATION / MARKER_COUNT;

const TravellingMarker: React.FC<{
  delay: number;
  travelX: number[];
  travelY: number[];
  radius: number;
}> = ({ delay, travelX, travelY, radius }) => (
  <motion.circle
    r={radius}
    className="fill-brand-500"
    style={{ filter: "drop-shadow(0 0 6px var(--color-brand-500, #465fff))" }}
    initial={{ cx: travelX[0], cy: travelY[0], opacity: 0 }}
    animate={{ cx: travelX, cy: travelY, opacity: opacityFor(travelX) }}
    transition={{
      duration: TRAVEL_DURATION,
      delay,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: MARKER_GAP * (MARKER_COUNT - 1),
    }}
  />
);

function Trilha({
  points,
  pathD,
  travelX,
  travelY,
  viewBox,
  nodeRadius,
  markerRadius,
  fontSize,
  reduced,
  markerDelays,
}: {
  points: Point[];
  pathD: string;
  travelX: number[];
  travelY: number[];
  viewBox: string;
  nodeRadius: number;
  markerRadius: number;
  fontSize: number;
  reduced: boolean;
  markerDelays: number[];
}) {
  const [, , vbWidth] = viewBox.split(" ").map(Number);

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Trilha do estudante: Matrícula, Ensino Fundamental, Ensino Médio, Universidade e Licenciatura, todos acompanhados na mesma plataforma"
    >
      <path
        d={pathD}
        fill="none"
        className="stroke-gray-300 dark:stroke-gray-700"
        strokeWidth={vbWidth > 400 ? 3 : 3.5}
        strokeDasharray="2 10"
        strokeLinecap="round"
      />

      {!reduced &&
        markerDelays.map((delay) => (
          <TravellingMarker key={delay} delay={delay} travelX={travelX} travelY={travelY} radius={markerRadius} />
        ))}

      {points.map((point, i) => {
        const isVertical = vbWidth < 400;
        const labelIsLeftNode = isVertical ? point.x < vbWidth / 2 : true;
        return (
          <g key={point.label}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={nodeRadius}
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
            <circle cx={point.x} cy={point.y} r={nodeRadius * 0.35} className="fill-brand-500" />
            <text
              x={isVertical ? point.x + (labelIsLeftNode ? nodeRadius + 12 : -(nodeRadius + 12)) : point.x}
              y={isVertical ? point.y + fontSize * 0.35 : point.y > 100 ? point.y + 30 : point.y - 22}
              textAnchor={isVertical ? (labelIsLeftNode ? "start" : "end") : "middle"}
              className="fill-gray-600 dark:fill-gray-300"
              style={{ fontSize, fontWeight: 600 }}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TrilhaAnimation({ className = "" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const reduced = Boolean(prefersReducedMotion);

  const markerDelays = useMemo(
    () => Array.from({ length: MARKER_COUNT }, (_, i) => i * MARKER_GAP),
    []
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile: traçado vertical, maior e com texto mais legível */}
      <div className="sm:hidden">
        <Trilha
          points={VERTICAL_WAYPOINTS}
          pathD={VERTICAL.d}
          travelX={VERTICAL.travelX}
          travelY={VERTICAL.travelY}
          viewBox="0 0 320 600"
          nodeRadius={14}
          markerRadius={9}
          fontSize={17}
          reduced={reduced}
          markerDelays={markerDelays}
        />
      </div>

      {/* A partir de sm: traçado horizontal */}
      <div className="hidden sm:block">
        <Trilha
          points={HORIZONTAL_WAYPOINTS}
          pathD={HORIZONTAL.d}
          travelX={HORIZONTAL.travelX}
          travelY={HORIZONTAL.travelY}
          viewBox="0 0 800 200"
          nodeRadius={11}
          markerRadius={7}
          fontSize={13}
          reduced={reduced}
          markerDelays={markerDelays}
        />
      </div>

      {/* Garante que a mensagem "acompanhamos todo o percurso" não depende só
          do SVG — importante para leitores de ecrã. */}
      <p className="sr-only">
        Percurso acompanhado pelo Spuri: Matrícula, Ensino Fundamental, Ensino Médio,
        Universidade e Licenciatura.
      </p>
    </div>
  );
}
