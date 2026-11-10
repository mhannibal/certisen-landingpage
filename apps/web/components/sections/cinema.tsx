"use client";

import dynamic from "next/dynamic";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  Check,
  ChevronDown,
  CircleDot,
  MousePointerClick,
  X,
} from "lucide-react";
import { NODE_ICON } from "@/components/three/node-icons";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { NODES, nodeById } from "@/lib/car-network";
import { smoothstep } from "@/lib/network";
import { SectionLabel } from "@/components/ui/primitives";
import { useDict, useI18n } from "@/lib/i18n/provider";
import { useLoaderSignal } from "@/components/loader";
import { TsnGraph } from "./tsn-graph";
import { WebGLGuard } from "@/components/three/webgl-guard";

const CarCanvas = dynamic(() => import("@/components/three/car-canvas"), {
  ssr: false,
});
// Sans WebGL : la voiture de profil en SVG, tirée de la même géométrie.
const CarFallback = dynamic(() => import("@/components/three/car-fallback"), {
  ssr: false,
});

/** Plans du montage : numéro et plage d'avancement (les textes viennent du dictionnaire). */
const SHOTS = [
  { n: "01", range: [0.0, 0.24] },
  { n: "02", range: [0.26, 0.5] },
  { n: "03", range: [0.52, 0.76] },
  { n: "04", range: [0.78, 1.0] },
] as const;

const IDLE_MS = 5000;

/** 0 : voiture entière puis démontage · 1 : réseau visible · 2 : chemin critique certifié · 3 : tout certifié. */
const stageOf = (p: number) => (p < 0.2 ? 0 : p < 0.58 ? 1 : p < 0.82 ? 2 : 3);

const EASE = [0.22, 1, 0.36, 1] as const;

/** Index du plan courant d'après l'avancement du défilement. */
const shotOf = (p: number) =>
  SHOTS.reduce((acc, s, i) => (p >= s.range[0] - 0.01 ? i : acc), 0);

/** Contenu « plan » : compteur qui défile, 4 segments, titre masqué et texte en fondu. */
function ShotContent({ index }: { index: number }) {
  const shots = useDict().cinema.shots;
  const shot = shots[index]!;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="flex font-mono text-[11px] text-subtle">
          <span className="relative inline-block h-[1.2em] w-[2ch] overflow-hidden text-fg">
            <AnimatePresence initial={false}>
              <motion.span
                key={index}
                className="absolute inset-0"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                {SHOTS[index]!.n}
              </motion.span>
            </AnimatePresence>
          </span>
          &nbsp;/ 04
        </span>
        <span className="flex flex-1 gap-1">
          {SHOTS.map((s, i) => (
            <span
              key={s.n}
              className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-line-2"
            >
              <motion.span
                className="absolute inset-0 origin-left bg-fg"
                initial={false}
                animate={{ scaleX: i <= index ? 1 : 0 }}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                  delay: i === index ? 0.1 : 0,
                }}
              />
            </span>
          ))}
        </span>
      </div>
      <div className="px-4 py-3.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index} initial="hidden" animate="show" exit="exit">
            <h3 className="overflow-hidden text-lg font-medium leading-snug tracking-tight text-fg">
              <motion.span
                className="block"
                variants={{
                  hidden: { y: "110%" },
                  show: { y: 0, transition: { duration: 0.5, ease: EASE } },
                  exit: {
                    y: "-110%",
                    transition: { duration: 0.22, ease: "easeIn" },
                  },
                }}
              >
                {shot.title}
              </motion.span>
            </h3>
            <motion.p
              className="mt-1 text-[13px] leading-relaxed text-muted"
              variants={{
                hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
                show: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.45, delay: 0.12, ease: EASE },
                },
                exit: { opacity: 0, transition: { duration: 0.18 } },
              }}
            >
              {shot.text}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Contenu « composant » : apparaît par étapes une fois la carte agrandie. */
