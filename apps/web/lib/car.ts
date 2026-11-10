/**
 * Voiture (SUV électrique) en fil de fer, dérivée de la même surface que la
 * carrosserie pleine (lib/car-body.ts) : les deux se superposent exactement.
 * Avant vers +x, toit vers +y, côté gauche vers +z. Unités ≈ mètres.
 *
 * Calques : silhouette, détails de carrosserie, cage (sections + lignes de niveau),
 * habitacle, châssis. Les roues sont construites à part (lib/car-wheel.ts).
 */
import * as THREE from "three";
import {
  ARCH_A0,
  ARCH_A1,
  RAIL,
  SURFACE as S,
  archTopY,
  decalOutlines,
  doorSeams,
  hoodSeams,
  lidarBox,
  lowU,
  mirrorShell,
  tailgateSeams,
} from "./car-body";
import { DESIGN } from "./car-design";
import { pushPolyline, sectionLine, surfaceLine, type V3 } from "./car-shape-core";

export type { V3 };

const lerp = THREE.MathUtils.lerp;
type Side = 1 | -1;
const toV3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

/** Boîte en fil de fer (12 arêtes). */
function box(out: V3[], [x0, y0, z0]: V3, [x1, y1, z1]: V3) {
  const c: V3[] = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  pushPolyline(out, c.slice(0, 4), true);
  pushPolyline(out, c.slice(4), true);
  for (let i = 0; i < 4; i++) out.push(c[i]!, c[i + 4]!);
}

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

