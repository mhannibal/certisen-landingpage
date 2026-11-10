/**
 * Carrosserie pleine du SUV, découpée en 6 pièces démontables (toit, capot, flancs,
 * avant, arrière). Chaque pièce regroupe ses maillages par matériau (peinture,
 * habillage noir, noir laqué, vitrage, chrome, optiques, puits de roue) et ses
 * lignes d'ouvrants. Tout dérive de la surface définie par les sections clés
 * (lib/car-design.ts), comme le fil de fer : les deux se superposent exactement.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DESIGN } from "./car-design";
import {
  CarSurface,
  endDecal,
  endFace,
  endPoint,
  gridGeometry,
  linesGeometry,
  mergeClean,
  offsetAlongNormals,
  orient,
  surfacePatch,
  surfaceStrip,
} from "./car-shape-core";

export const SURFACE = new CarSurface(DESIGN.stations);
const S = SURFACE;
const lerp = THREE.MathUtils.lerp;
const { arch, axles, split } = DESIGN;
type Side = 1 | -1;
const SIDES: Side[] = [1, -1];

/* ------------------------------------------------------------------ */
/* Passages de roue                                                     */
/* ------------------------------------------------------------------ */

/** Haut de l'ouverture de passage de roue à l'abscisse x (−∞ hors des passages). */
export function archTopY(x: number, grow = 0) {
  let y = -Infinity;
  for (const ax of axles) {
    const r = arch.r + grow;
    const d = Math.abs(x - ax);
    if (d < r) y = Math.max(y, arch.cy + Math.sqrt(r * r - d * d));
  }
  return y;
}

/** Bas de la caisse en u à l'abscisse x : bas de caisse, ou bord du passage de roue. */
export function lowU(x: number) {
  const y = archTopY(x);
  return y > S.pointsAt(x)[0]![1] ? S.uAtHeight(x, y, 0, 4) : 0;
}

/** Comme lowU, mais bornes de l'arche incluses (jambes verticales exactes en x = essieu ± r). */
function lowUInArch(x: number) {
  const ax = axles.reduce((best, a) => (Math.abs(x - a) < Math.abs(x - best) ? a : best));
  const d = Math.min(arch.r, Math.abs(x - ax));
  const y = arch.cy + Math.sqrt(arch.r * arch.r - d * d);
  return y > S.pointsAt(x)[0]![1] ? S.uAtHeight(x, y, 0, 4) : 0;
}

/** Haut de l'habillage noir (bas de caisse, bas des boucliers) en u. */
export function cladU(x: number) {
  return S.uAtHeight(x, DESIGN.cladTopY, 0, 4);
}

/** Angles de l'arc des passages (de l'arrière vers l'avant, par le haut). */
export const ARCH_A0 = Math.PI + 0.24;
export const ARCH_A1 = -0.24;

/** Élargisseur d'aile : lèvre rentrante, bord en surépaisseur, raccord à la caisse. */
function flare(ax: number, s: Side) {
  const rows: [number, number][] = [
    [arch.r, -0.035],
    [arch.r, arch.proud],
    [arch.r + arch.flare * 0.55, arch.proud * 0.85],
    [arch.r + arch.flare, 0.002],
  ];
  const g = gridGeometry(72, rows.length - 1, (a, b) => {
    const th = lerp(ARCH_A0, ARCH_A1, a);
    const [rad, dz] = rows[Math.round(b * (rows.length - 1))]!;
    const x = ax + rad * Math.cos(th);
    const y = arch.cy + rad * Math.sin(th);
    return new THREE.Vector3(x, y, s * (S.halfWidth(x, y) + dz));
  });
  return orient(g, new THREE.Vector3(0, 0, s));
}

