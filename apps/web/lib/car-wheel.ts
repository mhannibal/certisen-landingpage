/**
 * Roue réaliste générée en code et sa version fil de fer, à partir des mêmes cotes :
 * pneu au flanc bombé avec rainures, jante bi-ton à 5 doubles branches concaves,
 * rebord poli, disque et étrier de frein.
 *
 * Repère local : axe de rotation = z, face extérieure vers +z, origine au centre
 * de la roue (milieu de la bande de roulement).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { creasedNormals } from "./car-shape-core";

export type WheelSpec = {
  /** Rayon extérieur du pneu. */
  R: number;
  /** Largeur de section du pneu. */
  W: number;
  /** Rayon de la jante (siège du talon). */
  rimR: number;
  /** Largeur de la jante. */
  rimW: number;
  /** Rayon du disque de frein. */
  discR: number;
};

type V3 = [number, number, number];
type P2 = [number, number];

const SPOKE_PAIRS = 5;
/** Demi-largeur d'une branche. */
const SPOKE_HALF = 0.0115;
/** Creux de la jante : le moyeu est en retrait du rebord. */
const DISH = 0.034;
const FACE_DEPTH = 0.022;
const BEVEL = 0.006;
/** Rayon de l'alésage central (sous le cache-moyeu). */
const BORE = 0.028;

const lerp = THREE.MathUtils.lerp;

/* ------------------------------------------------------------------ */
/* Pneu                                                                 */
/* ------------------------------------------------------------------ */

/** Positions (fraction de la demi-largeur) des rainures de la bande de roulement. */
const GROOVES = [0.5, 0.15];
const TREAD_EDGE = 0.76;

/** Demi-profil (r, h) du pneu, du talon extérieur jusqu'au milieu de la bande de roulement. */
function tireHalfProfile({ R, W, rimR, rimW }: WheelSpec): P2[] {
  const hw = W / 2;
  const sw = R - rimR;
  // Flanc bombé : du talon (posé sur le rebord de jante) à l'épaule arrondie.
  const flank = new THREE.CatmullRomCurve3(
    [
      [rimR + 0.004, rimW / 2 + 0.006],
      [rimR + 0.14 * sw, hw * 0.955],
      [rimR + 0.48 * sw, hw],
      [rimR + 0.78 * sw, hw * 0.972],
      [R - 0.06 * sw, hw * 0.9],
      [R - 0.01, hw * 0.83],
      [R, hw * TREAD_EDGE],
    ].map(([r, h]) => new THREE.Vector3(r, h, 0)),
    false,
    "centripetal",
  )
    .getPoints(18)
    .map((v) => [v.x, v.y] as P2);

  // Bande de roulement légèrement bombée, avec rainures circonférentielles.
  const crown = (h: number) => R + 0.003 * (1 - (h / (hw * TREAD_EDGE)) ** 2);
  const gw = 0.011;
  const gd = 0.008;
  const tread: P2[] = [];
  for (const g of GROOVES) {
    const h = g * hw;
    tread.push([crown(h + gw / 2), h + gw / 2], [R - gd, h + gw / 2 - 0.0015], [R - gd, h - gw / 2 + 0.0015], [crown(h - gw / 2), h - gw / 2]);
  }
  tread.push([crown(0), 0]);
  return [...flank, ...tread];
}

export function tireGeometry(spec: WheelSpec, segments = 112) {
  const half = tireHalfProfile(spec);
  // Profil complet parcouru par l'extérieur : talon intérieur → bande → talon extérieur.
  const profile = [...half.map(([r, h]) => [r, -h] as P2), ...half.slice(0, -1).reverse()];
  const g = new THREE.LatheGeometry(
    profile.map(([r, h]) => new THREE.Vector2(r, h)),
    segments,
  );
  g.rotateX(Math.PI / 2); // axe du tour (y) → axe de la roue (z), face extérieure vers +z
  return g;
}

/* ------------------------------------------------------------------ */
/* Jante                                                                */
/* ------------------------------------------------------------------ */

function faceRadius(spec: WheelSpec) {
  return spec.rimR - 0.008;
}

