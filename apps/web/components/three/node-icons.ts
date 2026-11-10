import { ArrowLeftRight, Camera, Cpu, Disc3, Radar, ScanLine, type LucideIcon } from "lucide-react";
import type { CarNode } from "@/lib/car-network";

/** Icône de chaque composant du réseau embarqué (marqueurs 3D et fiche détaillée). */
export const NODE_ICON: Record<CarNode["id"], LucideIcon> = {
  "sw-front": ArrowLeftRight,
  "sw-central": ArrowLeftRight,
  "sw-rear": ArrowLeftRight,
  radar: Radar,
  camera: Camera,
  ecu: Cpu,
  "brake-fl": Disc3,
  "brake-rl": Disc3,
  lidar: ScanLine,
};
