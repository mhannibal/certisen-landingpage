"use client";

import dynamic from "next/dynamic";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTime,
  useTransform,
  type MotionValue,
  type Variants,
} from "motion/react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  CloudDownload,
  Cpu,
  Disc3,
  Factory,
  Gauge,
  LoaderCircle,
  Network,
  Package,
  PackageCheck,
  Radar,
  Route,
  ShieldBan,
  ShieldCheck,
  Siren,
  SquareTerminal,
  Syringe,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { LogoMark } from "@/components/logo";
import { useLoaderSignal, useReady } from "@/components/loader";
import { scrollToY } from "@/components/smooth-scroll";
import { WebGLGuard } from "@/components/three/webgl-guard";
import { PrimaryButton, SecondaryButton, StatusDot } from "@/components/ui/primitives";
import {
  FILM,
  FLOWS,
  INTRO,
  LATENCY,
  LATENCY_BOUND,
  LATENCY_DEADLINE,
  LATENCY_STATS,
  PACKAGES,
  deployOf,
  downloadOf,
  heroLayout,
  win,
} from "@/lib/hero-film";
import { NODES } from "@/lib/car-network";
import type { MarkerMap } from "@/components/three/hero-film-canvas";
import { useDict } from "@/lib/i18n/provider";

const HeroFilmCanvas = dynamic(() => import("@/components/three/hero-film-canvas"), { ssr: false });

type Range = readonly [number, number];

/** Fenêtres d'affichage des cartes, calées sur les jalons de la scène (lib/hero-film). */
const CARDS = {
  assembly: [0.006, 0.075],
  ota: [0.082, 0.172],
  inProgress: [0.176, 0.248],
  certified: [0.252, 0.318],
  deploy: [0.322, 0.372],
  safety: [0.376, 0.588],
  flows: [0.592, 0.662],
  monitor: [0.666, 0.742],
  cyber: [0.746, 0.842],
  latency: [0.846, 0.93],
  finale: [0.948, 2],
} satisfies Record<string, Range>;
const TOTAL = 9;

/** Chapitres du film : début, point d'arrivée au clic, icône. */
const CHAPTERS: { at: number; go: number; Icon: LucideIcon }[] = [
  { at: 0, go: 0.04, Icon: Factory },
  { at: 0.078, go: 0.135, Icon: CloudDownload },
  { at: 0.174, go: 0.27, Icon: ShieldCheck },
  { at: 0.32, go: 0.35, Icon: PackageCheck },
  { at: 0.374, go: 0.405, Icon: Clock3 },
  { at: 0.59, go: 0.625, Icon: Network },
  { at: 0.664, go: 0.705, Icon: Gauge },
  { at: 0.744, go: 0.79, Icon: ShieldBan },
  { at: 0.844, go: 0.9, Icon: Activity },
  { at: 0.945, go: 0.985, Icon: Route },
];

/** Apparition / disparition d'un élément selon l'avancement (avec flou, comme un fondu de montage). */
function useFade(progress: MotionValue<number>, [a, b]: Range, d = 0.015) {
  const input = [a, a + d, b - d, b];
  const opacity = useTransform(progress, input, [0, 1, 1, 0]);
  return {
    opacity,
    y: useTransform(progress, input, [24, 0, 0, -24]),
    filter: useTransform(progress, input, ["blur(8px)", "blur(0px)", "blur(0px)", "blur(8px)"]),
    visibility: useTransform(opacity, (o) => (o < 0.01 ? "hidden" : "visible")),
  };
}

/** Passe de 0 à 1 juste après l'instant `at` (apparition d'une coche, d'un état…). */
const useAfter = (progress: MotionValue<number>, at: number, d = 0.004) => useTransform(progress, [at, at + d], [0, 1]);

const EASE = [0.22, 1, 0.36, 1] as const;

type Step = { at: number; index?: number; eyebrow?: string; title: string; text: string; body?: ReactNode };

/**
 * Panneau unique à gauche (en bas sur mobile) : il reste en place pendant tout le
 * film, s'agrandit ou se réduit selon l'étape, et seul son contenu change.
 */
