"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { LoaderProvider } from "./loader";

/** Accélération puis décélération douces (easeInOutCubic) pour les sauts vers une section. */
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Décalage sous la barre de navigation, et durée du défilement doux (s). */
const OFFSET = -80;
const DURATION = 1.8;

/** Déplacement demandé par un bouton (chapitres du film…) ; défini par AnchorNav. */
let jump: (y: number) => void = (y) => window.scrollTo({ top: y });
export const scrollToY = (y: number) => jump(y);

/**
 * Déplacements par lien d'ancre ou par bouton : défilement doux et lent, SAUF si le
 * trajet traverse le film du héros (zone `[data-skip-on-jump]`). Le film défilerait
 * alors en accéléré, en flashs incompréhensibles : on fait un fondu au noir, on saute
 * sans le rejouer, puis on termine le trajet en douceur.
 */
function AnchorNav() {
  const lenis = useLenis();
  const [cover, setCover] = useState(false);
  useEffect(() => {
    if (!lenis) return;
    const smooth = (y: number, duration = DURATION) => lenis.scrollTo(y, { duration, easing: easeInOutCubic });
    const go = (y: number) => {
      const film = document.querySelector<HTMLElement>("[data-skip-on-jump]");
      const cur = window.scrollY;
      if (!film) return smooth(y);
      const top = film.getBoundingClientRect().top + cur;
      const end = top + film.offsetHeight - window.innerHeight;
      const lo = Math.min(cur, y);
      const hi = Math.max(cur, y);
      // Trajet hors du film, ou très court : défilement doux habituel.
      if (hi <= top + 2 || lo >= end - 2 || hi - lo < window.innerHeight * 0.6) return smooth(y);
      setCover(true);
      window.setTimeout(() => {
        // Saut jusqu'à la sortie du film côté cible (ou jusqu'à la cible si elle est dans le film).
        const landing = y > end ? Math.max(end + 1, y - window.innerHeight * 0.7) : y;
        lenis.scrollTo(landing, { immediate: true, force: true });
        window.dispatchEvent(new Event("herofilm:jump"));
        window.setTimeout(() => {
          setCover(false);
          if (landing !== y) smooth(y, 1.1);
        }, 90);
      }, 200);
    };
    jump = go;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!(a instanceof HTMLAnchorElement)) return;
      const id = decodeURIComponent(a.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (id && !el) return;
      e.preventDefault();
      go(el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY + OFFSET) : 0);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      jump = (y) => window.scrollTo({ top: y });
    };
  }, [lenis]);
  return (
    <AnimatePresence>
      {cover ? (
        <motion.div
          key="cut"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[85] bg-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        />
      ) : null}
    </AnimatePresence>
  );
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ReactLenis root options={{ lerp: 0.09 }} />
      <AnchorNav />
      <LoaderProvider>{children}</LoaderProvider>
    </MotionConfig>
  );
}