/** Plan de la face de jante (rebord) : au ras du rebord, en retrait du flanc bombé. */
function faceZ(spec: WheelSpec) {
  return spec.rimW / 2 + 0.004;
}

/** Retrait (creux) de la face de jante au rayon r. */
function dishAt(r: number, rf: number) {
  return -DISH * (1 - Math.min(1, r / rf) ** 2);
}

/**
 * Plan médian du disque de frein, derrière le moyeu : assez en retrait pour que
 * l'étrier passe derrière le dos des branches (jeu ≈ 4 mm au rayon 0,12).
 */
function discPlane(spec: WheelSpec) {
  return faceZ(spec) + dishAt(0, faceRadius(spec)) - 0.068;
}

/** Ajours de la jante : 5 grands entre les paires de branches, 5 petits dans chaque paire. */
function rimHoles(spec: WheelSpec): P2[][] {
  const rf = faceRadius(spec);
  const r0 = 0.098; // moyeu plein
  const r1 = rf - 0.02; // couronne extérieure de la face
  const step = (Math.PI * 2) / SPOKE_PAIRS;
  // Écart des deux branches d'une paire : jointes au moyeu, ouvertes vers le rebord.
  const delta = (r: number) => lerp(0.035, 0.125, (r - r0) / (r1 - r0));
  const edge = (r: number) => Math.asin(SPOKE_HALF / r);
  const holes: P2[][] = [];

  const polygon = (lo: (r: number) => number, hi: (r: number) => number, ra: number, rb: number) => {
    const pts: P2[] = [];
    const n = 8;
    const at = (r: number, a: number): P2 => [Math.cos(a) * r, Math.sin(a) * r];
    for (let i = 0; i <= n; i++) {
      const r = lerp(ra, rb, i / n);
      pts.push(at(r, lo(r)));
    }
    const arcN = 10;
    for (let i = 1; i < arcN; i++) pts.push(at(rb, lerp(lo(rb), hi(rb), i / arcN)));
    for (let i = n; i >= 0; i--) {
      const r = lerp(ra, rb, i / n);
      pts.push(at(r, hi(r)));
    }
    for (let i = 1; i < 4; i++) pts.push(at(ra, lerp(hi(ra), lo(ra), i / 4)));
    return chaikin(pts);
  };

  for (let k = 0; k < SPOKE_PAIRS; k++) {
    const a = k * step + Math.PI / 2; // une paire de branches vers le haut
    // Grand ajour entre la paire k et la paire k + 1.
    holes.push(
      polygon(
        (r) => a + delta(r) + edge(r),
        (r) => a + step - delta(r) - edge(r),
        r0 + 0.012,
        r1,
      ),
    );
    // Petit ajour entre les deux branches d'une paire, là où elles se sont écartées.
    let rs = r0;
    while (rs < r1 && delta(rs) - edge(rs) < 0.022) rs += 0.002;
    if (r1 - rs > 0.03)
      holes.push(
        polygon(
          (r) => a - delta(r) + edge(r),
          (r) => a + delta(r) - edge(r),
          rs,
          r1,
        ),
      );
  }
  return holes;
}

/** Arrondi des angles d'un contour fermé (une passe de Chaikin). */
function chaikin(pts: P2[]): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  return out;
}

/**
 * Face de jante extrudée. Groupes de matériaux d'ExtrudeGeometry :
 * 0 = faces (usinées, claires), 1 = flancs et chanfreins (sombres) → aspect bi-ton.
 */
function rimFaceGeometry(spec: WheelSpec) {
  const rf = faceRadius(spec);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rf, 0, Math.PI * 2, false);
  for (const h of rimHoles(spec)) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  // Alésage central (caché par le cache-moyeu) : donne des sommets au moyeu pour qu'il suive le creux.
  const bore = new THREE.Path();
  bore.absarc(0, 0, BORE, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: FACE_DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 48,
  });
  // Face avant au plan z = faceZ, puis creux progressif vers le moyeu.
  g.translate(0, 0, faceZ(spec) - FACE_DEPTH - BEVEL);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    pos.setZ(i, pos.getZ(i) + dishAt(r, rf));
  }
  // Normales lissées sur le creux, arêtes vives conservées (chanfreins, flancs des branches).
  return creasedNormals(g, Math.PI / 5);
}

