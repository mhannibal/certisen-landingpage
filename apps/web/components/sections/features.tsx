"use client";

import { motion, useInView } from "motion/react";
import {
  BrainCircuit,
  Check,
  CloudDownload,
  Fingerprint,
  MousePointer2,
  Puzzle,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { Reveal, useNarrow } from "@/components/ui/blur-text";
import { Container, SectionHeading, SpotlightCard } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";
import { OtaVisual } from "./ota-visual";

/* ---------------- Preuve Rocq qui s'écrit ---------------- */
const PROOF: { k: string; r: string; dim?: boolean }[] = [
  { k: "Theorem", r: " deadline_ok :" },
  { k: "  forall", r: " f, In f flows ->" },
  { k: "  wcl", r: " cfg f <= D f." },
  { k: "Proof.", r: "" },
  { k: "  intros", r: " f Hf; apply tas_bound." },
  { k: "  -", r: " exact (gcl_window_ok p).", dim: true },
  { k: "  -", r: " lia.", dim: true },
  { k: "Qed.", r: "" },
];

function ProofVisual() {
  const v = useDict().features.visuals;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setN((v) => (v >= PROOF.length + 5 ? 0 : v + 1)), 420);
    return () => clearInterval(id);
  }, [inView]);
  const done = n >= PROOF.length;
  return (
    <div ref={ref} className="card-inset relative mt-6 flex flex-1 flex-col overflow-hidden rounded-lg font-mono md:mt-3 lg:mt-5">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span className="size-2 rounded-full bg-line-2" />
        <span className="size-2 rounded-full bg-line-2" />
        <span className="size-2 rounded-full bg-line-2" />
        <span className="ml-3 text-[11px] text-subtle">certisen_core/tas.v</span>
      </div>
      {/* Hauteur des 8 lignes réservée d'avance : la carte ne grandit pas pendant la frappe. */}
      <div className="min-h-[212px] flex-1 px-2.5 py-2.5 text-[11px] leading-6 sm:min-h-[248px] sm:px-4 sm:py-3 sm:text-[13px] sm:leading-7 md:min-h-[184px] md:py-2 md:text-[12px] md:leading-[21px]">
        {PROOF.slice(0, n).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre">
            <span className="mr-2.5 select-none text-[#444] sm:mr-4">{String(i + 1).padStart(2, " ")}</span>
            <span className={l.dim ? "text-subtle" : "text-fg"}>{l.k}</span>
            <span className="text-muted">{l.r}</span>
          </motion.div>
        ))}
        {!done ? <span className="ml-8 inline-block h-4 w-[7px] translate-y-0.5 animate-pulse bg-fg" /> : null}
      </div>
      {/* Bandeau toujours en place (seule son opacité change) : aucune variation de hauteur. */}
      <motion.div
        aria-hidden={!done}
        initial={false}
        animate={{ opacity: done ? 1 : 0, y: done ? 0 : 6 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-2 border-t border-line bg-fg px-4 py-2.5 text-[11px] text-ink sm:text-[12px]"
      >
        <Check className="size-4 shrink-0" /> <span className="truncate">{v.verified}</span>
      </motion.div>
    </div>
  );
}

