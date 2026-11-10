/**
 * Définition chiffrée du SUV : sections clés, roues, passages de roue, découpe
 * des pièces démontables et des vitrages. Toute la géométrie (carrosserie pleine,
 * fil de fer, positions du réseau) en est dérivée.
 *
 * Repère : x vers l'avant, y vers le haut (sol à 0), z vers la gauche. Mètres.
 *
 * Forme : proposition « intégration technique » retenue à l'unanimité par trois
 * juges indépendants (réalisme, géométrie, intégration), avec leurs corrections :
 * taille pincée entre les roues, nez reculé et arrondi en plan, lunette, pavillon
 * et capot sans creux, stations de garde pour un pare-brise plan, roues à fleur.
 * SUV générique de 4,67 × 1,91 × 1,67 m, empattement 2,84 m, pneus 255/45 R21.
 */
import { monotone, sectionCurve, type P2, type Station } from "./car-shape-core";
import type { WheelSpec } from "./car-wheel";

/** Bornes en x d'une vitre latérale : [à la ceinture (u = 4), en haut du vitrage (u = 6)]. */
export type Edge = readonly [number, number];

export type CarDesign = {
  stations: Station[];
  wheel: WheelSpec;
  /** Abscisses des essieux (avant, arrière). */
  axles: readonly [number, number];
  /** Demi-voie : z du milieu de la bande de roulement. */
  trackHalf: number;
  /** Passages de roue : centre (hauteur), rayon, largeur et surépaisseur des élargisseurs. */
  arch: { cy: number; r: number; flare: number; proud: number };
  /** Haut de l'habillage noir du bas de caisse. */
  cladTopY: number;
  /** Frontières des pièces : arrière | flancs + toit | capot | avant. */
  split: { tail: number; cowl: number; nose: number };
  /** Vitres latérales (rectangles en (x, u) entre u = 4 et 6), de l'avant vers l'arrière. */
  sideWindows: { front: Edge; rear: Edge }[];
  /** Pare-brise et lunette : de x0 à x1, de u à l'axe (u = 8). */
  windshield: { x0: number; x1: number; u: number };
  rearGlass: { x0: number; x1: number; u: number };
  /** Bombé des faces avant et arrière au centre, selon u. */
  bulge: { front: (u: number) => number; rear: (u: number) => number };
  /** Pavillon noir (toit vitré) ou couleur carrosserie (montants noirs : « toit flottant »). */
  roof: "black" | "paint";
  /** Abscisse du pied de rétroviseur (sur le petit triangle noir au pied du montant A). */
  mirrorX: number;
  /** Boîtier du lidar posé sur l'axe du pavillon : abscisse et dimensions (x, y, z). */
  lidar: { x: number; size: [number, number, number] };
};

