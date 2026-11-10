"use client";

import { type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { BlurText, Reveal } from "./blur-text";

/* ------------------------------------------------------------------ */
/* Boutons                                                              */
/* ------------------------------------------------------------------ */
export function PrimaryButton({ children, className, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      className={`group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fg px-5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-white/85 ${className ?? ""}`}
    >
      {children}
    </a>
  );
}

export function SecondaryButton({ children, className, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      className={`group inline-flex h-11 items-center gap-2 rounded-lg border border-line-2 bg-card px-5 text-sm font-medium text-fg transition-colors duration-200 hover:border-subtle hover:bg-card-2 ${className ?? ""}`}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Carte avec reflet discret qui suit la souris (effet « spotlight »)   */
/* ------------------------------------------------------------------ */
/** Classes à ajouter à une carte pour l'effet spotlight (avec `onMouseMove={trackSpotlight}` et `<SpotlightGlow />`). */
export const SPOTLIGHT = "group relative overflow-hidden transition-colors duration-300 hover:border-line-2";

/** Suit la souris : position du halo dans la carte survolée. */
export function trackSpotlight(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--x", `${e.clientX - r.left}px`);
  el.style.setProperty("--y", `${e.clientY - r.top}px`);
}

/** Halo blanc très léger centré sur la souris, visible au survol de la carte. */
export function SpotlightGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(380px_circle_at_var(--x)_var(--y),rgb(255_255_255/0.05),transparent_60%)]"
    />
  );
}

export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div onMouseMove={trackSpotlight} className={`card rounded-xl ${SPOTLIGHT} ${className ?? ""}`}>
      <SpotlightGlow />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* En-tête de section éditorial : numéro, titre à gauche, texte à droite */
/* ------------------------------------------------------------------ */
export function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
      <span className="text-fg">{index}</span>
      <span className="h-px w-8 bg-line-2" />
      {children}
    </span>
  );
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  accent,
  description,
}: {
  index: string;
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
}) {
  return (
    <div className="grid gap-5 sm:gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Reveal>
          <SectionLabel index={index}>{eyebrow}</SectionLabel>
        </Reveal>
        <h2 className="mt-4 text-balance text-[1.875rem] font-medium leading-[1.08] tracking-[-0.035em] text-fg sm:mt-6 sm:text-5xl sm:leading-[1.05] lg:text-[3.5rem]">
          <BlurText text={title} />
          {accent ? (
            <>
              {/[　-鿿＀-￯]$/.test(title) ? null : " "}
              <BlurText text={accent} delay={0.15} wordClassName="text-subtle" />
            </>
          ) : null}
        </h2>
      </div>
      {description ? (
        <Reveal delay={0.15} className="flex items-end lg:col-span-5">
          <p className="max-w-md text-pretty text-[15px] leading-relaxed text-muted sm:text-base lg:ml-auto">{description}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Défilement infini                                                    */
/* ------------------------------------------------------------------ */
export function Marquee({ children, duration = 50 }: { children: ReactNode; duration?: number }) {
  return (
    <div className="group relative flex overflow-hidden [--gap:4rem] [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div
        style={{ ["--duration" as string]: `${duration}s` }}
        className="flex w-max shrink-0 animate-marquee items-center gap-[var(--gap)] pr-[var(--gap)] group-hover:[animation-play-state:paused]"
      >
        {children}
        {/* Copie pour la boucle : ignorée par les lecteurs d'écran et le clavier. */}
        <div aria-hidden inert className="contents">
          {children}
        </div>
      </div>
    </div>
  );
}

/* Point d'état */
export function StatusDot() {
  return (
    <span className="relative inline-flex size-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fg opacity-40" />
      <span className="relative inline-flex size-1.5 rounded-full bg-fg" />
    </span>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-6 ${className ?? ""}`}>{children}</div>;
}
