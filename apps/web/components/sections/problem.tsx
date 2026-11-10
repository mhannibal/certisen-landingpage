"use client";

import { AnimatePresence, motion } from "motion/react";
import { Cpu, Disc3, Network, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";

const STAGE_ICONS = [Radar, Cpu, Network, Disc3];

/** Chaîne de freinage : un message à l'heure, puis le même message en retard. */
function BrakingTimeline() {
  const t = useDict().problem.timeline;
  const [late, setLate] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setLate((l) => !l), 3800);
    return () => clearInterval(id);
  }, []);
  const ease = late ? ([0.3, 0, 0.9, 0.7] as const) : ([0.2, 0.7, 0.3, 1] as const);

  return (
    <div className="card relative h-full overflow-hidden rounded-xl p-6 sm:p-8">
      {/* hauteur fixe : le changement d'étiquette ne doit pas faire bouger la page */}
      <div className="flex h-7 items-center justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{t.label}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={late ? "late" : "ok"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-[11px] ${
              late ? "border border-fg text-fg" : "bg-fg text-ink"
            }`}
          >
            {late ? t.late : t.ok}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-12 grid grid-cols-4 gap-2">
        {t.stages.map((label, i) => {
          const Icon = STAGE_ICONS[i]!;
          return (
            <div key={label} className="flex flex-col items-center gap-2.5">
              <span className="card-inset grid size-12 place-items-center rounded-lg text-fg">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <span className="text-xs text-muted">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="relative mx-[12.5%] mt-7 h-1 bg-line">
        <div className="absolute -top-3 bottom-[-12px] left-[78%] w-px bg-fg" />
        <span className="absolute top-5 left-[78%] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-fg">
          {t.deadline}
        </span>
        <motion.div
          key={late ? "l" : "o"}
          className={`absolute inset-y-0 left-0 ${late ? "hatch" : "bg-fg"}`}
          initial={{ width: "0%" }}
          animate={{ width: late ? "100%" : "66%" }}
          transition={{ duration: late ? 3 : 2, ease }}
        />
        <motion.span
          key={late ? "dl" : "do"}
          className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            late ? "border-2 border-fg bg-ink" : "bg-fg"
          }`}
          initial={{ left: "0%" }}
          animate={{ left: late ? "100%" : "66%" }}
          transition={{ duration: late ? 3 : 2, ease }}
        />
      </div>

      <p className="mt-14 border-t border-line pt-5 text-sm leading-relaxed text-muted">
        {t.caption[0]}
        <span className="text-fg">{t.caption[1]}</span>
        {t.caption[2]}
      </p>
    </div>
  );
}

export function Problem() {
  const t = useDict().problem;
  return (
    <section id="probleme" className="relative py-28 sm:py-36">
      <Container>
        <SectionHeading index="01" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <div className="mt-16 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <Reveal parallax={12}>
            <BrakingTimeline />
          </Reveal>

          <Reveal delay={0.1} parallax={24}>
            <div className="card h-full overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{t.causes.title}</span>
                <span className="font-mono text-[11px] text-subtle">{t.causes.unit}</span>
              </div>
              <ul>
                {t.causes.rows.map((r) => (
                  <li
                    key={r.tag}
                    className="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-line px-6 py-5 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <div>
                      <p className="text-[15px] font-medium text-fg">{r.title}</p>
                      <p className="mt-1 text-sm text-muted">{r.what}</p>
                    </div>
                    <p className="whitespace-nowrap rounded-md border border-line-2 px-2.5 py-1 text-right font-mono text-[13px] text-fg">
                      {r.tag}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
