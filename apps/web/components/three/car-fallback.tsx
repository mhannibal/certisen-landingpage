"use client";

import { useMemo } from "react";
import { buildCar, type V3 } from "@/lib/car";
import { DESIGN } from "@/lib/car-design";

/** Segments (paires de points) vus de profil (côté gauche) → chemin SVG ; y vers le haut. */
function sidePath(segs: V3[]) {
  let d = "";
  for (let i = 0; i + 1 < segs.length; i += 2) {
    const a = segs[i]!;
    const b = segs[i + 1]!;
    if (a[2] < -0.01 || b[2] < -0.01) continue;
    d += `M${a[0].toFixed(3)} ${(-a[1]).toFixed(3)}L${b[0].toFixed(3)} ${(-b[1]).toFixed(3)}`;
  }
  return d;
}

/** Cercles de roue vus de profil (pneu et jante). */
function wheels() {
  const { R, rimR } = DESIGN.wheel;
  return DESIGN.axles.flatMap((x) => [
    { x, y: R, r: R },
    { x, y: R, r: rimR },
  ]);
}

/**
 * Image de secours quand WebGL est indisponible : la voiture en fil de fer, de
 * profil, tracée en SVG à partir de la même géométrie que la scène 3D.
 */
export default function CarFallback({ className }: { className?: string }) {
  const paths = useMemo(() => {
    const car = buildCar();
    return {
      outline: sidePath(car.outline),
      details: sidePath(car.details),
      interior: sidePath(car.interior),
    };
  }, []);
  return (
    <div className={`grid place-items-center ${className ?? ""}`}>
      <svg
        viewBox="-2.6 -2.0 5.2 2.25"
        className="w-[min(90%,1100px)] text-fg"
        fill="none"
        stroke="currentColor"
        role="img"
        aria-label="SUV"
      >
        <line x1={-2.6} x2={2.6} y1={0} y2={0} strokeWidth={0.006} opacity={0.25} />
        <path d={paths.interior} strokeWidth={0.004} opacity={0.35} />
        <path d={paths.details} strokeWidth={0.005} opacity={0.6} />
        <path d={paths.outline} strokeWidth={0.008} />
        {wheels().map((w, i) => (
          <circle key={i} cx={w.x} cy={-w.y} r={w.r} strokeWidth={0.008} opacity={i % 2 ? 0.6 : 1} />
        ))}
      </svg>
    </div>
  );
}
