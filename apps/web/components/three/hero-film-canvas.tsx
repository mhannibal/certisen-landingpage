"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useInView, useTransform, type MotionValue } from "motion/react";
import { createContext, useContext, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_PATHS } from "@/components/logo";
import { DESIGN } from "@/lib/car-design";
import { CRITICAL_PATH, LINKS, NODES, OTHER_FLOWS, nodeById } from "@/lib/car-network";
import {
  BARRIER_X,
  FILM,
  LATENCY,
  LATENCY_BOUND,
  LATENCY_DEADLINE,
  PACKAGES,
  TARGET_X,
  carX,
  deployOf,
  downloadOf,
  win,
} from "@/lib/hero-film";
import { pointAt, smoothstep, type Flow } from "@/lib/network";
import { CarBody } from "./car-body";
import { Precompile } from "./precompile";

/*
 * Film du héros (prototype) : la voiture est assemblée dans le garage du
 * constructeur, reçoit une mise à jour OTA (cloud, ondes, paquets de conduite
 * autonome), la certification CertiSen s'exécute, les paquets certifiés sont
 * déployés, la sûreté temporelle est démontrée à l'arrêt puis sur la route, les
 * paramètres surveillés et les attaques bloquées, puis la voiture trace sa courbe
 * de latence et s'éloigne. Tout est piloté par l'avancement du défilement.
 */

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const glow = (k: number) => new THREE.Color("#ffffff").multiplyScalar(k);
type V3 = [number, number, number];
type Ranges = readonly (readonly [number, number])[];
const maxWin = (p: number, ranges: Ranges, f?: number) => Math.max(0, ...ranges.map(([a, b]) => win(p, a, b, f)));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Avancement de l'intro (0 → 1), partagé par les éléments de la scène. */
const IntroCtx = createContext<MotionValue<number> | null>(null);
const useIntro = () => useContext(IntroCtx);
/** Intro : le réseau seul dans le noir, vu de près ; la caméra recule pendant que l'atelier s'allume. */
// Visée décalée vers l'arrière : la constellation se place à droite, le titre reste lisible à gauche.
const INTRO_SHOT = { pos: [3.4, 1.35, 6.4] as V3, look: [-1.4, 0.95, 0] as V3 };
/** Lumières de l'atelier pendant l'intro : 0 (noir) → 1 (allumées). */
const introLight = (ip: number) => smoothstep(0.5, 0.85, ip);
/** Réseau visible dès le premier écran de l'intro ; il s'efface quand l'assemblage commence. */
const introNet = (_ip: number, p: number) => 1 - smoothstep(0, 0.035, p);
/** Nœuds de la constellation (tous visibles pendant l'intro). */
const introNode = (_ip: number, _i: number) => 1;

/** Garage assez grand pour que les plans d'ouverture restent à l'intérieur. */
const GARAGE = { back: -12, front: 12, side: 11, height: 6.5 };
const ROAD_LENGTH = carX(1) + 140;
/** Icône cloud de la mise à jour OTA (au-dessus de la voiture) et paquets en attente. */
const CLOUD_Y = 4.7;
const STAGE: V3[] = [
  [-0.85, 2.75, 0],
  [0, 2.75, 0],
  [0.85, 2.75, 0],
];

function makeFlow(ids: readonly string[], speed: number, kind: Flow["kind"]): Flow {
  const path = ids.map((id) => nodeById(id).pos);
  const lengths = path.slice(1).map((p, i) => new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...path[i]!)));
  return { path, lengths, total: lengths.reduce((a, b) => a + b, 0), kind, speed };
}

