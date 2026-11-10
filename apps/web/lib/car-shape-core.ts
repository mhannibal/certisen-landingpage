/**
 * Socle mathématique de la forme du véhicule : une surface définie par des
 * sections clés (demi-sections gauches de 9 points sémantiques) interpolées le
 * long de x. Tout le reste (carrosserie pleine, fil de fer, largeur, hauteur,
 * vitres, optiques, positions du réseau) dérive de cette surface.
 *
 * Paramètre u ∈ [0, 8] le long d'une demi-section (points sémantiques) :
 *   0 bas de caisse · 1 rentré · 2 largeur maxi · 3 épaule · 4 ceinture
 *   5 milieu du vitrage · 6 haut du vitrage · 7 bord du toit · 8 axe (z = 0)
 */
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type P2 = [number, number]; // (z, y)
export type Station = { x: number; points: P2[] };

/* ------------------------------------------------------------------ */
/* Interpolation monotone (Fritsch–Carlson) : lisse, sans dépassement   */
/* ------------------------------------------------------------------ */
export function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  const d = new Array<number>(n - 1);
  const m = new Array<number>(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!);
  m[0] = d[0]!;
  m[n - 1] = d[n - 2]!;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i]!;
      m[i + 1] = t * b * d[i]!;
    }
  }
  return (x: number) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const t = (x - xs[i]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i]! +
      (t3 - 2 * t2 + t) * h * m[i]! +
      (-2 * t3 + 3 * t2) * ys[i + 1]! +
      (t3 - t2) * h * m[i + 1]!
    );
  };
}