/** Tour (r, h) → géométrie autour de l'axe z. */
function lathe(profile: P2[], segments: number) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, h]) => new THREE.Vector2(r, h)),
    segments,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylindre d'axe z (écrous, cache-moyeu). */
function zCylinder(r: number, h: number, seg: number, x: number, y: number, z: number) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

/** Secteur annulaire extrudé (étrier), d'axe z. */
function annularSector(r0: number, r1: number, a0: number, a1: number, depth: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 12 });
}

export type WheelGeometries = {
  tire: THREE.BufferGeometry;
  /** Face de jante (groupes : 0 usiné, 1 sombre). */
  face: THREE.BufferGeometry;
  /** Rebord poli. */
  lip: THREE.BufferGeometry;
  /** Fût, écrous, cache-moyeu (sombres). */
  dark: THREE.BufferGeometry;
  disc: THREE.BufferGeometry;
  /** Étrier (ne tourne pas), angle central en radians dans le repère local. */
  caliper: (angle: number) => THREE.BufferGeometry;
};

export function wheelGeometries(spec: WheelSpec): WheelGeometries {
  const { rimR, rimW, discR } = spec;
  const rf = faceRadius(spec);
  const zf = faceZ(spec);
  const hubZ = zf + dishAt(0, rf);

  // Profils de tour parcourus à r décroissant pour une face tournée vers +z (extérieur).
  const lip = lathe(
    [
      [rimR + 0.012, zf - 0.014],
      [rimR + 0.012, zf - 0.002],
      [rimR + 0.004, zf + 0.004],
      [rf + 0.002, zf + 0.002],
      [rf - 0.006, zf - 0.006],
    ],
    96,
  );

  const step = (Math.PI * 2) / SPOKE_PAIRS;
  const dark = mergeGeometries([
    // Fût de jante, vu à travers les ajours (normales vers l'intérieur).
    lathe(
      [
        [rimR - 0.003, zf - 0.012],
        [rimR - 0.003, -rimW / 2],
      ],
      72,
    ),
    // Cache-moyeu et écrous.
    zCylinder(0.034, 0.012, 32, 0, 0, hubZ + 0.004),
    ...Array.from({ length: SPOKE_PAIRS }, (_, k) => {
      const a = k * step + Math.PI / 2 + step / 2;
      return zCylinder(0.0105, 0.016, 6, Math.cos(a) * 0.058, Math.sin(a) * 0.058, hubZ + 0.002);
    }),
  ])!;

  // Disque : couronne épaisse + bol central, assez en retrait pour que l'étrier passe derrière les branches.
  const discZ = discPlane(spec);
  const disc = mergeGeometries([
    lathe(
      [
        [0.09, discZ - 0.014],
        [discR, discZ - 0.014],
        [discR, discZ + 0.014],
        [0.09, discZ + 0.014],
      ],
      72,
    ),
    lathe(
      [
        [0.09, discZ + 0.014],
        [0.085, discZ + 0.03],
        [0.02, discZ + 0.03],
      ],
      48,
    ),
  ])!;

  const caliper = (angle: number) => {
    const g = annularSector(discR - 0.055, discR + 0.016, angle - 0.42, angle + 0.42, 0.058);
    g.translate(0, 0, discZ - 0.026);
    return g;
  };

  return { tire: tireGeometry(spec), face: rimFaceGeometry(spec), lip, dark, disc, caliper };
}

/* ------------------------------------------------------------------ */
/* Fil de fer                                                           */
/* ------------------------------------------------------------------ */

function ring(out: V3[], r: number, z: number, n = 56) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    out.push([Math.cos(a) * r, Math.sin(a) * r, z], [Math.cos(b) * r, Math.sin(b) * r, z]);
  }
}