/** Icône Lucide (traits) en géométrie plane, centrée, unités SVG (24 × 24). */
function iconStrokes(paths: string[], width = 2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${paths
    .map((d) => `<path d="${d}" fill="none" stroke="#fff"/>`)
    .join("")}</svg>`;
  const style = SVGLoader.getStrokeStyle(width, "#fff", "round", "round");
  const out: THREE.BufferGeometry[] = [];
  for (const p of new SVGLoader().parse(svg).paths)
    for (const sp of p.subPaths) {
      const g = SVGLoader.pointsToStroke(sp.getPoints(), style);
      if (g) out.push(g.translate(-12, -12, 0));
    }
  return out;
}

/* ------------------------------------------------------------------ */
/* Caméra : plans successifs, relatifs à la voiture                    */
/* ------------------------------------------------------------------ */

const SHOTS: { p: number; pos: V3; look: V3 }[] = [
  { p: 0.0, pos: [10.5, 3.6, 9.0], look: [0, 0.6, 0] }, // plan large du garage, l'assemblage commence
  { p: 0.05, pos: [6.4, 2.2, 6.0], look: [0, 0.8, 0] }, // trois-quarts avant
  { p: 0.085, pos: [8.0, 3.2, 9.0], look: [0, 2.6, 0] }, // recul : le cloud apparaît au-dessus
  { p: 0.135, pos: [3.8, 2.2, 7.0], look: [0, 2.8, 0] }, // les paquets arrivent au-dessus du toit
  { p: 0.175, pos: [4.6, 2.6, 6.2], look: [0, 1.8, 0] }, // le portique commence : voiture et paquets
  { p: 0.215, pos: [-3.6, 3.0, 6.4], look: [0, 1.8, 0] }, // tour vers l'arrière
  { p: 0.25, pos: [0.2, 3.6, 9.5], look: [0, 2.3, 0] }, // anneau au sol et emblème au-dessus
  { p: 0.31, pos: [0.2, 3.6, 9.5], look: [0, 2.3, 0] },
  { p: 0.345, pos: [4.0, 3.8, 5.0], look: [0, 1.2, 0] }, // déploiement des paquets
  { p: 0.38, pos: [6.8, 1.5, 4.6], look: [2.6, 0.8, 0] }, // avant bas : la cible se dresse
  { p: 0.425, pos: [6.8, 1.5, 4.6], look: [2.6, 0.8, 0] },
  { p: 0.45, pos: [-6.4, 1.6, 1.4], look: [4, 1.2, 0] }, // derrière la voiture, le rideau se lève
  { p: 0.47, pos: [-6.0, 1.8, 2.6], look: [3, 1, 0] }, // poursuite à la sortie
  { p: 0.5, pos: [-8.0, 2.6, -2.6], look: [10, 1, 0.6] }, // trois-quarts arrière : la barrière tombe
  // Profil côté droit : la voiture reste à droite de l'image, la barrière à gauche.
  { p: 0.55, pos: [1.5, 1.6, -10.5], look: [1.5, 0.8, 0] }, // profil : arrêt devant la barrière
  { p: 0.575, pos: [1.5, 1.6, -10.5], look: [1.5, 0.8, 0] },
  { p: 0.6, pos: [-7.5, 1.3, -1.8], look: [3, 1, 0] }, // poursuite basse au redémarrage
  { p: 0.63, pos: [0.4, 1.15, 6.6], look: [-0.6, 0.9, 0] }, // travelling latéral : les flux
  // Paramètres surveillés : plan large en plongée qui glisse lentement, toujours du même côté.
  { p: 0.665, pos: [3.6, 7.0, 4.4], look: [0, 0.6, 0] },
  { p: 0.71, pos: [0.6, 7.6, 4.4], look: [-0.3, 0.6, 0] },
  { p: 0.75, pos: [2.2, 3.4, 4.4], look: [-0.5, 1.0, 0] }, // ECU compromis sur le toit (caméra entre les lampadaires)
  { p: 0.795, pos: [4.2, 2.2, 4.3], look: [0, 0.9, 0.8] }, // injection bloquée au commutateur
  { p: 0.84, pos: [-7.5, 2.4, 3.0], look: [3, 1, 0] }, // poursuite, la voiture accélère
  { p: 0.875, pos: [-3.0, 9.0, 10.0], look: [-3, 2.8, -1] }, // vue aérienne : la courbe se dessine
  { p: 0.925, pos: [-14, 7, 7], look: [-5, 2.6, 0] }, // très large, la courbe entière
  { p: 0.945, pos: [-7.5, 2.4, 3.0], look: [3, 1, 0] }, // poursuite
  { p: 1.0, pos: [-6.0, 4.8, 5.0], look: [0, 0.6, 0] }, // caméra arrêtée, la voiture s'éloigne
];

function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const intro = useIntro();
  const v = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      posNow: new THREE.Vector3(...SHOTS[0]!.pos),
      lookNow: new THREE.Vector3(...SHOTS[0]!.look),
      target: new THREE.Vector3(),
      last: 0,
    }),
    [],
  );
  useFrame((state, delta) => {
    const p = clamp(progress.get(), 0, 1);
    const jumped = Math.abs(p - v.last) > 0.03;
    v.last = p;
    let i = 0;
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1]!.p) i++;
    const s0 = SHOTS[i]!;
    const s1 = SHOTS[i + 1]!;
    const k = easeInOut(clamp((p - s0.p) / (s1.p - s0.p), 0, 1));
    v.pos.lerpVectors(v.a.set(...s0.pos), v.b.set(...s1.pos), k);
    v.look.lerpVectors(v.a.set(...s0.look), v.b.set(...s1.look), k);
    const ip = intro ? intro.get() : 1;
    if (ip < 1) {
      const e = easeInOut(ip);
      const t = state.clock.elapsedTime;
      // Lente dérive autour du réseau tant que l'intro est à l'écran.
      const sway = (1 - e) * 0.35;
      v.a.set(
        INTRO_SHOT.pos[0] + Math.sin(t * 0.18) * sway * 2,
        INTRO_SHOT.pos[1] + Math.sin(t * 0.23) * sway * 0.3,
        INTRO_SHOT.pos[2] + Math.cos(t * 0.18) * sway,
      );
      v.b.copy(v.pos);
      v.pos.lerpVectors(v.a, v.b, e);
      v.a.set(...INTRO_SHOT.look);
      v.b.copy(v.look);
      v.look.lerpVectors(v.a, v.b, e);
    }
    const { width, height } = state.size;
    // Écran portrait : on recule pour garder la voiture entière.
    const aspect = width / Math.max(1, height);
    if (aspect < 1) v.pos.sub(v.look).multiplyScalar(clamp(1.3 / aspect, 1, 2.4)).add(v.look);
    // Lissage dans le repère de la voiture : la caméra ne « décroche » pas à grande vitesse.
    const d = jumped ? 1 : 1 - Math.exp(-delta * 5);
    v.posNow.lerp(v.pos, d);
    v.lookNow.lerp(v.look, d);
    const base = carX(Math.min(p, FILM.freeze));
    state.camera.position.set(v.posNow.x + base, v.posNow.y, v.posNow.z);
    v.target.set(v.lookNow.x + carX(p), v.lookNow.y, v.lookNow.z);
    state.camera.lookAt(v.target);

    // Image décalée pour laisser la place aux cartes : à droite sur grand écran
    // (cartes à gauche), vers le haut sur mobile (cartes en bas).
    const cam = state.camera as THREE.PerspectiveCamera;
    const sx = width >= 1024 ? Math.round(-0.12 * width) : 0;
    const sy = width < 768 ? Math.round(0.13 * height) : 0;
    const view = cam.view;
    const on = !!view && view.enabled;
    const stale =
      (on ? view.offsetX : 0) !== sx ||
      (on ? view.offsetY : 0) !== sy ||
      (on && (view.fullWidth !== width || view.fullHeight !== height));
    if (stale) {
      if (sx || sy) cam.setViewOffset(width, height, sx, sy, width, height);
      else cam.clearViewOffset();
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Garage du constructeur                                              */
/* ------------------------------------------------------------------ */

function Garage({ progress }: { progress: MotionValue<number> }) {
  const door = useRef<THREE.Mesh>(null);
  const { back, front, side, height } = GARAGE;
  const mats = useMemo(
    () => ({
      // Faces tournées vers l'intérieur : vue de dehors (mobile, caméra reculée), la paroi s'efface.
      wall: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.9 }),
      // Sol satiné à faible spéculaire : face au contre-jour, il ne doit pas virer au blanc.
      floor: new THREE.MeshPhysicalMaterial({ color: "#111111", roughness: 0.6, metalness: 0, specularIntensity: 0.15, envMapIntensity: 0.3 }),
      strips: [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: glow(1.6), toneMapped: false })),
      panel: new THREE.MeshBasicMaterial({ color: glow(0.75), toneMapped: false }),
      mark: new THREE.MeshBasicMaterial({ color: "#5a5a5a" }),
      door: new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    }),
    [],
  );
  const intro = useIntro();
  useFrame((state) => {
    const open = smoothstep(FILM.door[0], FILM.door[1], progress.get());
    if (door.current) door.current.position.y = height / 2 + open * (height - 0.3);
    const ip = intro ? intro.get() : 1;
    const t = state.clock.elapsedTime;
    mats.strips.forEach((m, i) => {
      const a = 0.55 + 0.08 * i;
      // Les rampes s'allument l'une après l'autre, avec le scintillement des néons.
      let k = smoothstep(a, a + 0.02, ip);
      if (ip > a - 0.035 && ip < a) k = Math.sin(t * 53 + i * 7) > 0.35 ? 0.55 : 0.05;
      m.color.setScalar(1.6 * k);
    });
    mats.panel.color.setScalar(0.75 * smoothstep(0.78, 0.86, ip));
  });
  const midX = (back + front) / 2;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[midX, 0, 0]} material={mats.floor}>
        <planeGeometry args={[front - back, side * 2]} />
      </mesh>
      {/* Marquage de la baie et ligne d'arrêt */}
      {[-1.5, 1.5].map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[(front - 4) / 2, 0.003, z]} material={mats.mark}>
          <planeGeometry args={[front + 4, 0.05]} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[-3.9, 0.003, 0]} material={mats.mark}>
        <planeGeometry args={[0.05, 3]} />
      </mesh>
      <mesh position={[back, height / 2, 0]} rotation-y={Math.PI / 2} material={mats.wall}>
        <planeGeometry args={[side * 2, height]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[midX, height / 2, s * side]} rotation-y={s === 1 ? Math.PI : 0} material={mats.wall}>
          <planeGeometry args={[front - back, height]} />
        </mesh>
      ))}
      <mesh position={[midX, height, 0]} rotation-x={Math.PI / 2} material={mats.wall}>
        <planeGeometry args={[front - back, side * 2]} />
      </mesh>
      {[-3, 0, 3].map((z, i) => (
        <mesh key={z} position={[midX, height - 0.05, z]} material={mats.strips[i]}>
          <boxGeometry args={[18, 0.04, 0.16]} />
        </mesh>
      ))}
      {[-7, -4.5, 4.5, 7].map((z) => (
        <mesh key={z} position={[back + 0.03, 2.6, z]} material={mats.panel}>
          <boxGeometry args={[0.02, 3.8, 0.12]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[front, height / 2, (s * (side + 3.2)) / 2]} rotation-y={-Math.PI / 2} material={mats.wall}>
          <planeGeometry args={[side - 3.2, height]} />
        </mesh>
      ))}
      <mesh ref={door} position={[front, height / 2, 0]} rotation-y={-Math.PI / 2} material={mats.door}>
        <boxGeometry args={[6.4, height, 0.08]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Décor de l'atelier                                                  */
/* ------------------------------------------------------------------ */

/** Enseigne peinte au mur du fond (texture générée, aucune image téléchargée). */
function signTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 360;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = "#ffffff";
  g.textBaseline = "middle";
  g.font = "600 170px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  g.fillText("LINE 01", 30, 130);
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.font = "400 62px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  g.fillText("ASSEMBLY  ·  TSN CERTIFICATION BAY", 36, 285);
  g.fillRect(36, 205, 1180, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Écran du poste de contrôle : grille, courbe, barres et ligne d'état. */
function screenTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b0b0b";
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 320);
    g.stroke();
  }
  for (let y = 0; y <= 320; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const x = 20 + i * 7.8;
    const y = 150 - 40 * Math.sin(i * 0.35 + seed) - 18 * Math.sin(i * 1.3 + seed * 2);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 12; i++) {
    const h = 20 + 50 * Math.abs(Math.sin(i * 1.7 + seed));
    g.fillRect(24 + i * 38, 290 - h, 22, h);
  }
  g.fillStyle = "#ffffff";
  g.font = "500 22px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(seed > 1 ? "CERT RUN · OK" : "TSN · 9 NODES", 22, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Bras robotisé d'assemblage (6 axes simplifiés) : socle, tourelle, bras, avant-bras,
 * poignet et outil. Il travaille pendant l'intro et l'assemblage (étincelles au bout
 * de l'outil), puis se replie.
 */
function RobotArm({
  progress,
  position,
  phase,
  mats,
}: {
  progress: MotionValue<number>;
  position: V3;
  phase: number;
  mats: { body: THREE.Material; joint: THREE.Material; ring: THREE.MeshBasicMaterial; spark: THREE.MeshBasicMaterial };
}) {
  const turret = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const p = progress.get();
    const t = state.clock.elapsedTime + phase;
    // Au travail pendant l'intro et l'assemblage, puis position de repos.
    const work = 1 - smoothstep(FILM.assemble[1] - 0.01, FILM.assemble[1] + 0.02, p);
    if (turret.current) turret.current.rotation.y = work * 0.45 * Math.sin(t * 0.7);
    if (shoulder.current) shoulder.current.rotation.z = lerp(-0.3, -0.85 + 0.15 * Math.sin(t * 1.1), work);
    if (elbow.current) elbow.current.rotation.z = lerp(-0.6, -1.05 + 0.25 * Math.sin(t * 1.4 + 1), work);
    // Étincelles de soudure : uniquement pendant l'assemblage.
    const welding = p > 0.002 && p < FILM.assemble[1] && Math.sin(t * 3) > 0.2;
    if (spark.current) {
      spark.current.visible = welding;
      spark.current.scale.setScalar(0.6 + Math.random() * 0.9);
    }
  });
  return (
    <group position={position} rotation-y={-Math.PI / 2}>
      <mesh position={[0, 0.15, 0]} material={mats.joint}>
        <cylinderGeometry args={[0.38, 0.44, 0.3, 32]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} material={mats.ring}>
        <ringGeometry args={[0.52, 0.55, 48]} />
      </mesh>
      <group ref={turret} position={[0, 0.3, 0]}>
        <mesh position={[0, 0.22, 0]} material={mats.body}>
          <cylinderGeometry args={[0.24, 0.3, 0.44, 24]} />
        </mesh>
        <group ref={shoulder} position={[0, 0.55, 0]}>
          <mesh rotation-x={Math.PI / 2} material={mats.joint}>
            <cylinderGeometry args={[0.17, 0.17, 0.42, 24]} />
          </mesh>
          <mesh position={[0, 0.7, 0]} material={mats.body}>
            <boxGeometry args={[0.24, 1.4, 0.24]} />
          </mesh>
          <group ref={elbow} position={[0, 1.4, 0]}>
            <mesh rotation-x={Math.PI / 2} material={mats.joint}>
              <cylinderGeometry args={[0.13, 0.13, 0.34, 20]} />
            </mesh>
            <mesh position={[0, 0.55, 0]} material={mats.body}>
              <boxGeometry args={[0.18, 1.1, 0.18]} />
            </mesh>
            <mesh position={[0, 1.14, 0]} material={mats.joint}>
              <cylinderGeometry args={[0.09, 0.07, 0.16, 16]} />
            </mesh>
            <mesh position={[0, 1.3, 0]} material={mats.joint}>
              <coneGeometry args={[0.06, 0.18, 12]} />
            </mesh>
            <mesh ref={spark} position={[0, 1.42, 0]} material={mats.spark} visible={false}>
              <sphereGeometry args={[0.05, 10, 10]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Étagère à caisses le long d'un mur. */
function Rack({ position, mats }: { position: V3; mats: { frame: THREE.Material; crate: THREE.Material; crate2: THREE.Material } }) {
  const W = 3;
  const H = 2.7;
  const D = 0.8;
  const levels = [0.35, 1.25, 2.15];
  return (
    <group position={position}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, H / 2, 0]} material={mats.frame}>
          <boxGeometry args={[0.08, H, D]} />
        </mesh>
      ))}
      {levels.map((y, li) => (
        <group key={y}>
          <mesh position={[0, y, 0]} material={mats.frame}>
            <boxGeometry args={[W, 0.05, D]} />
          </mesh>
          {[-1, 0, 1].map((k) => (
            <mesh
              key={k}
              position={[k * 0.95 + ((li * 0.17) % 0.2), y + 0.25, 0.02]}
              material={(k + li) % 2 ? mats.crate : mats.crate2}
            >
              <boxGeometry args={[0.7 - ((li + k + 3) % 3) * 0.08, 0.45, 0.6]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Atelier du constructeur : bras robotisés, piliers et poutres, étagères, poste de
 * contrôle, pneus, servante, enseigne et bande de sécurité au seuil de la porte.
 * Tout est placé le long des murs pour ne gêner aucun plan de caméra.
 */
function Workshop({ progress }: { progress: MotionValue<number> }) {
  const { back, front, side, height } = GARAGE;
  const intro = useIntro();
  const textures = useMemo(() => ({ sign: signTexture(), screens: [screenTexture(0.4), screenTexture(2.1)] }), []);
  const mats = useMemo(
    () => ({
      metal: new THREE.MeshStandardMaterial({ color: "#1b1b1b", metalness: 0.55, roughness: 0.45 }),
      beam: new THREE.MeshStandardMaterial({ color: "#151515", metalness: 0.4, roughness: 0.6 }),
      robot: new THREE.MeshStandardMaterial({ color: "#2c2c2c", metalness: 0.5, roughness: 0.32 }),
      joint: new THREE.MeshStandardMaterial({ color: "#121212", metalness: 0.4, roughness: 0.5 }),
      crate: new THREE.MeshStandardMaterial({ color: "#222222", roughness: 0.85 }),
      crate2: new THREE.MeshStandardMaterial({ color: "#2e2e2e", roughness: 0.8 }),
      tire: new THREE.MeshStandardMaterial({ color: "#0c0c0c", roughness: 0.9 }),
      stripe: new THREE.MeshBasicMaterial({ color: "#d0d0d0" }),
      strip: new THREE.MeshBasicMaterial({ color: glow(1.1), toneMapped: false }),
      ring: new THREE.MeshBasicMaterial({ color: glow(1.2), toneMapped: false, transparent: true, side: THREE.DoubleSide }),
      spark: new THREE.MeshBasicMaterial({ color: glow(4), toneMapped: false }),
      sign: new THREE.MeshBasicMaterial({ map: textures.sign, transparent: true, toneMapped: false, depthWrite: false }),
      screens: textures.screens.map((map) => new THREE.MeshBasicMaterial({ map, toneMapped: false })),
    }),
    [textures],
  );
  // Les éléments lumineux du décor s'allument avec les néons de l'intro.
  useFrame(() => {
    const L = introLight(intro ? intro.get() : 1);
    mats.strip.color.setScalar(1.1 * L);
    mats.ring.opacity = 0.2 + 0.8 * L;
    // Éteinte dans le noir de l'intro : elle ne doit pas apparaître derrière le titre.
    mats.sign.color.setScalar(0.9 * L);
    mats.screens.forEach((m) => m.color.setScalar(0.2 + 0.8 * L));
  });
  const pillarsX = [-8, -2, 4, 10];
  const beamsX = [-9, -4.5, 0, 4.5, 9];
  const midX = (back + front) / 2;
  return (
    <group>
      {/* Piliers le long des murs latéraux, avec un bandeau lumineux */}
      {pillarsX.flatMap((x) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x, 0, s * (side - 0.3)]}>
            <mesh position={[0, height / 2, 0]} material={mats.beam}>
              <boxGeometry args={[0.5, height, 0.5]} />
            </mesh>
            <mesh position={[0, height / 2 - 0.4, -s * 0.255]} material={mats.strip}>
              <boxGeometry args={[0.05, height - 2, 0.01]} />
            </mesh>
          </group>
        )),
      )}
      {/* Poutres et chemins de câbles au plafond */}
      {beamsX.map((x) => (
        <mesh key={x} position={[x, height - 0.3, 0]} material={mats.beam}>
          <boxGeometry args={[0.28, 0.4, side * 2]} />
        </mesh>
      ))}
      {[-6, 6].map((z) => (
        <mesh key={z} position={[midX, height - 0.62, z]} material={mats.metal}>
          <boxGeometry args={[front - back - 1, 0.08, 0.5]} />
        </mesh>
      ))}

      {/* Bras robotisés, côté opposé aux caméras : ils ne masquent jamais la voiture */}
      <RobotArm progress={progress} position={[-1.4, 0, -3.6]} phase={0} mats={{ body: mats.robot, joint: mats.joint, ring: mats.ring, spark: mats.spark }} />
      <RobotArm progress={progress} position={[1.6, 0, -3.6]} phase={1.7} mats={{ body: mats.robot, joint: mats.joint, ring: mats.ring, spark: mats.spark }} />

      {/* Étagères à caisses contre le mur du fond de côté */}
      {[-8.5, -4.5, -0.5, 3.5].map((x) => (
        <Rack key={x} position={[x, 0, -side + 0.75]} mats={{ frame: mats.metal, crate: mats.crate, crate2: mats.crate2 }} />
      ))}

      {/* Poste de contrôle : pupitre et deux écrans */}
      <group position={[7.2, 0, -6.2]} rotation-y={-0.35}>
        <mesh position={[0, 0.45, 0]} material={mats.metal}>
          <boxGeometry args={[2.2, 0.9, 0.8]} />
        </mesh>
        <mesh position={[0, 0.92, 0]} material={mats.joint}>
          <boxGeometry args={[2.3, 0.05, 0.9]} />
        </mesh>
        {[-0.55, 0.55].map((x, i) => (
          <group key={x} position={[x, 1.42, -0.2]} rotation-x={-0.12}>
            <mesh material={mats.joint}>
              <boxGeometry args={[1.0, 0.66, 0.05]} />
            </mesh>
            <mesh position={[0, 0, 0.03]} material={mats.screens[i]}>
              <planeGeometry args={[0.92, 0.58]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Pile de pneus et servante d'outils */}
      <group position={[-9.6, 0, -6.8]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0.13 + i * 0.25, 0]} rotation-x={Math.PI / 2} material={mats.tire}>
            <torusGeometry args={[0.34, 0.13, 12, 32]} />
          </mesh>
        ))}
      </group>
      <group position={[9.4, 0, -8.4]} rotation-y={0.4}>
        <mesh position={[0, 0.5, 0]} material={mats.robot}>
          <boxGeometry args={[1.1, 0.9, 0.55]} />
        </mesh>
        {[0.25, 0.5, 0.75].map((y) => (
          <mesh key={y} position={[0, y + 0.05, 0.28]} material={mats.joint}>
            <boxGeometry args={[1.0, 0.015, 0.01]} />
          </mesh>
        ))}
        {[-0.45, 0.45].flatMap((x) =>
          [-0.22, 0.22].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.05, z]} material={mats.joint}>
              <sphereGeometry args={[0.05, 8, 8]} />
            </mesh>
          )),
        )}
      </group>

      {/* Enseigne du mur du fond */}
      {/* Assez bas pour rester sous la barre de navigation dans le plan large d'ouverture. */}
      <mesh position={[back + 0.05, 3.5, 0]} rotation-y={Math.PI / 2} material={mats.sign}>
        <planeGeometry args={[6, 1.05]} />
      </mesh>

      {/* Bande de sécurité rayée au seuil de la porte */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[front - 0.6, 0.004, -3.0 + i * 0.4]} material={i % 2 ? mats.crate : mats.stripe}>
          <planeGeometry args={[0.9, 0.4]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ingénieurs et appareils de mesure                                   */
/* ------------------------------------------------------------------ */

/** Segment de membre (capsule) tendu entre deux points. */
function Limb({ a, b, r, material }: { a: V3; b: V3; r: number; material: THREE.Material }) {
  const t = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    return {
      mid: va.clone().add(vb).multiplyScalar(0.5),
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
      len: Math.max(0.001, len - 2 * r),
    };
  }, [a, b, r]);
  return (
    <mesh position={t.mid} quaternion={t.q} material={material}>
      <capsuleGeometry args={[r, t.len, 4, 10]} />
    </mesh>
  );
}

/** Pose d'un ingénieur (angles en radians ; bras et jambes : [tangage, roulis, coude] / [hanche, genou]). */
type EngPose = {
  /** Hauteur du bassin. */
  hip: number;
  /** Buste penché vers l'avant. */
  lean: number;
  /** Tête : [baisse, tourne]. */
  head: [number, number];
  armL: [number, number, number];
  armR: [number, number, number];
  legL: [number, number];
  legR: [number, number];
};
const POSES: Record<"tablet" | "typing" | "pointing", EngPose> = {
  tablet: { hip: 0.95, lean: 0.06, head: [0.5, 0], armL: [-0.55, 0.12, -1.35], armR: [-0.5, 0.1, -1.55], legL: [0.03, 0.05], legR: [-0.06, 0.1] },
  typing: { hip: 0.95, lean: 0.2, head: [0.42, 0], armL: [-0.3, 0.08, -0.95], armR: [-0.3, 0.08, -0.95], legL: [0, 0.04], legR: [0.05, 0.08] },
  pointing: { hip: 0.95, lean: 0.03, head: [0.12, 0.15], armL: [-0.45, 0.1, -1.35], armR: [-1.3, 0.18, -0.12], legL: [-0.05, 0.08], legR: [0.06, 0.04] },
};

type EngMats = {
  jacket: THREE.Material;
  pants: THREE.Material;
  skin: THREE.Material;
  helmet: THREE.Material;
  glasses: THREE.Material;
  strip: THREE.Material;
  badge: THREE.Material;
  shoe: THREE.Material;
  device: THREE.Material;
  screen: THREE.Material;
};

/** Bande réfléchissante autour d'un membre. */
function Band({ y, r, mats }: { y: number; r: number; mats: EngMats }) {
  return (
    <mesh position={[0, y, 0]} material={mats.strip}>
      <cylinderGeometry args={[r, r, 0.03, 16, 1, true]} />
    </mesh>
  );
}

/**
 * Ingénieur articulé (cinématique directe) : bassin, buste, cou, tête casquée avec
 * lunettes, bras et jambes en deux segments, mains, chaussures ; veste avec col,
 * badge et bandes réfléchissantes. Il respire, regarde autour de lui et, selon la
 * pose, tapote sa tablette, tape au clavier ou montre la voiture.
 */
function Engineer({
  position,
  facing,
  pose,
  phase,
  mats,
}: {
  position: V3;
  facing: number;
  pose: keyof typeof POSES;
  phase: number;
  mats: EngMats;
}) {
  const P = POSES[pose];
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    // Respiration et regard.
    chest.current?.scale.set(1, 1 + 0.012 * Math.sin(t * 1.7), 1 + 0.02 * Math.sin(t * 1.7));
    if (head.current) {
      head.current.rotation.x = P.head[0] + Math.sin(t * 0.33) * 0.07;
      head.current.rotation.y = P.head[1] + Math.sin(t * 0.47) * 0.3;
    }
    if (pose === "typing") {
      if (foreL.current) foreL.current.rotation.x = P.armL[2] + Math.max(0, Math.sin(t * 11)) * 0.06;
      if (foreR.current) foreR.current.rotation.x = P.armR[2] + Math.max(0, Math.sin(t * 11 + 1.6)) * 0.06;
    } else if (pose === "tablet") {
      if (foreR.current) foreR.current.rotation.x = P.armR[2] + Math.max(0, Math.sin(t * 2.4)) * 0.12;
    } else if (armR.current) {
      armR.current.rotation.x = P.armR[0] + Math.sin(t * 0.6) * 0.05;
    }
  });
  // La tablette, tenue dans la main gauche, reste inclinée vers le visage.
  const tabletTilt = -0.55 - (P.lean + P.armL[0] + P.armL[2]);
  const arm = (side: 1 | -1, a: [number, number, number], fore: typeof foreL, root?: typeof armR) => (
    <group ref={root} position={[side * 0.215, 0.2, 0]} rotation={[a[0], 0, side * a[1]]}>
      <mesh position={[0, -0.02, 0]} material={mats.jacket}>
        <sphereGeometry args={[0.07, 14, 12]} />
      </mesh>
      <mesh position={[0, -0.15, 0]} material={mats.jacket}>
        <capsuleGeometry args={[0.058, 0.2, 4, 12]} />
      </mesh>
      <Band y={-0.12} r={0.061} mats={mats} />
      <group ref={fore} position={[0, -0.3, 0]} rotation-x={a[2]}>
        <mesh position={[0, -0.13, 0]} material={mats.jacket}>
          <capsuleGeometry args={[0.05, 0.18, 4, 12]} />
        </mesh>
        <mesh position={[0, -0.29, 0.005]} scale={[1, 1.25, 0.65]} material={mats.skin}>
          <sphereGeometry args={[0.045, 12, 10]} />
        </mesh>
        {side === 1 && pose !== "typing" ? (
          <group position={[0, -0.31, 0.05]} rotation-x={tabletTilt}>
            <mesh material={mats.device}>
              <boxGeometry args={[0.26, 0.012, 0.19]} />
            </mesh>
            <mesh position={[0, 0.007, 0]} rotation-x={-Math.PI / 2} material={mats.screen}>
              <planeGeometry args={[0.23, 0.16]} />
            </mesh>
          </group>
        ) : null}
      </group>
    </group>
  );
  const leg = (side: 1 | -1, l: [number, number]) => (
    <group position={[side * 0.095, -0.04, 0]} rotation-x={l[0]}>
      <mesh position={[0, -0.22, 0]} material={mats.pants}>
        <capsuleGeometry args={[0.075, 0.3, 4, 12]} />
      </mesh>
      <group position={[0, -0.44, 0]} rotation-x={l[1]}>
        <mesh position={[0, -0.2, 0]} material={mats.pants}>
          <capsuleGeometry args={[0.062, 0.3, 4, 12]} />
        </mesh>
        <Band y={-0.27} r={0.066} mats={mats} />
        <mesh position={[0, -0.44, 0.05]} material={mats.shoe}>
          <boxGeometry args={[0.11, 0.08, 0.27]} />
        </mesh>
      </group>
    </group>
  );
  return (
    <group position={position} rotation-y={facing}>
      <group position={[0, P.hip, 0]}>
        {/* Bassin, ceinture */}
        <mesh scale={[1, 0.62, 0.72]} material={mats.pants}>
          <sphereGeometry args={[0.17, 18, 14]} />
        </mesh>
        <mesh position={[0, 0.07, 0]} scale={[1, 1, 0.74]} material={mats.shoe}>
          <cylinderGeometry args={[0.168, 0.168, 0.04, 20]} />
        </mesh>
        {leg(1, P.legL)}
        {leg(-1, P.legR)}
        {/* Buste penché, épaules, col, badge */}
        <group rotation-x={P.lean}>
          <group ref={chest} position={[0, 0.3, 0]}>
            <mesh position={[0, -0.12, 0]} scale={[1, 1, 0.72]} material={mats.jacket}>
              <capsuleGeometry args={[0.15, 0.12, 4, 16]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} scale={[1.18, 1, 0.74]} material={mats.jacket}>
              <capsuleGeometry args={[0.17, 0.16, 4, 16]} />
            </mesh>
            <mesh position={[0, -0.02, 0]} scale={[1.17, 1, 0.75]} material={mats.strip}>
              <cylinderGeometry args={[0.176, 0.176, 0.035, 24, 1, true]} />
            </mesh>
            <mesh position={[0.08, 0.1, 0.125]} rotation-x={-0.12} material={mats.badge}>
              <boxGeometry args={[0.05, 0.07, 0.006]} />
            </mesh>
            <mesh position={[0, 0.25, 0]} rotation-x={Math.PI / 2} material={mats.jacket}>
              <torusGeometry args={[0.07, 0.022, 8, 20]} />
            </mesh>
            {arm(1, P.armL, foreL)}
            {arm(-1, P.armR, foreR, pose === "pointing" ? armR : undefined)}
            {/* Cou, tête, casque à visière, lunettes */}
            <mesh position={[0, 0.29, 0]} material={mats.skin}>
              <cylinderGeometry args={[0.045, 0.05, 0.1, 12]} />
            </mesh>
            <group ref={head} position={[0, 0.42, 0]}>
              <mesh scale={[0.92, 1.08, 1]} material={mats.skin}>
                <sphereGeometry args={[0.1, 20, 16]} />
              </mesh>
              <mesh position={[0, 0.02, 0.085]} scale={[1, 0.42, 0.4]} material={mats.glasses}>
                <sphereGeometry args={[0.085, 16, 10, -Math.PI / 2.2, Math.PI / 1.1]} />
              </mesh>
              <mesh position={[0, 0.045, 0]} material={mats.helmet}>
                <sphereGeometry args={[0.118, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              <mesh position={[0, 0.05, 0.1]} rotation-x={0.25} scale={[1, 1, 0.6]} material={mats.helmet}>
                <cylinderGeometry args={[0.09, 0.09, 0.012, 20, 1, false, -Math.PI / 2, Math.PI]} />
              </mesh>
              <mesh position={[0, 0.16, 0]} rotation-z={Math.PI / 2} material={mats.helmet}>
                <capsuleGeometry args={[0.012, 0.12, 4, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Ordinateur portable ouvert (écran allumé). */
function Laptop({ position, rotation = 0, mats }: { position: V3; rotation?: number; mats: EngMats }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh material={mats.device}>
        <boxGeometry args={[0.36, 0.018, 0.25]} />
      </mesh>
      <group position={[0, 0.01, -0.12]} rotation-x={-0.25}>
        <mesh position={[0, 0.12, 0]} material={mats.device}>
          <boxGeometry args={[0.36, 0.24, 0.012]} />
        </mesh>
        <mesh position={[0, 0.12, 0.007]} material={mats.screen}>
          <planeGeometry args={[0.32, 0.2]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Ingénieurs de l'atelier et leurs instruments : tablette près de l'avant, ordinateur
 * relié à la voiture par un câble de diagnostic, poste de contrôle, oscilloscope sur
 * chariot et laser de mesure sur trépied. Tous côté opposé aux caméras.
 */
function Engineers({ progress }: { progress: MotionValue<number> }) {
  const intro = useIntro();
  const textures = useMemo(() => [screenTexture(3.3), screenTexture(0.9), screenTexture(5.1)], []);
  const mats = useMemo(() => {
    const screens = textures.map((map) => new THREE.MeshBasicMaterial({ map, toneMapped: false }));
    return {
      eng: {
        jacket: new THREE.MeshStandardMaterial({ color: "#2d2d2d", roughness: 0.82 }),
        pants: new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.9 }),
        skin: new THREE.MeshStandardMaterial({ color: "#8e8e8e", roughness: 0.55 }),
        helmet: new THREE.MeshPhysicalMaterial({ color: "#e6e6e6", roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }),
        glasses: new THREE.MeshPhysicalMaterial({ color: "#050505", roughness: 0.05, clearcoat: 1, metalness: 0.2 }),
        strip: new THREE.MeshBasicMaterial({ color: glow(1.1), toneMapped: false, side: THREE.DoubleSide }),
        badge: new THREE.MeshStandardMaterial({ color: "#d4d4d4", roughness: 0.4 }),
        shoe: new THREE.MeshStandardMaterial({ color: "#0f0f0f", roughness: 0.6 }),
        device: new THREE.MeshStandardMaterial({ color: "#141414", metalness: 0.5, roughness: 0.4 }),
        screen: screens[0]!,
      } satisfies EngMats,
      screens,
      cart: new THREE.MeshStandardMaterial({ color: "#1d1d1d", metalness: 0.5, roughness: 0.5 }),
      knob: new THREE.MeshStandardMaterial({ color: "#3a3a3a", metalness: 0.6, roughness: 0.3 }),
      cable: new THREE.MeshStandardMaterial({ color: "#0e0e0e", roughness: 0.7 }),
      laser: new THREE.LineBasicMaterial({ color: glow(1.6), transparent: true, opacity: 0, toneMapped: false }),
      lens: new THREE.MeshBasicMaterial({ color: glow(2.4), toneMapped: false }),
    };
  }, [textures]);
  const engAlt = useMemo(() => ({ ...mats.eng, screen: mats.screens[1]! }), [mats]);
  // Câble de diagnostic : de l'ordinateur au bas de caisse avant gauche.
  const cableGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.35, 0.98, -2.55),
      new THREE.Vector3(-4.0, 0.5, -2.2),
      new THREE.Vector3(-3.2, 0.03, -1.6),
      new THREE.Vector3(-2.2, 0.03, -1.0),
      new THREE.Vector3(-1.75, 0.35, -0.86),
    ]);
    return new THREE.TubeGeometry(curve, 48, 0.014, 6, false);
  }, []);
  // Laser de mesure : du trépied vers l'arrière de la voiture.
  const laser = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6.6, 1.42, -4.4), new THREE.Vector3(-2.3, 0.95, -0.7)]),
        mats.laser,
      ),
    [mats],
  );
  const cable = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const p = progress.get();
    const L = introLight(intro ? intro.get() : 1);
    mats.screens.forEach((m) => m.color.setScalar(0.25 + 0.75 * L));
    (mats.eng.strip as THREE.MeshBasicMaterial).color.setScalar(1.1 * L);
    // La voiture part : le câble est débranché, le laser s'arrête.
    const parked = p < FILM.door[0];
    if (cable.current) cable.current.visible = parked;
    laser.visible = parked && L > 0.5;
    mats.laser.opacity = 0.35 + 0.25 * Math.sin(state.clock.elapsedTime * 3);
  });
  const toCar = (x: number, z: number) => Math.atan2(-x, -z);
  return (
    <group>
      {/* 1. Ingénieur à la tablette, près de l'avant de la voiture */}
      <Engineer position={[4.4, 0, -3.3]} facing={toCar(4.4 - 1.2, -3.3)} pose="pointing" phase={0} mats={mats.eng} />

      {/* 2. Ingénieur à l'ordinateur sur chariot, relié à la voiture */}
      <group position={[-4.5, 0, -2.85]}>
        <mesh position={[0, 0.45, 0]} material={mats.cart}>
          <boxGeometry args={[0.6, 0.9, 0.45]} />
        </mesh>
        <mesh position={[0, 0.91, 0]} material={mats.knob}>
          <boxGeometry args={[0.66, 0.03, 0.5]} />
        </mesh>
      </group>
      <Laptop position={[-4.45, 0.94, -2.8]} rotation={toCar(-4.45, -2.8) + Math.PI} mats={engAlt} />
      <Engineer position={[-4.8, 0, -3.02]} facing={toCar(-4.8, -3.02)} pose="typing" phase={1.3} mats={engAlt} />
      <mesh ref={cable} geometry={cableGeo} material={mats.cable} />

      {/* 3. Ingénieur au poste de contrôle (face aux écrans) */}
      <Engineer position={[6.96, 0, -5.54]} facing={Math.PI - 0.35} pose="typing" phase={2.4} mats={mats.eng} />

      {/* Oscilloscope sur chariot */}
      <group position={[3.0, 0, -5.6]} rotation-y={0.5}>
        <mesh position={[0, 0.42, 0]} material={mats.cart}>
          <boxGeometry args={[0.7, 0.84, 0.5]} />
        </mesh>
        <mesh position={[0, 1.06, 0]} material={mats.eng.device}>
          <boxGeometry args={[0.6, 0.4, 0.42]} />
        </mesh>
        <mesh position={[-0.07, 1.07, 0.212]} material={mats.screens[2]}>
          <planeGeometry args={[0.36, 0.26]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0.2, 1.17 - i * 0.1, 0.22]} rotation-x={Math.PI / 2} material={mats.knob}>
            <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
          </mesh>
        ))}
        {[-0.28, 0.28].flatMap((x) =>
          [-0.18, 0.18].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.04, z]} material={mats.knob}>
              <sphereGeometry args={[0.04, 8, 8]} />
            </mesh>
          )),
        )}
      </group>

      {/* Laser de mesure sur trépied, et l'ingénieur qui le surveille */}
      <group position={[-6.6, 0, -4.4]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <Limb key={i} a={[Math.cos(a) * 0.32, 0.01, Math.sin(a) * 0.32]} b={[0, 1.25, 0]} r={0.015} material={mats.knob} />
          );
        })}
        <mesh position={[0, 1.36, 0]} material={mats.eng.device}>
          <boxGeometry args={[0.2, 0.22, 0.2]} />
        </mesh>
        <mesh position={[0.05, 1.42, 0.06]} material={mats.lens}>
          <sphereGeometry args={[0.03, 12, 12]} />
        </mesh>
      </group>
      <primitive object={laser} />
      <Engineer position={[-7.4, 0, -3.7]} facing={toCar(-7.4 + 2, -3.7)} pose="tablet" phase={3.7} mats={engAlt} />
    </group>
  );
}

/** Portique de certification : il balaie la voiture et les paquets, son plan lumineux révèle le réseau. */
function Gantry({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      // Mat et sombre : un montant métallique renverrait les rampes du plafond en barre blanche.
      frame: new THREE.MeshStandardMaterial({ color: "#121212", metalness: 0.2, roughness: 0.75 }),
      strip: new THREE.MeshBasicMaterial({ color: glow(0.6), toneMapped: false }),
      plane: new THREE.MeshBasicMaterial({
        color: glow(1.2),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    }),
    [],
  );
  const intro = useIntro();
  useFrame(() => {
    const p = progress.get();
    const t = smoothstep(FILM.scan[0], FILM.scan[1], p);
    // Une fois la voiture certifiée, le portique remonte dans le plafond et libère la vue.
    const away = smoothstep(FILM.certifiedOut[0], FILM.deploy[0] + 0.01, p);
    if (group.current) {
      group.current.position.x = lerp(-3.3, 3.3, t);
      group.current.position.y = away * 4;
    }
    const on = Math.sin(Math.PI * t);
    mats.plane.opacity = 0.08 * on;
    mats.strip.color.setScalar((0.6 + 1.6 * on) * introLight(intro ? intro.get() : 1));
  });
  // Assez haut pour englober les paquets en attente au-dessus du toit.
  const H = 3.3;
  const Z = 1.78;
  return (
    <group ref={group} position={[-3.3, 0, 0]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, H / 2, s * Z]} material={mats.frame}>
            <boxGeometry args={[0.14, H, 0.14]} />
          </mesh>
          <mesh position={[0, H / 2, s * (Z - 0.075)]} material={mats.strip}>
            <boxGeometry args={[0.04, H - 0.1, 0.012]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H, 0]} material={mats.frame}>
        <boxGeometry args={[0.18, 0.14, Z * 2 + 0.14]} />
      </mesh>
      <mesh position={[0, H - 0.075, 0]} material={mats.strip}>
        <boxGeometry args={[0.04, 0.012, Z * 2 - 0.1]} />
      </mesh>
      <mesh position={[0, H / 2 - 0.05, 0]} rotation-y={Math.PI / 2} material={mats.plane}>
        <planeGeometry args={[Z * 2 - 0.15, H - 0.1]} />
      </mesh>
    </group>
  );
}

/** Cible du test de freinage à l'arrêt : panneau rayé qui se dresse devant la voiture. */
function TestTarget({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      white: new THREE.MeshBasicMaterial({ color: glow(1.05), toneMapped: false }),
      dark: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5 }),
      leg: new THREE.MeshStandardMaterial({ color: "#1e1e1e", roughness: 0.6 }),
    }),
    [],
  );
  useFrame(() => {
    const p = progress.get();
    const [a, b] = FILM.target;
    const up = smoothstep(a - 0.006, a + 0.004, p) * (1 - smoothstep(b - 0.01, b, p));
    const g = group.current;
    if (!g) return;
    g.visible = up > 0.001;
    g.position.y = -1.5 * (1 - up);
  });
  const W = 1.8;
  const SEG = 9;
  return (
    <group ref={group} position={[TARGET_X, 0, 0]} visible={false}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.25, s * 0.7]} material={mats.leg}>
          <boxGeometry args={[0.06, 0.5, 0.06]} />
        </mesh>
      ))}
      {Array.from({ length: SEG }, (_, i) => (
        <mesh key={i} position={[0, 0.95, -W / 2 + ((i + 0.5) * W) / SEG]} material={i % 2 ? mats.dark : mats.white}>
          <boxGeometry args={[0.05, 1.0, W / SEG]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

function Road() {
  const dashes = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const rails = useRef<THREE.InstancedMesh>(null);
  const start = GARAGE.front;
  const length = ROAD_LENGTH;
  const nDash = Math.floor(length / 4);
  const lampStep = 16;
  const nLamp = Math.floor(length / lampStep) * 2;
  const nRail = Math.floor(length / 4) * 2;
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < nDash; i++) {
      m.position.set(start + 2 + i * 4, 0.004, 0);
      m.updateMatrix();
      dashes.current?.setMatrixAt(i, m.matrix);
    }
    for (let i = 0; i < nLamp; i++) {
      const s = i % 2 ? 1 : -1;
      const x = start + 10 + Math.floor(i / 2) * lampStep;
      m.position.set(x, 2.4, s * 5.6);
      m.updateMatrix();
      poles.current?.setMatrixAt(i, m.matrix);
      m.position.set(x, 4.75, s * 5.0);
      m.updateMatrix();
      heads.current?.setMatrixAt(i, m.matrix);
    }
    for (let i = 0; i < nRail; i++) {
      m.position.set(start + 4 + Math.floor(i / 2) * 4, 0.3, (i % 2 ? 1 : -1) * 4.95);
      m.updateMatrix();
      rails.current?.setMatrixAt(i, m.matrix);
    }
    for (const r of [dashes, poles, heads, rails]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  }, [nDash, nLamp, nRail, start]);
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a3a3a", metalness: 0.8, roughness: 0.3 }), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[start + length / 2, 0, 0]}>
        <planeGeometry args={[length, 9]} />
        <meshStandardMaterial color="#121212" roughness={0.85} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[start + length / 2, -0.01, 0]}>
        <planeGeometry args={[length, 90]} />
        <meshStandardMaterial color="#080808" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation-x={-Math.PI / 2} position={[start + length / 2, 0.004, s * 4.1]}>
            <planeGeometry args={[length, 0.12]} />
            <meshBasicMaterial color="#9a9a9a" />
          </mesh>
          <mesh position={[start + length / 2, 0.55, s * 4.95]} material={railMat}>
            <boxGeometry args={[length, 0.18, 0.04]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={rails} args={[undefined, undefined, nRail]} material={railMat} frustumCulled={false}>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
      </instancedMesh>
      <instancedMesh ref={dashes} args={[undefined, undefined, nDash]} frustumCulled={false}>
        <boxGeometry args={[2, 0.005, 0.12]} />
        <meshBasicMaterial color="#d0d0d0" />
      </instancedMesh>
      <instancedMesh ref={poles} args={[undefined, undefined, nLamp]} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.07, 4.8, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, nLamp]} frustumCulled={false}>
        <boxGeometry args={[0.5, 0.06, 0.18]} />
        <meshBasicMaterial color={glow(2)} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Barrière du freinage d'urgence : elle tombe devant la voiture, puis se relève. */
function Barrier({ progress }: { progress: MotionValue<number> }) {
  const arm = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      post: new THREE.MeshStandardMaterial({ color: "#1e1e1e", metalness: 0.5, roughness: 0.4 }),
      white: new THREE.MeshBasicMaterial({ color: glow(1.15), toneMapped: false }),
      dark: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5 }),
      lamp: new THREE.MeshBasicMaterial({ color: glow(2.2), toneMapped: false, transparent: true, opacity: 0.15 }),
    }),
    [],
  );
  useFrame((state) => {
    const p = progress.get();
    const down = smoothstep(FILM.barrierDown[0], FILM.barrierDown[1], p) * (1 - smoothstep(FILM.barrierUp[0], FILM.barrierUp[1], p));
    if (arm.current) arm.current.rotation.x = (-Math.PI / 2) * (1 - down);
    mats.lamp.opacity = down > 0.02 && Math.sin(state.clock.elapsedTime * 9) > 0 ? 1 : 0.15;
  });
  const LEN = 8.8;
  const SEG = 8;
  return (
    <group position={[BARRIER_X, 0, -4.5]}>
      <mesh position={[0, 0.55, 0]} material={mats.post}>
        <boxGeometry args={[0.32, 1.1, 0.32]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={mats.lamp}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      <group ref={arm} position={[0, 1.0, 0.2]} rotation-x={-Math.PI / 2}>
        {Array.from({ length: SEG }, (_, i) => (
          <mesh key={i} position={[0, 0, ((i + 0.5) * LEN) / SEG]} material={i % 2 ? mats.dark : mats.white}>
            <boxGeometry args={[0.08, 0.1, LEN / SEG]} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.48, 9.0]} material={mats.post}>
        <boxGeometry args={[0.12, 0.96, 0.12]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Mise à jour OTA : cloud, ondes, paquets                             */
/* ------------------------------------------------------------------ */

/** Icône cloud de téléchargement (Lucide « cloud-download »), toujours face à la caméra. */
function OtaCloud({ progress }: { progress: MotionValue<number> }) {
  const geos = useMemo(
    () => ({
      cloud: iconStrokes(["M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"], 1.6),
      arrow: iconStrokes(["M12 13v8l-4-4", "m12 21 4-4"], 1.6),
    }),
    [],
  );
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: glow(1.8), toneMapped: false, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    [],
  );
  const group = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null);
  useFrame((state) => {
    const p = progress.get();
    const vis = win(p, FILM.ota[0], FILM.ota[1], 0.012);
    const g = group.current;
    if (!g) return;
    g.visible = vis > 0.002;
    if (!g.visible) return;
    g.quaternion.copy(state.camera.quaternion);
    g.scale.setScalar(0.7 + 0.3 * vis);
    mat.opacity = vis;
    const t = state.clock.elapsedTime;
    const loading = p > FILM.download[0] && p < FILM.download[1] + 0.01;
    if (arrow.current) arrow.current.position.y = loading ? ((t * 2) % 1) * 2.4 - 1.2 : 0;
  });
  const S = 0.07;
  return (
    <group ref={group} position={[0, CLOUD_Y, 0]} visible={false}>
      <group scale={[S, -S, S]}>
        {geos.cloud.map((g, i) => (
          <mesh key={`c${i}`} geometry={g} material={mat} renderOrder={12} />
        ))}
        <group ref={arrow}>
          {geos.arrow.map((g, i) => (
            <mesh key={`a${i}`} geometry={g} material={mat} renderOrder={12} />
          ))}
        </group>
      </group>
    </group>
  );
}

/** Ondes de transmission : anneaux fins qui descendent du cloud vers la voiture en s'élargissant. */
function OtaWaves({ progress }: { progress: MotionValue<number> }) {
  const COUNT = 3;
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(
    () =>
      Array.from(
        { length: COUNT },
        () =>
          new THREE.MeshBasicMaterial({
            color: glow(1.4),
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );
  useFrame((state) => {
    const vis = win(progress.get(), FILM.ota[0] + 0.006, FILM.ota[1], 0.012);
    const t = state.clock.elapsedTime;
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.visible = vis > 0.002;
      const ph = (t / 1.8 + i / COUNT) % 1;
      r.position.y = lerp(CLOUD_Y - 0.55, 2.0, ph);
      const s = lerp(0.3, 1.8, ph);
      r.scale.set(s * 1.4, s, 1);
      mats[i]!.opacity = vis * Math.sin(Math.PI * ph) * 0.35;
    });
  });
  return (
    <group>
      {mats.map((m, i) => (
        <mesh key={i} ref={(el) => void (rings.current[i] = el)} rotation-x={-Math.PI / 2} material={m} visible={false}>
          <ringGeometry args={[0.985, 1, 128]} />
        </mesh>
      ))}
    </group>
  );
}

/** Flux de données : fines traînées lumineuses qui tombent du cloud vers la voiture. */
function OtaStream({ progress }: { progress: MotionValue<number> }) {
  const TOP = CLOUD_Y - 0.6;
  const BOTTOM = 2.0;
  const COUNT = 54;
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: glow(2.2), toneMapped: false, transparent: true, opacity: 0, depthWrite: false }), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        a: (i * 2.39996) % (Math.PI * 2),
        r: 0.15 + ((i * 0.618) % 1) * 0.6,
        ph: (i * 0.137) % 1,
        v: 0.5 + ((i * 0.37) % 1) * 0.5,
      })),
    [],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const vis = win(progress.get(), FILM.download[0] - 0.008, FILM.download[1] + 0.01, 0.01);
    m.visible = vis > 0.002;
    mat.opacity = vis * 0.9;
    if (!m.visible) return;
    const t = state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      const f = (s.ph + t * s.v * 0.7) % 1;
      // Le flux s'évase légèrement en descendant, comme un faisceau.
      const rr = s.r * (0.35 + 0.65 * f);
      dummy.position.set(Math.cos(s.a) * rr, lerp(TOP, BOTTOM, f), Math.sin(s.a) * rr);
      dummy.scale.set(1, 0.6 + 0.8 * Math.sin(Math.PI * f), 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, mat, COUNT]} frustumCulled={false} visible={false} renderOrder={11}>
      <boxGeometry args={[0.012, 0.2, 0.012]} />
    </instancedMesh>
  );
}

/** Position (repère de la voiture) et visibilité de chaque paquet, lues par les repères cliquables. */
const PKG_STATE = PACKAGES.map(() => ({ pos: new THREE.Vector3(), vis: 0 }));

/** Point d'une courbe de Bézier quadratique. */
function bezier(out: THREE.Vector3, a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}

const TRAIL = 30;

/**
 * Paquets de conduite autonome : ils descendent du cloud sur une courbe en
 * laissant une traînée, se remplissent pendant le téléchargement, se posent
 * avec une onde, attendent la certification au-dessus du toit, puis filent
 * chacun vers son calculateur.
 */
function Packages({ progress }: { progress: MotionValue<number> }) {
  const geos = useMemo(() => {
    const box = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const tape = new THREE.BufferGeometry().setFromPoints(
      [
        [0, 0.151, -0.15],
        [0, 0.151, 0.15],
        [0, 0.151, 0.15],
        [0, -0.15, 0.151],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    return { box, edges: new THREE.EdgesGeometry(box), tape, core: new THREE.BoxGeometry(0.15, 0.15, 0.15) };
  }, []);
  const items = useMemo(
    () =>
      PACKAGES.map(() => {
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
        const colors = new Float32Array(TRAIL * 3);
        for (let j = 0; j < TRAIL; j++) colors.fill(Math.pow(1 - j / TRAIL, 1.6) * 1.6, j * 3, j * 3 + 3);
        trailGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const flat = (o = 0) =>
          new THREE.MeshBasicMaterial({ color: glow(1.4), transparent: true, opacity: o, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false });
        return {
          face: new THREE.MeshBasicMaterial({ color: "#121212", transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
          line: new THREE.LineBasicMaterial({ color: glow(1.6), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
          core: new THREE.MeshBasicMaterial({ color: glow(2.2), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
          trailMat: new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          }),
          trailGeo,
          land: flat(),
          halo: flat(),
        };
      }),
    [],
  );
  const objs = useMemo(
    () =>
      items.map((it) => ({
        edges: new THREE.LineSegments(geos.edges, it.line),
        tape: new THREE.LineSegments(geos.tape, it.line),
        trail: new THREE.Line(it.trailGeo, it.trailMat),
      })),
    [items, geos],
  );
  const groups = useRef<(THREE.Group | null)[]>([]);
  const cores = useRef<(THREE.Mesh | null)[]>([]);
  const lands = useRef<(THREE.Mesh | null)[]>([]);
  const halos = useRef<(THREE.Mesh | null)[]>([]);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), q: new THREE.Vector3() }), []);

  useFrame((state) => {
    const p = progress.get();
    const t = state.clock.elapsedTime;
    const gx = lerp(-3.3, 3.3, smoothstep(FILM.scan[0], FILM.scan[1], p));
    const scanning = p > FILM.scan[0] && p < FILM.scan[1];
    PACKAGES.forEach((pkg, i) => {
      const g = groups.current[i];
      const it = items[i]!;
      const o = objs[i]!;
      if (!g) return;
      const [d0, d1] = downloadOf(i);
      const [e0, e1] = deployOf(i);
      const s = STAGE[i]!;
      const node = nodeById(pkg.node).pos;
      let vis = 1;
      let scale = 1;
      let fill = 1;
      // Trajet en cours (téléchargement ou déploiement) : courbe et avancement.
      let path: { k: number } | null = null;
      if (p < d0 || p > e1) vis = 0;
      else if (p < d1) {
        const k = easeInOut((p - d0) / (d1 - d0));
        v.a.set(0, CLOUD_Y - 0.55, 0);
        v.c.set(s[0] * 2.4, (CLOUD_Y + s[1]) / 2, 1.1 * (i - 1) + 0.6);
        v.b.set(...s);
        path = { k };
        bezier(g.position, v.a, v.c, v.b, k);
        scale = 0.45 + 0.55 * k;
        fill = smoothstep(0.1, 1, k);
        vis = smoothstep(0, 0.15, k);
      } else if (p < e0) {
        // En attente de certification : il flotte, son noyau respire.
        g.position.set(s[0], s[1] + Math.sin(t * 2 + i) * 0.04, s[2]);
        fill = 0.85 + 0.15 * Math.sin(t * 3 + i);
      } else {
        const k = easeInOut((p - e0) / (e1 - e0));
        v.a.set(...s);
        v.c.set((s[0] + node[0]) / 2, s[1] + 0.55, (s[2] + node[2]) / 2 + 0.7);
        v.b.set(...node);
        path = { k };
        bezier(g.position, v.a, v.c, v.b, k);
        scale = 1 - 0.8 * k;
        vis = 1 - smoothstep(0.9, 1, k);
      }
      g.visible = vis > 0.002;
      g.scale.setScalar(scale);
      g.rotation.set(0.35, t * 0.6 + i * 1.7, 0);
      const hit = scanning ? Math.exp(-((gx - g.position.x) ** 2) / 0.08) : 0;
      it.face.opacity = vis * 0.8;
      it.line.opacity = vis;
      it.line.color.setScalar(1.3 + 2 * hit);
      it.core.opacity = vis * (0.55 + 0.45 * hit);
      cores.current[i]?.scale.setScalar(Math.max(0.001, fill));

      // Traînée : les positions passées le long de la courbe.
      o.trail.visible = !!path && vis > 0.002;
      if (path) {
        const arr = it.trailGeo.attributes.position!.array as Float32Array;
        for (let j = 0; j < TRAIL; j++) {
          bezier(v.q, v.a, v.c, v.b, Math.max(0, path.k - j * 0.03));
          arr[j * 3] = v.q.x;
          arr[j * 3 + 1] = v.q.y;
          arr[j * 3 + 2] = v.q.z;
        }
        it.trailGeo.attributes.position!.needsUpdate = true;
        it.trailMat.opacity = vis * Math.sin(Math.PI * clamp(path.k, 0, 1)) * 1.2;
      }

      // Onde d'atterrissage, puis halo d'attente sous le paquet.
      const lk = (p - d1) / 0.014;
      const land = lands.current[i];
      if (land) {
        land.visible = lk > 0 && lk < 1;
        land.position.set(s[0], s[1] - 0.2, s[2]);
        land.scale.setScalar(0.25 + lk * 0.55);
      }
      it.land.opacity = lk > 0 && lk < 1 ? (1 - lk) * 0.9 : 0;
      const pending = p > d1 && p < e0 ? smoothstep(d1, d1 + 0.01, p) * (1 - smoothstep(e0 - 0.006, e0, p)) : 0;
      const halo = halos.current[i];
      if (halo) {
        halo.visible = pending > 0.002;
        halo.position.set(s[0], s[1] - 0.22, s[2]);
        halo.rotation.z = t * 0.8 + i;
      }
      it.halo.opacity = pending * 0.4;

      PKG_STATE[i]!.pos.copy(g.position);
      PKG_STATE[i]!.vis = vis;
    });
  });

  return (
    <group>
      {PACKAGES.map((pkg, i) => (
        <group key={pkg.node}>
          <group ref={(el) => void (groups.current[i] = el)} visible={false}>
            <mesh geometry={geos.box} material={items[i]!.face} renderOrder={12} />
            <mesh ref={(el) => void (cores.current[i] = el)} geometry={geos.core} material={items[i]!.core} renderOrder={13} />
            <primitive object={objs[i]!.edges} renderOrder={14} />
            <primitive object={objs[i]!.tape} renderOrder={14} />
          </group>
          <primitive object={objs[i]!.trail} renderOrder={11} />
          <mesh ref={(el) => void (lands.current[i] = el)} rotation-x={-Math.PI / 2} material={items[i]!.land} renderOrder={11} visible={false}>
            <ringGeometry args={[0.9, 1, 64]} />
          </mesh>
          <mesh ref={(el) => void (halos.current[i] = el)} rotation-x={-Math.PI / 2} material={items[i]!.halo} renderOrder={11} visible={false}>
            <ringGeometry args={[0.22, 0.235, 48, 1, 0, Math.PI * 1.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Réseau dans la voiture                                              */
/* ------------------------------------------------------------------ */

/** Éclairs ponctuels : détection au radar, commande reçue au frein, paquet installé. */
const FLASHES: { id: string; at: number }[] = [
  ...FILM.pulse.flatMap(([a, b]) => [
    { id: "radar", at: a - 0.004 },
    { id: "brake-fl", at: b },
  ]),
  ...PACKAGES.map((pkg, i) => ({ id: pkg.node as string, at: deployOf(i)[1] - 0.003 })),
];

/** Vue « rayons X » : nœuds et liens, chaîne critique, impulsions, synchronisation, ECU compromis. */
function NetworkXray({ progress }: { progress: MotionValue<number> }) {
  const nodeMats = useMemo(
    () =>
      NODES.map(
        (n) =>
          new THREE.MeshBasicMaterial({
            color: n.critical ? glow(2) : new THREE.Color("#b0b0b0"),
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const linkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(LINKS.flatMap(([a, b]) => [...nodeById(a).pos, ...nodeById(b).pos]), 3),
    );
    return g;
  }, []);
  const critGeo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(CRITICAL_PATH.map((id) => new THREE.Vector3(...nodeById(id).pos))),
    [],
  );
  const mats = useMemo(
    () => ({
      link: new THREE.LineBasicMaterial({ color: "#d6d6d6", transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
      crit: new THREE.LineBasicMaterial({ color: glow(2.4), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
      pulse: new THREE.MeshBasicMaterial({ color: glow(3), depthTest: false, depthWrite: false, toneMapped: false }),
      flash: FLASHES.map(
        () => new THREE.MeshBasicMaterial({ color: glow(2), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
      ),
    }),
    [],
  );
  const critLine = useMemo(() => new THREE.Line(critGeo, mats.crit), [critGeo, mats]);
  const critFlow = useMemo(() => makeFlow(CRITICAL_PATH, 1, "critical"), []);
  const pulse = useRef<THREE.Mesh>(null);
  const flashes = useRef<(THREE.Mesh | null)[]>([]);
  const tmp = useMemo<V3>(() => [0, 0, 0], []);
  const intro = useIntro();

  useFrame((state) => {
    const p = progress.get();
    const t = state.clock.elapsedTime;
    const vis = maxWin(p, FILM.network);
    const ip = intro ? intro.get() : 1;
    const iv = introNet(ip, p);
    const [s0, s1] = FILM.scan;
    const sx = lerp(-3.3, 3.3, smoothstep(s0, s1, p));
    const inCert = p < 0.3;
    // Paramètres surveillés : tous les nœuds battent ensemble (horloges synchronisées).
    const sync = win(p, FILM.monitor[0], FILM.monitor[1], 0.01) * Math.exp(-(t % 1) / 0.08);
    NODES.forEach((n, i) => {
      let o = vis * (inCert ? smoothstep(-0.05, 0.25, sx - n.pos[0]) : 1);
      o = Math.max(o, iv * introNode(ip, i));
      // ECU compromis : le lidar se dérègle, puis il est isolé.
      if (n.id === "lidar" && p > FILM.rogue[0]) {
        if (p < FILM.isolate) o *= Math.sin(t * 41) * Math.sin(t * 23) > 0 ? 1 : 0.2;
        else if (p < FILM.rogue[1] + 0.05) o *= 0.35;
      }
      nodeMats[i]!.opacity = o;
      nodeRefs.current[i]?.scale.setScalar(1 + 0.8 * sync);
    });
    mats.link.opacity = Math.max(vis * 0.5 * (inCert ? smoothstep(s1 - 0.015, s1 + 0.005, p) : 1), iv * 0.5);
    mats.crit.opacity = maxWin(p, FILM.radar.map(([a, b]) => [a, b + 0.008] as const), 0.008);

    let shown = false;
    for (const [a, b] of FILM.pulse) {
      const k = (p - a) / (b - a);
      if (k > 0 && k < 1) {
        pointAt(critFlow, k * critFlow.total, tmp);
        shown = true;
      }
    }
    if (pulse.current) {
      pulse.current.visible = shown;
      if (shown) pulse.current.position.set(tmp[0], tmp[1], tmp[2]);
    }
    FLASHES.forEach((f, i) => {
      const r = (p - f.at) / 0.014;
      const m = flashes.current[i];
      const on = r > 0 && r < 1;
      if (m) {
        m.visible = on;
        m.scale.setScalar(0.04 + r * 0.18);
      }
      mats.flash[i]!.opacity = on ? 1 - r : 0;
    });
  });

  return (
    <group>
      {NODES.map((n, i) => (
        <mesh
          key={n.id}
          ref={(el) => void (nodeRefs.current[i] = el)}
          position={n.pos}
          material={nodeMats[i]}
          renderOrder={10}
        >
          <sphereGeometry args={[n.critical ? 0.055 : 0.042, 16, 16]} />
        </mesh>
      ))}
      <lineSegments geometry={linkGeo} material={mats.link} renderOrder={9} />
      <primitive object={critLine} renderOrder={9} />
      <mesh ref={pulse} material={mats.pulse} renderOrder={11} visible={false}>
        <sphereGeometry args={[0.07, 16, 16]} />
      </mesh>
      {FLASHES.map((f, i) => (
        <mesh
          key={i}
          ref={(el) => void (flashes.current[i] = el)}
          position={nodeById(f.id).pos}
          material={mats.flash[i]}
          renderOrder={11}
          visible={false}
        >
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
      ))}
    </group>
  );
}

/** Messages qui circulent entre les modules (flux réguliers). */
function Packets({ progress }: { progress: MotionValue<number> }) {
  const flows = useMemo<Flow[]>(
    () => [makeFlow(CRITICAL_PATH, 1.4, "critical"), ...OTHER_FLOWS.map((f) => makeFlow(f, 0.9, "best"))],
    [],
  );
  const PER = 7;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo<V3>(() => [0, 0, 0], []);
  const intro = useIntro();
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const crit = glow(2.2);
    const other = new THREE.Color("#9a9a9a");
    flows.forEach((f, fi) => {
      for (let j = 0; j < PER; j++) m.setColorAt(fi * PER + j, f.kind === "critical" ? crit : other);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [flows]);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const p = progress.get();
    const ip = intro ? intro.get() : 1;
    const vis = Math.max(maxWin(p, FILM.packets), introNet(ip, p));
    m.visible = vis > 0.001;
    if (!m.visible) return;
    const t = state.clock.elapsedTime;
    flows.forEach((f, fi) => {
      for (let j = 0; j < PER; j++) {
        pointAt(f, t * f.speed + (j / PER) * f.total + fi, tmp);
        dummy.position.set(tmp[0], tmp[1], tmp[2]);
        dummy.scale.setScalar(vis * (f.kind === "critical" ? 1.2 : 0.8));
        dummy.updateMatrix();
        m.setMatrixAt(fi * PER + j, dummy.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, flows.length * PER]} frustumCulled={false} renderOrder={10}>
      <sphereGeometry args={[0.03, 10, 10]} />
      <meshBasicMaterial toneMapped={false} depthTest={false} depthWrite={false} />
    </instancedMesh>
  );
}

/** Faisceau du radar avant : vers la cible dans le garage, puis vers la barrière sur la route. */
function RadarCone({ progress }: { progress: MotionValue<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const radar = nodeById("radar").pos;
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const p = progress.get();
    const [w0, w1] = FILM.radar;
    const v0 = win(p, w0![0], w0![1], 0.008);
    const v1 = win(p, w1![0], w1![1], 0.01);
    const vis = Math.max(v0, v1);
    m.visible = vis > 0.001;
    if (!m.visible) return;
    const L = v0 > v1 ? TARGET_X - 0.05 - radar[0] : clamp(BARRIER_X - carX(p) - radar[0], 1, 45);
    const r = L * 0.16;
    m.scale.set(r, L, r);
    m.position.set(radar[0] + L / 2, radar[1], radar[2]);
    mat.opacity = vis * (0.06 + 0.03 * Math.sin(state.clock.elapsedTime * 18));
  });
  return (
    <mesh ref={mesh} rotation-z={Math.PI / 2} material={mat} visible={false}>
      <coneGeometry args={[1, 1, 48, 1, true]} />
    </mesh>
  );
}

/** Phares : flaque de lumière dans le garage, puis sur la route. */
function Headlights({ progress }: { progress: MotionValue<number> }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (light.current) light.current.intensity = 40 * smoothstep(0.37, 0.4, progress.get());
  });
  return (
    <>
      <primitive object={target} position={[14, 0, 0]} />
      <spotLight ref={light} position={[2.2, 0.75, 0]} target={target} angle={0.55} penumbra={0.7} distance={45} decay={1.4} intensity={0} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Certification : anneau au sol et emblème                            */
/* ------------------------------------------------------------------ */

function ellipseBand(rx: number, rz: number, w: number, n: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pos.push(rx * c, 0, rz * s, (rx + w) * c, 0, (rz + w) * s);
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function ellipseTicks(rx: number, rz: number, n: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / n) * Math.PI * 2;
    const da = i % 4 === 0 ? 0.008 : 0.004;
    const len = i % 4 === 0 ? 0.22 : 0.12;
    const k = pos.length / 3;
    for (const [ang, r] of [
      [a - da, 1],
      [a + da, 1],
      [a - da, 1 + len / rx],
      [a + da, 1 + len / rx],
    ] as const)
      pos.push(rx * r * Math.cos(ang), 0, rz * r * Math.sin(ang));
    idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function CertRing({ progress }: { progress: MotionValue<number> }) {
  const N = 240;
  const T = 96;
  const geos = useMemo(
    () => ({ band: ellipseBand(3.25, 2.05, 0.05, N), inner: ellipseBand(3.0, 1.82, 0.012, N), ticks: ellipseTicks(3.36, 2.14, T) }),
    [],
  );
  const mats = useMemo(
    () => ({
      band: new THREE.MeshBasicMaterial({ color: glow(1.8), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
      soft: new THREE.MeshBasicMaterial({ color: glow(1), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    }),
    [],
  );
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = progress.get();
    const vis = win(p, FILM.ring[0] - 0.004, FILM.certifiedOut[1], 0.015);
    const draw = smoothstep(FILM.ring[0], FILM.ring[1], p);
    if (group.current) group.current.visible = vis > 0.001;
    geos.band.setDrawRange(0, Math.floor(draw * N) * 6);
    geos.inner.setDrawRange(0, Math.floor(clamp(draw * 1.15 - 0.15, 0, 1) * N) * 6);
    geos.ticks.setDrawRange(0, Math.floor(clamp(draw * 1.3 - 0.3, 0, 1) * T) * 6);
    mats.band.opacity = vis;
    mats.soft.opacity = vis * 0.6;
  });
  return (
    <group ref={group} position={[0, 0.012, 0]} visible={false}>
      <mesh geometry={geos.band} material={mats.band} renderOrder={2} />
      <mesh geometry={geos.inner} material={mats.soft} renderOrder={2} />
      <mesh geometry={geos.ticks} material={mats.soft} renderOrder={2} />
    </group>
  );
}

/** Géométries du logo CertiSen en relief (bouclier et couronne extrudés, poussoir, coche en réserve). */
function useLogoGeometry() {
  return useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="${LOGO_PATHS.crown}" fill="#fff"/><path d="${LOGO_PATHS.shield}" fill="#fff"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const CX = 16;
    const CY = 15.3;
    const body = new THREE.ExtrudeGeometry(shapes, {
      depth: 2.2,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.35,
      bevelSegments: 3,
      curveSegments: 32,
    });
    body.translate(-CX, -CY, -1.1);
    body.computeVertexNormals();
    const pusher = new THREE.CapsuleGeometry(0.9, 2.26, 6, 16);
    pusher.rotateZ(Math.PI / 4);
    pusher.translate(25.1 - CX, 6.1 - CY, 0);
    const pts = [new THREE.Vector2(11.3, 16.9), new THREE.Vector2(14.6, 20.2), new THREE.Vector2(20.8, 13.6)];
    const check = SVGLoader.pointsToStroke(pts, SVGLoader.getStrokeStyle(2.6, "#000", "round", "round"));
    check.translate(-CX, -CY, 0);
    return { body, pusher, check };
  }, []);
}

/** Emblème du logo au-dessus de la voiture, au moment de la certification. */
function Emblem({ progress }: { progress: MotionValue<number> }) {
  const geo = useLogoGeometry();
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      metal: new THREE.MeshStandardMaterial({
        color: "#f2f2f2",
        metalness: 0.55,
        roughness: 0.22,
        emissive: "#ffffff",
        emissiveIntensity: 0.28,
        transparent: true,
      }),
      check: new THREE.MeshBasicMaterial({ color: "#0a0a0a", transparent: true, side: THREE.DoubleSide }),
      ring: new THREE.MeshBasicMaterial({ color: glow(1.6), transparent: true, toneMapped: false }),
      beam: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );
  const S = 0.042;
  // Au-dessus des paquets en attente : le rai de l'emblème les « tamponne » au passage.
  const Y = 4.0;
  useFrame((state) => {
    const p = progress.get();
    const a = smoothstep(FILM.emblem[0], FILM.emblem[1], p);
    const o = 1 - smoothstep(FILM.certifiedOut[0], FILM.certifiedOut[1], p);
    const vis = a * o;
    const g = group.current;
    if (!g) return;
    g.visible = vis > 0.002;
    if (!g.visible) return;
    g.position.y = Y - (1 - a) * 0.8 + (1 - o) * 0.7;
    g.scale.setScalar(0.6 + 0.4 * a);
    if (spin.current) spin.current.rotation.y = state.clock.elapsedTime * 0.6 + (1 - a) * 2.4;
    mats.metal.opacity = vis;
    mats.check.opacity = vis;
    mats.ring.opacity = vis;
    mats.beam.opacity = vis * 0.035;
  });
  return (
    <group ref={group} position={[0, Y, 0]} visible={false}>
      <group ref={spin}>
        <group scale={[S, -S, S]}>
          <mesh geometry={geo.body} material={mats.metal} />
          <mesh geometry={geo.pusher} material={mats.metal} />
          <mesh geometry={geo.check} material={mats.check} position={[0, 0, 1.62]} />
          <mesh geometry={geo.check} material={mats.check} position={[0, 0, -1.62]} />
        </group>
        <mesh material={mats.ring}>
          <torusGeometry args={[0.82, 0.012, 8, 128]} />
        </mesh>
      </group>
      <mesh position={[0, -1.55, 0]} material={mats.beam}>
        <cylinderGeometry args={[0.35, 2.4, 2.5, 48, 1, true]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Paramètres surveillés                                               */
/* ------------------------------------------------------------------ */

/**
 * Autour de chaque commutateur : l'anneau fixe est la borne σ du délai de
 * commutation, l'anneau intérieur la valeur mesurée, qui reste en dessous.
 */
const SWITCHES = ["sw-front", "sw-central", "sw-rear"] as const;
function SwitchGauges({ progress }: { progress: MotionValue<number> }) {
  const mats = useMemo(
    () => ({
      bound: new THREE.MeshBasicMaterial({ color: glow(1.2), transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false }),
      value: new THREE.MeshBasicMaterial({ color: glow(2.2), transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false }),
    }),
    [],
  );
  const inner = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const vis = win(progress.get(), FILM.monitor[0], FILM.monitor[1], 0.012);
    if (group.current) group.current.visible = vis > 0.002;
    mats.bound.opacity = vis * 0.6;
    mats.value.opacity = vis;
    const t = state.clock.elapsedTime;
    inner.current.forEach((m, i) => m?.scale.setScalar(0.45 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1))));
  });
  return (
    <group ref={group} visible={false}>
      {SWITCHES.map((id, i) => (
        <group key={id} position={nodeById(id).pos} rotation-x={-Math.PI / 2}>
          <mesh material={mats.bound} renderOrder={11}>
            <ringGeometry args={[0.235, 0.245, 64]} />
          </mesh>
          <mesh ref={(el) => void (inner.current[i] = el)} material={mats.value} renderOrder={11}>
            <ringGeometry args={[0.31, 0.33, 64]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Battement de surveillance autour de la voiture. */
function MonitorPulse({ progress }: { progress: MotionValue<number> }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(
    () =>
      [0, 1].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: glow(1.4),
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );
  useFrame((state) => {
    const vis = win(progress.get(), FILM.monitor[0], FILM.monitor[1], 0.015);
    const t = state.clock.elapsedTime;
    rings.current.forEach((r, i) => {
      if (!r) return;
      const ph = (t + i * 0.5) % 1;
      r.visible = vis > 0.002;
      const s = 0.95 + ph * 0.7;
      r.scale.set(3.3 * s, 2.1 * s, 1);
      mats[i]!.opacity = vis * (1 - ph) * 0.4;
    });
  });
  return (
    <group position={[0, 0.015, 0]}>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => void (rings.current[i] = el)} rotation-x={-Math.PI / 2} material={mats[i]} visible={false}>
          <ringGeometry args={[0.985, 1, 128]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cybersécurité : ECU compromis isolé, injection bloquée              */
/* ------------------------------------------------------------------ */

/** Émetteur étranger, à côté de la voiture (prise de diagnostic, appareil pirate…). */
const INJECTOR: V3 = [-0.4, 1.1, 2.7];

/** Anneau irrégulier (contour « parasité » de l'ECU compromis). */
function jaggedRing(r: number, n: number, seed: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.28 * Math.sin(i * 12.9898 + seed) * Math.sin(i * 4.1414 + seed * 2);
    pts.push(new THREE.Vector3(Math.cos(a) * r * k, Math.sin(a) * r * k, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

/** Logo CertiSen à plat : bouclier et couronne pleins, poussoir, coche en réserve (unités SVG centrées). */
function useFlatLogo() {
  return useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="${LOGO_PATHS.crown}" fill="#fff"/><path d="${LOGO_PATHS.shield}" fill="#fff"/></svg>`;
    const shapes = new SVGLoader().parse(svg).paths.flatMap((pp) => SVGLoader.createShapes(pp));
    const fill = new THREE.ShapeGeometry(shapes, 24).translate(-16, -15.3, 0);
    const style = SVGLoader.getStrokeStyle(1.8, "#fff", "round", "round");
    const pusher = SVGLoader.pointsToStroke([new THREE.Vector2(24.3, 6.9), new THREE.Vector2(25.9, 5.3)], style).translate(-16, -15.3, 0);
    const check = SVGLoader.pointsToStroke(
      [new THREE.Vector2(11.3, 16.9), new THREE.Vector2(14.6, 20.2), new THREE.Vector2(20.8, 13.6)],
      SVGLoader.getStrokeStyle(2.6, "#000", "round", "round"),
    ).translate(-16, -15.3, 0.01);
    return { fill, pusher, check };
  }, []);
}