/** Puits de roue sombre : voûte qui suit l'arc + fond vertical côté intérieur. */
function wheelWell(ax: number, s: Side) {
  const zIn = DESIGN.trackHalf - DESIGN.wheel.W / 2 - 0.09;
  const rr = arch.r - 0.004;
  const vault = gridGeometry(48, 2, (a, b) => {
    const th = lerp(ARCH_A0, ARCH_A1, a);
    const x = ax + rr * Math.cos(th);
    const y = arch.cy + rr * Math.sin(th);
    return new THREE.Vector3(x, y, s * lerp(zIn, S.halfWidth(x, y) - 0.03, b));
  });
  orient(vault, new THREE.Vector3(0, -1, 0));
  const back = gridGeometry(48, 1, (a, b) => {
    const th = lerp(ARCH_A0, ARCH_A1, a);
    return new THREE.Vector3(ax + rr * b * Math.cos(th), arch.cy + rr * b * Math.sin(th), s * zIn);
  });
  orient(back, new THREE.Vector3(0, 0, s));
  return mergeClean([vault, back]);
}

/* ------------------------------------------------------------------ */
/* Vitrages et garnitures                                               */
/* ------------------------------------------------------------------ */

const GLASS_OFFSET = 0.004;
type CarDesignWindow = (typeof DESIGN.sideWindows)[number];

/** Vitre latérale : rectangle en (x, u) entre ceinture et haut de vitrage, bords inclinables. */
function sideWindow(w: CarDesignWindow, s: Side) {
  const g = gridGeometry(
    40,
    10,
    (a, b) => {
      const u = lerp(4.07, 5.93, b);
      const k = (u - 4) / 2;
      const x = lerp(lerp(w.rear[0], w.rear[1], k), lerp(w.front[0], w.front[1], k), a);
      return S.point(x, u, s, new THREE.Vector3());
    },
    s === -1,
  );
  return offsetAlongNormals(g, GLASS_OFFSET);
}

/** Bande de vitrage sur le dessus (pare-brise, lunette) entre x0 et x1, de u à l'axe. */
function topGlass(x0: number, x1: number, u: number) {
  if (x1 - x0 < 0.01) return null;
  return mergeClean(
    SIDES.map((s) => surfacePatch(S, { side: s, x0, x1, uLo: u, uHi: 8, nx: 40, nu: 14, offset: GLASS_OFFSET })),
  );
}

/** Rétroviseur : coque ovoïde (dos plat = miroir) sur un pied fixé au pied du montant A. */
export function mirrorShell(s: Side) {
  const xm = DESIGN.mirrorX;
  const [zb, yb] = S.section(xm, 4.35);
  return { x: xm, y: yb + 0.075, z: s * (zb + 0.135), foot: [xm + 0.012, yb + 0.035, s * (zb + 0.055)] as const };
}

function mirror(s: Side) {
  const m = mirrorShell(s);
  const shell = new THREE.SphereGeometry(1, 28, 14);
  shell.scale(0.115, 0.068, 0.1);
  const p = shell.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getX(i) < -0.035) p.setX(i, -0.035);
  shell.computeVertexNormals();
  shell.translate(m.x, m.y, m.z);
  const foot = new THREE.BoxGeometry(0.08, 0.028, 0.12);
  foot.translate(...m.foot);
  return mergeClean([shell, foot]);
}

/** Poignée affleurante (bande chromée sur la surface), sous la ligne d'épaule. */
function handle(xc: number, s: Side) {
  const u = S.uAtHeight(xc, 0.93, 0, 4);
  return surfaceStrip(S, s, (t) => [xc - 0.09 + 0.18 * t, u], 0.022, 12, 0.004);
}

/** Tracé des barres de toit : bord du pavillon, de la traverse à l'arrière. */
export const RAIL = { xa: 0.0, xb: -1.6, u: 7.15, w: 0.026, h: 0.032 };