function StoryPanel({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm;
  const steps: Step[] = [
    { at: 0, eyebrow: t.assembly.eyebrow, title: t.assembly.title, text: t.assembly.text },
    { at: CARDS.ota[0], index: 0, title: t.ota.title, text: t.ota.text, body: <OtaPanel progress={progress} /> },
    { at: CARDS.inProgress[0], index: 1, title: t.inProgress.title, text: t.inProgress.text, body: <InProgressPanel progress={progress} /> },
    { at: CARDS.certified[0], index: 2, title: t.certified.title, text: t.certified.text, body: <CertifiedPanel progress={progress} /> },
    { at: CARDS.deploy[0], index: 3, title: t.deploy.title, text: t.deploy.text, body: <DeployPanel progress={progress} /> },
    { at: CARDS.safety[0], index: 4, title: t.safety.title, text: t.safety.text, body: <SafetyPanel progress={progress} /> },
    { at: CARDS.flows[0], index: 5, title: t.flows.title, text: t.flows.text, body: <FlowList progress={progress} /> },
    { at: CARDS.monitor[0], index: 6, title: t.monitor.title, text: t.monitor.text, body: <MonitorPanel /> },
    { at: CARDS.cyber[0], index: 7, title: t.cyber.title, text: t.cyber.text, body: <CyberPanel progress={progress} /> },
    { at: CARDS.latency[0], index: 8, title: t.latency.title, text: t.latency.text, body: <LatencyChart progress={progress} /> },
  ];
  const [step, setStep] = useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    const k = steps.reduce((acc, st, i) => (p >= st.at - 0.004 ? i : acc), 0);
    setStep((prev) => (prev === k ? prev : k));
  });
  // Le panneau entre au début du film et sort avant le final.
  const input = [0.002, 0.012, CARDS.latency[1] - 0.008, CARDS.latency[1] + 0.006];
  const opacity = useTransform(progress, input, [0, 1, 1, 0]);
  const y = useTransform(progress, input, [24, 0, 0, 24]);
  const visibility = useTransform(opacity, (o) => (o < 0.01 ? "hidden" : "visible"));
  // Sur mobile et tablette (panneau en bas), le détail de chaque étape est replié :
  // la voiture reste visible ; « Détails » le déplie.
  const [details, setDetails] = useState(false);
  // Hauteur suivie au pixel près, animée à chaque changement de contenu.
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number>();
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Place prise en bas de l'écran (panneau + marge) : la caméra cadre la voiture au-dessus.
  useEffect(() => {
    const update = () => {
      heroLayout.bottom = window.innerWidth < 1024 && h ? h + (window.innerWidth < 640 ? 12 : 96) : 0;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [h]);
  const s = steps[step]!;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end px-3 pb-3 sm:px-8 sm:pb-24 lg:items-center lg:px-12 lg:pb-0">
      <motion.div style={{ opacity, y, visibility }} className="card w-full overflow-hidden rounded-xl sm:w-[380px] lg:w-[400px]">
        <motion.div animate={{ height: h ?? "auto" }} transition={{ duration: 0.55, ease: EASE }}>
          <div ref={inner} className="p-3.5 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
              {s.index === undefined ? (
                <span className="flex items-center gap-2 text-muted">
                  <Factory className="size-3.5" strokeWidth={1.6} /> {s.eyebrow}
                </span>
              ) : (
                <span>
                  <span className="text-fg">0{s.index + 1}</span> / 0{TOTAL}
                </span>
              )}
              {/* Avancement : une marque par événement */}
              <span className="flex gap-1">
                {Array.from({ length: TOTAL }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      s.index === i ? "w-4 bg-fg" : s.index !== undefined && i < s.index ? "w-1.5 bg-muted" : "w-1.5 bg-line-2"
                    }`}
                  />
                ))}
              </span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.26, ease: EASE }}
              >
                <h3 className="mt-1.5 text-base font-medium tracking-tight text-fg sm:text-lg lg:mt-3 lg:text-2xl">{s.title}</h3>
                <p className="mt-1 text-[12.5px] leading-snug text-muted lg:mt-2 lg:text-sm lg:leading-relaxed">{s.text}</p>
                {s.body ? <div className={`mt-3 lg:mt-5 ${details ? "" : "hidden lg:block"}`}>{s.body}</div> : null}
              </motion.div>
            </AnimatePresence>
            {s.body ? (
              <button
                type="button"
                aria-expanded={details}
                onClick={() => setDetails((v) => !v)}
                className="pointer-events-auto mt-2 inline-flex cursor-pointer items-center gap-1 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-subtle transition-colors hover:text-fg lg:hidden"
              >
                {details ? t.hideDetails : t.showDetails}
                <ChevronDown className={`size-3.5 transition-transform duration-300 ${details ? "rotate-180" : ""}`} />
              </button>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Points du réseau cliquables : la scène 3D place chaque repère sur son nœud
 * (MarkerMap) ; au survol ou au clic, une étiquette dit ce que c'est.
 */
function NodeMarkers({ markers }: { markers: RefObject<MarkerMap> }) {
  const d = useDict();
  const [open, setOpen] = useState<string | null>(null);
  // Nœuds du réseau, puis paquets de conduite autonome (repères « pkg-0 » à « pkg-2 »).
  const items = [
    ...NODES.map((n) => ({ id: n.id as string, name: d.car[n.id].name, role: d.car[n.id].role })),
    ...PACKAGES.map((pkg, i) => ({
      id: `pkg-${i}`,
      name: `${d.heroFilm.ota.packages[i]} · v${pkg.version}`,
      role: d.heroFilm.ota.kind,
    })),
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((n) => {
        const { name, role } = n;
        return (
          <div
            key={n.id}
            ref={(el) => {
              if (el) markers.current.set(n.id, el);
              else markers.current.delete(n.id);
            }}
            data-on="0"
            className="group pointer-events-auto absolute left-0 top-0 transition-opacity duration-300 data-[on=0]:pointer-events-none data-[on=0]:opacity-0"
          >
            <button
              type="button"
              aria-label={name}
              aria-pressed={open === n.id}
              onClick={() => setOpen((o) => (o === n.id ? null : n.id))}
              className="absolute -left-3.5 -top-3.5 size-7 cursor-pointer rounded-full ring-1 ring-transparent transition-shadow hover:ring-fg/50 focus-visible:outline-none focus-visible:ring-fg"
            />
            <div
              className={`pointer-events-none absolute left-4 top-[-14px] whitespace-nowrap rounded-md border border-line-2 bg-ink/85 px-2 py-1 backdrop-blur-sm transition-opacity duration-200 ${
                open === n.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <p className="text-[11px] font-medium leading-tight text-fg">{name}</p>
              <p className="font-mono text-[9.5px] uppercase leading-tight tracking-[0.1em] text-subtle">{role}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Coche ronde qui apparaît. */
function Tick({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.span style={{ opacity }} className="grid size-5 shrink-0 place-items-center rounded-full bg-fg text-ink">
      <Check className="size-3" strokeWidth={3} />
    </motion.span>
  );
}

/** Barre qui se remplit. */
function Bar({ value, className = "h-1" }: { value: MotionValue<number>; className?: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-full bg-ink-2 ${className}`}>
      <motion.span className="absolute inset-0 origin-left rounded-full bg-fg" style={{ scaleX: value }} />
    </span>
  );
}

/* ---------------- 1. Mise à jour OTA ---------------- */
function OtaPanel({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.ota;
  const pending = useAfter(progress, FILM.download[1] + 0.004, 0.008);
  return (
    <div className="space-y-3">
      <ul className="card-inset space-y-3 rounded-lg p-4">
        {PACKAGES.map((pkg, i) => (
          <OtaRow key={pkg.node} progress={progress} i={i} name={t.packages[i]!} version={pkg.version} />
        ))}
      </ul>
      <motion.p style={{ opacity: pending }} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        <LoaderCircle className="size-3.5 animate-spin" /> {t.pending}
      </motion.p>
    </div>
  );
}
function OtaRow({ progress, i, name, version }: { progress: MotionValue<number>; i: number; name: string; version: string }) {
  const [a, b] = downloadOf(i);
  const fill = useTransform(progress, [a, b], [0, 1]);
  const done = useAfter(progress, b);
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <Package className="size-4 text-muted" strokeWidth={1.6} />
      <div>
        <div className="flex justify-between text-[13px] text-fg">
          <span>{name}</span>
          <span className="font-mono text-[11px] text-subtle">v{version}</span>
        </div>
        <Bar value={fill} className="mt-1 h-1" />
      </div>
      <Tick opacity={done} />
    </li>
  );
}

/* ---------------- 2. Certification en cours ---------------- */
function InProgressPanel({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.inProgress;
  const [a, b] = FILM.scan;
  const scan = useTransform(progress, [a, b], [0, 1]);
  const pct = useTransform(scan, (v) => `${Math.round(v * 100)} %`);
  return (
    <div className="space-y-3">
      <div className="card-inset rounded-lg p-3">
        <div className="flex justify-between font-mono text-[11px] text-subtle">
          <span>{t.scope}</span>
          <motion.span className="text-fg">{pct}</motion.span>
        </div>
        <Bar value={scan} className="mt-2 h-1" />
      </div>
      <ul className="space-y-2">
        {t.steps.map((s, i) => (
          <Step key={s} progress={progress} at={a + ((i + 1) / t.steps.length) * (b - a) - 0.003} label={s} />
        ))}
      </ul>
    </div>
  );
}
function Step({ progress, at, label }: { progress: MotionValue<number>; at: number; label: string }) {
  const done = useAfter(progress, at);
  const busy = useTransform(done, (v) => 1 - v);
  return (
    <li className="flex items-center gap-3 text-[13px]">
      <span className="grid size-5 shrink-0">
        <motion.span style={{ opacity: busy }} className="grid place-items-center text-subtle [grid-area:1/1]">
          <LoaderCircle className="size-4 animate-spin" />
        </motion.span>
        <motion.span style={{ opacity: done }} className="grid place-items-center rounded-full bg-fg text-ink [grid-area:1/1]">
          <Check className="size-3" strokeWidth={3} />
        </motion.span>
      </span>
      <span className="text-fg">{label}</span>
    </li>
  );
}

/* ---------------- 3. Certifié par CertiSen ---------------- */
function CertifiedPanel({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.certified;
  const [a, b] = FILM.emblem;
  const scale = useTransform(progress, [a, b], [1.5, 1]);
  const rotate = useTransform(progress, [a, b], [-10, 0]);
  const opacity = useTransform(progress, [a, a + 0.012], [0, 1]);
  return (
    <motion.div style={{ scale, rotate, opacity }} className="card-inset flex items-center gap-4 rounded-lg p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-fg text-ink">
        <LogoMark size={26} animate={false} cutout="var(--color-fg)" />
      </span>
      <div>
        <p className="font-medium text-fg">{t.badge}</p>
        <p className="font-mono text-[11px] text-subtle">{t.proof}</p>
        <p className="mt-0.5 font-mono text-[11px] text-subtle">{t.id} · CS-2026-0412</p>
      </div>
    </motion.div>
  );
}

/* ---------------- 4. Déploiement ---------------- */
function DeployPanel({ progress }: { progress: MotionValue<number> }) {
  const d = useDict();
  const t = d.heroFilm.deploy;
  const active = useAfter(progress, deployOf(PACKAGES.length - 1)[1], 0.006);
  return (
    <div className="space-y-3">
      <ul className="card-inset space-y-2.5 rounded-lg p-4">
        {PACKAGES.map((pkg, i) => (
          <DeployRow key={pkg.node} progress={progress} i={i} name={d.heroFilm.ota.packages[i]!} target={d.car[pkg.node].name} />
        ))}
      </ul>
      <motion.p style={{ opacity: active }} className="inline-flex items-center gap-1.5 rounded-md bg-fg px-2 py-1 text-[12px] font-medium text-ink">
        <ShieldCheck className="size-3.5" strokeWidth={2.2} /> {t.active}
      </motion.p>
    </div>
  );
}
function DeployRow({ progress, i, name, target }: { progress: MotionValue<number>; i: number; name: string; target: string }) {
  const [a, b] = deployOf(i);
  const go = useTransform(progress, [a, b], [0.35, 1]);
  const done = useAfter(progress, b - 0.002);
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]">
      <motion.span style={{ opacity: go }} className="flex min-w-0 items-center gap-2 text-fg">
        <Package className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />
        {name}
        <ArrowRight className="size-3 shrink-0 text-subtle" />
        <span className="truncate text-muted">{target}</span>
      </motion.span>
      <Tick opacity={done} />
    </li>
  );
}

/* ---------------- 5. Sûreté temporelle garantie ---------------- */
function SafetyPanel({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.safety;
  const [p1, p2] = FILM.pulse;
  const [a1, b1] = p1!;
  const [a2, b2] = p2!;
  const end = `${LATENCY_BOUND * 100}%`;
  // La commande traverse la chaîne une fois à l'arrêt, puis une fois sur la route.
  const marker = useTransform(progress, [a1, b1, a2 - 0.001, a2, b2], ["0%", end, end, "0%", end]);
  const done = useAfter(progress, b1 - 0.002, 0.006);
  const standstill = useTransform(progress, [b1, b1 + 0.004], [0.3, 1]);
  const road = useTransform(progress, [FILM.stop - 0.004, FILM.stop + 0.002], [0.3, 1]);
  const step = (b1 - a1) / 4;
  return (
    <div className="space-y-3">
      <div className="card-inset rounded-lg p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {t.stages.map((s, i) => (
            <Stage key={s} progress={progress} at={a1 + i * step} label={s} />
          ))}
        </div>
        <div className="relative mt-5 h-2 rounded-full bg-ink-2">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-fg" style={{ width: marker }} />
          <span className="absolute -top-1.5 bottom-[-6px] right-0 w-px bg-muted" />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-subtle">
          <motion.span style={{ opacity: done }} className="text-fg">
            {LATENCY_BOUND} ms · {t.worst}
          </motion.span>
          <span>
            {LATENCY_DEADLINE} ms · {t.deadline}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-[12px]">
        <motion.span style={{ opacity: standstill }} className="inline-flex items-center gap-1.5 rounded-md border border-line-2 px-2 py-1 text-fg">
          <Check className="size-3.5" strokeWidth={3} /> {t.standstill}
        </motion.span>
        <motion.span style={{ opacity: road }} className="inline-flex items-center gap-1.5 rounded-md bg-fg px-2 py-1 font-medium text-ink">
          <Radar className="size-3.5" strokeWidth={2} /> {t.road}
        </motion.span>
      </div>
    </div>
  );
}
function Stage({ progress, at, label }: { progress: MotionValue<number>; at: number; label: string }) {
  const opacity = useTransform(progress, [at, at + 0.003], [0.35, 1]);
  return (
    <motion.span style={{ opacity }} className="rounded-md border border-line-2 px-1 py-1.5 text-[11px] text-fg">
      {label}
    </motion.span>
  );
}

/* ---------------- 6. Tous les flux respectent leurs échéances ---------------- */
const FLOW_ICONS = [Radar, Cpu, Network, Disc3];
function FlowList({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.flows;
  return (
    <ul className="space-y-2.5">
      {t.rows.map((name, i) => (
        <FlowRow key={name} progress={progress} i={i} name={name} unit={t.unit} Icon={FLOW_ICONS[i]!} {...FLOWS[i]!} />
      ))}
    </ul>
  );
}
function FlowRow({
  progress,
  i,
  name,
  bound,
  deadline,
  unit,
  Icon,
}: {
  progress: MotionValue<number>;
  i: number;
  name: string;
  bound: number;
  deadline: number;
  unit: string;
  Icon: LucideIcon;
}) {
  const start = 0.6 + i * 0.012;
  const fill = useTransform(progress, [start, start + 0.016], [0, bound / deadline]);
  const ok = useAfter(progress, start + 0.014);
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <Icon className="size-4 text-muted" strokeWidth={1.6} />
      <div>
        <div className="flex justify-between gap-2 text-[13px] text-fg">
          <span>{name}</span>
          <span className="shrink-0 font-mono text-[11px] text-subtle">
            {bound} / {deadline} {unit}
          </span>
        </div>
        <Bar value={fill} className="mt-1 h-1" />
      </div>
      <Tick opacity={ok} />
    </li>
  );
}

/* ---------------- 7. Paramètres surveillés ---------------- */
function MonitorPanel() {
  const t = useDict().heroFilm.monitor;
  return (
    <div className="space-y-3">
      <Monitored name={t.switching} symbol="σ" phase={0} ok={t.ok} />
      <Monitored name={t.sync} symbol="δ" phase={1.9} ok={t.ok} />
      <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">{t.footer}</p>
    </div>
  );
}
/** Une grandeur surveillée : formule |x| < borne, et sa valeur en direct sous la borne. */
function Monitored({ name, symbol, phase, ok }: { name: string; symbol: string; phase: number; ok: string }) {
  const time = useTime();
  const width = useTransform(time, (ms) => `${54 + 16 * Math.sin(ms / 420 + phase) + 4 * Math.sin(ms / 133 + phase * 2)}%`);
  return (
    <div className="card-inset rounded-lg p-4">
      {/* Formule sur une seule ligne ; l'état « dans la borne » passe sous la jauge. */}
      <p className="whitespace-nowrap font-mono text-[13px] text-fg lg:text-sm">
        |{name}| <span className="text-muted">&lt;</span> <span className="font-serif text-base italic">{symbol}</span>
      </p>
      <div className="relative mt-6 h-2 rounded-full bg-ink-2">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-fg" style={{ width }} />
        <span className="absolute -top-1.5 bottom-[-6px] left-[86%] w-px bg-muted" />
        <span className="absolute -top-5 left-[86%] -translate-x-1/2 font-serif text-[13px] italic text-muted">{symbol}</span>
      </div>
      <p className="mt-2.5 flex items-center justify-end gap-1 text-[11px] text-muted">
        <Check className="size-3" strokeWidth={3} /> {ok}
      </p>
    </div>
  );
}

/* ---------------- 8. Cybersécurité garantie ---------------- */
type CyberState = 0 | 1 | 2;
/** État d'une menace selon l'avancement : surveillée, détectée, bloquée. */
function useCyberState(progress: MotionValue<number>, detected: number, blocked: number) {
  const [s, setS] = useState<CyberState>(0);
  useMotionValueEvent(progress, "change", (p) => {
    const k: CyberState = p >= blocked ? 2 : p >= detected ? 1 : 0;
    setS((prev) => (prev === k ? prev : k));
  });
  return s;
}
function CyberPanel({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.cyber;
  const rows = [
    { ...t.rows[0]!, Icon: Cpu, start: FILM.rogue[0], detected: FILM.isolate - 0.006, blocked: FILM.isolate + 0.003 },
    { ...t.rows[1]!, Icon: Syringe, start: FILM.injection[0], detected: FILM.shield - 0.003, blocked: FILM.shield + 0.005 },
  ];
  // Journal du moniteur : une ligne par événement de la scène.
  const logAt = [FILM.rogue[0] + 0.003, FILM.isolate - 0.006, FILM.isolate + 0.003, FILM.injection[0] + 0.003, FILM.shield - 0.003, FILM.shield + 0.005];
  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <CyberRow key={r.k} progress={progress} {...r} labels={t} />
        ))}
      </ul>
      <div className="card-inset hidden rounded-lg p-3 font-mono text-[10.5px] leading-relaxed sm:block">
        <p className="mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-subtle">
          <SquareTerminal className="size-3" /> {t.logTitle}
        </p>
        {t.log.map((line, i) => (
          <LogLine key={i} progress={progress} at={logAt[i]!} text={line} strong={i === 2 || i === 5} />
        ))}
      </div>
    </div>
  );
}
function LogLine({ progress, at, text, strong }: { progress: MotionValue<number>; at: number; text: string; strong: boolean }) {
  const opacity = useTransform(progress, [at, at + 0.003], [0, 1]);
  const x = useTransform(progress, [at, at + 0.003], [-6, 0]);
  return (
    <motion.p style={{ opacity, x }} className={strong ? "text-fg" : "text-muted"}>
      <span className="text-subtle">› </span>
      {text}
    </motion.p>
  );
}
function CyberRow({
  progress,
  k,
  d,
  Icon,
  start,
  detected,
  blocked,
  labels,
}: {
  progress: MotionValue<number>;
  k: string;
  d: string;
  Icon: LucideIcon;
  start: number;
  detected: number;
  blocked: number;
  labels: { watching: string; detected: string; blocked: string };
}) {
  const state = useCyberState(progress, detected, blocked);
  // La ligne s'éclaire quand sa menace entre en scène.
  const active = useTransform(progress, [start, start + 0.004], [0.45, 1]);
  const steps = [labels.watching, labels.detected, labels.blocked];
  const StateIcon = state === 2 ? ShieldBan : state === 1 ? Siren : Activity;
  return (
    <motion.li style={{ opacity: active }} className="card-inset rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <Icon className="size-4 text-muted" strokeWidth={1.6} /> {k}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${
              state === 2 ? "bg-fg font-medium text-ink" : state === 1 ? "border border-fg text-fg" : "border border-line-2 text-muted"
            }`}
          >
            <StateIcon className="size-3" strokeWidth={2.2} /> {steps[state]}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted">{d}</p>
      {/* Surveillé → détecté → bloqué */}
      <div className="mt-2.5 grid grid-cols-3 gap-1">
        {steps.map((s, i) => (
          <span key={s} className={`h-1 rounded-full transition-colors duration-500 ${i <= state ? "bg-fg" : "bg-ink-2"}`} />
        ))}
      </div>
    </motion.li>
  );
}

/* ---------------- 9. Latence au fil du temps (simulation) ---------------- */
function LatencyChart({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.latency;
  const draw = useTransform(progress, [FILM.trail[0], FILM.trail[1]], [0, 1]);
  const stats = useTransform(progress, [FILM.trail[1] - 0.01, FILM.trail[1]], [0, 1]);
  const W = 340;
  const H = 130;
  const yOf = (ms: number) => H - (ms / 1.2) * H;
  const d = LATENCY.map((v, i) => `${i ? "L" : "M"}${((i / (LATENCY.length - 1)) * W).toFixed(1)} ${yOf(v).toFixed(1)}`).join(" ");
  return (
    <div className="card-inset rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-subtle">
        <span>{t.unit}</span>
        <span className="rounded border border-line-2 px-1.5 py-0.5">{t.sim}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={g * H} y2={g * H} stroke="var(--color-line)" strokeWidth={1} />
        ))}
        <line x1={0} x2={W} y1={yOf(LATENCY_DEADLINE)} y2={yOf(LATENCY_DEADLINE)} stroke="var(--color-muted)" strokeWidth={1.2} />
        <line
          x1={0}
          x2={W}
          y1={yOf(LATENCY_BOUND)}
          y2={yOf(LATENCY_BOUND)}
          stroke="var(--color-subtle)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <motion.path d={d} fill="none" stroke="var(--color-fg)" strokeWidth={1.6} strokeLinejoin="round" style={{ pathLength: draw }} />
      </svg>
      <div className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-subtle">
        <span>
          — {t.deadline} {LATENCY_DEADLINE} ms
        </span>
        <span>
          - - {t.bound} {LATENCY_BOUND} ms
        </span>
        <span>{t.axis} →</span>
      </div>
      <motion.div style={{ opacity: stats }} className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[12px]">
        <span className="text-muted">
          {t.max} <span className="font-mono text-fg">{LATENCY_STATS.max.toFixed(2)} ms</span>
        </span>
        <span className="text-muted">
          {t.mean} <span className="font-mono text-fg">{LATENCY_STATS.mean.toFixed(2)} ms</span>
        </span>
      </motion.div>
    </div>
  );
}

/* ---------------- Final ---------------- */
function Finale({ progress }: { progress: MotionValue<number> }) {
  const t = useDict().heroFilm.finale;
  const style = useFade(progress, CARDS.finale, 0.02);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
      <motion.div
        style={style}
        className="flex max-w-2xl flex-col items-center rounded-3xl bg-[radial-gradient(closest-side,rgb(10_10_10/0.8),transparent)] px-4 py-10 text-center sm:px-10 sm:py-14"
      >
        <LogoMark size={44} animate={false} className="text-fg" />
        <h2 className="mt-6 text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[1.02] tracking-[-0.04em] text-fg">
          {t.title1}
          <br />
          <span className="text-muted">{t.title2}</span>
        </h2>
        <p className="mt-4 max-w-md text-muted">{t.text}</p>
        <PrimaryButton href="#contact" className="pointer-events-auto mt-8">
          {t.cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </PrimaryButton>
      </motion.div>
    </div>
  );
}

/* ---------------- Chapitres ---------------- */
function Chapters({
  progress,
  intro,
  section,
}: {
  progress: MotionValue<number>;
  intro: MotionValue<number>;
  section: RefObject<HTMLElement | null>;
}) {
  const shown = useTransform(intro, [0.55, 0.9], [0, 1]);
  const labels = useDict().heroFilm.chapters;
  const [current, setCurrent] = useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    const c = CHAPTERS.reduce((acc, ch, i) => (p >= ch.at ? i : acc), 0);
    setCurrent((prev) => (prev === c ? prev : c));
  });
  const go = (p: number) => {
    const el = section.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = top + (INTRO + p * (1 - INTRO)) * (el.offsetHeight - window.innerHeight);
    scrollToY(y);
  };
  return (
    <motion.div style={{ opacity: shown }} className="absolute inset-x-0 bottom-5 mx-auto hidden max-w-[1280px] grid-cols-10 gap-2.5 px-6 md:grid">
      {CHAPTERS.map((ch, i) => (
        <ChapterButton
          key={ch.at}
          progress={progress}
          from={ch.at}
          to={CHAPTERS[i + 1]?.at ?? 1}
          label={labels[i]!}
          Icon={ch.Icon}
          on={i === current}
          onClick={() => go(ch.go)}
        />
      ))}
    </motion.div>
  );
}
function ChapterButton({
  progress,
  from,
  to,
  label,
  Icon,
  on,
  onClick,
}: {
  progress: MotionValue<number>;
  from: number;
  to: number;
  label: string;
  Icon: LucideIcon;
  on: boolean;
  onClick: () => void;
}) {
  const fill = useTransform(progress, [from, to], [0, 1]);
  return (
    <button type="button" onClick={onClick} title={label} className="group flex min-w-0 cursor-pointer flex-col gap-2 text-left">
      <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-line-2">
        <motion.span style={{ scaleX: fill }} className="absolute inset-0 origin-left bg-fg" />
      </span>
      <span
        className={`flex min-w-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-500 group-hover:text-fg ${on ? "text-fg" : "text-subtle"}`}
      >
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}

/** Texte avec passages mis en avant : [[…]] est souligné et en blanc (SDV, OTA). */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(/\[\[(.+?)\]\]/).map((part, i) =>
        i % 2 ? (
          <span key={i} className="text-fg underline decoration-fg/50 decoration-1 underline-offset-[5px]">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

const INTRO_ITEM: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

/**
 * Intro du héros : badge, titre, accroche et boutons sur la constellation du
 * réseau. Au défilement, le texte s'efface pendant que l'atelier s'allume.
 */
function IntroOverlay({ intro }: { intro: MotionValue<number> }) {
  const d = useDict();
  const h = d.hero;
  // Les entrées démarrent quand l'écran de chargement se lève.
  const ready = useReady();
  const input = [0, 0.3, 0.6];
  const opacity = useTransform(intro, input, [1, 1, 0]);
  const y = useTransform(intro, input, [0, 0, -40]);
  const filter = useTransform(intro, input, ["blur(0px)", "blur(0px)", "blur(10px)"]);
  const visibility = useTransform(opacity, (o) => (o < 0.01 ? "hidden" : "visible"));
  return (
    <>
      {/* Voile à gauche pour la lisibilité du texte */}
      <motion.div
        style={{ opacity }}
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(10_10_10/0.85)_0%,rgb(10_10_10/0.55)_35%,transparent_70%)]"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center px-6 lg:px-12">
        <motion.div style={{ opacity, y, filter, visibility }} className="mx-auto w-full max-w-[1200px]">
          <motion.div
            initial="hidden"
            animate={ready ? "show" : "hidden"}
            variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
            className="max-w-3xl"
          >
            <motion.p
              variants={INTRO_ITEM}
              className="inline-flex items-center gap-3 rounded-full border border-line-2 bg-card py-1 pl-1 pr-3.5 text-xs text-muted"
            >
              <span className="rounded-full bg-fg px-2.5 py-0.5 font-medium text-ink">2026</span>
              {h.badge}
            </motion.p>
            <motion.h1
              variants={INTRO_ITEM}
              className="mt-6 text-[clamp(2.4rem,6vw,5rem)] font-medium leading-[1] tracking-[-0.045em] text-fg sm:mt-8"
            >
              {h.title1}
              <br />
              <span className="text-subtle">{h.title2}</span>
            </motion.h1>
            <motion.p variants={INTRO_ITEM} className="mt-4 max-w-[34rem] text-pretty text-[15px] leading-relaxed text-muted sm:mt-6 sm:text-lg">
              {/* Repli sur l'accroche d'origine si le dictionnaire chargé est plus ancien. */}
              <Marked text={d.heroFilm.lead ?? h.lead} />
            </motion.p>
            <motion.div variants={INTRO_ITEM} className="pointer-events-auto mt-6 flex flex-wrap items-center gap-3 sm:mt-9">
              <PrimaryButton href="#contact">
                {h.cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </PrimaryButton>
              <SecondaryButton href="#solution">
                <StatusDot /> {h.secondary}
              </SecondaryButton>
            </motion.div>
            {/* Repères clés : niveau de confiance, premier périmètre, preuves */}
            <motion.dl
              variants={INTRO_ITEM}
              className="mt-8 grid max-w-3xl grid-cols-3 border-t border-line sm:mt-16"
            >
              {h.facts.map((f, i) => (
                <div key={f.k} className={`py-3 pr-2 sm:py-5 sm:pr-6 ${i > 0 ? "border-l border-line pl-3 sm:pl-6" : ""}`}>
                  <dt className="font-mono text-[9.5px] uppercase leading-snug tracking-[0.12em] text-subtle sm:text-[11px] sm:tracking-[0.14em]">{f.k}</dt>
                  <dd className="mt-1 text-[13px] leading-snug text-fg sm:mt-1.5 sm:text-[15px]">{f.v}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

/**
 * Héros du site : film au
 * défilement. Assemblage, mise à jour OTA, certification CertiSen, déploiement,
 * sûreté temporelle, échéances, paramètres surveillés, cybersécurité, latence, final.
 */
export function HeroFilm() {
  const t = useDict().heroFilm;
  const onSceneReady = useLoaderSignal("heroScene");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.6 });
  // Le début du défilement joue l'intro, la suite joue le film.
  const intro = useTransform(progress, [0, INTRO], [0, 1]);
  const film = useTransform(progress, [INTRO, 1], [0, 1]);
  const hint = useTransform(intro, [0, 0.15], [1, 0]);
  // Écran large (≥ 640 px), lu après le montage : le rendu serveur et le premier rendu client concordent.
  const wide = useMotionValue(0);
  useEffect(() => {
    const f = () => wide.set(window.innerWidth >= 640 ? 1 : 0);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [wide]);
  const hintPoints = useTransform([film, intro, wide], ([p, ip, w]) => {
    const f = p as number;
    const i = ip as number;
    // Pendant l'intro, seulement sur écran large : sur mobile, le texte de l'intro occupe le haut.
    const inIntro = (w as number) * (1 - Math.min(1, f / 0.035)) * Math.min(1, i / 0.15 + 0.4);
    return Math.max(inIntro, ...FILM.network.map(([a, b]) => win(f, a, b, 0.01)));
  });
  const markers = useRef<MarkerMap>(new Map());
  useEffect(() => {
    const onJump = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      progress.jump(Math.min(1, Math.max(0, (window.scrollY - top) / (el.offsetHeight - window.innerHeight))));
    };
    window.addEventListener("herofilm:jump", onJump);
    return () => window.removeEventListener("herofilm:jump", onJump);
  }, [progress]);
  const bar = useTransform(progress, [0, 1], [0, 1]);

  return (
    <section ref={ref} id="top" data-skip-on-jump aria-label={t.label} className="relative h-[1300vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <WebGLGuard onFallback={onSceneReady} fallback={<div className="absolute inset-0 bg-dots opacity-60" />}>
          <HeroFilmCanvas progress={film} intro={intro} markers={markers} onReady={onSceneReady} className="absolute inset-0" />
        </WebGLGuard>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ink to-transparent" />

        <motion.div
          style={{ opacity: hintPoints }}
          className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-subtle"
        >
          {t.hint}
        </motion.div>
        <NodeMarkers markers={markers} />
        <IntroOverlay intro={intro} />
        <StoryPanel progress={film} />
        <Finale progress={film} />

        <motion.div
          style={{ opacity: hint }}
          className="pointer-events-none absolute inset-x-0 bottom-20 flex flex-col items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
        >
          {t.scroll}
          <ChevronDown className="size-4 animate-bounce" />
        </motion.div>

        <Chapters progress={film} intro={intro} section={ref} />
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-line md:hidden">
          <motion.div style={{ scaleX: bar }} className="h-full origin-left bg-fg" />
        </div>
      </div>
    </section>
  );
}