/** Roue en fil de fer superposable à la roue pleine (même repère, mêmes cotes). */
export function wheelLines(spec: WheelSpec) {
  const { R, W, rimR, rimW, discR } = spec;
  const hw = W / 2;
  const tire: V3[] = [];
  const rim: V3[] = [];

  /* pneu : flancs (bombé), arêtes et rainures de la bande de roulement, sculpture */
  for (const s of [1, -1]) {
    ring(tire, rimR + 0.48 * (R - rimR), s * hw);
    ring(tire, R, s * hw * TREAD_EDGE);
    ring(tire, rimR + 0.004, s * (rimW / 2 + 0.006), 48);
  }
  for (const g of GROOVES) for (const s of [1, -1]) ring(tire, R - 0.004, s * g * hw, 56);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const b = a + Math.PI / 28;
    const zEdge = hw * TREAD_EDGE;
    tire.push([Math.cos(a) * R, Math.sin(a) * R, zEdge], [Math.cos(b) * R, Math.sin(b) * R, 0]);
    tire.push([Math.cos(b) * R, Math.sin(b) * R, 0], [Math.cos(a) * R, Math.sin(a) * R, -zEdge]);
  }

  /* jante : contours des ajours (au creux près), rebord, moyeu, écrous, disque */
  const rf = faceRadius(spec);
  const zf = faceZ(spec);
  for (const h of rimHoles(spec)) {
    for (let i = 0; i < h.length; i++) {
      const [x0, y0] = h[i]!;
      const [x1, y1] = h[(i + 1) % h.length]!;
      rim.push([x0, y0, zf + dishAt(Math.hypot(x0, y0), rf) + 0.001], [x1, y1, zf + dishAt(Math.hypot(x1, y1), rf) + 0.001]);
    }
  }
  ring(rim, rimR + 0.006, zf + 0.002, 64);
  ring(rim, 0.034, zf + dishAt(0, rf) + 0.011, 20);
  const step = (Math.PI * 2) / SPOKE_PAIRS;
  for (let k = 0; k < SPOKE_PAIRS; k++) {
    const a = k * step + Math.PI / 2 + step / 2;
    const cx = Math.cos(a) * 0.058;
    const cy = Math.sin(a) * 0.058;
    const z = zf + dishAt(0.058, rf) + 0.011;
    for (let i = 0; i < 6; i++) {
      const b0 = (i / 6) * Math.PI * 2;
      const b1 = ((i + 1) / 6) * Math.PI * 2;
      rim.push([cx + Math.cos(b0) * 0.0105, cy + Math.sin(b0) * 0.0105, z], [cx + Math.cos(b1) * 0.0105, cy + Math.sin(b1) * 0.0105, z]);
    }
  }
  const discZ = discPlane(spec);
  ring(rim, discR, discZ + 0.014, 48);
  ring(rim, 0.09, discZ + 0.014, 24);
  return { tire, rim };
}

/** Étrier en fil de fer (contour du secteur, faces avant et arrière). */
export function caliperLines(spec: WheelSpec, angle: number) {
  const { discR } = spec;
  const discZ = discPlane(spec);
  const r0 = discR - 0.055;
  const r1 = discR + 0.016;
  const a0 = angle - 0.42;
  const a1 = angle + 0.42;
  const out: V3[] = [];
  const n = 10;
  for (const z of [discZ - 0.026, discZ + 0.038]) {
    const loop: P2[] = [];
    for (let i = 0; i <= n; i++) loop.push([Math.cos(lerp(a0, a1, i / n)) * r1, Math.sin(lerp(a0, a1, i / n)) * r1]);
    for (let i = n; i >= 0; i--) loop.push([Math.cos(lerp(a0, a1, i / n)) * r0, Math.sin(lerp(a0, a1, i / n)) * r0]);
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i]!;
      const q = loop[(i + 1) % loop.length]!;
      out.push([p[0], p[1], z], [q[0], q[1], z]);
    }
  }
  for (const [r, a] of [[r1, a0], [r1, a1], [r0, a0], [r0, a1]] as const)
    out.push([Math.cos(a) * r, Math.sin(a) * r, discZ - 0.026], [Math.cos(a) * r, Math.sin(a) * r, discZ + 0.038]);
  return out;
}
