/**
 * Scénario du film du héros (prototype) : jalons d'avancement partagés entre la
 * scène 3D et les cartes, mouvement de la voiture, latence simulée.
 * Toutes les valeurs de temps sont des illustrations, pas des mesures.
 *
 * Ordre validé par Lucas (10/11/2026) : assemblage → mise à jour OTA → certification
 * en cours → certifié → déploiement des paquets → sûreté temporelle (à l'arrêt puis
 * sur la route) → flux dans leurs échéances → paramètres surveillés → cybersécurité
 * → latence au fil du temps → final.
 */
import { smoothstep } from "./network";

type Range = readonly [number, number];

/** Part du défilement réservée à la scène d'intro (titre du héros), avant le film. */
export const INTRO = 0.08;

/** Jalons du film, en avancement du film (0 → 1, après l'intro). */
export const FILM = {
  /** Assemblage au garage : les pièces arrivent une à une. */
  assemble: [0, 0.07] as Range,
  /** Mise à jour OTA : cloud, ondes, téléchargement des paquets (mis en attente au-dessus du toit). */
  ota: [0.085, 0.17] as Range,
  download: [0.1, 0.155] as Range,
  /** Certification en cours : le portique balaie la voiture et les paquets. */
  scan: [0.18, 0.24] as Range,
  /** Certifié : anneau au sol, puis emblème au-dessus. */
  ring: [0.245, 0.28] as Range,
  emblem: [0.252, 0.282] as Range,
  certifiedOut: [0.305, 0.325] as Range,
  /** Déploiement : chaque paquet descend vers son calculateur. */
  deploy: [0.322, 0.366] as Range,
  /** Sûreté temporelle à l'arrêt : une cible se dresse devant la voiture dans le garage. */
  target: [0.378, 0.425] as Range,
  /** Rideau du garage, puis départ. */
  door: [0.42, 0.455] as Range,
  /** Freinage d'urgence sur la route : la barrière tombe, la voiture s'arrête. */
  barrierDown: [0.49, 0.503] as Range,
  stop: 0.55,
  barrierUp: [0.562, 0.578] as Range,
  /** Faisceau radar et impulsion de freinage (à l'arrêt, puis sur la route). */
  radar: [
    [0.384, 0.42],
    [0.493, 0.552],
  ] as Range[],
  pulse: [
    [0.39, 0.402],
    [0.498, 0.513],
  ] as Range[],
  /** Vue « rayons X » du réseau et messages réguliers. */
  network: [
    [0.175, 0.43],
    [0.485, 0.845],
  ] as Range[],
  packets: [[0.595, 0.845]] as Range[],
  /** Paramètres surveillés : délai de commutation et précision de synchronisation. */
  monitor: [0.665, 0.745] as Range,
  /** Cybersécurité : ECU compromis isolé, puis injection bloquée au commutateur central. */
  rogue: [0.752, 0.777] as Range,
  isolate: 0.774,
  injection: [0.792, 0.836] as Range,
  shield: 0.799,
  /** Courbe de latence tracée par la voiture le long de la route. */
  trail: [0.85, 0.925] as Range,
  trailVisible: [0.84, 0.94] as Range,
  /** La caméra s'arrête, la voiture s'éloigne. */
  freeze: 0.945,
};

/**
 * Mise en page partagée entre le panneau (DOM) et la caméra (3D) : hauteur occupée en
 * bas de l'écran par le panneau quand il est posé en bas (mobile, tablette), en px.
 */
export const heroLayout = { bottom: 0 };

/** Fenêtre d'apparition : 0 hors de [a, b], fondus de largeur f aux bords. */
export const win = (p: number, a: number, b: number, f = 0.02) =>
  smoothstep(a, a + f, p) * (1 - smoothstep(b - f, b, p));

/** Vitesse (m par unité d'avancement) : garage, sortie, freinage, arrêt, croisière, autoroute. */
const SPEED: [number, number][] = [
  [0, 0],
  [0.445, 0],
  [0.49, 600],
  [0.515, 600],
  [FILM.stop, 0],
  [0.575, 0],
  [0.6, 600],
  [0.84, 600],
  [0.87, 1500],
  [1, 1500],
];

const N = 4000;
const TABLE = (() => {
  const speed = (p: number) => {
    let i = 0;
    while (i < SPEED.length - 2 && p > SPEED[i + 1]![0]) i++;
    const [a, va] = SPEED[i]!;
    const [b, vb] = SPEED[i + 1]!;
    return va + (vb - va) * smoothstep(a, b, p);
  };
  const xs = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) xs[i] = xs[i - 1]! + (speed((i - 1) / N) + speed(i / N)) / (2 * N);
  return xs;
})();

/** Abscisse de la voiture (m) : vitesse intégrée, donc accélérations et freinage sans à-coups. */
export function carX(p: number) {
  const f = Math.min(1, Math.max(0, p)) * N;
  const i = Math.min(N - 1, Math.floor(f));
  return TABLE[i]! + (TABLE[i + 1]! - TABLE[i]!) * (f - i);
}

/** Barrière du freinage d'urgence : la voiture s'arrête ~2,6 m devant. */
export const BARRIER_X = carX(FILM.stop) + 5;
/** Cible du test à l'arrêt, devant le bouclier, dans le garage. */
export const TARGET_X = 5.2;

/** Paquets de conduite autonome téléchargés, et calculateur qui reçoit chacun. */
export const PACKAGES = [
  { version: "3.2", node: "camera" },
  { version: "2.8", node: "ecu" },
  { version: "4.1", node: "brake-fl" },
] as const;

/** Fenêtres de téléchargement et de déploiement de chaque paquet (scène et cartes). */
export const downloadOf = (i: number) => [FILM.download[0] + i * 0.016, FILM.download[0] + i * 0.016 + 0.022] as const;
export const deployOf = (i: number) => [FILM.deploy[0] + i * 0.012, FILM.deploy[0] + i * 0.012 + 0.02] as const;

/** Flux affichés (pire cas prouvé / échéance, ms), mêmes valeurs que lib/car-network. */
export const FLOWS = [
  { bound: 0.41, deadline: 1 },
  { bound: 1.6, deadline: 5 },
  { bound: 1.1, deadline: 3 },
  { bound: 0.96, deadline: 2 },
];

/** Latence de bout en bout de la chaîne de freinage (ms) : borne prouvée et échéance. */
export const LATENCY_BOUND = 0.41;
export const LATENCY_DEADLINE = 1;

/** Trace simulée, déterministe : toujours sous la borne prouvée, loin de l'échéance. */
export const LATENCY = Array.from({ length: 120 }, (_, i) => {
  const n = Math.sin(i * 1.7) * 0.5 + Math.sin(i * 0.37 + 1) * 0.3 + Math.sin(i * 4.1) * 0.2;
  return 0.265 + n * 0.085;
});
export const LATENCY_STATS = {
  max: Math.max(...LATENCY),
  mean: LATENCY.reduce((a, b) => a + b, 0) / LATENCY.length,
};
