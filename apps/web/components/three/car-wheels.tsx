"use client";

import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { wheelGeometries, type WheelSpec } from "@/lib/car-wheel";
import { smoothstep } from "@/lib/network";
import { fade, wheelMaterials } from "./car-materials";

/** Vitesse de rotation des roues (rad/s), partagée avec les roues en fil de fer. */
export const WHEEL_SPIN = 2.2;

/** Étrier en haut, vers l'arrière du véhicule, des deux côtés (repère local de chaque roue). */
export const CALIPER_LEFT = Math.PI * 0.8;
export const CALIPER_RIGHT = Math.PI * 0.2;

/**
 * Quatre roues pleines (pneu, jante bi-ton, disque, étrier) qui tournent en phase
 * avec les roues en fil de fer, puis s'effacent pendant le démontage.
 */
export function CarWheels({
  progress,
  spec,
  axles,
  trackHalf,
  fadeRange,
  spin,
}: {
  progress: MotionValue<number>;
  /** Angle de rotation imposé (roulage réel) ; sinon rotation continue à vitesse fixe. */
  spin?: MotionValue<number>;
  spec: WheelSpec;
  /** Abscisses des essieux. */
  axles: readonly number[];
  /** Demi-voie : z du milieu de la bande de roulement. */
  trackHalf: number;
  /** Avancement du défilement où les roues pleines s'effacent. */
  fadeRange: [number, number];
}) {
  const geo = useMemo(() => wheelGeometries(spec), [spec]);
  const calipers = useMemo(() => [geo.caliper(CALIPER_LEFT), geo.caliper(CALIPER_RIGHT)] as const, [geo]);
  const mats = useMemo(() => wheelMaterials(), []);
  const root = useRef<THREE.Group>(null);
  const spinners = useRef<(THREE.Group | null)[]>([]);

  useFrame((state) => {
    const o = 1 - smoothstep(fadeRange[0], fadeRange[1], progress.get());
    fade(mats.all, o);
    if (root.current) root.current.visible = o > 0.01;
    // Index pair = gauche, impair = droite (retournée d'un demi-tour : sens inversé).
    const a = spin ? -spin.get() : -state.clock.elapsedTime * WHEEL_SPIN;
    spinners.current.forEach((w, i) => {
      if (w) w.rotation.z = i % 2 === 0 ? a : -a;
    });
  });

  return (
    <group ref={root}>
      {axles.flatMap((x, wi) =>
        ([1, -1] as const).map((s, si) => (
          <group key={`${x}-${s}`} position={[x, spec.R, s * trackHalf]} rotation={[0, s === 1 ? 0 : Math.PI, 0]}>
            <group ref={(el) => void (spinners.current[wi * 2 + si] = el)}>
              <mesh geometry={geo.tire} material={mats.tire} />
              <mesh geometry={geo.face} material={[mats.machined, mats.darkMetal]} />
              <mesh geometry={geo.lip} material={mats.machined} />
              <mesh geometry={geo.dark} material={mats.darkMetal} />
              <mesh geometry={geo.disc} material={mats.disc} />
            </group>
            <mesh geometry={s === 1 ? calipers[0] : calipers[1]} material={mats.caliper} />
          </group>
        )),
      )}
    </group>
  );
}
