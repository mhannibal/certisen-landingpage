"use client";

import { BrandLogo, LOGOS, type LogoFile } from "@/components/ui/brand-logo";
import { Marquee } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";

type Item =
  | { kind: "logo"; label: string; file: LogoFile; href: string; height: string }
  | { kind: "text"; label: string; href: string };

/**
 * Écosystème technique : logos officiels quand ils existent et sont utilisables,
 * sinon le nom en police à chasse fixe (normes IEEE : logo réservé à l'IEEE ;
 * OMNeT++ : pas de logo image officiel). Défilement continu, pause au survol.
 */
const ITEMS: Item[] = [
  { kind: "logo", label: "Inria", file: LOGOS.inria, href: "https://www.inria.fr", height: "h-7" },
  // Le logo Rocq doit renvoyer vers le site de Rocq (conditions d'utilisation du logo).
  { kind: "logo", label: "Rocq", file: LOGOS.rocq, href: "https://rocq-prover.org", height: "h-6" },
  { kind: "text", label: "IEEE 802.1 TSN", href: "https://1.ieee802.org/tsn/" },
  { kind: "text", label: "OMNeT++", href: "https://omnetpp.org" },
  { kind: "logo", label: "INET Framework", file: LOGOS.inet, href: "https://inet.omnetpp.org", height: "h-9" },
];

export function TrustStrip() {
  const t = useDict().trust;
  return (
    // Seule section qui garde ses traits de séparation (bandeau de confiance).
    <section className="relative border-y border-line bg-ink-2">
      <div className="mx-auto grid max-w-[1200px] items-center gap-4 px-5 py-6 sm:gap-6 sm:px-6 sm:py-7 md:grid-cols-[max-content_minmax(0,1fr)] md:gap-10">
        {/* Toujours deux lignes : chaque moitié reste sur une ligne, la colonne s'adapte. */}
        <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-subtle">
          <span className="block whitespace-nowrap">{t.label[0]}</span>
          <span className="block whitespace-nowrap">{t.label[1]}</span>
        </p>
        {/* Liste doublée : une copie couvre toujours toute la largeur, la boucle reste sans raccord. */}
        <Marquee duration={40}>
          {[...ITEMS, ...ITEMS].map((it, i) => (
            <a
              key={`${it.label}-${i}`}
              href={it.href}
              target="_blank"
              rel="noreferrer"
              aria-hidden={i >= ITEMS.length || undefined}
              tabIndex={i >= ITEMS.length ? -1 : undefined}
              className="flex h-9 shrink-0 items-center text-muted transition-colors duration-300 hover:text-fg"
            >
              {it.kind === "logo" ? (
                <BrandLogo file={it.file} label={it.label} className={it.height} />
              ) : (
                <span className="whitespace-nowrap font-mono text-[13px] tracking-[0.04em]">{it.label}</span>
              )}
            </a>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