/** Bas de caisse (u bas) en tronçons, interrompu par les passages de roue. */
function lowerEdge(s: Side): V3[][] {
  const runs: V3[][] = [];
  let run: V3[] = [];
  const n = 200;
  for (let i = 0; i <= n; i++) {
    const x = lerp(S.xMin + 0.01, S.xMax - 0.01, i / n);
    if (archTopY(x, DESIGN.arch.flare) > -Infinity) {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    const [z, y] = S.section(x, 0.3);
    run.push([x, y, s * (z + 0.004)]);
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

export function buildCar() {
  const outline: V3[] = []; // silhouette, trait principal
  const details: V3[] = []; // vitres, portes, optiques, accessoires
  const cage: V3[] = []; // sections transversales et lignes de niveau
  const interior: V3[] = []; // sièges, volant, planche de bord
  const chassis: V3[] = []; // essieux, batterie, berceaux
  const { split, axles, arch, wheel } = DESIGN;

  for (const s of [1, -1] as const) {
    /* silhouette : épaule, bord du pavillon, bas de caisse et passages de roue */
    pushPolyline(outline, surfaceLine(S, s, S.xMin + 0.01, S.xMax - 0.01, 3, 180));
    pushPolyline(outline, surfaceLine(S, s, S.xMin + 0.01, S.xMax - 0.01, 7, 180));
    for (const run of lowerEdge(s)) pushPolyline(outline, run);
    for (const ax of axles) {
      for (const [r, dz] of [
        [arch.r, arch.proud],
        [arch.r + arch.flare, 0.004],
      ] as const)
        pushPolyline(
          outline,
          arc(ax, arch.cy, r, ARCH_A0, ARCH_A1, 40).map(([x, y]) => [x, y, s * (S.halfWidth(x, y) + dz)] as V3),
        );
    }

    /* ceinture et haut de vitrage */
    pushPolyline(details, surfaceLine(S, s, split.tail, split.cowl, 4, 140));
    pushPolyline(details, surfaceLine(S, s, split.tail, split.cowl, 6, 140));
    /* vitres (contour de chaque vitre en (x, u)) */
    for (const w of DESIGN.sideWindows) {
      const loop: V3[] = [];
      const at = (x: number, u: number) => {
        const [z, y] = S.section(x, u);
        return [x, y, s * (z + 0.008)] as V3;
      };
      for (let i = 0; i <= 16; i++) loop.push(at(lerp(w.rear[0], w.front[0], i / 16), 4.07));
      for (let i = 0; i <= 8; i++) loop.push(at(lerp(w.front[0], w.front[1], i / 8), lerp(4.07, 5.93, i / 8)));
      for (let i = 0; i <= 16; i++) loop.push(at(lerp(w.front[1], w.rear[1], i / 16), 5.93));
      for (let i = 0; i <= 8; i++) loop.push(at(lerp(w.rear[1], w.rear[0], i / 8), lerp(5.93, 4.07, i / 8)));
      pushPolyline(details, loop);
    }
    /* portes, trappe de recharge */
    for (const l of doorSeams(s)) pushPolyline(details, l.map(toV3));
    /* rétroviseur (contour de la coque) */
    const m = mirrorShell(s);
    pushPolyline(
      details,
      arc(0, 0, 1, 0, Math.PI * 2, 20).map(([a, b]) => [m.x + 0.01 + a * 0.09, m.y + b * 0.065, m.z] as V3),
    );
    /* barres de toit affleurantes (arête haute) */
    pushPolyline(
      details,
      Array.from({ length: 25 }, (_, i) => {
        const x = lerp(RAIL.xa, RAIL.xb, i / 24);
        const [z, y] = S.section(x, RAIL.u);
        return [x, y + 0.003 + RAIL.h, s * z] as V3;
      }),
    );
  }

  /* capot, pare-brise, lunette, optiques, calandre */
  for (const l of [...hoodSeams(), ...tailgateSeams()]) pushPolyline(details, l.map(toV3));
  for (const l of decalOutlines()) pushPolyline(details, l.map(toV3));
  for (const [x0, x1, u] of [
    [DESIGN.windshield.x0, DESIGN.windshield.x1, DESIGN.windshield.u],
    [DESIGN.rearGlass.x0, DESIGN.rearGlass.x1, DESIGN.rearGlass.u],
  ] as const) {
    for (const s of [1, -1] as const) pushPolyline(details, surfaceLine(S, s, x0, x1, u, 30, 0.008));
    for (const x of [x0, x1]) {
      const left = Array.from({ length: 13 }, (_, i) => {
        const [z, y] = S.section(x, lerp(u, 8, i / 12));
        return [x, y + 0.006, z] as V3;
      });
      pushPolyline(details, [...left, ...left.slice(0, -1).reverse().map(([a, b, c]) => [a, b, -c] as V3)]);
    }
  }
  /* arête centrale du pavillon */
  pushPolyline(details, surfaceLine(S, 1, S.xMin + 0.02, S.xMax - 0.02, 8, 160, 0).map(([x, y]) => [x, y + 0.006, 0] as V3));
  /* boîtier du lidar */
  const lb = lidarBox();
  box(
    details,
    [lb.x - lb.size[0] / 2, lb.y - lb.size[1] / 2, -lb.size[2] / 2],
    [lb.x + lb.size[0] / 2, lb.y + lb.size[1] / 2, lb.size[2] / 2],
  );

  /* cage : sections transversales */
  for (const x of [S.xMax - 0.015, split.nose, 1.2, split.cowl, 0.45, -0.35, -1.2, split.tail, S.xMin + 0.015]) {
    pushPolyline(cage, sectionLine(S, x, 48, lowU(x), 0.004));
  }
  /* cage : lignes de niveau (vue en plan), interrompues par les passages de roue */
  for (const y of [0.45, 0.75, 1.0, 1.3, 1.55]) {
    for (const s of [1, -1] as const) {
      let run: V3[] = [];
      for (let i = 0; i <= 120; i++) {
        const x = lerp(S.xMin, S.xMax, i / 120);
        const w = S.halfWidth(x, y);
        if (w < 0.02 || y < archTopY(x, arch.flare)) {
          if (run.length > 1) pushPolyline(cage, run);
          run = [];
          continue;
        }
        run.push([x, y, s * (w + 0.004)]);
      }
      if (run.length > 1) pushPolyline(cage, run);
    }
  }

  /* sièges (deux rangées) */
  for (const s of [1, -1] as const) {
    for (const [sx, zc] of [[0.05, 0.42], [-1.0, 0.42]] as const) {
      const zz = s * zc;
      for (const dz of [-0.2, 0.2]) {
        const zs = zz + dz;
        pushPolyline(interior, [
          [sx + 0.38, 0.58, zs], [sx + 0.38, 0.64, zs], [sx, 0.62, zs], [sx - 0.12, 1.14, zs],
          [sx - 0.06, 1.16, zs], [sx + 0.06, 0.68, zs],
        ]);
      }
      for (const p of [[sx + 0.38, 0.64], [sx, 0.62], [sx - 0.12, 1.14]] as [number, number][])
        interior.push([p[0], p[1], zz - 0.2], [p[0], p[1], zz + 0.2]);
      box(interior, [sx - 0.16, 1.18, zz - 0.11], [sx - 0.08, 1.32, zz + 0.11]); // appui-tête
    }
  }
  /* volant (côté gauche) et planche de bord */
  const wheelC: V3 = [0.5, 1.0, 0.42];
  const tilt = 0.45;
  pushPolyline(
    interior,
    arc(0, 0, 0.17, 0, Math.PI * 2, 32).map(
      ([a, b]) => [wheelC[0] + Math.sin(tilt) * b, wheelC[1] + Math.cos(tilt) * b, wheelC[2] + a] as V3,
    ),
  );
  interior.push([wheelC[0], wheelC[1], wheelC[2] - 0.17], [wheelC[0], wheelC[1], wheelC[2] + 0.17]);
  interior.push(wheelC, [0.78, 0.9, 0.42]);
  interior.push([0.74, 1.04, 0.78], [0.74, 1.04, -0.78], [0.64, 0.95, 0.78], [0.64, 0.95, -0.78]);
  box(interior, [0.6, 1.04, -0.18], [0.64, 1.19, 0.18]); // écran central (sous le pare-brise)
  box(interior, [-0.2, 0.58, -0.1], [0.55, 0.74, 0.1]); // console centrale

  /* châssis : essieux, pack batterie quadrillé, berceaux moteurs */
  for (const x of axles) chassis.push([x, wheel.R, DESIGN.trackHalf - 0.05], [x, wheel.R, -DESIGN.trackHalf + 0.05]);
  // Pack batterie au-dessus de la garde au sol (bas de caisse à 0,24).
  box(chassis, [-1.0, 0.25, -0.72], [0.95, 0.34, 0.72]);
  for (let i = 1; i < 8; i++) {
    const x = lerp(-1.0, 0.95, i / 8);
    chassis.push([x, 0.34, -0.72], [x, 0.34, 0.72]);
  }
  for (let i = 1; i < 4; i++) {
    const zz = lerp(-0.72, 0.72, i / 4);
    chassis.push([-1.0, 0.34, zz], [0.95, 0.34, zz]);
  }
  for (const x of axles) box(chassis, [x - 0.22, wheel.R - 0.12, -0.32], [x + 0.22, wheel.R + 0.14, 0.32]);

  return { outline, details, cage, interior, chassis };
}