/* ---------------- Liste de portes TAS (802.1Qbv) ---------------- */
const GCL: number[][] = [
  [0, 18],
  [18, 30],
  [30, 55],
  [55, 70],
  [70, 100],
  [0, 10, 70, 80],
  [10, 18, 80, 90],
  [90, 100],
];
function GclVisual() {
  const v = useDict().features.visuals;
  return (
    <div className="card-inset relative mt-5 rounded-lg p-3.5 sm:mt-6 sm:p-4 md:mt-2 md:p-2.5 lg:mt-6 lg:p-4">
      <div className="mb-3 flex justify-between md:hidden lg:flex font-mono text-[10px] uppercase tracking-wider text-subtle">
        <span>{v.gcl}</span>
        <span>{v.cycle}</span>
      </div>
      <div className="relative space-y-1.5 md:space-y-[3px] lg:space-y-1.5">
        {GCL.map((w, q) => (
          <div key={q} className="flex items-center gap-2">
            <span className="w-5 font-mono text-[10px] text-subtle md:text-[9px] md:leading-[6px] lg:text-[10px] lg:leading-normal">q{7 - q}</span>
            <div className="relative h-2.5 flex-1 rounded-sm bg-[#1a1a1a] md:h-1.5 lg:h-2.5">
              {Array.from({ length: w.length / 2 }).map((_, k) => (
                <span
                  key={k}
                  className={`absolute inset-y-0 rounded-sm ${q < 2 ? "bg-fg" : q < 5 ? "bg-[#8a8a8a]" : "bg-[#4a4a4a]"}`}
                  style={{ left: `${w[k * 2]}%`, width: `${w[k * 2 + 1]! - w[k * 2]!}%` }}
                />
              ))}
            </div>
          </div>
        ))}
        <span className="absolute -inset-y-1 left-7 right-0">
          <span className="absolute inset-y-0 w-px animate-sweep bg-fg" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- Éditeur visuel de topologie ---------------- */
function DesignVisual() {
  const v = useDict().features.visuals;
  return (
    <div className="card-inset bg-dots relative mt-5 h-32 overflow-hidden rounded-lg sm:mt-6 sm:h-40 md:mt-2 md:h-auto md:min-h-16 md:flex-1 lg:mt-6 lg:min-h-28">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 160" fill="none">
        <motion.path
          d="M60 80 L150 45 L240 80 L150 120 Z M150 45 L150 120"
          stroke="#6e6e6e"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 1.6 }}
        />
        {[[60, 80], [150, 45], [240, 80], [150, 120]].map(([x, y], i) => (
          <motion.rect
            key={i}
            x={x! - 8}
            y={y! - 8}
            width="16"
            height="16"
            rx="3"
            fill="#0a0a0a"
            stroke="#fafafa"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 20 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </svg>
      <motion.div
        className="absolute"
        animate={{ left: ["22%", "48%", "74%", "48%", "22%"], top: ["42%", "22%", "44%", "68%", "42%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <MousePointer2 className="size-4 fill-fg text-fg" />
        <span className="ml-4 rounded bg-fg px-1.5 py-0.5 text-[10px] font-medium text-ink">{v.precertified}</span>
      </motion.div>
    </div>
  );
}

/* ---------------- Cybersécurité ---------------- */
function CyberVisual() {
  return (
    <div className="card-inset relative mt-5 grid h-28 place-items-center overflow-hidden rounded-lg sm:mt-6 sm:h-32 md:mt-2 md:h-auto md:min-h-16 md:flex-1 lg:mt-6 lg:min-h-28">
      <div className="grid grid-cols-8 gap-x-2 gap-y-1 opacity-50">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="font-mono text-[10px] text-subtle">
            {((i * 7919) % 16).toString(16)}
            {((i * 104729) % 16).toString(16)}
          </span>
        ))}
      </div>
      <span className="absolute grid size-12 place-items-center rounded-lg border border-line-2 bg-card text-fg">
        <Fingerprint className="size-6" strokeWidth={1.5} />
      </span>
      <span className="absolute inset-x-0 h-px animate-scan bg-fg/60" />
    </div>
  );
}

/* ---------------- Écosystème ---------------- */
function EcosystemVisual() {
  const tools = useDict().features.visuals.eco;
  return (
    <div className="relative mt-5 grid h-36 place-items-center [--eco-r:72px] sm:mt-6 sm:h-40 md:mt-2 md:h-auto md:min-h-[6.5rem] md:flex-1 md:[--eco-r:44px] lg:mt-6 lg:min-h-36 lg:[--eco-r:72px]">
      <div className="absolute size-36 animate-[spin_30s_linear_infinite] rounded-full border border-dashed border-line-2 md:size-[88px] lg:size-36">
        {tools.map((t, i) => (
          <span
            key={t}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `rotate(${i * 90}deg) translate(var(--eco-r)) rotate(${-i * 90}deg)` }}
          >
            <span className="block animate-[spin_30s_linear_infinite_reverse] whitespace-nowrap rounded-md border border-line-2 bg-card px-2 py-1 text-[10px] text-muted md:px-1.5 md:py-0.5 md:text-[9px] lg:px-2 lg:py-1 lg:text-[10px]">
              {t}
            </span>
          </span>
        ))}
      </div>
      <span className="grid size-14 place-items-center rounded-xl bg-fg text-ink md:size-10 md:rounded-lg lg:size-14 lg:rounded-xl">
        <LogoMark size={30} animate={false} cutout="#fafafa" />
      </span>
    </div>
  );
}

/**
 * Carrousel de la plateforme (téléphone ; bento dès la tablette), d'après le composant « Gallery4 » de 21st.dev recréé sans
 * dépendance : défilement natif aimanté, flèches, points cliquables, glisser à la souris.
 * Les arrêts tiennent compte de la fin de piste (plusieurs cartes visibles sur grand écran).
 */
function useCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const snapsRef = useRef<number[]>([0]);
  const [snaps, setSnaps] = useState<number[]>([0]);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ prev: false, next: true });
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);

  const nearest = (x: number) => {
    const list = snapsRef.current;
    return list.reduce((b, v, i) => (Math.abs(v - x) < Math.abs(list[b]! - x) ? i : b), 0);
  };
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setIndex(nearest(el.scrollLeft));
    setEdges({ prev: el.scrollLeft > 4, next: el.scrollLeft < max - 4 });
  }, []);
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const max = el.scrollWidth - el.clientWidth;
    const list: number[] = [];
    for (const c of Array.from(el.children) as HTMLElement[]) {
      const x = Math.min(max, Math.max(0, c.offsetLeft - pad));
      if (!list.some((v) => Math.abs(v - x) < 4)) list.push(x);
    }
    snapsRef.current = list.length ? list : [0];
    setSnaps(snapsRef.current);
    onScroll();
  }, [onScroll]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [measure, onScroll]);

  const go = useCallback((i: number) => {
    const list = snapsRef.current;
    ref.current?.scrollTo({ left: list[Math.max(0, Math.min(list.length - 1, i))], behavior: "smooth" });
  }, []);

  // Glisser à la souris (le doigt et le pavé tactile défilent nativement).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0 || el.scrollWidth <= el.clientWidth + 1) return;
    const x0 = e.clientX;
    const left0 = el.scrollLeft;
    moved.current = false;
    const onMove = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved.current && Math.abs(dx) > 5) {
        moved.current = true;
        setDragging(true);
        window.getSelection()?.removeAllRanges();
      }
      if (moved.current) el.scrollLeft = left0 - dx;
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved.current) return;
      // La carte suivante (ou précédente) dans le sens du geste.
      const dx = ev.clientX - x0;
      const cur = el.scrollLeft;
      const list = snapsRef.current;
      const ahead = dx < 0 ? list.filter((v) => v >= cur - 2) : list.filter((v) => v <= cur + 2);
      const target = ahead.length ? (dx < 0 ? Math.min(...ahead) : Math.max(...ahead)) : list[nearest(cur)]!;
      el.scrollTo({ left: target, behavior: "smooth" });
      window.setTimeout(() => setDragging(false), 450);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const onClickCapture = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (!moved.current) return;
    e.preventDefault();
    e.stopPropagation();
    moved.current = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      go(index + (e.key === "ArrowLeft" ? -1 : 1));
    }
  };
  return { ref, snaps, index, edges, dragging, go, onPointerDown, onClickCapture, onKeyDown };
}

