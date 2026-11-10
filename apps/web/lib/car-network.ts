/**
 * Réseau TSN embarqué dans la voiture (architecture zonale simplifiée).
 * Les textes (noms, rôles, caractéristiques) sont dans les dictionnaires `car`.
 * Les valeurs de latence sont des exemples d'illustration, pas des mesures.
 */
import type { V3 } from "./car";

export type NodeKind = "switch" | "sensor" | "compute" | "actuator";

export type CarNode = {
  id: "sw-front" | "sw-central" | "sw-rear" | "radar" | "camera" | "ecu" | "brake-fl" | "brake-rl" | "lidar";
  kind: NodeKind;
  pos: V3;
  /** Latence au pire cas et échéance du flux principal, en ms (illustration). */
  flow: { bound: number; deadline: number };
  critical: boolean;
};

/*
 * Positions calculées sur la surface du véhicule (lib/car-design.ts) :
 * radar 16 mm derrière la peau du bouclier (calandre haute), caméra 27 mm sous
 * le haut du pare-brise, lidar sur son boîtier de toit, freins au centre de
 * l'étrier avant / arrière gauche ; commutateurs et calculateur dans la caisse.
 * Valeurs figées ici pour ne pas charger la géométrie 3D dans le graphe SVG.
 */
export const NODES: CarNode[] = [
  { id: "sw-front", kind: "switch", pos: [1.75, 0.66, 0], critical: true, flow: { bound: 0.41, deadline: 1 } },
  { id: "sw-central", kind: "switch", pos: [0.05, 0.72, 0], critical: true, flow: { bound: 0.41, deadline: 1 } },
  { id: "sw-rear", kind: "switch", pos: [-1.55, 0.74, 0], critical: false, flow: { bound: 0.58, deadline: 2 } },
  { id: "radar", kind: "sensor", pos: [2.272, 0.7, 0.18], critical: true, flow: { bound: 0.18, deadline: 0.5 } },
  { id: "camera", kind: "sensor", pos: [0.2, 1.515, 0], critical: false, flow: { bound: 1.6, deadline: 5 } },
  { id: "ecu", kind: "compute", pos: [-0.55, 0.98, 0], critical: true, flow: { bound: 0.23, deadline: 0.5 } },
  { id: "brake-fl", kind: "actuator", pos: [1.29, 0.474, 0.833], critical: true, flow: { bound: 0.82, deadline: 1 } },
  { id: "brake-rl", kind: "actuator", pos: [-1.55, 0.474, 0.833], critical: false, flow: { bound: 0.96, deadline: 2 } },
  { id: "lidar", kind: "sensor", pos: [-0.62, 1.7, 0], critical: false, flow: { bound: 1.1, deadline: 3 } },
];

export const LINKS: [CarNode["id"], CarNode["id"]][] = [
  ["radar", "sw-front"],
  ["brake-fl", "sw-front"],
  ["sw-front", "sw-central"],
  ["camera", "sw-central"],
  ["ecu", "sw-central"],
  ["sw-central", "sw-rear"],
  ["brake-rl", "sw-rear"],
  ["lidar", "sw-rear"],
];

/** Chaîne de freinage : radar → zone avant → central → calculateur → central → zone avant → frein. */
export const CRITICAL_PATH: CarNode["id"][] = ["radar", "sw-front", "sw-central", "ecu", "sw-central", "sw-front", "brake-fl"];

export const OTHER_FLOWS: CarNode["id"][][] = [
  ["camera", "sw-central", "ecu"],
  ["lidar", "sw-rear", "sw-central", "ecu"],
  ["ecu", "sw-central", "sw-rear", "brake-rl"],
];

export const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

export const isOnCritical = (a: string, b: string) =>
  CRITICAL_PATH.some((id, i) => {
    const next = CRITICAL_PATH[i + 1];
    return next !== undefined && ((id === a && next === b) || (id === b && next === a));
  });