function NodeContent({
  id,
  stage,
  onClose,
}: {
  id: string;
  stage: number;
  onClose: () => void;
}) {
  const { dict, intl } = useI18n();
  const c = dict.cinema;
  const n = nodeById(id);
  const txt = dict.car[n.id];
  const Icon = NODE_ICON[n.id];
  const certified = stage >= 3 || (stage >= 2 && n.critical);
  const ratio = Math.min(1, n.flow.bound / n.flow.deadline);
  const fmt = (v: number) =>
    v.toLocaleString(intl, { maximumFractionDigits: 2 });
  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  };
  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
      }}
    >
      <motion.div
        variants={item}
        className="flex items-start justify-between gap-4 border-b border-line p-4"
      >
        <div className="flex items-start gap-3">
          <span className="card-inset grid size-9 shrink-0 place-items-center rounded-md text-fg">
            <Icon className="size-4" strokeWidth={1.6} />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
              {txt.role}
            </p>
            <p className="mt-0.5 text-[15px] font-medium text-fg">{txt.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={c.close}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </motion.div>

      <ul className="hidden space-y-1.5 px-4 pt-3.5 lg:block">
        {txt.facts.map((f) => (
          <motion.li
            key={f}
            variants={item}
            className="flex gap-2.5 text-[13px] text-muted"
          >
            <CircleDot className="mt-0.5 size-3.5 shrink-0 text-subtle" />
            {f}
          </motion.li>
        ))}
      </ul>

      <motion.div variants={item} className="p-4">
        <p className="text-xs text-muted">{txt.flow}</p>
        <div className="mt-2.5 h-1.5 w-full bg-line">
          <motion.div
            className={certified ? "h-full bg-fg" : "hatch h-full"}
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-subtle">
          <span>
            {c.worstCase} {fmt(n.flow.bound)} ms
          </span>
          <span>
            {c.deadline} {fmt(n.flow.deadline)} ms
          </span>
        </div>
        <div
          className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
            certified ? "bg-fg text-ink" : "border border-line-2 text-muted"
          }`}
        >
          {certified ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            <span className="size-1.5 animate-pulse rounded-full bg-muted" />
          )}
          {certified ? c.certified : c.pending}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Carte unique : sous-titre du plan, qui s'agrandit en douceur (hauteur et largeur
 * animées par ressort) pour devenir la fiche du composant cliqué, puis se rétracte.
 */
function InfoCard({
  shot,
  selected,
  stage,
  onClose,
}: {
  shot: number;
  selected: string | null;
  stage: number;
  onClose: () => void;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height, maxWidth: selected ? 380 : 320 }}
      transition={{ type: "spring", stiffness: 240, damping: 30, mass: 0.9 }}
      className="pointer-events-auto w-full overflow-hidden rounded-lg border border-line-2 bg-card/85 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.9)] backdrop-blur-md"
    >
      <div ref={inner}>
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <NodeContent
              key={`node-${selected}`}
              id={selected}
              stage={stage}
              onClose={onClose}
            />
          ) : (
            <ShotContent key="shot" index={shot} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const label = useDict().cinema.scroll;
  const opacity = useTransform(progress, [0, 0.9, 0.97], [1, 1, 0]);
  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none flex flex-col items-center gap-2 text-muted"
    >
      <span className="relative flex h-8 w-5 justify-center rounded-full border border-muted/70">
        <motion.span
          className="mt-1.5 h-1.5 w-[3px] rounded-full bg-fg"
          animate={{ y: [0, 9, 0], opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
        {label}
      </span>
      <ChevronDown className="size-3.5 animate-bounce" />
    </motion.div>
  );
}

/** Plage de défilement de la transformation des boutons en cartes du graphe. */
const MORPH_FROM = 0.82;
const MORPH_TO = 0.92;
const MORPH_STAGGER = 0.004;
const MORPH_END = MORPH_TO + MORPH_STAGGER * 8;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Copies des boutons de la voiture qui glissent jusqu'à la place de leur nœud dans le
 * graphe et s'étirent pour devenir la carte (fondu de l'aspect « bouton » vers « carte »).
 * Positions lues à chaque image : départ = bouton projeté depuis la 3D, arrivée = carte SVG.
 */
function NodeMorph({
  progress,
  container,
}: {
  progress: MotionValue<number>;
  container: RefObject<HTMLDivElement | null>;
}) {
  const d = useDict();
  const els = useRef<Record<string, HTMLDivElement | null>>({});
  const [active, setActive] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    const a = p > MORPH_FROM - 0.005 && p < MORPH_END + 0.005;
    setActive((prev) => (prev === a ? prev : a));
  });

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const c = container.current?.getBoundingClientRect();
      const p = progress.get();
      NODES.forEach((n, i) => {
        const el = els.current[n.id];
        const a = document
          .querySelector(
            `[data-marker-id="${n.id}"] button > span:not(.absolute)`,
          )
          ?.getBoundingClientRect();
        const b = document
          .querySelector(`[data-graph-node="${n.id}"]`)
          ?.getBoundingClientRect();
        if (!el || !c || !a || !b) return;
        const t = easeInOut(
          smoothstep(
            MORPH_FROM + i * MORPH_STAGGER,
            MORPH_TO + i * MORPH_STAGGER,
            p,
          ),
        );
        const isSwitch = n.kind === "switch";
        el.style.transform = `translate3d(${mix(a.left, b.left, t) - c.left}px, ${mix(a.top, b.top, t) - c.top}px, 0)`;
        el.style.width = `${mix(a.width, b.width, t)}px`;
        el.style.height = `${mix(a.height, b.height, t)}px`;
        el.style.borderRadius = `${mix(isSwitch ? 6 : a.height / 2, (6 * b.height) / 46, t)}px`;
        el.style.setProperty("--t", t.toFixed(3));
        el.style.setProperty("--s", (b.height / 46).toFixed(3));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, container, progress]);

  if (!active) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[15]">
      {NODES.map((n) => {
        const Icon = NODE_ICON[n.id];
        const isSwitch = n.kind === "switch";
        return (
          <div
            key={n.id}
            ref={(el) => void (els.current[n.id] = el)}
            className="absolute left-0 top-0 overflow-hidden will-change-transform"
            style={{ ["--t" as string]: 0, ["--s" as string]: 1 }}
          >
            {/* Aspect « bouton » (identique au marqueur 3D), qui s'efface */}
            <div
              className={`absolute inset-0 grid place-items-center border ${
                isSwitch
                  ? "border-fg bg-fg text-ink"
                  : "border-fg/80 bg-ink/90 text-fg"
              }`}
              style={{ opacity: "calc(1 - var(--t))", borderRadius: "inherit" }}
            >
              <Icon className="size-3.5" strokeWidth={isSwitch ? 2.2 : 1.9} />
            </div>
            {/* Aspect « carte » du graphe, qui apparaît */}
            <div
              className="absolute inset-0 border border-[#363636] bg-[#151515]"
              style={{ opacity: "var(--t)", borderRadius: "inherit" }}
            >
              <span
                className="absolute inset-y-0 left-0 w-[4px] rounded-full"
                style={{ background: n.critical ? "#fafafa" : "#6e6e6e" }}
              />
              <div
                className="absolute left-0 top-0 flex origin-top-left items-center gap-2 whitespace-nowrap"
                style={{
                  transform: "scale(var(--s))",
                  width: "204px",
                  height: "46px",
                  paddingLeft: "12px",
                }}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line-2 bg-ink text-fg">
                  <Icon className="size-3.5" strokeWidth={1.8} />
                </span>
                <span
                  className="flex flex-col"
                  style={{
                    opacity: "clamp(0, calc((var(--t) - 0.55) * 2.5), 1)",
                  }}
                >
                  <span className="text-[12px] font-medium leading-tight text-fg">
                    {d.car[n.id].name}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-subtle">
                    {d.car[n.id].role}
                  </span>
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Cinema() {
  const c = useDict().cinema;
  const onSceneReady = useLoaderSignal("carScene");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  });
  const bar = useTransform(progress, [0, 1], ["0%", "100%"]);
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const [shot, setShot] = useState(0);
  // Dernier plan : la scène 3D s'efface, le graphe du réseau TSN prend sa place.
  const sceneOpacity = useTransform(progress, [0.82, 0.9], [1, 0]);
  const graphOpacity = useTransform(progress, [0.86, 0.94], [0, 1]);
  const [graphOn, setGraphOn] = useState(false);
  // Pendant la transformation : boutons d'origine masqués, cartes du graphe masquées.
  const [morphing, setMorphing] = useState(false);
  const [graphNodesOn, setGraphNodesOn] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    const g = p >= 0.88;
    setGraphOn((prev) => (prev === g ? prev : g));
    const mo = p > MORPH_FROM;
    setMorphing((prev) => (prev === mo ? prev : mo));
    const gn = p >= MORPH_END;
    setGraphNodesOn((prev) => (prev === gn ? prev : gn));
    const s = stageOf(p);
    setStage((prev) => (prev === s ? prev : s));
    const k = Math.max(0, shotOf(p));
    setShot((prev) => (prev === k ? prev : k));
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (stage === 0) setSelected(null);
  }, [stage]);

  /* Invitation « Cliquez sur un composant » : seulement après 5 s sans aucune action,
     tant que la section est à l'écran et que personne n'a encore cliqué. */
  const stickyRef = useRef<HTMLDivElement>(null);
  const onScreen = useInView(stickyRef, { amount: 0.6 });
  const [hasClicked, setHasClicked] = useState(false);
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!onScreen || hasClicked) return;
    let timer = 0;
    let lastY = window.scrollY;
    const arm = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    // Un vrai défilement déplace la page de plusieurs pixels ; on ignore les micro-ajustements
    // du navigateur (ancrage du défilement quand une section change de hauteur).
    const onScroll = () => {
      if (Math.abs(window.scrollY - lastY) < 8) return;
      lastY = window.scrollY;
      arm();
    };
    arm();
    // Le simple survol à la souris ne compte pas : c'est justement là que l'invitation aide.
    const events = ["wheel", "pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
      window.removeEventListener("scroll", onScroll);
      setIdle(false);
    };
  }, [onScreen, hasClicked]);
  const showHint = idle && onScreen && !hasClicked && !selected && stage >= 1;

  return (
    <section id="montage" ref={ref} className="relative h-[460vh]">
      <div ref={stickyRef} className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div
          style={{ opacity: sceneOpacity }}
          className={`absolute inset-0 ${graphOn ? "pointer-events-none" : ""}`}
        >
          <WebGLGuard
            onFallback={onSceneReady}
            fallback={<CarFallback className="absolute inset-0 z-0 pt-24" />}
          >
            <CarCanvas
              onReady={onSceneReady}
              progress={progress}
              stage={stage}
              selected={selected}
              onSelect={(id) => {
                setHasClicked(true);
                setSelected((cur) => (cur === id ? null : id));
              }}
              className="absolute inset-0 isolate z-0"
              markersHidden={morphing}
            />
          </WebGLGuard>
        </motion.div>

        <NodeMorph progress={progress} container={stickyRef} />

        {/* Graphe des nœuds du réseau TSN (dernier plan) */}
        <motion.div
          style={{ opacity: graphOpacity }}
          className={`absolute inset-x-0 bottom-72 top-36 z-10 mx-auto grid max-w-[1200px] items-center px-6 lg:bottom-28 lg:top-32 lg:grid-cols-[360px_1fr] lg:gap-8 ${
            graphOn ? "" : "pointer-events-none"
          }`}
        >
          <div className="hidden lg:block" />
          <TsnGraph
            visible={graphOn}
            nodesHidden={!graphNodesOn}
            certified={stage >= 3}
            selected={selected}
            onSelect={(id) => {
              setHasClicked(true);
              setSelected((cur) => (cur === id ? null : id));
            }}
          />
        </motion.div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

        {/* en-tête */}
        <div className="pointer-events-none absolute inset-x-0 top-28 mx-auto flex max-w-[1200px] items-start justify-between gap-4 px-6">
          <SectionLabel index="05">{c.eyebrow}</SectionLabel>
          <AnimatePresence>
            {showHint ? (
              <motion.span
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 rounded-md border border-line-2 bg-card px-3 py-1.5 text-xs text-fg shadow-[0_8px_24px_rgb(0_0_0/0.6)]"
              >
                <MousePointerClick className="size-3.5 animate-pulse text-fg" />
                {c.hint}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* carte unique : sous-titre du plan, qui s'agrandit en fiche du composant cliqué */}
        <div className="pointer-events-none absolute inset-x-0 bottom-40 top-40 z-20 mx-auto flex max-w-[1200px] flex-col justify-end px-6 lg:justify-start">
          <InfoCard
            shot={shot}
            selected={selected}
            stage={stage}
            onClose={() => setSelected(null)}
          />
        </div>

        {/* bas : indicateur de défilement + chapitres */}
        <div className="absolute inset-x-0 bottom-6 mx-auto max-w-[1200px] px-6">
          <div className="mb-4 flex justify-center">
            <ScrollHint progress={progress} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {SHOTS.map((s, i) => (
              <span
                key={s.n}
                className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
              >
                {s.n} · {c.shots[i]!.title}
              </span>
            ))}
          </div>
          <div className="mt-2 h-px w-full bg-line">
            <motion.div style={{ width: bar }} className="h-px bg-fg" />
          </div>
        </div>
      </div>
    </section>
  );
}
