"use client";

import { AnimatePresence, motion } from "motion/react";
import { Cpu, Disc3, Network, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SPOTLIGHT, SectionHeading, SpotlightGlow, trackSpotlight } from "@/components/ui/primitives";
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
    <div onMouseMove={trackSpotlight} className={`card h-full rounded-xl p-5 lg:p-8 ${SPOTLIGHT}`}>
      <SpotlightGlow />
      {/* hauteur fixe : le changement d'étiquette ne doit pas faire bouger la page */}
      <div className="flex h-7 items-center justify-between gap-3">
        <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-subtle lg:text-[11px] lg:tracking-[0.14em]">{t.label}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={late ? "late" : "ok"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`whitespace-nowrap rounded-md px-2 py-1 font-mono text-[10px] lg:px-2.5 lg:text-[11px] ${
              late ? "border border-fg text-fg" : "bg-fg text-ink"
            }`}
          >
            {late ? t.late : t.ok}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2 sm:mt-12">
        {t.stages.map((label, i) => {
          const Icon = STAGE_ICONS[i]!;
          return (
            <div key={label} className="flex flex-col items-center gap-2.5">
              <span className="card-inset grid size-10 place-items-center rounded-lg text-fg sm:size-12">
                <Icon className="size-4 sm:size-5" strokeWidth={1.5} />
              </span>
              <span className="text-[11px] text-muted sm:text-xs">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="relative mx-[12.5%] mt-6 h-1 bg-line sm:mt-7">
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

      <p className="mt-11 border-t border-line pt-4 text-[13px] leading-relaxed text-muted sm:mt-14 sm:pt-5 sm:text-sm">
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
    <section id="probleme" className="relative py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading index="01" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-5 md:grid-cols-2 lg:grid-cols-[1fr_1.1fr]">
          <Reveal parallax={12}>
            <BrakingTimeline />
          </Reveal>

          <Reveal delay={0.1} parallax={24}>
            {/* Une petite carte par cause : norme en haut, titre et explication en bas. */}
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 px-1 pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                <span>{t.causes.title}</span>
                <span className="hidden whitespace-nowrap normal-case tracking-normal lg:inline">{t.causes.unit}</span>
              </div>
              <ul className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 sm:gap-4">
                {t.causes.rows.map((r, i) => (
                  <li key={r.tag} onMouseMove={trackSpotlight} className={`card flex flex-col rounded-xl p-4 sm:p-5 ${SPOTLIGHT}`}>
                    <SpotlightGlow />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-subtle">0{i + 1}</span>
                      <span className="whitespace-nowrap rounded-md border border-line-2 px-1.5 py-0.5 font-mono text-[10.5px] text-fg sm:text-[11px]">
                        {r.tag}
                      </span>
                    </div>
                    <p className="mt-auto pt-5 text-[13.5px] font-medium leading-snug text-fg sm:text-[15px]">{r.title}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-muted sm:text-[13px]">{r.what}</p>
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
