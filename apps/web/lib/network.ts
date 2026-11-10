/**
 * Topologie TSN générée de façon déterministe (même dessin à chaque chargement) :
 * commutateurs en anneau maillé, stations terminales autour, flux périodiques
 * routés au plus court entre commutateurs.
 */
export type V3 = [number, number, number];

export type Flow = {
  path: V3[];
  lengths: number[];
  total: number;
  kind: "critical" | "control" | "best";
  speed: number;
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function buildNetwork(seed = 11) {
  const rand = mulberry32(seed);
  const S = 6;
  const switches: V3[] = [];
  for (let i = 0; i < S; i++) {
    const a = (i / S) * Math.PI * 2 + 0.3;
    switches.push([Math.cos(a) * 3.1, Math.sin(a) * 1.9, (rand() - 0.5) * 1.6]);
  }
  const swEdges: [number, number][] = [];
  for (let i = 0; i < S; i++) swEdges.push([i, (i + 1) % S]);
  swEdges.push([0, 3], [1, 4]);

  const stations: V3[] = [];
  const stationSwitch: number[] = [];
  switches.forEach((s, i) => {
    const base = Math.atan2(s[1] / 1.9, s[0] / 3.1);
    const n = i % 2 === 0 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const a = base + (k - (n - 1) / 2) * 0.42;
      const r = 1.65 + rand() * 0.35;
      stations.push([Math.cos(a) * 3.1 * r, Math.sin(a) * 1.9 * r, s[2] + (rand() - 0.5) * 2.2]);
      stationSwitch.push(i);
    }
  });

  // Plus court chemin entre commutateurs (BFS).
  const adj: number[][] = Array.from({ length: S }, () => []);
  swEdges.forEach(([a, b]) => {
    adj[a]!.push(b);
    adj[b]!.push(a);
  });
  const route = (from: number, to: number) => {
    const prev = new Array<number>(S).fill(-1);
    const seen = new Array<boolean>(S).fill(false);
    const q = [from];
    seen[from] = true;
    while (q.length) {
      const u = q.shift()!;
      if (u === to) break;
      for (const v of adj[u]!)
        if (!seen[v]) {
          seen[v] = true;
          prev[v] = u;
          q.push(v);
        }
    }
    const out = [to];
    while (out[0] !== from) out.unshift(prev[out[0]!]!);
    return out;
  };

  const flows: Flow[] = [];
  const kinds: Flow["kind"][] = ["critical", "control", "best"];
  const makeFlow = (src: number, dst: number, kind: Flow["kind"]): Flow => {
    const sw = route(stationSwitch[src]!, stationSwitch[dst]!);
    const path: V3[] = [stations[src]!, ...sw.map((i) => switches[i]!), stations[dst]!];
    const lengths = path.slice(1).map((p, i) => dist(path[i]!, p));
    return {
      path,
      lengths,
      total: lengths.reduce((s, l) => s + l, 0),
      kind,
      speed: kind === "critical" ? 2.4 : kind === "control" ? 1.8 : 1.3,
    };
  };

  // Flux « freinage » mis en avant dans le montage : traverse le réseau.
  const critical = makeFlow(0, stations.length - 4, "critical");
  for (let f = 0; f < 16; f++) {
    const src = Math.floor(rand() * stations.length);
    let dst = Math.floor(rand() * stations.length);
    if (stationSwitch[dst] === stationSwitch[src]) dst = (dst + 5) % stations.length;
    flows.push(makeFlow(src, dst, kinds[f % 3]!));
  }

  const links: V3[] = [];
  swEdges.forEach(([a, b]) => links.push(switches[a]!, switches[b]!));
  stations.forEach((s, i) => links.push(s, switches[stationSwitch[i]!]!));

  return { switches, stations, links, flows, critical };
}

/** Position le long d'une polyligne à l'abscisse curviligne d. */
export function pointAt(flow: Flow, d: number, out: V3): V3 {
  let rest = ((d % flow.total) + flow.total) % flow.total;
  for (let i = 0; i < flow.lengths.length; i++) {
    const l = flow.lengths[i]!;
    if (rest <= l) {
      const a = flow.path[i]!;
      const b = flow.path[i + 1]!;
      const t = l === 0 ? 0 : rest / l;
      out[0] = a[0] + (b[0] - a[0]) * t;
      out[1] = a[1] + (b[1] - a[1]) * t;
      out[2] = a[2] + (b[2] - a[2]) * t;
      return out;
    }
    rest -= l;
  }
  const last = flow.path[flow.path.length - 1]!;
  out[0] = last[0];
  out[1] = last[1];
  out[2] = last[2];
  return out;
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
