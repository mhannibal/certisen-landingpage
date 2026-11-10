"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { WebGLGuard } from "@/components/three/webgl-guard";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SPOTLIGHT, SectionHeading, SpotlightGlow, trackSpotlight } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";

/** Coloration monochrome : mots-clés en blanc, identifiants en gris, commentaires atténués. */
const TONE = { k: "text-fg", i: "text-muted", c: "text-subtle", p: "text-[#5a5a5a]" } as const;
type Tone = keyof typeof TONE;

/** Théorème illustratif : la chaîne de freinage respecte son échéance pour toute configuration certifiée. */
const PROOF: [string, Tone][][] = [
  [["Theorem ", "k"], ["emergency_braking_on_time", "i"], [" :", "p"]],
  [["  forall ", "k"], ["cfg : TsnConfig", "i"], [",", "p"]],
  [["    ", "p"], ["CertifiedByCore ", "i"], ["cfg", "i"], [" ->", "p"]],
  [["    ", "p"], ["wcrt ", "i"], ["cfg (radar ~> brake_fl)", "i"], [" <= ", "p"], ["1 ms", "k"], [".", "p"]],
  [["Proof", "k"], [". ", "p"], ["(* checked by the Rocq kernel *)", "c"], [" Qed", "k"], [".", "p"]],
];

const BarsCanvas = dynamic(() => import("@/components/three/bars-canvas"), { ssr: false });

const BAR_STYLE = [
  { h: 30, c: "bg-[#2e2e2e]" },
  { h: 45, c: "bg-[#3d3d3d]" },
  { h: 60, c: "bg-[#5a5a5a]" },
  { h: 92, c: "bg-fg" },
];

export function Positioning() {
  const t = useDict().positioning;
  return (
    <section className="relative py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading index="06" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
          <Reveal parallax={12}>
            <div onMouseMove={trackSpotlight} className={`card h-full rounded-xl p-5 sm:p-7 ${SPOTLIGHT}`}>
              <SpotlightGlow />
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                <span>{t.chartTitle}</span>
                <span className="hidden sm:inline">{t.chartNote}</span>
              </div>
              {/* Colonnes en 3D ; sans WebGL, les barres à plat d'origine. */}
              <WebGLGuard fallback={<FlatBars />}>
                <BarsCanvas className="mt-4 h-52 sm:mt-6 sm:h-72" />
              </WebGLGuard>
              <div className="mt-3 flex gap-3">
                {t.bars.map((b, i) => (
                  <div key={b.label} className="flex-1 text-center">
                    <p className={`text-[13px] sm:text-sm ${i === t.bars.length - 1 ? "font-medium text-fg" : "text-muted"}`}>{b.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">{b.kind}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} parallax={24}>
            <div onMouseMove={trackSpotlight} className={`card h-full rounded-xl ${SPOTLIGHT}`}>
              <SpotlightGlow />
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle sm:px-6 sm:py-4">
                <span>{t.proofTitle}</span>
                <span className="normal-case tracking-normal">{t.proofNote}</span>
              </div>
              {/* Énoncé du théorème que le certificat établit (forme simplifiée). */}
              <pre className="card-inset overflow-x-auto px-4 py-4 font-mono text-[11px] leading-relaxed sm:px-6 sm:py-5 sm:text-[12.5px]">
                {PROOF.map((line, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.08 * i }}
                    className="block whitespace-pre"
                  >
                    {line.map(([text, tone], j) => (
                      <span key={j} className={TONE[tone]}>
                        {text}
                      </span>
                    ))}
                  </motion.span>
                ))}
              </pre>
              {t.proof.map((p) => (
                <div key={p.k} className="flex gap-3 border-t border-line px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
                  <span className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-fg">{p.k}</span>
                  <span className="text-[13px] leading-relaxed text-muted sm:text-sm">{p.v}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/** Barres à plat (repli sans WebGL). */
function FlatBars() {
  return (
    <div className="relative mt-6 flex h-48 items-end gap-3 border-b border-line sm:mt-8 sm:h-64">
      {[25, 50, 75].map((g) => (
        <span key={g} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${g}%` }} />
      ))}
      {BAR_STYLE.map((b, i) => (
        <div key={i} className="relative flex h-full flex-1 items-end justify-center">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: `${b.h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full max-w-20 rounded-t-sm ${b.c}`}
          />
        </div>
      ))}
    </div>
  );
}