/** Barre de toit affleurante : profil arrondi de 26 × 32 mm posé sur le pavillon, extrémités effilées. */
function roofRail(s: Side) {
  const n = 64;
  const m = 12;
  const g = gridGeometry(n, m, (a, b) => {
    const x = lerp(RAIL.xa, RAIL.xb, a);
    const [z, y] = S.section(x, RAIL.u);
    // Effilement sur 6 cm à chaque bout.
    const end = Math.min(1, Math.min(a, 1 - a) * (Math.abs(RAIL.xb - RAIL.xa) / 0.06));
    const k = 0.25 + 0.75 * Math.sin((Math.PI / 2) * end);
    // Profil fermé (contour d'un rectangle arrondi), parcouru par b.
    const th = b * Math.PI * 2;
    const px = Math.sign(Math.cos(th)) * Math.pow(Math.abs(Math.cos(th)), 0.45) * (RAIL.w / 2);
    const py = Math.sign(Math.sin(th)) * Math.pow(Math.abs(Math.sin(th)), 0.45) * (RAIL.h / 2);
    return new THREE.Vector3(x, y + 0.003 + (RAIL.h / 2 + py) * k, s * (z + px * k));
  });
  g.computeVertexNormals();
  return orient(g, new THREE.Vector3(0, 1, 0));
}

/** Boîtier du lidar posé sur l'axe du pavillon. */
export function lidarBox() {
  const [sx, sy, sz] = DESIGN.lidar.size;
  const x = DESIGN.lidar.x;
  const y = S.topY(x) + sy / 2 - 0.003;
  return { x, y, z: 0, size: [sx, sy, sz] as const };
}

function lidar() {
  const b = lidarBox();
  const g = new RoundedBoxGeometry(b.size[0], b.size[1], b.size[2], 3, 0.012);
  g.translate(b.x, b.y, b.z);
  return g;
}

/** Aileron de toit au-dessus de la lunette, bombé comme le pavillon. */
function spoiler() {
  const xe = DESIGN.rearGlass.x1 + 0.03;
  const pts = S.pointsAt(xe);
  const yRoof = pts[8]![1];
  const [zEdge, yEdge] = S.section(xe, 6.7, pts);
  const crown = yRoof - yEdge;
  const shape = new THREE.Shape();
  shape.moveTo(0.02, 0);
  shape.lineTo(-0.12, -0.014);
  shape.lineTo(-0.125, -0.024);
  shape.lineTo(-0.05, -0.03);
  shape.lineTo(0.02, -0.022);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: zEdge * 2,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 1,
    steps: 16,
  });
  g.translate(xe, yRoof + 0.006, -zEdge);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.abs(p.getZ(i)) / zEdge);
    p.setY(i, p.getY(i) - crown * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/** Feu stop central : fine barre sous le bord de fuite de l'aileron. */
function thirdBrakeLight() {
  const xe = DESIGN.rearGlass.x1 + 0.03;
  const yRoof = S.pointsAt(xe)[8]![1];
  const g = new THREE.BoxGeometry(0.008, 0.006, 0.42);
  g.translate(xe - 0.118, yRoof - 0.012, 0);
  return g;
}

/** Aileron de requin (antenne) sur l'axe, à l'arrière du pavillon. */
function sharkFin() {
  const xc = DESIGN.rearGlass.x1 + 0.3;
  const y = S.pointsAt(xc)[8]![1];
  const s = new THREE.Shape();
  s.moveTo(0.1, 0);
  s.quadraticCurveTo(0.0, 0.01, -0.07, 0.068);
  s.quadraticCurveTo(-0.095, 0.072, -0.1, 0.05);
  s.lineTo(-0.1, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 10,
  });
  g.translate(xc, y - 0.004, -0.025);
  return g;
}

