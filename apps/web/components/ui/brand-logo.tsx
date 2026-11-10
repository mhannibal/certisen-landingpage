import type { CSSProperties } from "react";

/** Fichier de logo : chemin, dimensions et zone utile (sans les marges transparentes). */
export type LogoFile = {
  src: string;
  width: number;
  height: number;
  /** Zone opaque [x0, y0, x1, y1] en pixels du fichier ; tout le fichier par défaut. */
  crop?: readonly [number, number, number, number];
};

/**
 * Logo de partenaire affiché en monochrome : le fichier (PNG ou SVG à fond
 * transparent) sert de masque, la couleur vient du texte (`currentColor`).
 * Le logo suit donc la palette noir et blanc du site et les états de survol.
 * Les marges transparentes du fichier sont retirées (centrage optique exact).
 * En mode « couleurs forcées » (contraste élevé), le masque est ignoré par le
 * navigateur : on affiche alors le nom en texte.
 */
export function BrandLogo({
  file,
  label,
  className = "",
  color = false,
}: {
  file: LogoFile;
  label: string;
  className?: string;
  /** Couleurs d'origine du fichier (sinon masque monochrome dans la couleur du texte). */
  color?: boolean;
}) {
  const [x0, y0, x1, y1] = file.crop ?? [0, 0, file.width, file.height];
  const cw = x1 - x0;
  const ch = y1 - y0;
  const pos = (start: number, inner: number, total: number) =>
    total === inner ? "0%" : `${(start / (total - inner)) * 100}%`;
  const size = `${(file.width / cw) * 100}% ${(file.height / ch) * 100}%`;
  const at = `${pos(x0, cw, file.width)} ${pos(y0, ch, file.height)}`;
  const mask: CSSProperties = color
    ? { backgroundImage: `url(${file.src})`, backgroundSize: size, backgroundRepeat: "no-repeat", backgroundPosition: at }
    : {
        backgroundColor: "currentColor",
        maskImage: `url(${file.src})`,
        WebkitMaskImage: `url(${file.src})`,
        maskSize: size,
        WebkitMaskSize: size,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: at,
        WebkitMaskPosition: at,
      };
  return (
    <span
      role="img"
      aria-label={label}
      className={`block forced-colors:aspect-auto! forced-colors:h-auto! ${className}`}
      style={{ aspectRatio: `${cw} / ${ch}` }}
    >
      <span aria-hidden className="block h-full w-full forced-colors:hidden" style={mask} />
      <span aria-hidden className="hidden whitespace-nowrap text-sm forced-colors:inline">
        {label}
      </span>
    </span>
  );
}

/** Logos utilisés sur le site (fichiers officiels dans public/logos). */
export const LOGOS = {
  inria: { src: "/logos/inria.png", width: 309, height: 135, crop: [13, 13, 296, 96] },
  iss: { src: "/logos/inria-startup-studio.png", width: 799, height: 232 },
  rocq: { src: "/logos/rocq.svg", width: 815.52, height: 148.52 },
  inet: { src: "/logos/inet.png", width: 256, height: 256 },
  /** Logo officiel tiré de bpifrance.fr (thème du site, logo-bpi-dark.svg). */
  bpifrance: { src: "/logos/bpifrance.svg", width: 77.352, height: 22.2 },
  /** Version fond sombre dérivée du logo officiel : texte blanc, point jaune d'origine. */
  bpifranceNegatif: { src: "/logos/bpifrance-negatif.svg", width: 77.352, height: 22.2 },
} satisfies Record<string, LogoFile>;