function Feature({
  icon: Icon,
  title,
  text,
  children,
  className,
  delay = 0,
  show,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children: ReactNode;
  /** Place dans le bento du PC. */
  className?: string;
  delay?: number;
  /** Carrousel : apparition quand la piste entre dans la vue (une carte hors champ n'est jamais « visible »). */
  show?: boolean;
}) {
  return (
    <Reveal delay={delay} show={show} className={`w-[84%] max-w-[340px] shrink-0 snap-start sm:w-[340px] md:w-auto md:max-w-none ${className ?? ""}`}>
      {/* Toutes les cartes du bento suivent la même disposition : texte en haut, visuel en
          dessous qui occupe le reste de la carte (les cartes larges ont juste plus de place). */}
      <SpotlightCard className="flex h-full flex-col p-4 sm:p-6 md:p-3.5 lg:p-6">
        {/* Texte : glisse légèrement au survol (comme le bento d'Aceternity). */}
        <div className="transition-transform duration-300 md:group-hover:translate-x-1">
          <div className="md:flex md:items-center md:gap-2 lg:block">
            <Icon className="size-5 shrink-0 text-fg md:size-4 lg:size-5" strokeWidth={1.5} />
            <h3 className="mt-4 text-base font-medium tracking-tight text-fg sm:mt-5 sm:text-lg md:mt-0 md:text-[14px] md:leading-tight lg:mt-5 lg:text-lg lg:leading-normal">{title}</h3>
          </div>
          <p className="mt-1.5 max-w-[36rem] text-[13px] leading-relaxed text-muted sm:mt-2 sm:text-sm md:mt-1 md:text-[12px] md:leading-[1.35] lg:mt-2 lg:text-sm lg:leading-relaxed">
            {text}
          </p>
        </div>
        <div className="mt-auto flex min-h-0 flex-1 flex-col justify-end">{children}</div>
      </SpotlightCard>
    </Reveal>
  );
}

