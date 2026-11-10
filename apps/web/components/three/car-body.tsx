"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { buildBody, type MaterialKey } from "@/lib/car-body";
import { DESIGN } from "@/lib/car-design";
import { smoothstep } from "@/lib/network";
import { bodyMaterials, contactShadowTexture, fade } from "./car-materials";
import { CarWheels } from "./car-wheels";

/** Durée (en avancement de défilement) du mouvement d'une pièce, puis de son effacement. */
const MOVE = 0.1;
const FADE_FROM = 0.03;
const FADE_TO = 0.1;
/** Les roues pleines et l'ombre de contact s'effacent en dernier. */
const WHEELS_FADE: [number, number] = [0.12, 0.19];

/**
 * Studio photo monochrome, généré localement (aucun fichier HDR téléchargé) :
 * plafonnier pour les reflets du capot et du pavillon, bandeaux bas de part et
 * d'autre pour la « ligne d'horizon » qui court sur les flancs et éclaire les
 * jantes, panneaux avant et arrière plus discrets. Sans rotation explicite, chaque
 * Lightformer est orienté vers le centre de la voiture.
 */
function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} />
      {/* Contre-jour haut, derrière la voiture : liseré clair sur le pavillon et les arêtes, qui la détache du fond noir. */}
      <directionalLight position={[-6, 5, -7]} intensity={1.6} />
      <directionalLight position={[-5, 3, -4]} intensity={0.7} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-3, 4, -7]} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 1.6, 7]} scale={[18, 1.3, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 1.6, -7]} scale={[18, 1.3, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[8, 2.4, 0]} scale={[7, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[-8, 2.4, 0]} scale={[7, 3, 1]} />
      </Environment>
    </>
  );
}

/** Plan de l'ombre de contact (x, z), centré sous la voiture. */
const SHADOW_SIZE: [number, number] = [7.2, 3.8];

/** Ombre de contact précalculée sous la voiture pleine ; s'efface avec les pneus. */
function ContactShadow({ progress }: { progress: MotionValue<number> }) {
  const mat = useMemo(() => {
    // Empreinte : longueur bouclier à bouclier (bombés compris), largeur aux élargisseurs.
    const xs = DESIGN.stations.map((s) => s.x);
    const length = Math.max(...xs) - Math.min(...xs) + DESIGN.bulge.front(1) + DESIGN.bulge.rear(1);
    const width = 2 * (Math.max(...DESIGN.stations.flatMap((s) => s.points.map((p) => p[0]))) + DESIGN.arch.proud);
    const map = contactShadowTexture({
      size: SHADOW_SIZE,
      body: [length, width],
      patches: DESIGN.axles.flatMap((x) => [
        [x, DESIGN.trackHalf],
        [x, -DESIGN.trackHalf],
      ]) as [number, number][],
      patch: [0.2, DESIGN.wheel.W * 0.92],
    });
    return new THREE.MeshBasicMaterial({ map, color: "#000000", transparent: true, depthWrite: false });
  }, []);
  useFrame(() => {
    mat.opacity = 1 - smoothstep(WHEELS_FADE[0], WHEELS_FADE[1], progress.get());
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={mat} renderOrder={-1}>
      <planeGeometry args={SHADOW_SIZE} />
    </mesh>
  );
}

/**
 * Halo de studio au sol : disque clair très doux sous la voiture, qui la pose sur
 * une « scène » et la détache du fond noir. Il s'atténue avec la carrosserie.
 */
function StageGlow({ progress }: { progress: MotionValue<number> }) {
  const mat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, "rgba(255,255,255,0.16)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.07)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  }, []);
  useFrame(() => {
    mat.opacity = 1 - 0.65 * smoothstep(WHEELS_FADE[0], WHEELS_FADE[1], progress.get());
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={[1.6, 1, 1]} material={mat} renderOrder={-2}>
      <planeGeometry args={[9, 7]} />
    </mesh>
  );
}

/**
 * Carrosserie pleine : visible entière en arrivant sur la section, puis démontée
 * pièce par pièce au défilement (toit, capot, flancs, avant/arrière, roues) pour
 * laisser place à la vue fil de fer et au réseau TSN.
 */
export function CarBody({
  progress,
  spin,
  lights = true,
}: {
  progress: MotionValue<number>;
  /** Angle des roues imposé (voiture qui roule) ; voir CarWheels. */
  spin?: MotionValue<number>;
  /** Studio d'éclairage intégré (désactivé quand la scène fournit le sien). */
  lights?: boolean;
}) {
  const pieces = useMemo(() => buildBody(), []);
  // Un jeu de matériaux par pièce : chacune s'efface indépendamment.
  const mats = useMemo(() => pieces.map(() => bodyMaterials()), [pieces]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const p = progress.get();
    pieces.forEach((pc, i) => {
      const g = groups.current[i];
      if (!g) return;
      const k = smoothstep(pc.start, pc.start + MOVE, p);
      // Démontage : la pièce s'écarte et pivote, avec une légère accélération.
      tmp.copy(pc.move).multiplyScalar(k * k);
      g.position.copy(pc.center).add(tmp);
      g.rotation.set(pc.rot.x * k, pc.rot.y * k, pc.rot.z * k);
      const o = 1 - smoothstep(pc.start + FADE_FROM, pc.start + FADE_TO, p);
      fade(mats[i]!.all, o);
      g.visible = o > 0.01;
    });
  });

  return (
    <group>
      {lights ? <StudioLights /> : null}
      <StageGlow progress={progress} />
      <ContactShadow progress={progress} />

      {pieces.map((pc, i) => {
        const m = mats[i]!;
        return (
          <group key={pc.id} ref={(el) => void (groups.current[i] = el)} position={pc.center}>
            {(Object.keys(pc.meshes) as MaterialKey[]).map((k) => (
              <mesh key={k} geometry={pc.meshes[k]} material={m[k]} />
            ))}
            {pc.seams ? <lineSegments geometry={pc.seams} material={m.seams} /> : null}
          </group>
        );
      })}

      <CarWheels
        progress={progress}
        spec={DESIGN.wheel}
        axles={DESIGN.axles}
        trackHalf={DESIGN.trackHalf}
        fadeRange={WHEELS_FADE}
        spin={spin}
      />
    </group>
  );
}