/* ------------------------------------------------------------------ */
/* Catmull-Rom centripète par segment (paramètre sémantique entier)     */
/* ------------------------------------------------------------------ */
function crSegment(p0: P2, p1: P2, p2: P2, p3: P2, t: number): P2 {
  const td = (a: P2, b: P2) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  const t0 = 0;
  const t1 = t0 + td(p0, p1);
  const t2 = t1 + td(p1, p2);
  const t3 = t2 + td(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const lerp2 = (a: P2, b: P2, ta: number, tb: number): P2 => {
    const w = (tt - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  const a1 = lerp2(p0, p1, t0, t1);
  const a2 = lerp2(p1, p2, t1, t2);
  const a3 = lerp2(p2, p3, t2, t3);
  const b1 = lerp2(a1, a2, t0, t2);
  const b2 = lerp2(a2, a3, t1, t3);
  return lerp2(b1, b2, t1, t2);
}

/** Point de la demi-section au paramètre u ∈ [0, 8] (passe exactement par les 9 points). */
export function sectionCurve(pts: P2[], u: number): P2 {
  const k = Math.min(7, Math.max(0, Math.floor(u)));
  const t = Math.min(1, Math.max(0, u - k));
  const p0 = pts[Math.max(0, k - 1)]!;
  const p1 = pts[k]!;
  const p2 = pts[k + 1]!;
  // Au-delà de l'axe : symétrique du point 7 (tangente horizontale sur l'axe du toit).
  const p3: P2 = k + 2 <= 8 ? pts[k + 2]! : [-pts[7]![0], pts[7]![1]];
  return crSegment(p0, p1, p2, p3, t);
}

/* ------------------------------------------------------------------ */
/* Surface                                                              */
/* ------------------------------------------------------------------ */
export class CarSurface {
  readonly xMin: number;
  readonly xMax: number;
  private readonly interp: ((x: number) => number)[][]; // [point][0=z,1=y]

  constructor(readonly stations: Station[]) {
    const xs = stations.map((s) => s.x);
    this.xMin = xs[0]!;
    this.xMax = xs[xs.length - 1]!;
    this.interp = Array.from({ length: 9 }, (_, k) => [
      monotone(xs, stations.map((s) => s.points[k]![0])),
      monotone(xs, stations.map((s) => s.points[k]![1])),
    ]);
  }

  /** Les 9 points sémantiques de la demi-section à l'abscisse x. */
  pointsAt(x: number): P2[] {
    return this.interp.map(([fz, fy]) => [Math.max(0, fz!(x)), fy!(x)] as P2);
  }

  /** Point (z, y) de la demi-section gauche, paramètre u ∈ [0, 8]. */
  section(x: number, u: number, pts = this.pointsAt(x)): P2 {
    const p = sectionCurve(pts, u);
    return [Math.max(0, p[0]), p[1]];
  }

  /** Point 3D de la surface. side = +1 gauche, −1 droite. */
  point(x: number, u: number, side: 1 | -1, out = new THREE.Vector3(), pts?: P2[]) {
    const [z, y] = this.section(x, u, pts);
    return out.set(x, y, side * z);
  }

  /** Hauteur du dessus (axe du toit / capot) à l'abscisse x. */
  topY(x: number) {
    return this.pointsAt(x)[8]![1];
  }

  /** Demi-largeur à la hauteur y (z univoque en y sur le flanc, de u = 0 à 8). */
  halfWidth(x: number, y: number) {
    const pts = this.pointsAt(x);
    let prev = this.section(x, 0, pts);
    if (y <= prev[1]) return prev[0];
    const N = 64;
    for (let i = 1; i <= N; i++) {
      const cur = this.section(x, (8 * i) / N, pts);
      if (y <= cur[1]) {
        const w = (y - prev[1]) / Math.max(1e-6, cur[1] - prev[1]);
        return prev[0] + (cur[0] - prev[0]) * w;
      }
      prev = cur;
    }
    return 0;
  }

  /** Paramètre u où la demi-section atteint la hauteur y (dichotomie sur [lo, hi]). */
  uAtHeight(x: number, y: number, lo = 0, hi = 4) {
    const pts = this.pointsAt(x);
    if (this.section(x, lo, pts)[1] >= y) return lo;
    if (this.section(x, hi, pts)[1] <= y) return hi;
    let a = lo;
    let b = hi;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (this.section(x, m, pts)[1] < y) a = m;
      else b = m;
    }
    return (a + b) / 2;
  }
}

/* ------------------------------------------------------------------ */
/* Maillages paramétriques                                              */
/* ------------------------------------------------------------------ */

/**
 * Grille (i, j) → position, triangulée avec un ordre de sommets qui donne des
 * normales vers l'extérieur ; flip = true inverse l'ordre (côté droit miroir).
 */
export function gridGeometry(
  ni: number,
  nj: number,
  at: (s: number, t: number) => THREE.Vector3,
  flip = false,
) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= ni; i++)
    for (let j = 0; j <= nj; j++) {
      const p = at(i / ni, j / nj);
      pos.push(p.x, p.y, p.z);
    }
  const row = nj + 1;
  for (let i = 0; i < ni; i++)
    for (let j = 0; j < nj; j++) {
      const a = i * row + j;
      const b = a + row;
      if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const lerp = THREE.MathUtils.lerp;
type UBound = number | ((x: number) => number);
const bound = (b: UBound) => (typeof b === "number" ? () => b : b);

/** Décale chaque sommet le long de sa normale (vitres, joncs en surépaisseur). */
export function offsetAlongNormals(g: THREE.BufferGeometry, d: number) {
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++)
    p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/**
 * Oriente toutes les faces d'une géométrie indexée vers `dir` (normale moyenne
 * pondérée par l'aire) : utile pour les bouchons et décalques dont l'ordre des
 * sommets n'est pas évident.
 */
export function orient(g: THREE.BufferGeometry, dir: THREE.Vector3) {
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const idx = g.getIndex();
  if (!idx) return g;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const sum = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(p, idx.getX(i));
    b.fromBufferAttribute(p, idx.getX(i + 1)).sub(a);
    c.fromBufferAttribute(p, idx.getX(i + 2)).sub(a);
    sum.add(b.cross(c));
  }
  if (sum.dot(dir) < 0) {
    for (let i = 0; i < idx.count; i += 3) {
      const t = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, t);
    }
    idx.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Panneau de la surface d'un côté : x ∈ [x0, x1] (x0 < x1), u entre uLo(x) et uHi(x).
 * Les normales sont tournées vers l'extérieur (gauche +z, droite −z, dessus +y).
 */
export function surfacePatch(
  S: CarSurface,
  o: {
    side: 1 | -1;
    x0: number;
    x1: number;
    uLo: UBound;
    uHi: UBound;
    nx: number;
    nu: number;
    /** Décalage le long de la normale. */
    offset?: number;
    /** Répartition des colonnes (0 → 1) ; par défaut uniforme. */
    spacing?: (s: number) => number;
  },
) {
  const lo = bound(o.uLo);
  const hi = bound(o.uHi);
  const sp = o.spacing ?? ((s: number) => s);
  const pos: number[] = [];
  const nor: number[] = [];
  const n = new THREE.Vector3();
  for (let i = 0; i <= o.nx; i++) {
    // Une colonne par x : les points sémantiques (et ceux de x ± h) sont calculés une fois.
    const x = lerp(o.x0, o.x1, sp(i / o.nx));
    const cols = surfaceColumns(S, x);
    const a = lo(x);
    const b = hi(x);
    for (let j = 0; j <= o.nu; j++) {
      const u = lerp(a, b, j / o.nu);
      const [z, y] = S.section(x, u, cols.at);
      surfaceNormal(S, x, u, o.side, cols, n);
      const d = o.offset ?? 0;
      pos.push(x + n.x * d, y + n.y * d, o.side * z + n.z * d);
      nor.push(n.x, n.y, n.z);
    }
  }
  const idx: number[] = [];
  const row = o.nu + 1;
  for (let i = 0; i < o.nx; i++)
    for (let j = 0; j < o.nu; j++) {
      const a = i * row + j;
      const b = a + row;
      if (o.side === -1) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

const H = 1e-3;

/** Points sémantiques en x, x − h et x + h (dérivées par différences finies). */
function surfaceColumns(S: CarSurface, x: number) {
  return { at: S.pointsAt(x), prev: S.pointsAt(x - H), next: S.pointsAt(x + H) };
}

/**
 * Normale ANALYTIQUE de la surface (∂S/∂x × ∂S/∂u, différences finies), tournée vers
 * l'extérieur. Calculée sur la surface et non par panneau : deux pièces voisines
 * (capot / aile, flanc / toit, flanc / nez) ont exactement la même normale à leur
 * frontière, donc aucune couture dans les reflets du vernis.
 */
function surfaceNormal(
  S: CarSurface,
  x: number,
  u: number,
  side: 1 | -1,
  cols: ReturnType<typeof surfaceColumns>,
  out: THREE.Vector3,
) {
  const [zx1, yx1] = S.section(x + H, u, cols.next);
  const [zx0, yx0] = S.section(x - H, u, cols.prev);
  const ua = Math.max(0, u - H);
  const ub = Math.min(8, u + H);
  const [zu1, yu1] = S.section(x, ub, cols.at);
  const [zu0, yu0] = S.section(x, ua, cols.at);
  // Tangentes (côté gauche) ; le côté droit est le miroir en z.
  const dx = new THREE.Vector3(2 * H, yx1 - yx0, side * (zx1 - zx0));
  const du = new THREE.Vector3(0, yu1 - yu0, side * (zu1 - zu0));
  out.crossVectors(dx, du).multiplyScalar(side);
  const l = out.length();
  if (l < 1e-12) return out.set(0, u > 7 ? 1 : 0, u > 7 ? 0 : side);
  return out.divideScalar(l);
}

/**
 * Bande étroite posée sur la surface autour d'une courbe (x(s), u(s)) : demi-épaisseur
 * `half` mesurée en u. Sert aux joncs, poignées, nervures.
 */
export function surfaceStrip(
  S: CarSurface,
  side: 1 | -1,
  curve: (s: number) => [number, number],
  half: number | ((s: number) => number),
  n: number,
  offset: number,
) {
  const h = typeof half === "number" ? () => half : half;
  const g = gridGeometry(
    n,
    1,
    (s, t) => {
      const [x, u] = curve(s);
      return S.point(x, Math.min(8, Math.max(0, u + (t * 2 - 1) * h(s))), side);
    },
    side === -1,
  );
  // L'ordre (s, t) peut inverser la face selon le sens de la courbe : on corrige.
  orient(g, new THREE.Vector3(0, 0.3, side));
  if (offset) offsetAlongNormals(g, offset);
  return g;
}

/**
 * Face d'extrémité (bouclier) refermant la section de la station extrême, légèrement
 * bombée : grille (u, t) avec u le long de la demi-section et t de −1 (droite) à +1 (gauche).
 * `bulge(u)` donne l'avancée au centre (en x, vers l'extérieur) ; nulle sur le contour.
 */
export function endFace(
  S: CarSurface,
  front: boolean,
  bulge: (u: number) => number,
  nu = 64,
  nt = 32,
  uLo = 0,
  uHi = 8,
) {
  const xEnd = front ? S.xMax : S.xMin;
  const pts = S.pointsAt(xEnd);
  const dir = front ? 1 : -1;
  const g = gridGeometry(nu, nt, (a, b) => {
    const u = lerp(uLo, uHi, a);
    const t = b * 2 - 1;
    const [z, y] = S.section(xEnd, u, pts);
    return new THREE.Vector3(xEnd + dir * bulge(u) * (1 - t * t), y, t * z);
  });
  return orient(g, new THREE.Vector3(dir, 0, 0));
}

/**
 * Point de la face avant (ou arrière) à la hauteur y et à l'écart latéral z :
 * sur la face d'extrémité bombée si |z| est dans la section extrême, sinon sur
 * l'arrondi d'angle (recherche du x où la demi-largeur vaut |z|).
 */
export function endPoint(
  S: CarSurface,
  front: boolean,
  bulge: (u: number) => number,
  y: number,
  z: number,
  xLimit: number,
  out = new THREE.Vector3(),
) {
  const xEnd = front ? S.xMax : S.xMin;
  const pts = S.pointsAt(xEnd);
  const az = Math.abs(z);
  // Sur la face d'extrémité seulement si y est dans la hauteur de la section extrême.
  if (y >= pts[0]![1] && y <= pts[8]![1]) {
    const u = S.uAtHeight(xEnd, y, 0, 8);
    const [zEnd] = S.section(xEnd, u, pts);
    if (az <= zEnd) {
      const t = zEnd > 1e-6 ? az / zEnd : 0;
      return out.set(xEnd + (front ? 1 : -1) * bulge(u) * (1 - t * t), y, z);
    }
  }
  // Arrondi d'angle (ou dessus du hayon / du capot) : x où le contour à la hauteur y passe par |z|.
  let a = front ? xLimit : xEnd;
  let b = front ? xEnd : xLimit;
  for (let i = 0; i < 24; i++) {
    const m = (a + b) / 2;
    const w = S.halfWidth(m, y);
    // Avant : w décroît quand x augmente ; arrière : w croît quand x augmente.
    if (front ? w > az : w <= az) a = m;
    else b = m;
  }
  return out.set((a + b) / 2, y, z);
}

/**
 * Décalque conforme sur une face d'extrémité : la forme est décrite en vue de face
 * par une courbe médiane (z(s), y(s)) et une demi-hauteur h(s) ; chaque sommet est
 * reprojeté sur la carrosserie puis avancé de `offset`.
 */
export function endDecal(
  S: CarSurface,
  front: boolean,
  bulge: (u: number) => number,
  xLimit: number,
  mid: (s: number) => [number, number],
  half: (s: number) => number,
  n: number,
  offset: number,
  m = 2,
) {
  const dir = front ? 1 : -1;
  const g = gridGeometry(n, m, (s, t) => {
    const [z, y] = mid(s);
    const p = endPoint(S, front, bulge, y + (t * 2 - 1) * half(s), z, xLimit);
    return p;
  });
  orient(g, new THREE.Vector3(dir, 0, 0));
  return offsetAlongNormals(g, offset);
}

/* ------------------------------------------------------------------ */
/* Lignes sur la surface (fil de fer)                                   */
/* ------------------------------------------------------------------ */

export type V3 = [number, number, number];

/** Ligne longitudinale à u constant (ou u(x)) d'un côté, légèrement décollée de la surface. */
export function surfaceLine(
  S: CarSurface,
  side: 1 | -1,
  x0: number,
  x1: number,
  u: UBound,
  n: number,
  lift = 0.004,
): V3[] {
  const fu = bound(u);
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    const [z, y] = S.section(x, fu(x));
    out.push([x, y, side * (z + lift)]);
  }
  return out;
}

/** Section transversale complète (gauche puis droite) à l'abscisse x, de uLo à 8. */
export function sectionLine(S: CarSurface, x: number, n: number, uLo: number = 0, lift = 0.004): V3[] {
  const pts = S.pointsAt(x);
  const left: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const [z, y] = S.section(x, lerp(uLo, 8, i / n), pts);
    left.push([x, y + (i === n ? lift : 0), z + lift]);
  }
  const right = left
    .slice(0, -1)
    .reverse()
    .map(([a, b, c]) => [a, b, -c] as V3);
  return [...left, ...right];
}

/** Polyligne → segments (paires de points) pour un rendu en `segments`. */
export function pushPolyline(out: V3[], pts: V3[], closed = false) {
  for (let i = 0; i < pts.length - 1; i++) out.push(pts[i]!, pts[i + 1]!);
  if (closed && pts.length > 2) out.push(pts[pts.length - 1]!, pts[0]!);
}

/**
 * Normales lissées sauf aux arêtes vives (angle > `angle`). toCreasedNormals regroupe
 * les sommets au centième d'unité, soit 1 cm ici : on travaille à l'échelle ×1000
 * pour ne fusionner que les sommets réellement confondus.
 */
export function creasedNormals(g: THREE.BufferGeometry, angle: number) {
  g.scale(1000, 1000, 1000);
  const r = toCreasedNormals(g, angle);
  r.scale(0.001, 0.001, 0.001);
  return r;
}

/**
 * Fusionne des géométries hétérogènes (grilles, tours, extrusions, boîtes) :
 * on ne garde que position et normale, toutes non indexées.
 */
export function mergeClean(geoms: (THREE.BufferGeometry | null | undefined)[]) {
  const list = geoms
    .filter((g): g is THREE.BufferGeometry => !!g)
    .map((g) => {
      const c = g.index ? g.toNonIndexed() : g.clone();
      for (const name of Object.keys(c.attributes)) if (name !== "position" && name !== "normal") c.deleteAttribute(name);
      if (!c.getAttribute("normal")) c.computeVertexNormals();
      c.clearGroups();
      return c;
    });
  if (list.length === 0) return null;
  return mergeGeometries(list);
}

/** Segments de ligne à partir d'une liste de polylignes. */
export function linesGeometry(polylines: THREE.Vector3[][]) {
  const pos: number[] = [];
  for (const pl of polylines)
    for (let i = 0; i < pl.length - 1; i++) {
      const a = pl[i]!;
      const b = pl[i + 1]!;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