/** Sections clés, de l'arrière (x min) vers l'avant (x max) : 9 points (z, y) de la demi-section gauche. */
const STATIONS: Station[] = [
  // bouclier AR / bas de hayon (face bombée)
  { x: -2.28, points: [[0.603, 0.36], [0.655, 0.405], [0.691, 0.62], [0.677, 0.95], [0.607, 1.01], [0.567, 1.027], [0.522, 1.038], [0.467, 1.044], [0.0, 1.052]] },
  // arête haute du hayon, feux AR
  { x: -2.26, points: [[0.698, 0.355], [0.75, 0.398], [0.786, 0.622], [0.772, 0.978], [0.702, 1.048], [0.662, 1.069], [0.617, 1.082], [0.562, 1.09], [0.0, 1.1]] },
  // base de lunette, feux AR
  { x: -2.2, points: [[0.78, 0.342], [0.832, 0.392], [0.868, 0.624], [0.854, 1.012], [0.784, 1.104], [0.744, 1.142], [0.686, 1.166], [0.619, 1.18], [0.0, 1.196]] },
  // lunette (haut), pied D
  { x: -2.08, points: [[0.835, 0.312], [0.887, 0.37], [0.923, 0.62], [0.909, 1.026], [0.839, 1.142], [0.777, 1.25], [0.711, 1.324], [0.634, 1.359], [0.0, 1.396]] },
  // garde : haut de lunette (sous l'aileron)
  { x: -1.99, points: [[0.8371, 0.2933], [0.8912, 0.3562], [0.9292, 0.6131], [0.9166, 1.0288], [0.8438, 1.151], [0.7825, 1.2881], [0.7186, 1.4126], [0.6485, 1.4898], [0.0, 1.5455]] },
  // fin de pavillon, pied D (frontière pièce arrière)
  { x: -1.95, points: [[0.838, 0.285], [0.893, 0.35], [0.932, 0.61], [0.92, 1.03], [0.846, 1.155], [0.785, 1.305], [0.722, 1.452], [0.655, 1.548], [0.0, 1.612]] },
  // essieu AR, pied C, hanche AR
  { x: -1.42, points: [[0.858, 0.252], [0.91, 0.308], [0.945, 0.59], [0.935, 1.017], [0.859, 1.14], [0.795, 1.318], [0.728, 1.492], [0.659, 1.586], [0.0, 1.648]] },
  // pied B, sommet du pavillon
  { x: -0.35, points: [[0.855, 0.24], [0.905, 0.298], [0.921, 0.572], [0.912, 0.99], [0.856, 1.105], [0.795, 1.305], [0.726, 1.505], [0.656, 1.6], [0.0, 1.665]] },
  // traverse de pavillon (haut du pare-brise)
  { x: 0.1, points: [[0.855, 0.24], [0.905, 0.298], [0.92, 0.57], [0.911, 0.982], [0.855, 1.097], [0.806, 1.28], [0.749, 1.455], [0.686, 1.54], [0.0, 1.605]] },
  // garde : pare-brise (haut)
  { x: 0.2, points: [[0.855, 0.2406], [0.905, 0.2986], [0.9209, 0.5703], [0.9119, 0.9809], [0.8547, 1.0959], [0.8109, 1.2549], [0.759, 1.4079], [0.6997, 1.48], [0.0, 1.5421]] },
  // milieu du pare-brise, pied A
  { x: 0.45, points: [[0.855, 0.242], [0.905, 0.3], [0.923, 0.571], [0.914, 0.978], [0.854, 1.093], [0.823, 1.192], [0.784, 1.29], [0.734, 1.33], [0.0, 1.385]] },
  // garde : pare-brise (bas)
  { x: 0.7, points: [[0.855, 0.2441], [0.905, 0.3], [0.9273, 0.5717], [0.9176, 0.9759], [0.8526, 1.0909], [0.8251, 1.1352], [0.7926, 1.1739], [0.754, 1.195], [0.0, 1.2279]] },
  // base du pare-brise, pied du montant A
  { x: 0.8, points: [[0.855, 0.245], [0.905, 0.3], [0.929, 0.572], [0.919, 0.975], [0.852, 1.09], [0.826, 1.1125], [0.796, 1.1275], [0.762, 1.141], [0.0, 1.165]] },
  // auvent, arrière du capot (juste après la frontière capot 0,85)
  { x: 0.86, points: [[0.855, 0.245], [0.905, 0.3], [0.929, 0.573], [0.919, 0.973], [0.85, 1.087], [0.825, 1.1059], [0.795, 1.1185], [0.76, 1.1298], [0.0, 1.15]] },
  // essieu AV, capot, aile AV
  { x: 1.42, points: [[0.857, 0.252], [0.908, 0.308], [0.938, 0.59], [0.918, 0.962], [0.815, 1.058], [0.782, 1.0706], [0.743, 1.079], [0.7, 1.0866], [0.0, 1.1]] },
  // avant du capot (frontière pièce avant)
  { x: 1.95, points: [[0.836, 0.29], [0.89, 0.352], [0.926, 0.595], [0.905, 0.945], [0.8, 1.02], [0.765, 1.0305], [0.725, 1.0375], [0.68, 1.0438], [0.0, 1.055]] },
  // début de l'arrondi d'angle, retour des optiques
  { x: 2.12, points: [[0.822, 0.32], [0.876, 0.372], [0.912, 0.588], [0.892, 0.938], [0.8, 1.008], [0.765, 1.0176], [0.725, 1.024], [0.68, 1.0298], [0.0, 1.04]] },
  // bord d'attaque du capot, optiques
  { x: 2.17, points: [[0.775, 0.345], [0.828, 0.385], [0.862, 0.578], [0.842, 0.922], [0.78, 0.993], [0.745, 1.0023], [0.705, 1.0085], [0.66, 1.0141], [0.0, 1.024]] },
  // arrondi du bord d'attaque, optiques
  { x: 2.22, points: [[0.742, 0.355], [0.796, 0.393], [0.832, 0.57], [0.811, 0.895], [0.74, 0.97], [0.705, 0.979], [0.665, 0.985], [0.62, 0.9904], [0.0, 1.0]] },
  // haut de face avant, signature lumineuse
  { x: 2.245, points: [[0.696, 0.358], [0.75, 0.397], [0.786, 0.565], [0.765, 0.858], [0.7, 0.932], [0.665, 0.9413], [0.625, 0.9475], [0.58, 0.9531], [0.0, 0.963]] },
  // bouclier AV, face avant (face bombée)
  { x: 2.26, points: [[0.616, 0.36], [0.67, 0.4], [0.706, 0.56], [0.685, 0.8], [0.63, 0.862], [0.595, 0.8719], [0.555, 0.8785], [0.51, 0.8844], [0.0, 0.895]] },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Bombé d'une face d'extrémité selon la HAUTEUR relative s ∈ [0, 1] de la section
 * extrême (et non selon u, qui ne couvre que quelques centimètres en haut de face) :
 * profil « en proue », maximal au bouclier et nul en haut de face, sans chanfrein.
 */
function heightBulge(pts: P2[], s: number[], v: number[]) {
  const f = monotone(s, v);
  const y0 = pts[0]![1];
  const y8 = pts[8]![1];
  return (u: number) => f(clamp01((sectionCurve(pts, u)[1] - y0) / (y8 - y0)));
}
const BULGE_S = [0, 0.15, 0.3, 0.6, 0.85, 1];

const SIDE_WINDOWS: CarDesign["sideWindows"] = [
  { front: [0.78, 0.78], rear: [-0.31, -0.33] },
  { front: [-0.39, -0.41], rear: [-1.38, -1.4] },
  { front: [-1.46, -1.48], rear: [-1.95, -1.95] },
];

export const DESIGN: CarDesign = {
  stations: STATIONS,
  // 255/45 R21 : Ø 0,76 m, jante 21" × 8,5", disque Ø 360 mm.
  wheel: { R: 0.38, W: 0.255, rimR: 0.267, rimW: 0.216, discR: 0.18 },
  axles: [1.42, -1.42],
  // Pneus à fleur de la lèvre des élargisseurs.
  trackHalf: 0.82,
  // Jeu de 5 cm au-dessus du pneu.
  arch: { cy: 0.38, r: 0.43, flare: 0.055, proud: 0.015 },
  cladTopY: 0.4,
  split: { tail: -1.95, cowl: 0.85, nose: 1.95 },
  sideWindows: SIDE_WINDOWS,
  windshield: { x0: 0.13, x1: 0.8, u: 7.0 },
  rearGlass: { x0: -2.235, x1: -1.99, u: 6.9 },
  bulge: {
    front: heightBulge(STATIONS[STATIONS.length - 1]!.points, BULGE_S, [0.04, 0.068, 0.064, 0.034, 0.01, 0]),
    rear: heightBulge(STATIONS[0]!.points, BULGE_S, [0.04, 0.066, 0.062, 0.03, 0.008, 0]),
  },
  roof: "paint",
  mirrorX: SIDE_WINDOWS[0]!.front[0] + 0.035,
  lidar: { x: -0.62, size: [0.15, 0.045, 0.12] },
};
