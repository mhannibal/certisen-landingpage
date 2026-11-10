"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useInView } from "motion/react";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/*
 * Graphique « Force de la garantie » en 3D : quatre colonnes (tests, simulation,
 * analyse, CertiSen) qui montent quand la carte entre à l'écran. Caméra
 * orthographique légèrement tournée : chaque colonne reste au-dessus de son
 * libellé, gardé dans la page.
 */

/** Hauteur pleine échelle (100 %) en unités de scène. */
const H = 1.45;
const W = 0.56;
const BARS = [
  { h: 0.3, color: "#3a3a3a" },
  { h: 0.45, color: "#4e4e4e" },
  { h: 0.6, color: "#6c6c6c" },
  { h: 0.92, color: "#f5f5f5", lead: true },
];
const XS = [-1.5, -0.5, 0.5, 1.5];
const YAW = 0.22;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Cadrage : colonnes alignées sur les quatre libellés, hauteur toujours visible. */
function Framing() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = Math.min(size.width / (4 * Math.cos(YAW)), size.height / 1.75);
    cam.position.set(Math.sin(YAW) * 8, 2.9, Math.cos(YAW) * 8);
    cam.lookAt(0, 0.62, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Bars({ start }: { start: boolean }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const root = useRef<THREE.Group>(null);
  const time = useRef(0);
  const mats = useMemo(
    () =>
      BARS.map(
        (b) =>
          new THREE.MeshPhysicalMaterial({
            color: b.color,
            roughness: b.lead ? 0.25 : 0.45,
            metalness: 0.1,
            clearcoat: 1,
            clearcoatRoughness: 0.15,
            emissive: b.lead ? "#ffffff" : "#000000",
            emissiveIntensity: b.lead ? 0.18 : 0,
          }),
      ),
    [],
  );
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W, 1, W)), []);
  const edgeMats = useMemo(
    () => BARS.map((b) => new THREE.LineBasicMaterial({ color: b.lead ? "#ffffff" : "#6e6e6e", transparent: true, opacity: b.lead ? 0.9 : 0.35 })),
    [],
  );
  useFrame((state, delta) => {
    if (start) time.current += delta;
    BARS.forEach((b, i) => {
      const g = groups.current[i];
      if (!g) return;
      const k = easeOut(THREE.MathUtils.clamp((time.current - 0.12 * i) / 1.1, 0, 1));
      const h = Math.max(0.001, b.h * H * k);
      g.scale.set(1, h, 1);
      g.position.y = h / 2;
    });
    // Colonne CertiSen : léger éclat qui respire.
    mats[3]!.emissiveIntensity = 0.16 + 0.06 * Math.sin(state.clock.elapsedTime * 1.6);
    // Le graphique suit doucement le pointeur.
    if (root.current) {
      const target = state.pointer.x * 0.08;
      root.current.rotation.y += (target - root.current.rotation.y) * Math.min(1, delta * 3);
    }
  });
  return (
    <group ref={root}>
      {BARS.map((b, i) => (
        <group key={i} ref={(el) => void (groups.current[i] = el)} position={[XS[i]!, 0, 0]}>
          <mesh material={mats[i]} castShadow>
            <boxGeometry args={[W, 1, W]} />
          </mesh>
          <lineSegments geometry={edges} material={edgeMats[i]} />
        </group>
      ))}
    </group>
  );
}

/** Repères à 25, 50 et 75 % (pointillés sur le fond) et ligne de base. */
function Guides() {
  const lines = useMemo(() => {
    const mat = new THREE.LineDashedMaterial({ color: "#4a4a4a", dashSize: 0.06, gapSize: 0.06 });
    return [0.25, 0.5, 0.75].map((g) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.1, g * H, -0.5), new THREE.Vector3(2.1, g * H, -0.5)]);
      const l = new THREE.Line(geo, mat);
      l.computeLineDistances();
      return l;
    });
  }, []);
  const base = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.1, 0.001, 0.45), new THREE.Vector3(2.1, 0.001, 0.45)]);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#262626" }));
  }, []);
  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      <primitive object={base} />
    </group>
  );
}

export default function BarsCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "100px" });
  const seen = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} className={className}>
      <Canvas
        orthographic
        shadows
        frameloop={inView ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ position: [0, 2.9, 8], near: 0.1, far: 50, zoom: 120 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
      >
        <Framing />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[3, 6, 4]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <directionalLight position={[-4, 3, -3]} intensity={0.6} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} position={[0, 5, 2]} scale={[8, 1.5, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[5, 1.5, 3]} scale={[2, 4, 1]} />
          <Lightformer form="rect" intensity={0.6} position={[-5, 1.5, 3]} scale={[2, 4, 1]} />
        </Environment>
        <Guides />
        <Bars start={seen} />
        {/* Sol : il ne garde que l'ombre portée des colonnes. */}
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[8, 4]} />
          <shadowMaterial opacity={0.45} />
        </mesh>
      </Canvas>
    </div>
  );
}