/** Balais d'essuie-glace couchés au pied du pare-brise. */
function wipers() {
  const xw = DESIGN.windshield.x1 - 0.06;
  const yw = S.pointsAt(xw)[8]![1];
  const slope = (S.pointsAt(xw - 0.1)[8]![1] - yw) / 0.1;
  const a = Math.atan(slope);
  return mergeClean(
    [0.3, -0.27].map((zc) => {
      const g = new THREE.BoxGeometry(0.026, 0.012, 0.56);
      g.rotateY(zc > 0 ? 0.06 : -0.06);
      g.rotateZ(-a);
      g.translate(xw, yw + 0.016, zc);
      return g;
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Lignes d'ouvrants (portes, capot, trappe de recharge)                */
/* ------------------------------------------------------------------ */

const lift = 0.0025;
const onSurface = (x: number, u: number, s: Side) => {
  const [z, y] = S.section(x, u);
  return new THREE.Vector3(x, y, s * (z + lift));
};

export function doorSeams(s: Side) {
  const lines: THREE.Vector3[][] = [];
  const frontEdge = axles[0] - arch.r - arch.flare - 0.07;
  // Arête arrière de la porte AR sous le montant C (au-delà, elle couperait la vitre AR).
  const rearEdge = axles[1] + 0.02;
  // Arête avant de la porte avant et montant B (de l'habillage à la ceinture).
  for (const [xLow, xHigh] of [
    [frontEdge, frontEdge - 0.03],
    [-0.33, -0.35],
  ] as const) {
    const ua = cladU(xLow);
    lines.push(
      Array.from({ length: 13 }, (_, i) => {
        const u = lerp(ua, 4, i / 12);
        return onSurface(lerp(xLow, xHigh, i / 12), u, s);
      }),
    );
  }
  // Arête arrière de la porte arrière : verticale au-dessus du passage, puis autour de l'arc.
  const rOut = arch.r + arch.flare + 0.035;
  const yTurn = arch.cy + Math.sqrt(Math.max(0, rOut * rOut - (rearEdge - axles[1]) ** 2));
  const uTurn = S.uAtHeight(rearEdge, yTurn, 0, 4);
  const up = Array.from({ length: 9 }, (_, i) => onSurface(rearEdge, lerp(4, uTurn, i / 8), s));
  const th0 = Math.atan2(yTurn - arch.cy, rearEdge - axles[1]);
  const around: THREE.Vector3[] = [];
  for (let i = 1; i <= 16; i++) {
    const th = lerp(th0, 0.02, i / 16);
    const x = axles[1] + rOut * Math.cos(th);
    const y = arch.cy + rOut * Math.sin(th);
    if (y < DESIGN.cladTopY) break;
    around.push(onSurface(x, S.uAtHeight(x, y, 0, 4), s));
  }
  lines.push([...up, ...around]);
  // Trappe de recharge (côté gauche, aile arrière).
  if (s === 1) {
    const [x0, x1, y0, y1] = [-1.74, -1.58, 0.84, 0.95];
    const loop: THREE.Vector3[] = [];
    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0],
    ] as const)
      loop.push(onSurface(x, S.uAtHeight(x, y, 0, 4), s));
    lines.push(loop);
  }
  return lines;
}

/** Lignes de capot : le long des ailes et au bord avant. */
export function hoodSeams() {
  const lines: THREE.Vector3[][] = [];
  for (const s of SIDES) {
    lines.push(
      Array.from({ length: 33 }, (_, i) => onSurface(lerp(split.cowl + 0.02, split.nose, i / 32), 4, s)),
    );
  }
  const front: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) front.push(onSurface(split.nose, lerp(4, 8, i / 24), 1));
  for (let i = 23; i >= 0; i--) front.push(onSurface(split.nose, lerp(4, 8, i / 24), -1));
  lines.push(front.map((v) => v.setY(v.y + 0.002)));
  return lines;
}

/* ------------------------------------------------------------------ */
/* Faces avant et arrière : optiques, calandre, boucliers               */
/* ------------------------------------------------------------------ */

type Decal = { mid: (s: number) => [number, number]; half: (s: number) => number; n?: number };

const line = (z0: number, z1: number, y0: number, y1: number) => (s: number) =>
  [lerp(z0, z1, s), lerp(y0, y1, s)] as [number, number];