/** Marge de la piste : alignée sur le contenu de la page, la piste déborde jusqu'au bord droit. */
const TRACK =
  "px-[max(1.25rem,calc((100%_-_1200px)/2_+_1.25rem))] scroll-px-[max(1.25rem,calc((100%_-_1200px)/2_+_1.25rem))] sm:px-[max(1.5rem,calc((100%_-_1200px)/2_+_1.5rem))] sm:scroll-px-[max(1.5rem,calc((100%_-_1200px)/2_+_1.5rem))]";

export function Features() {
  const t = useDict().features;
  const it = t.items;
  const c = useCarousel();
  // Carrousel sur téléphone (< 768 px) ; dès la tablette, le bento.
  const carousel = useNarrow(767);
  const inView = useInView(c.ref, { once: true, margin: "-80px" });
  const show = carousel ? inView : undefined;
  return (
    <section id="plateforme" className="bg-fade relative py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading index="04" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

      </Container>

      <div
        ref={c.ref}
        role="region"
        aria-roledescription="carousel"
        aria-label={t.eyebrow}
        tabIndex={0}
        onPointerDown={c.onPointerDown}
        onClickCapture={c.onClickCapture}
        onKeyDown={c.onKeyDown}
        className={`relative mt-10 flex gap-3 overflow-x-auto pb-2 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${TRACK} md:mx-auto md:mt-10 md:grid md:max-w-[1200px] md:grid-flow-dense md:grid-cols-2 md:grid-rows-[repeat(4,14rem)] md:gap-3 lg:mt-16 lg:gap-4 md:overflow-visible md:px-6 md:pb-0 lg:grid-cols-3 lg:grid-rows-none lg:auto-rows-[28.5rem] xl:grid-cols-4 ${
          c.dragging ? "snap-none select-none" : "snap-x snap-mandatory"
        }`}
      >
        {/* Bento, rangées de hauteur fixe — tablette (2 colonnes × 4 rangées, tout tient dans un écran ; les
            grandes cartes prennent deux rangées, en zigzag) : [preuve | IA] [preuve | conception] [cyber | OTA]
            [écosystème | OTA] ; PC 3 colonnes : [preuve ×2 | IA] [conception | OTA ×2] [cyber ×2 | écosystème] ;
            PC 4 colonnes : [preuve ×2 | IA | conception] [cyber | écosystème | OTA ×2]. */}
        <Feature show={show} className="md:row-span-2 lg:col-span-2 lg:row-span-1" icon={ShieldCheck} title={it.proof.title} text={it.proof.text}>
          <ProofVisual />
        </Feature>
        <Feature show={show} delay={0.06} icon={BrainCircuit} title={it.ai.title} text={it.ai.text}>
          <GclVisual />
        </Feature>
        <Feature show={show} delay={0.12} icon={Workflow} title={it.design.title} text={it.design.text}>
          <DesignVisual />
        </Feature>
        <Feature show={show} delay={carousel ? 0.18 : 0.08} className="md:col-start-2 md:row-span-2 lg:col-span-2 lg:col-start-auto lg:row-span-1 xl:col-start-3" icon={CloudDownload} title={it.ota.title} text={it.ota.text}>
          <OtaVisual />
        </Feature>
        <Feature show={show} delay={carousel ? 0.24 : 0.12} className="lg:col-span-2 xl:col-span-1" icon={Fingerprint} title={it.cyber.title} text={it.cyber.text}>
          <CyberVisual />
        </Feature>
        <Feature show={show} delay={carousel ? 0.3 : 0.16} icon={Puzzle} title={it.eco.title} text={it.eco.text}>
          <EcosystemVisual />
        </Feature>
      </div>

      {/* Points cliquables : un par arrêt du carrousel (téléphone). */}
      <div className="mt-6 flex justify-center gap-1 md:hidden">
        {c.snaps.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${t.goTo} ${i + 1}`}
            aria-current={i === c.index}
            onClick={() => c.go(i)}
            className="group grid h-6 cursor-pointer place-items-center px-0.5"
          >
            <span
              className={`block h-1 rounded-full transition-all duration-300 ${i === c.index ? "w-5 bg-fg" : "w-1.5 bg-line-2 group-hover:bg-subtle"}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