/** Matériaux d'un logo bloqueur (un jeu par logo : opacité et éclat indépendants). */
function logoMaterials() {
  const base = { transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false } as const;
  return {
    fill: new THREE.MeshBasicMaterial({ ...base, color: glow(1.8), toneMapped: false }),
    check: new THREE.MeshBasicMaterial({ ...base, color: "#0a0a0a" }),
  };
}

/**
 * Cybersécurité.
 * 1. ECU compromis : le lidar se dérègle (contour parasité) et inonde le réseau
 *    jusqu'au commutateur central ; le commutateur arrière le détecte (onde),
 *    une cage se referme et le logo CertiSen se pose sur le lien coupé : les
 *    messages restent piégés.
 * 2. Injection : un émetteur étranger vise le commutateur central ; le logo
 *    CertiSen se dresse devant lui, chaque trame s'y écrase (onde, éclats).
 */
function CyberAttacks({ progress }: { progress: MotionValue<number> }) {
  const lidar = nodeById("lidar").pos;
  const swRear = nodeById("sw-rear").pos;
  const swCentral = nodeById("sw-central").pos;
  const SHIELD_R = 0.34;
  const FLOOD = 22;
  const INJ = 6;
  const FRAG = 5;
  const geos = useMemo(
    () => ({
      rogue: new THREE.SphereGeometry(0.03, 8, 6),
      frag: new THREE.TetrahedronGeometry(0.02),
      cage: new THREE.EdgesGeometry(new THREE.BoxGeometry(0.36, 0.36, 0.36)),
      shield: new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(SHIELD_R, 1)),
      device: new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.13)),
      glitch: [jaggedRing(0.13, 40, 1.7), jaggedRing(0.17, 40, 4.3)],
      cross: new THREE.BufferGeometry().setFromPoints(
        [
          [-0.06, -0.06, 0],
          [0.06, 0.06, 0],
          [-0.06, 0.06, 0],
          [0.06, -0.06, 0],
        ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      ),
      ray: new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...INJECTOR), new THREE.Vector3(...swCentral)]),
    }),
    [swCentral],
  );
  const line = (k: number) =>
    new THREE.LineBasicMaterial({ color: glow(k), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const mats = useMemo(
    () => ({
      // Messages illégitimes : sphères creuses (fil de fer), distinctes des messages pleins.
      rogue: new THREE.MeshBasicMaterial({ color: glow(1.8), wireframe: true, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
      frag: new THREE.MeshBasicMaterial({ color: glow(2.2), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
      cage: line(2.2),
      glitch: line(1.8),
      cross: line(2.4),
      shield: line(1.4),
      device: line(1.6),
      deviceRing: new THREE.MeshBasicMaterial({ color: glow(1.4), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
      ray: new THREE.LineDashedMaterial({ color: glow(0.9), dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
      fill: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }),
      ring: Array.from({ length: INJ + 1 }, () =>
        new THREE.MeshBasicMaterial({ color: glow(1.8), transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false }),
      ),
    }),
    [],
  );
  const objs = useMemo(() => {
    const ray = new THREE.Line(geos.ray, mats.ray);
    ray.computeLineDistances();
    return {
      cage: new THREE.LineSegments(geos.cage, mats.cage),
      shield: new THREE.LineSegments(geos.shield, mats.shield),
      device: new THREE.LineSegments(geos.device, mats.device),
      glitch: geos.glitch.map((g) => new THREE.LineLoop(g, mats.glitch)),
      cross: new THREE.LineSegments(geos.cross, mats.cross),
      ray,
    };
  }, [geos, mats]);
  const logo = useFlatLogo();
  const logoMats = useMemo(() => [logoMaterials(), logoMaterials()], []);
  const logos = useRef<(THREE.Group | null)[]>([]);
  const flood = useRef<THREE.InstancedMesh>(null);
  const inj = useRef<THREE.InstancedMesh>(null);
  const frags = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const shieldFill = useRef<THREE.Mesh>(null);
  const deviceRing = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const v = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      c: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      z: new THREE.Vector3(0, 0, 1),
    }),
    [],
  );
  const mid = useMemo(() => new THREE.Vector3(...lidar).lerp(new THREE.Vector3(...swRear), 0.5), [lidar, swRear]);

  useFrame((state) => {
    const p = progress.get();
    const t = state.clock.elapsedTime;
    const camQ = state.camera.quaternion;

    /* ---- 1. ECU compromis ---- */
    const fv = win(p, FILM.rogue[0], FILM.rogue[1] + 0.03, 0.006);
    const isolated = smoothstep(FILM.isolate, FILM.isolate + 0.006, p);
    const fm = flood.current;
    if (fm) {
      fm.visible = fv > 0.002;
      if (fm.visible) {
        v.a.set(...lidar);
        v.b.set(...swRear);
        v.c.set(...swCentral);
        for (let i = 0; i < FLOOD; i++) {
          const f = (t * 1.6 + i / FLOOD) % 1;
          // Libre : lidar → arrière → central, avec une trajectoire erratique.
          if (f < 0.5) dummy.position.lerpVectors(v.a, v.b, f * 2);
          else dummy.position.lerpVectors(v.b, v.c, (f - 0.5) * 2);
          dummy.position.x += Math.sin(t * 9 + i * 3.1) * 0.03;
          dummy.position.y += Math.sin(t * 11 + i * 1.7) * 0.03;
          // Isolé : piégé dans la cage, il rebondit contre ses parois.
          if (isolated > 0) {
            v.dir.set(Math.sin(i * 2.3), Math.sin(i * 1.3 + 1), Math.cos(i * 3.7)).normalize();
            v.hit.set(...lidar).addScaledVector(v.dir, 0.15 * Math.abs(Math.sin(t * 4 + i)));
            dummy.position.lerp(v.hit, isolated);
          }
          dummy.scale.setScalar(1 - 0.45 * isolated);
          dummy.updateMatrix();
          fm.setMatrixAt(i, dummy.matrix);
        }
        fm.instanceMatrix.needsUpdate = true;
      }
    }
    mats.rogue.opacity = Math.max(fv * (1 - 0.5 * isolated), 0);
    // Contour parasité tant que l'ECU n'est pas isolé.
    const glitching = fv * (1 - isolated);
    objs.glitch.forEach((g, i) => {
      g.visible = glitching > 0.002;
      g.position.set(...lidar);
      g.quaternion.copy(camQ);
      g.rotateZ(t * (i ? -2.3 : 1.7));
      g.scale.setScalar(1 + 0.12 * Math.sin(t * 17 + i));
    });
    mats.glitch.opacity = glitching * (Math.sin(t * 43) * Math.sin(t * 27) > 0 ? 1 : 0.3);
    // Détection au commutateur arrière : une onde part du commutateur.
    const dk = (p - (FILM.isolate - 0.006)) / 0.012;
    const det = rings.current[INJ];
    if (det) {
      det.visible = dk > 0 && dk < 1 && fv > 0.002;
      det.position.set(...swRear);
      det.quaternion.copy(camQ);
      det.scale.setScalar(0.05 + dk * 0.4);
    }
    mats.ring[INJ]!.opacity = dk > 0 && dk < 1 ? (1 - dk) * fv : 0;
    // Cage qui se referme, croix sur le lien coupé.
    objs.cage.visible = isolated > 0.001 && fv > 0.002;
    objs.cage.position.set(...lidar);
    objs.cage.scale.setScalar(lerp(1.9, 1, isolated));
    objs.cage.rotation.y = (1 - isolated) * 1.2;
    mats.cage.opacity = isolated * fv;
    objs.cross.visible = false;
    const lg0 = logos.current[0];
    if (lg0) {
      lg0.visible = objs.cage.visible;
      lg0.position.copy(mid);
      lg0.quaternion.copy(camQ);
      // Apparition avec un léger rebond.
      const pop = isolated < 1 ? isolated * (1 + 0.35 * Math.sin(Math.PI * isolated)) : 1;
      lg0.scale.setScalar(0.0095 * pop);
    }
    logoMats[0]!.fill.opacity = isolated * fv;
    logoMats[0]!.check.opacity = isolated * fv;

    /* ---- 2. Injection ---- */
    const iv = win(p, FILM.injection[0], FILM.injection[1], 0.008);
    const shield = smoothstep(FILM.shield, FILM.shield + 0.005, p);
    v.a.set(...INJECTOR);
    v.b.set(...swCentral);
    v.dir.copy(v.a).sub(v.b).normalize();
    v.hit.copy(v.b).addScaledVector(v.dir, SHIELD_R);
    v.q.setFromUnitVectors(v.z, v.dir);
    const im = inj.current;
    const fr = frags.current;
    let flash = 0;
    if (im && fr) {
      im.visible = iv > 0.002;
      fr.visible = im.visible && shield > 0.001;
      for (let i = 0; i < INJ; i++) {
        const f = (t * 0.9 + i / INJ) % 1;
        const ring = rings.current[i];
        let impact = -1;
        if (shield > 0.5) {
          // Vol jusqu'au bouclier (0 → 0,85), puis impact (0,85 → 1).
          if (f < 0.85) dummy.position.lerpVectors(v.a, v.hit, f / 0.85);
          else impact = (f - 0.85) / 0.15;
          dummy.scale.setScalar(impact >= 0 ? 0.001 : 1);
        } else {
          dummy.position.lerpVectors(v.a, v.b, f);
          dummy.scale.setScalar(1);
        }
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (ring) {
          ring.visible = impact >= 0 && iv > 0.002;
          ring.position.copy(v.hit);
          ring.quaternion.copy(v.q);
          ring.scale.setScalar(0.04 + Math.max(0, impact) * 0.22);
        }
        mats.ring[i]!.opacity = impact >= 0 ? (1 - impact) * iv : 0;
        if (impact >= 0) flash = Math.max(flash, 1 - impact / 0.35);
        // Éclats renvoyés vers l'émetteur.
        for (let j = 0; j < FRAG; j++) {
          const k = i * FRAG + j;
          if (impact >= 0) {
            const a = j * 1.2566 + i;
            dummy.position
              .copy(v.hit)
              .addScaledVector(v.dir, impact * 0.28)
              .add(v.c.set(Math.cos(a), Math.sin(a), Math.cos(a * 1.7)).multiplyScalar(impact * 0.14));
            dummy.scale.setScalar(1 - impact);
            dummy.rotation.set(t * 4 + j, t * 3, 0);
          } else dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          fr.setMatrixAt(k, dummy.matrix);
          dummy.rotation.set(0, 0, 0);
        }
      }
      im.instanceMatrix.needsUpdate = true;
      fr.instanceMatrix.needsUpdate = true;
    }
    mats.frag.opacity = iv;
    objs.device.visible = iv > 0.002;
    objs.device.position.set(...INJECTOR);
    objs.device.rotation.set(t * 0.9, t * 1.3, 0);
    mats.device.opacity = iv * (Math.sin(t * 37) * Math.sin(t * 19) > 0 ? 1 : 0.45);
    mats.deviceRing.opacity = iv * 0.6;
    if (deviceRing.current) {
      deviceRing.current.visible = objs.device.visible;
      deviceRing.current.rotation.set(Math.PI / 2 + Math.sin(t) * 0.3, t * 1.6, 0);
    }
    objs.ray.visible = iv > 0.002;
    mats.ray.opacity = iv * 0.5;
    objs.shield.visible = false;
    if (shieldFill.current) shieldFill.current.visible = false;
    const lg1 = logos.current[1];
    if (lg1) {
      lg1.visible = iv > 0.002 && shield > 0.001;
      lg1.position.copy(v.hit);
      lg1.quaternion.copy(v.q);
      const pop = shield < 1 ? shield * (1 + 0.35 * Math.sin(Math.PI * shield)) : 1;
      lg1.scale.setScalar(0.017 * pop * (1 + 0.06 * Math.max(0, flash)));
    }
    logoMats[1]!.fill.opacity = iv * shield;
    logoMats[1]!.fill.color.setScalar(1.6 + 1.6 * Math.max(0, flash));
    logoMats[1]!.check.opacity = iv * shield;
  });

  return (
    <group>
      <instancedMesh ref={flood} args={[geos.rogue, mats.rogue, FLOOD]} frustumCulled={false} renderOrder={12} visible={false} />
      {objs.glitch.map((g, i) => (
        <primitive key={i} object={g} renderOrder={13} />
      ))}
      <primitive object={objs.cage} renderOrder={13} />
      <primitive object={objs.cross} renderOrder={13} />
      <instancedMesh ref={inj} args={[geos.rogue, mats.rogue, INJ]} frustumCulled={false} renderOrder={12} visible={false} />
      <instancedMesh ref={frags} args={[geos.frag, mats.frag, INJ * FRAG]} frustumCulled={false} renderOrder={12} visible={false} />
      {mats.ring.map((m, i) => (
        <mesh key={i} ref={(el) => void (rings.current[i] = el)} material={m} renderOrder={13} visible={false}>
          <ringGeometry args={[0.9, 1, 48]} />
        </mesh>
      ))}
      <primitive object={objs.ray} renderOrder={11} />
      <primitive object={objs.device} renderOrder={13} />
      <mesh ref={deviceRing} position={INJECTOR} material={mats.deviceRing} renderOrder={13} visible={false}>
        <torusGeometry args={[0.2, 0.004, 6, 64]} />
      </mesh>
      <primitive object={objs.shield} renderOrder={13} />
      {logoMats.map((m, i) => (
        <group key={i} ref={(el) => void (logos.current[i] = el)} visible={false}>
          <group scale={[1, -1, 1]}>
            <mesh geometry={logo.fill} material={m.fill} renderOrder={15} />
            <mesh geometry={logo.pusher} material={m.fill} renderOrder={15} />
            <mesh geometry={logo.check} material={m.check} renderOrder={16} />
          </group>
        </group>
      ))}
      <mesh ref={shieldFill} position={swCentral} material={mats.fill} renderOrder={12} visible={false}>
        <sphereGeometry args={[SHIELD_R, 24, 16]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Courbe de latence tracée le long de la route                        */
/* ------------------------------------------------------------------ */

function strip(xs: number[], lo: number[], hi: number[], z: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  xs.forEach((x, i) => {
    pos.push(x, lo[i]!, z, x, hi[i]!, z);
    if (i < xs.length - 1) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function LatencyTrail({ progress }: { progress: MotionValue<number> }) {
  // Graphe planté de l'autre côté de la route : vu des plans aériens, il se dessine derrière la voiture.
  const Z = -4.0;
  const H0 = 1.6;
  const K = 3.2;
  const W = 0.1;
  const data = useMemo(() => {
    const x0 = carX(FILM.trail[0]);
    const x1 = carX(FILM.trail[1]);
    const n = 600;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i++) {
      const f = (i / (n - 1)) * (LATENCY.length - 1);
      const j = Math.min(LATENCY.length - 2, Math.floor(f));
      const v = lerp(LATENCY[j]!, LATENCY[j + 1]!, f - j);
      xs.push(lerp(x0, x1, i / (n - 1)));
      ys.push(H0 + v * K);
    }
    const flat = (y: number) => xs.map(() => y);
    const dashes = (y: number) => {
      const pos: number[] = [];
      const idx: number[] = [];
      for (let x = x0; x < x1; x += 1.4) {
        const k = pos.length / 3;
        pos.push(x, y - 0.018, Z, x + 0.7, y - 0.018, Z, x, y + 0.018, Z, x + 0.7, y + 0.018, Z);
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      return g;
    };
    return {
      x0,
      x1,
      xs,
      ys,
      trace: strip(
        xs,
        ys.map((y) => y - W / 2),
        ys.map((y) => y + W / 2),
        Z,
      ),
      area: strip(xs, flat(H0), ys, Z),
      deadline: strip(xs, flat(H0 + LATENCY_DEADLINE * K - 0.02), flat(H0 + LATENCY_DEADLINE * K + 0.02), Z),
      axis: strip(xs, flat(H0 - 0.012), flat(H0 + 0.012), Z),
      bound: dashes(H0 + LATENCY_BOUND * K),
    };
  }, []);
  const mats = useMemo(() => {
    const m = (c: THREE.Color, o = 0) =>
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    return { trace: m(glow(2.4)), area: m(glow(1)), deadline: m(glow(1.3)), bound: m(glow(0.8)), axis: m(glow(0.5)), head: m(glow(3)) };
  }, []);
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = progress.get();
    const vis = win(p, FILM.trailVisible[0], FILM.trailVisible[1], 0.02);
    const g = group.current;
    if (!g) return;
    g.visible = vis > 0.002;
    if (!g.visible) return;
    const n = data.xs.length;
    const hx = clamp(carX(p), data.x0, data.x1);
    const f = ((hx - data.x0) / (data.x1 - data.x0)) * (n - 1);
    const k = Math.max(0, Math.min(n - 1, Math.floor(f)));
    data.trace.setDrawRange(0, k * 6);
    data.area.setDrawRange(0, k * 6);
    if (head.current) {
      const y = lerp(data.ys[k]!, data.ys[Math.min(n - 1, k + 1)]!, f - k);
      head.current.position.set(hx, y, Z);
      head.current.visible = p > FILM.trail[0] - 0.005;
    }
    mats.trace.opacity = vis;
    mats.area.opacity = vis * 0.07;
    mats.deadline.opacity = vis * 0.85;
    mats.bound.opacity = vis * 0.7;
    mats.axis.opacity = vis * 0.6;
    mats.head.opacity = vis;
  });
  return (
    <group ref={group} visible={false}>
      <mesh geometry={data.area} material={mats.area} />
      <mesh geometry={data.axis} material={mats.axis} />
      <mesh geometry={data.deadline} material={mats.deadline} />
      <mesh geometry={data.bound} material={mats.bound} />
      <mesh geometry={data.trace} material={mats.trace} />
      <mesh ref={head} material={mats.head}>
        <sphereGeometry args={[0.09, 16, 16]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Points cliquables : position à l'écran de chaque nœud               */
/* ------------------------------------------------------------------ */

/** Éléments DOM des repères, par identifiant de nœud (remplis par la section). */
export type MarkerMap = Map<string, HTMLElement>;

/**
 * Projette chaque nœud à l'écran et place son repère DOM (pas de `Html` de drei :
 * il démonte mal). Un repère n'est actif que si son nœud est bien visible.
 */
function NodeProjector({ progress, markers }: { progress: MotionValue<number>; markers: RefObject<MarkerMap> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const intro = useIntro();
  useFrame((state) => {
    const map = markers.current;
    if (!map) return;
    const p = progress.get();
    const vis = maxWin(p, FILM.network);
    const ip = intro ? intro.get() : 1;
    const iv = introNet(ip, p);
    const x = carX(p);
    const sx = lerp(-3.3, 3.3, smoothstep(FILM.scan[0], FILM.scan[1], p));
    const { width, height } = state.size;
    state.camera.updateMatrixWorld();
    NODES.forEach((n, i) => {
      const el = map.get(n.id);
      if (!el) return;
      const reveal = p < 0.3 ? smoothstep(-0.05, 0.25, sx - n.pos[0]) : 1;
      v.set(n.pos[0] + x, n.pos[1], n.pos[2]).project(state.camera);
      const on = Math.max(vis * reveal, iv * introNode(ip, i)) > 0.6 && v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 ? "1" : "0";
      el.style.transform = `translate3d(${(((v.x + 1) / 2) * width).toFixed(1)}px, ${(((1 - v.y) / 2) * height).toFixed(1)}px, 0)`;
      if (el.dataset.on !== on) el.dataset.on = on;
    });
    PKG_STATE.forEach((st, i) => {
      const el = map.get(`pkg-${i}`);
      if (!el) return;
      v.copy(st.pos).setX(st.pos.x + x).project(state.camera);
      const on = st.vis > 0.6 && v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 ? "1" : "0";
      el.style.transform = `translate3d(${(((v.x + 1) / 2) * width).toFixed(1)}px, ${(((1 - v.y) / 2) * height).toFixed(1)}px, 0)`;
      if (el.dataset.on !== on) el.dataset.on = on;
    });
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Voiture                                                             */
/* ------------------------------------------------------------------ */

function Vehicle({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  // Assemblage : le démontage de la section « En action » joué à l'envers (0,2 → 0).
  const assembly = useTransform(progress, [FILM.assemble[0], FILM.assemble[1]], [0.2, 0], { clamp: true });
  const spin = useTransform(progress, (p) => carX(p) / DESIGN.wheel.R);
  useFrame(() => {
    if (group.current) group.current.position.x = carX(progress.get());
  });
  return (
    <group ref={group}>
      <CarBody progress={assembly} spin={spin} lights={false} />
      <Headlights progress={progress} />
      <OtaCloud progress={progress} />
      <OtaWaves progress={progress} />
      <OtaStream progress={progress} />
      <Packages progress={progress} />
      <NetworkXray progress={progress} />
      <Packets progress={progress} />
      <RadarCone progress={progress} />
      <CertRing progress={progress} />
      <Emblem progress={progress} />
      <SwitchGauges progress={progress} />
      <MonitorPulse progress={progress} />
      <CyberAttacks progress={progress} />
    </group>
  );
}

/** Projecteurs du plafond de l'atelier : baie de la voiture, robots et ingénieurs, poste de contrôle. */
const WORK_LIGHTS: { pos: V3; aim: V3; power: number }[] = [
  { pos: [0, 6.2, 0.5], aim: [0, 0, 0], power: 90 },
  { pos: [-2, 6.2, -4.5], aim: [-2, 0, -4], power: 70 },
  { pos: [6.5, 6.2, -5], aim: [6.8, 0, -5.8], power: 55 },
];

function Lighting({ progress }: { progress: MotionValue<number> }) {
  const intro = useIntro();
  const amb = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const spots = useRef<(THREE.SpotLight | null)[]>([]);
  const targets = useMemo(() => WORK_LIGHTS.map((w) => new THREE.Object3D()), []);
  useFrame(({ scene }) => {
    const L = 0.08 + 0.92 * introLight(intro ? intro.get() : 1);
    // Éclairage d'atelier : plein dans le garage, il baisse quand la voiture prend la route (nuit).
    const inGarage = introLight(intro ? intro.get() : 1) * (1 - smoothstep(FILM.door[1], FILM.door[1] + 0.05, progress.get()));
    if (amb.current) amb.current.intensity = 0.3 * L + 0.25 * inGarage;
    if (key.current) key.current.intensity = 1.7 * L;
    if (rim.current) rim.current.intensity = 1.4 * L;
    if (hemi.current) hemi.current.intensity = 0.9 * inGarage;
    spots.current.forEach((sp, i) => {
      if (sp) sp.intensity = WORK_LIGHTS[i]!.power * inGarage;
    });
    scene.environmentIntensity = L;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#ffffff", "#1c1c1c", 0]} />
      {WORK_LIGHTS.map((w, i) => (
        <group key={i}>
          <primitive object={targets[i]!} position={w.aim} />
          <spotLight
            ref={(el) => void (spots.current[i] = el)}
            position={w.pos}
            target={targets[i]}
            angle={0.75}
            penumbra={0.85}
            decay={2}
            distance={18}
            intensity={0}
          />
        </group>
      ))}
      <ambientLight ref={amb} intensity={0.3} />
      <directionalLight ref={key} position={[4, 8, 5]} intensity={1.7} />
      <directionalLight ref={rim} position={[-6, 5, -7]} intensity={1.4} />
      <Environment resolution={256} frames={1}>
        {[-2.2, 0, 2.2].map((z) => (
          <Lightformer key={z} form="rect" intensity={2.6} position={[0, 6, z]} scale={[12, 0.5, 1]} />
        ))}
        <Lightformer form="rect" intensity={1.4} position={[0, 1.6, 8]} scale={[18, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[0, 1.6, -8]} scale={[18, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[9, 2.4, 0]} scale={[7, 3, 1]} />
      </Environment>
    </>
  );
}

/** Poussière en suspension dans l'atelier : quelques points qui dérivent lentement. */
function Dust({ progress }: { progress: MotionValue<number> }) {
  const geo = useMemo(() => {
    const n = 160;
    const a = new Float32Array(n * 3);
    const rnd = (i: number) => {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < n; i++) {
      a[i * 3] = -8 + rnd(i) * 16;
      a[i * 3 + 1] = 0.2 + rnd(i + 0.31) * 5;
      a[i * 3 + 2] = -7 + rnd(i + 0.57) * 14;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.PointsMaterial({ color: "#9a9a9a", size: 0.025, transparent: true, opacity: 0.4, depthWrite: false }),
    [],
  );
  const pts = useRef<THREE.Points>(null);
  useFrame((state) => {
    const p = progress.get();
    if (!pts.current) return;
    pts.current.visible = p < FILM.door[1];
    pts.current.rotation.y = state.clock.elapsedTime * 0.01;
    pts.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    mat.opacity = 0.4 * (1 - smoothstep(FILM.door[0], FILM.door[1], p));
  });
  return <points ref={pts} geometry={geo} material={mat} />;
}

/** Couleur de fond du site (thème) lue dans les variables CSS. */
function themeInk() {
  if (typeof window === "undefined") return "#0a0a0a";
  return getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim() || "#0a0a0a";
}

export default function HeroFilmCanvas({
  progress,
  intro,
  markers,
  onReady,
  className,
}: {
  progress: MotionValue<number>;
  /** Avancement de l'intro (0 → 1), avant le film. */
  intro: MotionValue<number>;
  markers: RefObject<MarkerMap>;
  /** Appelé quand la scène est prête (écran de chargement). */
  onReady?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "200px" });
  const ink = useMemo(themeInk, []);
  return (
    <div ref={ref} className={className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: SHOTS[0]!.pos, fov: 36, near: 0.1, far: 220 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[ink]} />
        <fog attach="fog" args={[ink, 22, 85]} />
        <IntroCtx.Provider value={intro}>
        <Lighting progress={progress} />
        <Dust progress={progress} />
        <Garage progress={progress} />
        <Workshop progress={progress} />
        <Engineers progress={progress} />
        <Gantry progress={progress} />
        <TestTarget progress={progress} />
        <Road />
        <Barrier progress={progress} />
        <LatencyTrail progress={progress} />
        <Vehicle progress={progress} />
        <CameraRig progress={progress} />
        <NodeProjector progress={progress} markers={markers} />
        </IntroCtx.Provider>
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
          <ToneMapping mode={8} />
          <Vignette eskil={false} offset={0.2} darkness={0.6} />
        </EffectComposer>
        <Precompile onReady={onReady} />
      </Canvas>
    </div>
  );
}