const flat = (h: number) => () => h;
const ramp = (h0: number, h1: number) => (s: number) => lerp(h0, h1, s);
/** Disque (lentille de projecteur) : demi-hauteur en demi-cercle le long du diamètre. */
const disc = (zc: number, yc: number, r: number): Decal => ({
  mid: (s) => [zc + r * (2 * s - 1), yc],
  half: (s) => r * Math.sqrt(Math.max(0, 1 - (2 * s - 1) ** 2)),
  n: 16,
});
/** Copie miroir d'un décalque (côté droit). */
const mirrorDecal = (d: Decal): Decal => ({
  mid: (s) => {
    const [z, y] = d.mid(s);
    return [-z, y];
  },
  half: d.half,
  n: d.n,
});
const both = (d: Decal) => [d, mirrorDecal(d)];

function decals(front: boolean, list: Decal[], offset: number) {
  const bulge = front ? DESIGN.bulge.front : DESIGN.bulge.rear;
  const xLimit = front ? split.nose : split.tail;
  return mergeClean(list.map((d) => endDecal(S, front, bulge, xLimit, d.mid, d.half, d.n ?? 40, offset)));
}

/** Décalques de la face avant, par rôle (partagés avec le fil de fer). */
function frontDecals() {
  // Bloc optique fin sous le bord d'attaque, qui s'enroule sur l'angle ; signature au-dessus.
  const hl: Decal = { mid: line(0.4, 0.86, 0.858, 0.884), half: ramp(0.02, 0.028) };
  const drl: Decal = {
    mid: (s) => [lerp(0.4, 0.86, s), lerp(0.858, 0.884, s) + lerp(0.02, 0.028, s) - 0.007],
    half: flat(0.005),
  };
  return {
    headlights: both(hl),
    drl: both(drl),
    bar: [{ mid: line(-0.4, 0.4, 0.866, 0.866), half: flat(0.0038), n: 60 }] as Decal[],
    upper: [{ mid: line(-0.44, 0.44, 0.74, 0.74), half: flat(0.075), n: 40 }] as Decal[],
    intake: [{ mid: line(-0.52, 0.52, 0.52, 0.52), half: flat(0.075), n: 48 }] as Decal[],
    slats: [0.49, 0.52, 0.55].map((y) => ({ mid: line(-0.48, 0.48, y, y), half: flat(0.0045), n: 40 })) as Decal[],
    sideIntakes: both({ mid: line(0.6, 0.69, 0.52, 0.52), half: flat(0.06), n: 16 }),
    skid: [{ mid: line(-0.42, 0.42, 0.395, 0.395), half: flat(0.02), n: 40 }] as Decal[],
    radar: [{ mid: line(0.12, 0.24, 0.7, 0.7), half: flat(0.032), n: 8 }] as Decal[],
    lenses: [disc(0.55, 0.868, 0.016), disc(0.66, 0.873, 0.016)].flatMap(both),
  };
}

function rearDecals() {
  const tl: Decal = { mid: line(0.48, 0.86, 0.985, 1.015), half: ramp(0.022, 0.032) };
  const strip: Decal = {
    mid: (s) => [lerp(0.48, 0.86, s), lerp(0.985, 1.015, s) + lerp(0.022, 0.032, s) - 0.009],
    half: flat(0.006),
  };
  return {
    taillights: both(tl),
    strips: both(strip),
    bar: [{ mid: line(-0.48, 0.48, 0.995, 0.995), half: flat(0.0045), n: 60 }] as Decal[],
    plate: [{ mid: line(-0.26, 0.26, 0.7, 0.7), half: flat(0.068), n: 24 }] as Decal[],
    reflectors: both({ mid: line(0.62, 0.74, 0.47, 0.47), half: flat(0.008), n: 12 }),
    skid: [{ mid: line(-0.4, 0.4, 0.385, 0.385), half: flat(0.018), n: 32 }] as Decal[],
  };
}

function frontDetails() {
  const d = frontDecals();
  return {
    gloss: mergeClean([
      decals(true, [...d.headlights, ...d.upper, ...d.sideIntakes, ...d.radar], 0.004),
      decals(true, d.intake, 0.003),
    ]),
    lamp: decals(true, [...d.drl, ...d.bar], 0.007),
    chrome: mergeClean([decals(true, [...d.slats, ...d.skid], 0.006), decals(true, d.lenses, 0.0065)]),
  };
}

