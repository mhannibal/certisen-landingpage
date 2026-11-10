"use client";

import { motion } from "motion/react";
import { Activity, Check, FlaskConical, Minus, Plus, Sigma } from "lucide-react";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SectionHeading } from "@/components/ui/primitives";
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
    <section className="bg-fade relative py-28 sm:py-36">
      <Container>
        <SectionHeading index="02" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <div className="mt-16 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <Reveal parallax={12}>
            <div className="card flex h-full flex-col rounded-xl p-6 sm:p-7">
              <p className="text-[15px] font-medium text-fg">{t.lifecycle.title}</p>
              {/* En-tête : versions successives de la même configuration */}
              <div className="mt-10 flex items-end gap-3">
                <span className="w-28 shrink-0 sm:w-40" />
                <div className="grid flex-1 grid-cols-4">
                  {t.lifecycle.versions.map((v) => (
                    <div key={v.v} className="text-center">
                      <p className="font-mono text-sm text-fg">{v.v}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">{v.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Une ligne par approche : validée une fois, ou certifiée à chaque version */}
              <div className="mt-6 flex flex-1 flex-col justify-center gap-8">
                {LIFECYCLE.map((states, r) => (
                  <div key={r} className="flex items-center gap-3">
                    <p className={`w-28 shrink-0 text-xs leading-snug sm:w-40 sm:text-sm ${r ? "font-medium text-fg" : "text-muted"}`}>
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
                          className={`relative mx-auto grid size-9 place-items-center rounded-full ${
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
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-wider text-subtle">
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
            <div className="card h-full overflow-hidden rounded-xl">
              <p className="border-b border-line px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                {t.approaches.title}
              </p>
              {t.approaches.rows.map(({ title, plus, minus }, i) => {
                const Icon = APPROACH_ICONS[i]!;
                return (
                  <div key={title} className="flex items-start gap-5 border-b border-line px-6 py-5">
                    <span className="card-inset grid size-10 shrink-0 place-items-center rounded-lg text-fg">
                      <Icon className="size-4.5" strokeWidth={1.5} />
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-fg">{title}</p>
                      <div className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                        <span className="flex items-center gap-2 text-fg/90">
                          <Plus className="size-3.5 shrink-0" /> {plus}
                        </span>
                        <span className="flex items-center gap-2 text-subtle">
                          <Minus className="size-3.5 shrink-0" /> {minus}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="bg-white/[0.02] px-6 py-5 text-sm text-fg">{t.approaches.conclusion}</p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
