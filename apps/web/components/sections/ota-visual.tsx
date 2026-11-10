"use client";

import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { Check, CloudDownload, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDict } from "@/lib/i18n/provider";

/** Nombre d'obligations de preuve rejouées à chaque mise à jour (illustration). */
const OBLIGATIONS = 42;
/** Rayon de l'anneau de rejeu. */
const R = 17;
const C = 2 * Math.PI * R;

type Phase = "arrive" | "replay" | "certified";

/** Cadre sobre du visuel (sans lueur autour). */
function Frame({ children }: { children: ReactNode }) {
  return <div className="card-inset rounded-lg">{children}</div>;
}

/**
 * Re-certification OTA, en trois temps qui s'enchaînent en boucle :
 * 1. la mise à jour arrive (paquet qui file le long du faisceau) ;
 * 2. le noyau rejoue la preuve (anneau et barre qui se remplissent, obligations comptées) ;
 * 3. le certificat est émis (tampon) et rejoint l'historique des versions.
 */
export function OtaVisual() {
  const t = useDict().features.visuals;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-60px" });
  const [ver, setVer] = useState(5);
  const [phase, setPhase] = useState<Phase>("certified");
  const progress = useMotionValue(1);
  const dash = useTransform(progress, (p) => C * (1 - p));
  const count = useTransform(progress, (p) => `${Math.round(p * OBLIGATIONS)}/${OBLIGATIONS}`);

  useEffect(() => {
    if (!inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let run: { stop: () => void } | undefined;
    const cycle = () => {
      setVer((v) => v + 1);
      setPhase("arrive");
      run?.stop();
      progress.set(0);
      timers.push(
        setTimeout(() => {
          setPhase("replay");
          run = animate(progress, 1, { duration: 1.9, ease: [0.65, 0, 0.35, 1] });
        }, 1150),
      );
      timers.push(setTimeout(() => setPhase("certified"), 3150));
      timers.push(setTimeout(cycle, 5600));
    };
    timers.push(setTimeout(cycle, 600));
    return () => {
      timers.forEach(clearTimeout);
      run?.stop();
    };
  }, [inView, progress]);

  const certified = phase === "certified";
  const latest = certified ? ver : ver - 1;
  const history = [latest - 3, latest - 2, latest - 1, latest];

  return (
    <div ref={ref} className="mt-6">
      <Frame>
        <div className="p-4">
          {/* Mise à jour → faisceau → noyau CertiSen → version */}
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line-2 text-fg">
              <CloudDownload className="size-4" strokeWidth={1.6} />
            </span>
            <div className="relative h-px flex-1 bg-gradient-to-r from-line-2 via-line-2 to-transparent">
              <AnimatePresence>
                {phase === "arrive" ? (
                  <motion.span
                    key={ver}
                    className="absolute -top-[3px] size-[7px] rounded-full bg-fg shadow-[0_0_14px_3px_rgb(255_255_255/0.55)]"
                    initial={{ left: "0%", opacity: 0 }}
                    animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: [0.45, 0, 0.2, 1] }}
                  />
                ) : null}
              </AnimatePresence>
            </div>
            {/* Noyau : anneau de rejeu de la preuve */}
            <span className="relative grid size-11 shrink-0 place-items-center">
              <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx="22" cy="22" r={R} fill="none" stroke="var(--color-line-2)" strokeWidth="2" />
                <motion.circle
                  cx="22"
                  cy="22"
                  r={R}
                  fill="none"
                  stroke="var(--color-fg)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  style={{ strokeDashoffset: dash }}
                />
              </svg>
              <motion.span
                animate={certified ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-fg"
              >
                <ShieldCheck className="size-4" strokeWidth={1.7} />
              </motion.span>
            </span>
            <div className="w-[68px] shrink-0 overflow-hidden text-right font-mono text-lg text-fg">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={ver}
                  className="inline-block"
                  initial={{ y: 18, opacity: 0, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -18, opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  v2.{ver}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Rejeu de la preuve */}
          <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-subtle">
            <span>{t.replay}</span>
            <motion.span className="tabular-nums text-muted">{count}</motion.span>
          </div>
          <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-ink-2">
            <motion.div className="h-full origin-left rounded-full bg-fg" style={{ scaleX: progress }} />
          </div>

          {/* Historique des certificats : la dernière version arrive comme un tampon */}
          <div className="mt-4 flex items-center gap-2 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {history.map((v, i) => {
                const newest = i === history.length - 1;
                return (
                  <motion.span
                    layout
                    key={v}
                    initial={{ opacity: 0, scale: 1.6, rotate: -10 }}
                    animate={{ opacity: newest ? 1 : 0.45 + i * 0.12, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className={`relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-md px-2.5 py-1 font-mono text-[11px] ${
                      newest ? "bg-fg font-medium text-ink" : "border border-line-2 text-muted"
                    }`}
                  >
                    <Check className="size-3" strokeWidth={3} />
                    v2.{v}
                    {newest ? <span className="font-sans">· {t.certified}</span> : null}
                    {/* Reflet qui balaie le tampon à son arrivée */}
                    {newest ? (
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 w-8 -skew-x-12 bg-white/60 blur-[2px]"
                        initial={{ left: "-30%" }}
                        animate={{ left: "130%" }}
                        transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
                      />
                    ) : null}
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </Frame>
    </div>
  );
}
