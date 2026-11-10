"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LOGO_PATHS } from "@/components/logo";
import { useDict } from "@/lib/i18n/provider";

const EASE = [0.22, 1, 0.36, 1] as const;
const CURTAIN = [0.76, 0, 0.24, 1] as const;
const SESSION_KEY = "certisen-loaded";

/**
 * Étapes réelles du chargement, dans l'ordre affiché, avec leur poids dans la barre.
 * Les scènes 3D signalent elles-mêmes leur fin via useLoaderSignal().
 */
const TASKS = [
  { id: "page", weight: 1 },
  { id: "fonts", weight: 1 },
  { id: "heroModule", weight: 2 },
  { id: "carModule", weight: 2 },
  { id: "heroScene", weight: 2 },
  { id: "carScene", weight: 3 },
] as const;
export type LoaderTask = (typeof TASKS)[number]["id"];
const TOTAL = TASKS.reduce((s, t) => s + t.weight, 0);
/** Au-delà, on ouvre le site quoi qu'il arrive (ex. WebGL indisponible). */
const SAFETY_MS = 15000;

/** Vrai quand l'écran de chargement commence à s'effacer : les entrées de page peuvent démarrer. */
const ReadyContext = createContext(false);
export const useReady = () => useContext(ReadyContext);

const SignalContext = createContext<(id: LoaderTask) => void>(() => {});
/** Renvoie une fonction stable à appeler quand l'étape `id` est terminée. */
export function useLoaderSignal(id: LoaderTask) {
  const mark = useContext(SignalContext);
  return useCallback(() => mark(id), [mark, id]);
}

function LoaderScreen({ progress, step }: { progress: number; step: string }) {
  return (
    <motion.div
      key="loader"
      role="status"
      aria-live="polite"
      aria-label={`CertiSen ${progress}%`}
      initial={{ y: 0 }}
      exit={{ y: "-100%", transition: { duration: 1.1, ease: CURTAIN } }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-ink"
    >
      <motion.div
        exit={{
          opacity: 0,
          y: -24,
          transition: { duration: 0.45, ease: "easeIn" },
        }}
        className="flex flex-col items-center"
      >
        {/* Logo : contour du bouclier qui se dessine, remplissage, puis coche */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden
          className="text-fg"
        >
          <motion.path
            d={LOGO_PATHS.crown}
            fill="currentColor"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.5, ease: EASE }}
          />
          <motion.path
            d={LOGO_PATHS.pusher}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.45, duration: 0.4 }}
          />
          <motion.path
            d={LOGO_PATHS.shield}
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinejoin="round"
            initial={{ pathLength: 0, fill: "rgba(250,250,250,0)" }}
            animate={{ pathLength: 1, fill: "rgba(250,250,250,1)" }}
            transition={{
              pathLength: {
                delay: 0.15,
                duration: 1.4,
                ease: [0.65, 0, 0.35, 1],
              },
              fill: { delay: 1.45, duration: 0.6 },
            }}
          />
          <motion.path
            d={LOGO_PATHS.check}
            stroke="var(--color-ink)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              delay: 1.95,
              duration: 0.6,
              ease: [0.65, 0, 0.35, 1],
            }}
          />
        </svg>

        {/* Nom : lettres révélées depuis un masque */}
        <p className="mt-5 flex overflow-hidden text-2xl font-medium tracking-[-0.03em] text-fg">
          {Array.from("CertiSen").map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ delay: 0.9 + i * 0.07, duration: 0.8, ease: EASE }}
            >
              {ch}
            </motion.span>
          ))}
        </p>
      </motion.div>

      {/* Progression */}
      <motion.div
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        className="absolute inset-x-0 bottom-12 mx-auto flex w-[min(320px,80vw)] flex-col gap-3"
      >
        <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {step}
            </motion.span>
          </AnimatePresence>
          <span className="tabular-nums text-fg">
            {String(progress).padStart(3, "0")}
          </span>
        </div>
        <div className="h-px w-full bg-line-2">
          <div
            className="h-px origin-left bg-fg"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Écran de chargement à l'arrivée, piloté par des étapes RÉELLES : page, polices,
 * modules 3D, premier rendu des deux scènes (shaders compilés). La barre suit leur
 * avancement pondéré (lissée, sans jamais dépasser le réel). Le rideau se lève quand
 * tout est prêt ET que l'animation du logo a eu le temps de se jouer.
 */
export function LoaderProvider({ children }: { children: ReactNode }) {
  const labels = useDict().loader;
  const [finished, setFinished] = useState<ReadonlySet<LoaderTask>>(
    () => new Set(),
  );
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;
  const finishedRef = useRef(finished);
  finishedRef.current = finished;

  const mark = useCallback((id: LoaderTask) => {
    setFinished((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Étapes suivies directement ici : page, polices, téléchargement des modules 3D.
  useEffect(() => {
    if (document.readyState === "complete") mark("page");
    else window.addEventListener("load", () => mark("page"), { once: true });
    document.fonts.ready.then(() => mark("fonts")).catch(() => mark("fonts"));
    import("@/components/three/hero-film-canvas")
      .then(() => mark("heroModule"))
      .catch(() => mark("heroModule"));
    import("@/components/three/car-canvas")
      .then(() => mark("carModule"))
      .catch(() => mark("carModule"));
  }, [mark]);

  // Barre lissée vers l'avancement réel + fin quand tout est prêt et la durée minimale écoulée.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* stockage indisponible : durée normale */
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const minMs = reduced ? 300 : seen ? 1400 : 2600;
    const start = performance.now();
    let shown = 0;
    let raf = 0;
    let closing = false;

    const tick = () => {
      const elapsed = performance.now() - start;
      const done = finishedRef.current;
      const real =
        TASKS.reduce((s, t) => s + (done.has(t.id) ? t.weight : 0), 0) / TOTAL;
      const timedOut = elapsed > SAFETY_MS;
      const target = timedOut ? 1 : real;
      // Lissage : on rattrape le réel en douceur, sans jamais le dépasser ni reculer.
      shown = Math.min(
        target,
        shown + Math.max(0.004, (target - shown) * 0.12),
      );
      setProgress(Math.round(shown * 100));

      if (!closing && shown >= 0.999 && elapsed >= minMs) {
        closing = true;
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* ignoré */
        }
        window.setTimeout(() => setDone(true), 350);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Défilement bloqué pendant le chargement.
  useEffect(() => {
    const html = document.documentElement;
    if (!done) {
      html.style.overflow = "hidden";
      lenisRef.current?.stop();
    } else {
      html.style.overflow = "";
      lenisRef.current?.start();
    }
  }, [done, lenis]);

  const step = useMemo(() => {
    const pending = TASKS.find((t) => !finished.has(t.id));
    return pending ? labels.steps[pending.id] : labels.ready;
  }, [finished, labels]);

  return (
    <SignalContext.Provider value={mark}>
      <ReadyContext.Provider value={done}>
        {children}
        <AnimatePresence>
          {done ? null : <LoaderScreen progress={progress} step={step} />}
        </AnimatePresence>
      </ReadyContext.Provider>
    </SignalContext.Provider>
  );
}
