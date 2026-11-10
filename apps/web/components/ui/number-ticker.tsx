"use client";

import { useInView, useMotionValue, useMotionValueEvent, useSpring } from "motion/react";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/provider";

/** Compteur animé (inspiré du NumberTicker de magicui), au format numérique de la langue. */
export function NumberTicker({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const { intl } = useI18n();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 42, stiffness: 70 });
  const fmt = new Intl.NumberFormat(intl, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, mv, value]);

  useMotionValueEvent(spring, "change", (v) => {
    if (ref.current) ref.current.textContent = fmt.format(v);
  });

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {fmt.format(0)}
    </span>
  );
}