function rearDetails() {
  const d = rearDecals();
  return {
    gloss: decals(false, [...d.taillights, ...d.plate], 0.004),
    tailLamp: decals(false, [...d.strips, ...d.bar], 0.0065),
    // Catadioptres : réfléchissants, pas lumineux.
    chrome: decals(false, [...d.skid, ...d.reflectors], 0.005),
  };
}

/** Ouvrant du hayon : contour sur la face arrière, du bandeau lumineux au bouclier. */
export function tailgateSeams() {
  const bulge = DESIGN.bulge.rear;
  const at = (z: number, y: number) => {
    const p = endPoint(S, false, bulge, y, z, split.tail);
    return p.setX(p.x - lift);
  };
  const [zs, y0, y1] = [0.62, 0.6, 0.975];
  const loop: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) loop.push(at(zs, lerp(y1, y0, i / 10)));
  for (let i = 1; i <= 24; i++) loop.push(at(lerp(zs, -zs, i / 24), y0));
  for (let i = 1; i <= 10; i++) loop.push(at(-zs, lerp(y0, y1, i / 10)));
  return [loop];
}

/** Contours des décalques principaux (optiques, calandre, prises d'air), pour le fil de fer. */
export function decalOutlines(): THREE.Vector3[][] {
  const f = frontDecals();
  const r = rearDecals();
  const out: THREE.Vector3[][] = [];
  const add = (front: boolean, list: Decal[]) => {
    const bulge = front ? DESIGN.bulge.front : DESIGN.bulge.rear;
    const xLimit = front ? split.nose : split.tail;
    for (const d of list) {
      const n = d.n ?? 40;
      const loop: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const [z, y] = d.mid(i / n);
        loop.push(endPoint(S, front, bulge, y + d.half(i / n), z, xLimit));
      }
      for (let i = n; i >= 0; i--) {
        const [z, y] = d.mid(i / n);
        loop.push(endPoint(S, front, bulge, y - d.half(i / n), z, xLimit));
      }
      loop.push(loop[0]!.clone());
      // Légèrement devant la surface pour rester visible.
      out.push(loop.map((v) => v.setX(v.x + (front ? 0.008 : -0.008))));
    }
  };
  add(true, [...f.headlights, ...f.upper, ...f.intake, ...f.sideIntakes, ...f.skid]);
  add(false, [...r.taillights, ...r.plate, ...r.skid]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                           */
/* ------------------------------------------------------------------ */

export type MaterialKey = "paint" | "cladding" | "gloss" | "glass" | "chrome" | "lamp" | "tailLamp" | "liner";

export type BodyPiece = {
  id: "roof" | "hood" | "left" | "right" | "nose" | "tail";
  meshes: Partial<Record<MaterialKey, THREE.BufferGeometry>>;
  /** Lignes d'ouvrants (portes, capot), dans le même repère. */
  seams?: THREE.BufferGeometry;
  center: THREE.Vector3;
  move: THREE.Vector3;
  rot: THREE.Euler;
  /** Début du démontage (avancement du défilement, 0 → 1). */
  start: number;
};

function piece(
  id: BodyPiece["id"],
  meshes: Partial<Record<MaterialKey, THREE.BufferGeometry | null>>,
  seams: THREE.Vector3[][] | null,
  start: number,
  move: [number, number, number],
  rot: [number, number, number],
): BodyPiece {
  const clean = Object.fromEntries(Object.entries(meshes).filter(([, g]) => !!g)) as Partial<
    Record<MaterialKey, THREE.BufferGeometry>
  >;
  const box = new THREE.Box3();
  for (const g of Object.values(clean)) {
    g.computeBoundingBox();
    box.union(g.boundingBox!);
  }
  const center = box.getCenter(new THREE.Vector3());
  const seamGeo = seams ? linesGeometry(seams) : undefined;
  for (const g of [...Object.values(clean), seamGeo]) g?.translate(-center.x, -center.y, -center.z);
  return {
    id,
    meshes: clean,
    seams: seamGeo,
    center,
    start,
    move: new THREE.Vector3(...move),
    rot: new THREE.Euler(...rot),
  };
}

const paintLo = (x: number) => Math.max(lowU(x), cladU(x));
const paintLoInArch = (x: number) => Math.max(lowUInArch(x), cladU(x));

/**
 * Tronçons du flanc en x : une colonne pile sur chaque bord d'arche (x = essieu ± r),
 * pour que les jambes des passages de roue soient exactement verticales.
 */
function sideSpans() {
  const [front, rear] = axles;
  const cuts = [split.tail, rear - arch.r, rear + arch.r, front - arch.r, front + arch.r, split.nose];
  const total = split.nose - split.tail;
  return cuts.slice(0, -1).map((x0, i) => {
    const x1 = cuts[i + 1]!;
    const inArch = i === 1 || i === 3;
    return { x0, x1, inArch, nx: Math.max(8, Math.round((240 * (x1 - x0)) / total)) };
  });
}

function sidePiece(s: Side): BodyPiece {
  const windows = DESIGN.sideWindows;
  const spans = sideSpans();
  return piece(
    s === 1 ? "left" : "right",
    {
      paint: mergeClean(
        spans.map((p) =>
          surfacePatch(S, { side: s, x0: p.x0, x1: p.x1, uLo: p.inArch ? paintLoInArch : paintLo, uHi: 4, nx: p.nx, nu: 32 }),
        ),
      ),
      cladding: mergeClean([
        ...spans.map((p) =>
          surfacePatch(S, {
            side: s,
            x0: p.x0,
            x1: p.x1,
            uLo: p.inArch ? lowUInArch : lowU,
            uHi: p.inArch ? paintLoInArch : paintLo,
            nx: p.nx,
            nu: 4,
            offset: 0.002,
          }),
        ),
        ...axles.map((ax) => flare(ax, s)),
      ]),
      liner: mergeClean(axles.map((ax) => wheelWell(ax, s))),
      gloss: mirror(s),
      chrome: mergeClean([
        handle(0.22, s),
        handle(-0.92, s),
        // Jonc de ceinture le long des vitres.
        surfaceStrip(S, s, (t) => [lerp(windows.at(-1)!.rear[0], windows[0]!.front[0], t), 4.0], 0.014, 160, 0.004),
      ]),
    },
    doorSeams(s),
    0.07,
    [0, 0.15, s * 1.6],
    [s * 0.22, 0, 0],
  );
}

function roofPiece(): BodyPiece {
  const x0 = split.tail;
  const x1 = split.cowl;
  const black = DESIGN.roof === "black";
  const lower = SIDES.map((s) => surfacePatch(S, { side: s, x0, x1, uLo: 4, uHi: 6, nx: 160, nu: 12 }));
  const upper = SIDES.map((s) => surfacePatch(S, { side: s, x0, x1, uLo: 6, uHi: 8, nx: 160, nu: 18 }));
  const ws = DESIGN.windshield;
  const rg = DESIGN.rearGlass;
  return piece(
    "roof",
    {
      // Montants et encadrements noir laqué : le pavillon couleur caisse « flotte » au-dessus.
      gloss: mergeClean([...lower, ...(black ? upper : []), spoiler(), sharkFin(), lidar()]),
      paint: black ? null : mergeClean(upper),
      glass: mergeClean([
        ...SIDES.flatMap((s) => DESIGN.sideWindows.map((w) => sideWindow(w, s))),
        topGlass(ws.x0, Math.min(ws.x1, x1), ws.u),
        topGlass(Math.max(rg.x0, x0), rg.x1, rg.u),
      ]),
      chrome: mergeClean([
        ...SIDES.map(roofRail),
        // Jonc chromé en haut des vitres, prolongé le long du montant A : il détache le vitrage des montants noirs.
        ...SIDES.map((s) =>
          surfaceStrip(
            S,
            s,
            (t) => [lerp(DESIGN.sideWindows.at(-1)!.rear[1], DESIGN.sideWindows[0]!.front[1], t), 5.985],
            0.012,
            160,
            0.005,
          ),
        ),
      ]),
      tailLamp: thirdBrakeLight(),
    },
    null,
    0.03,
    [0, 1.7, 0],
    [0, 0, 0.12],
  );
}

function hoodPiece(): BodyPiece {
  return piece(
    "hood",
    {
      paint: mergeClean(
        SIDES.map((s) => surfacePatch(S, { side: s, x0: split.cowl, x1: split.nose, uLo: 4, uHi: 8, nx: 64, nu: 28 })),
      ),
      gloss: wipers(),
    },
    hoodSeams(),
    0.05,
    [0.8, 1.2, 0],
    [0, 0, -0.55],
  );
}

/** Pièce d'extrémité : flancs de l'arrondi + face bombée, bas en habillage noir. */
function endPiece(front: boolean): BodyPiece {
  const x0 = front ? split.nose : S.xMin;
  const x1 = front ? S.xMax : split.tail;
  const xEnd = front ? S.xMax : S.xMin;
  const bulge = front ? DESIGN.bulge.front : DESIGN.bulge.rear;
  const uc = cladU(xEnd);
  // Colonnes resserrées vers la face : l'arrondi d'angle, serré, reste lisse en silhouette.
  const toward = front ? (s: number) => 1 - (1 - s) * (1 - s) : (s: number) => s * s;
  const sides = (uLo: (x: number) => number, uHi: (x: number) => number, nu: number, xa = x0, xb = x1) =>
    xb - xa < 0.005
      ? []
      : SIDES.map((s) =>
          surfacePatch(S, {
            side: s,
            x0: xa,
            x1: xb,
            uLo,
            uHi,
            nx: 36,
            nu,
            spacing: xa === x0 && xb === x1 ? toward : undefined,
          }),
        );
  const details = front ? frontDetails() : rearDetails();
  const rg = DESIGN.rearGlass;
  // Arrière : le montant D, entre la custode et la lunette, est une applique noir laqué.
  // Avec un toit noir, elle monte jusqu'à l'axe ; avec un toit couleur caisse, jusqu'au bord de la lunette.
  const xGlass = Math.min(Math.max(rg.x0, x0), x1);
  const pillarTop = DESIGN.roof === "black" ? 8 : rg.u;
  return piece(
    front ? "nose" : "tail",
    {
      paint: mergeClean([
        ...(front
          ? sides(cladU, () => 8, 64)
          : [
              ...sides(cladU, () => 4, 40),
              ...sides(() => 4, () => 8, 24, x0, xGlass),
              ...(pillarTop < 8 ? sides(() => pillarTop, () => 8, 12, xGlass, x1) : []),
            ]),
        endFace(S, front, bulge, 48, 32, uc, 8),
      ]),
      cladding: mergeClean([...sides(() => 0, cladU, 6), endFace(S, front, bulge, 8, 32, 0, uc)]),
      gloss: mergeClean([details.gloss, ...(front ? [] : sides(() => 4, () => pillarTop, 20, xGlass, x1))]),
      chrome: details.chrome,
      lamp: "lamp" in details ? details.lamp : null,
      tailLamp: "tailLamp" in details ? details.tailLamp : null,
      glass: front ? null : topGlass(rg.x0, Math.min(rg.x1, split.tail), rg.u),
    },
    front ? null : tailgateSeams(),
    0.09,
    [front ? 1.5 : -1.5, 0, 0],
    [0, 0, 0],
  );
}

/** Pièces de carrosserie, dans l'ordre du démontage. */
export function buildBody(): BodyPiece[] {
  return [roofPiece(), hoodPiece(), sidePiece(1), sidePiece(-1), endPiece(true), endPiece(false)];
}
