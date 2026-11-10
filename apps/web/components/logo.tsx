"use client";

import { motion } from "motion/react";

/**
 * Logo CertiSen (monochrome) : bouclier plein = sûreté, couronne et poussoir
 * de chronomètre = temps réel, coche en réserve = certifié.
 */
export const LOGO_PATHS = {
  crown: "M13.6 1.2h4.8a1 1 0 0 1 0 2h-1.4v1.6h-2V3.2h-1.4a1 1 0 0 1 0-2Z",
  pusher: "M24.3 6.9 25.9 5.3",
  shield: "M16 5.2 26.4 8.9v6.8c0 6.4-4.2 11.1-10.4 13.6C9.8 26.8 5.6 22.1 5.6 15.7V8.9L16 5.2Z",
  check: "m11.3 16.9 3.3 3.3 6.2-6.6",
};

export function LogoMark({
  size = 28,
  animate = true,
  className,
  cutout = "var(--color-ink)",
}: {
  size?: number;
  animate?: boolean;
  className?: string;
  /** Couleur de la coche en réserve (celle du fond). */
  cutout?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d={LOGO_PATHS.crown} fill="currentColor" />
      <path d={LOGO_PATHS.pusher} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d={LOGO_PATHS.shield} fill="currentColor" />
      <motion.path
        d={LOGO_PATHS.check}
        stroke={cutout}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-fg ${className ?? ""}`}>
      <LogoMark size={26} />
      <span className="text-[17px] font-medium tracking-[-0.025em]">CertiSen</span>
    </span>
  );
}
