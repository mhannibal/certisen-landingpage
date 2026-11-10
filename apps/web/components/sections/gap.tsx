"use client";

import { motion } from "motion/react";
import { Activity, Check, FlaskConical, Minus, Plus, Sigma } from "lucide-react";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SPOTLIGHT, SectionHeading, SpotlightGlow, trackSpotlight } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";

/** États de la même configuration à chaque version : validée une fois, ou certifiée à chaque mise à jour. */
const LIFECYCLE: ("ok" | "unknown")[][] = [
  ["ok", "unknown", "unknown", "unknown"],
  ["ok", "ok", "ok", "ok"],
];
const APPROACH_ICONS = [FlaskConical, Activity, Sigma];

export function Gap() {
  const t = useDict().gap;
  return (
    <section className="bg-fade relative py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading index="02" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-[1fr_1.15fr]">
          <Reveal parallax={12}>
            <div onMouseMove={trackSpotlight} className={`card flex h-full flex-col rounded-xl p-5 sm:p-7 ${SPOTLIGHT}`}>
              <SpotlightGlow />
              <p className="text-sm font-medium text-fg sm:text-[15px]">{t.lifecycle.title}</p>
              {/* En-tête : versions successives de la même configuration */}
              <div className="mt-7 flex items-end gap-3 sm:mt-10">
                <span className="w-[5.25rem] shrink-0 sm:w-40" />
                <div className="grid flex-1 grid-cols-4">
                  {t.lifecycle.versions.map((v) => (
                    <div key={v.v} className="text-center">
                      <p className="font-mono text-[13px] text-fg sm:text-sm">{v.v}</p>
                      <p className="font-mono text-[8.5px] uppercase tracking-normal text-subtle sm:text-[10px] sm:tracking-wider">{v.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Une ligne par approche : validée une fois, ou certifiée à chaque version */}
              <div className="mt-5 flex flex-1 flex-col justify-center gap-6 sm:mt-6 sm:gap-8">
                {LIFECYCLE.map((states, r) => (
                  <div key={r} className="flex items-center gap-3">
                    <p className={`w-[5.25rem] shrink-0 text-xs leading-snug sm:w-40 sm:text-sm ${r ? "font-medium text-fg" : "text-muted"}`}>
                      {t.lifecycle.rows[r]}
                    </p>
                    <div className="relative grid flex-1 grid-cols-4">
                      <span
                        aria-hidden
                        className={`absolute inset-x-[12.5%] top-1/2 border-t ${r ? "border-fg/60" : "border-dashed border-line-2"}`}
                      />
                      {states.map((s, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.6 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.45, delay: 0.15 * i + 0.25 * r, ease: [0.22, 1, 0.36, 1] }}
                          className={`relative mx-auto grid size-8 place-items-center rounded-full sm:size-9 ${
                            s === "ok" ? "bg-fg text-ink" : "border border-dashed border-line-2 bg-ink text-subtle"
                          }`}
                        >
                          {s === "ok" ? <Check className="size-4" strokeWidth={2.4} /> : <span className="font-mono text-sm">?</span>}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 sm:mt-8 font-mono text-[10px] uppercase tracking-wider text-subtle">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-fg" /> {t.lifecycle.legend.ok}
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full border border-dashed border-subtle" /> {t.lifecycle.legend.unknown}
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} parallax={24}>
            <div className="flex h-full flex-col">
              <p className="px-1 pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{t.approaches.title}</p>
              <div className="grid flex-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:auto-rows-fr lg:grid-cols-1 lg:gap-3">
                {t.approaches.rows.map(({ title, plus, minus }, i) => {
                  const Icon = APPROACH_ICONS[i]!;
                  return (
                    <div
                      key={title}
                      onMouseMove={trackSpotlight}
                      className={`card flex flex-col rounded-xl p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6 lg:py-4 ${SPOTLIGHT}`}
                    >
                      <SpotlightGlow />
                      {/* Mobile et PC : icône et titre sur une ligne ; tablette : l'un sous l'autre. */}
                      <div className="flex items-center gap-3 sm:block lg:flex lg:w-48 lg:shrink-0">
                        <span className="card-inset grid size-9 shrink-0 place-items-center rounded-lg text-fg">
                          <Icon className="size-4" strokeWidth={1.5} />
                        </span>
                        <p className="text-[15px] font-medium text-fg sm:mt-4 lg:mt-0">{title}</p>
                      </div>
                      <div className="mt-3 space-y-1.5 text-[12.5px] leading-snug sm:mt-auto sm:pt-4 sm:text-[13px] lg:mt-0 lg:min-w-0 lg:flex-1 lg:pt-0">
                        <p className="flex items-start gap-2 text-fg/90">
                          <Plus className="mt-px size-3.5 shrink-0" /> {plus}
                        </p>
                        <p className="flex items-start gap-2 text-subtle">
                          <Minus className="mt-px size-3.5 shrink-0" /> {minus}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 border-l border-fg pl-3 text-[13px] leading-relaxed text-fg sm:text-sm">{t.approaches.conclusion}</p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
