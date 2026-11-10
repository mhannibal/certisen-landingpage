"use client";

import { Line } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useInView, type MotionValue } from "motion/react";
import { Check } from "lucide-react";
import { NODE_ICON } from "./node-icons";
import { CarBody } from "./car-body";
import { Precompile } from "./precompile";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { buildCar, type V3 } from "@/lib/car";
import { DESIGN } from "@/lib/car-design";
import { caliperLines, wheelLines as buildWheelLines } from "@/lib/car-wheel";
import { CALIPER_LEFT, CALIPER_RIGHT, WHEEL_SPIN } from "./car-wheels";
import {
  CRITICAL_PATH,
  LINKS,
  NODES,
  OTHER_FLOWS,
  isOnCritical,
  nodeById,
  type CarNode,
} from "@/lib/car-network";
import { pointAt, smoothstep, type Flow } from "@/lib/network";
import { useDict } from "@/lib/i18n/provider";

/* ---------- caméra : plans du montage ---------- */
const CAM_POS = [
  new THREE.Vector3(7.2, 2.9, 8.1),
  new THREE.Vector3(0.4, 2.3, 9.4),
  new THREE.Vector3(5.6, 1.7, 4.8),
  new THREE.Vector3(7.4, 5.0, 7.2),
];
// Point visé un peu au-dessus de la voiture : elle descend dans le cadre et libère le haut pour le texte.
const CAM_LOOK = [
  new THREE.Vector3(0, 1.1, 0),
  new THREE.Vector3(0, 1.2, 0),
  new THREE.Vector3(0.9, 1.0, 0.2),
  new THREE.Vector3(0, 1.0, 0),
];

const toFlow = (ids: string[], speed: number, kind: Flow["kind"]): Flow => {
  const path = ids.map((id) => nodeById(id).pos);
  const lengths = path
    .slice(1)
    .map((p, i) =>
      new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...path[i]!)),
    );
  return {
    path,
    lengths,
    total: lengths.reduce((a, b) => a + b, 0),
    kind,
    speed,
  };
};

/** Brouillard de fond (distances pour un écran paysage). */
const FOG_NEAR = 9;
const FOG_FAR = 20;

function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(CAM_POS, false, "centripetal"),
    [],
  );
  const goal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0.75, 0), []);
  const lookGoal = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    // L'amorti du défilement peut dépasser légèrement [0, 1] : on borne pour rester sur la trajectoire.
    const p = THREE.MathUtils.clamp(progress.get(), 0, 0.999);
    curve.getPoint(p, goal);
    const seg = p * (CAM_LOOK.length - 1);
    const i = THREE.MathUtils.clamp(Math.floor(seg), 0, CAM_LOOK.length - 2);
    lookGoal.lerpVectors(
      CAM_LOOK[i]!,
      CAM_LOOK[i + 1]!,
      smoothstep(0, 1, seg - i),
    );
    // Écran portrait : la caméra recule pour garder la voiture entière dans le cadre ;
    // le brouillard recule d'autant, sinon la voiture s'y noierait.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const back = aspect < 1 ? THREE.MathUtils.clamp(1.4 / aspect, 1, 2.8) : 1;
    if (back > 1) goal.sub(lookGoal).multiplyScalar(back).add(lookGoal);
    const fog = state.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.near = FOG_NEAR * back;
      fog.far = FOG_FAR * back;
    }
    goal.x += state.pointer.x * 0.35;
    goal.y += state.pointer.y * 0.2;
    const k = Math.min(1, delta * 3);
    state.camera.position.lerp(goal, k);
    look.lerp(lookGoal, k);
    state.camera.lookAt(look);
  });
  return null;
}

type LineHandle = { material: THREE.Material & { opacity: number } };

function CarModel({ progress }: { progress: MotionValue<number> }) {
  const car = useMemo(() => buildCar(), []);
  const wheel = useMemo(() => buildWheelLines(DESIGN.wheel), []);
  const calipers = useMemo(
    () => [caliperLines(DESIGN.wheel, CALIPER_LEFT), caliperLines(DESIGN.wheel, CALIPER_RIGHT)] as const,
    [],
  );
  const refs = useRef<(LineHandle | null)[]>([]);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const wheelLines = useRef<(LineHandle | null)[]>([]);
  const shadow = useRef<THREE.MeshBasicMaterial>(null);
  const root = useRef<THREE.Group>(null);

  /* calque : points, couleur, épaisseur, opacité finale, début d'apparition */
  const lines: [V3[], string, number, number, number][] = [
    // débuts négatifs : la silhouette est déjà là en arrivant, les couches internes se dessinent ensuite
    [car.outline, "#f5f5f5", 1.5, 1, 0.05],
    [car.details, "#b5b5b5", 1, 0.85, 0.07],
    [car.cage, "#4a4a4a", 1, 0.8, 0.09],
    [car.interior, "#6e6e6e", 1, 0.75, 0.11],
    [car.chassis, "#555555", 1, 0.75, 0.12],
  ];

  useFrame((state) => {
    const p = progress.get();
    // Dernier plan : la voiture s'efface, il ne reste que le graphe du réseau TSN.
    const gone = 1 - smoothstep(0.8, 0.9, p);
    if (root.current) root.current.visible = gone > 0.01;
    // Un calque invisible n'est pas tracé (material.visible : il reste compilé par Precompile).
    refs.current.forEach((l, i) => {
      const layer = lines[i];
      if (!l || !layer) return;
      l.material.opacity = smoothstep(layer[4], layer[4] + 0.06, p) * layer[3] * gone;
      l.material.visible = l.material.opacity > 0.001;
    });
    // Roues en fil de fer : elles prennent le relais des roues pleines qui s'effacent (0,12 → 0,19).
    wheelLines.current.forEach((l) => {
      if (!l) return;
      l.material.opacity = smoothstep(0.15, 0.21, p) * gone;
      l.material.visible = l.material.opacity > 0.001;
    });
    // Ombre diffuse du fil de fer : prend le relais de l'ombre de contact de la voiture pleine.
    if (shadow.current) shadow.current.opacity = 0.55 * gone * smoothstep(0.1, 0.2, p);
    const spin = -state.clock.elapsedTime * WHEEL_SPIN;
    // Index pair = côté gauche, impair = côté droit. Les roues droites sont retournées
    // d'un demi-tour (rotation y = π) : leur axe local est inversé, donc on inverse le sens.
    wheelRefs.current.forEach((w, i) => {
      if (w) w.rotation.z = i % 2 === 0 ? spin : -spin;
    });
  });

  return (
    <group>
      <group ref={root}>
        {lines.map(([pts, color, w], i) => (
          <Line
            key={i}
            ref={(el) => void (refs.current[i] = el as unknown as LineHandle)}
            points={pts}
            segments
            color={color}
            lineWidth={w}
            transparent
            opacity={0}
            depthWrite={false}
          />
        ))}
        {DESIGN.axles.flatMap((ax, wi) =>
          [1, -1].map((s, si) => (
            <group
              key={`${ax}-${s}`}
              position={[ax, DESIGN.wheel.R, s * DESIGN.trackHalf]}
              rotation={[0, s === 1 ? 0 : Math.PI, 0]}
            >
              <group ref={(el) => void (wheelRefs.current[wi * 2 + si] = el)}>
                <Line
                  ref={(el) =>
                    void (wheelLines.current[(wi * 2 + si) * 3] =
                      el as unknown as LineHandle)
                  }
                  points={wheel.tire}
                  segments
                  color="#cfcfcf"
                  lineWidth={1.1}
                  transparent
                  opacity={0}
                />
                <Line
                  ref={(el) =>
                    void (wheelLines.current[(wi * 2 + si) * 3 + 1] =
                      el as unknown as LineHandle)
                  }
                  points={wheel.rim}
                  segments
                  color="#8a8a8a"
                  lineWidth={1}
                  transparent
                  opacity={0}
                />
              </group>
              <Line
                ref={(el) =>
                  void (wheelLines.current[(wi * 2 + si) * 3 + 2] =
                    el as unknown as LineHandle)
                }
                points={s === 1 ? calipers[0] : calipers[1]}
                segments
                color="#e5e5e5"
                lineWidth={1.2}
                transparent
                opacity={0}
              />
            </group>
          )),
        )}
        {/* ombre au sol */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 0]}
          scale={[2.9, 1.35, 1]}
        >
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial
            ref={shadow}
            color="#000000"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      </group>
      <gridHelper args={[16, 32, "#262626", "#181818"]} position={[0, 0, 0]} />
    </group>
  );
}

function NetworkLinks({
  progress,
  selected,
  stage,
}: {
  progress: MotionValue<number>;
  selected: string | null;
  stage: number;
}) {
  const refs = useRef<(LineHandle | null)[]>([]);
  useFrame(() => {
    const v = smoothstep(0.19, 0.26, progress.get());
    refs.current.forEach((l) => {
      if (!l) return;
      l.material.opacity = v;
      l.material.visible = v > 0.001;
    });
  });
  return (
    <group>
      {LINKS.map(([a, b], i) => {
        const crit = isOnCritical(a, b);
        const touched = selected !== null && (a === selected || b === selected);
        const lit = touched || stage >= 3 || (stage >= 2 && crit);
        return (
          <Line
            key={`${a}-${b}`}
            ref={(el) => void (refs.current[i] = el as unknown as LineHandle)}
            points={[nodeById(a).pos, nodeById(b).pos]}
            color={lit ? "#ffffff" : selected ? "#3a3a3a" : "#7a7a7a"}
            lineWidth={lit ? 2.2 : 1.2}
            dashed={!lit}
            dashSize={0.07}
            gapSize={0.06}
            transparent
            opacity={0}
            depthWrite={false}
          />
        );
      })}
    </group>
  );
}

function Packets({ progress }: { progress: MotionValue<number> }) {
  const flows = useMemo(
    () => [
      toFlow(CRITICAL_PATH, 1.1, "critical"),
      ...OTHER_FLOWS.map((f) => toFlow(f, 0.7, "best")),
    ],
    [],
  );
  const PER = 4;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo<V3>(() => [0, 0, 0], []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    // Messages entre modules : bleu clair de la marque ; flux critique plus lumineux (il rayonne au bloom).
    const critical = new THREE.Color("#ffffff").multiplyScalar(2);
    const other = new THREE.Color("#8a8a8a");
    flows.forEach((f, fi) => {
      for (let j = 0; j < PER; j++)
        m.setColorAt(fi * PER + j, f.kind === "critical" ? critical : other);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [flows]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const vis = smoothstep(0.27, 0.36, progress.get());
    flows.forEach((f, fi) => {
      for (let j = 0; j < PER; j++) {
        pointAt(f, t * f.speed + (j / PER) * f.total + fi, tmp);
        dummy.position.set(tmp[0], tmp[1], tmp[2]);
        dummy.scale.setScalar(vis * (f.kind === "critical" ? 1.25 : 0.8));
        dummy.updateMatrix();
        m.setMatrixAt(fi * PER + j, dummy.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, flows.length * PER]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.035, 10, 10]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/**
 * Projette chaque nœud 3D sur l'écran à chaque image et déplace le marqueur DOM
 * correspondant (sans état React : aucune re-création, aucun rendu supplémentaire).
 */
function Projector({
  anchors,
}: {
  anchors: RefObject<(HTMLDivElement | null)[]>;
}) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    NODES.forEach((n, i) => {
      const el = anchors.current[i];
      if (!el) return;
      v.set(n.pos[0], n.pos[1], n.pos[2]).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.visibility = v.z > 1 ? "hidden" : "visible";
    });
  });
  return null;
}

function Marker({
  node,
  index,
  visible,
  certified,
  selected,
  dimmed,
  onSelect,
}: {
  node: CarNode;
  index: number;
  visible: boolean;
  certified: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  const isSwitch = node.kind === "switch";
  const name = useDict().car[node.id].name;
  const Icon = NODE_ICON[node.id];
  // Halo pulsant décalé d'un marqueur à l'autre ; coupé quand un autre composant est sélectionné.
  const pulse = visible && !dimmed && !selected;
  const shape = isSwitch ? "rounded-[6px]" : "rounded-full";
  return (
    <div className="-translate-x-1/2 -translate-y-1/2">
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-label={name}
        tabIndex={visible ? 0 : -1}
        className={`group relative flex items-center transition-[opacity,transform] duration-500 hover:scale-110 ${
          visible
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-50 opacity-0"
        } ${dimmed ? "opacity-40" : ""}`}
      >
        {pulse ? (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 animate-pulse-ring border border-fg/70 ${shape}`}
            style={{ animationDelay: `${(index * 0.37) % 2.4}s` }}
          />
        ) : null}
        {selected ? (
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-1.5 border border-fg ${shape}`}
          />
        ) : null}
        <span
          className={`relative grid place-items-center border shadow-[0_4px_14px_rgb(0_0_0/0.7)] transition-colors duration-200 ${shape} ${
            isSwitch ? "h-7 w-9" : "size-7"
          } ${
            selected || isSwitch
              ? "border-fg bg-fg text-ink"
              : "border-fg/80 bg-ink/90 text-fg group-hover:bg-fg group-hover:text-ink"
          }`}
        >
          <Icon className="size-3.5" strokeWidth={isSwitch ? 2.2 : 1.9} />
        </span>
        {certified ? (
          <span className="absolute -right-2 -top-2 grid size-3.5 place-items-center rounded-full bg-fg text-ink ring-2 ring-ink">
            <Check className="size-2.5" strokeWidth={3.5} />
          </span>
        ) : null}
        <span
          className={`pointer-events-none absolute left-full ml-2.5 whitespace-nowrap rounded-md border border-line-2 bg-ink/90 px-2 py-1 text-[11px] text-fg backdrop-blur transition-opacity ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {name}
        </span>
      </button>
    </div>
  );
}

export default function CarCanvas({
  progress,
  stage,
  selected,
  onSelect,
  className,
  onReady,
  markersHidden = false,
}: {
  progress: MotionValue<number>;
  stage: number;
  selected: string | null;
  onSelect: (id: string) => void;
  className?: string;
  /** Appelé une fois la scène préparée (shaders compilés, première image calculée). */
  onReady?: () => void;
  /** Masque les boutons (ils sont remplacés par leurs copies en mouvement vers le graphe). */
  markersHidden?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const anchors = useRef<(HTMLDivElement | null)[]>([]);
  const inView = useInView(ref, { margin: "120px" });
  const visible = stage >= 1;
  return (
    <div ref={ref} className={className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [6.6, 2.7, 7.4], fov: 35 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", FOG_NEAR, FOG_FAR]} />
        <CameraRig progress={progress} />
        <CarBody progress={progress} />
        <CarModel progress={progress} />
        <NetworkLinks progress={progress} selected={selected} stage={stage} />
        <Packets progress={progress} />
        <Projector anchors={anchors} />
        {/* MSAA dans le tampon du composer : arêtes nettes (carrosserie, branches de jantes, fil de fer). */}
        <EffectComposer multisampling={4}>
          {/* Seuil haut : seules les optiques rayonnent, jamais les reflets du vernis. */}
          <Bloom
            mipmapBlur
            intensity={0.5}
            luminanceThreshold={0.95}
            luminanceSmoothing={0.2}
          />
          {/* Courbe de tons « PBR Neutral » (valeur 8 à l'exécution dans postprocessing 6.39 ;
              l'enum des types est décalé d'un cran) : couleurs de base intactes, reflets compressés
              au lieu d'être écrêtés. Le composer désactive la courbe de tons du rendu WebGL. */}
          <ToneMapping mode={8} />
          <Vignette eskil={false} offset={0.2} darkness={0.65} />
        </EffectComposer>
        <Precompile onReady={onReady} />
      </Canvas>

      {/* Marqueurs cliquables : DOM ordinaire, positionné par <Projector /> */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ opacity: markersHidden ? 0 : 1 }}
      >
        {NODES.map((n, i) => (
          <div
            key={n.id}
            data-marker-id={n.id}
            ref={(el) => void (anchors.current[i] = el)}
            className="pointer-events-auto absolute left-0 top-0 will-change-transform"
            style={{ visibility: "hidden" }}
          >
            <Marker
              node={n}
              index={i}
              visible={visible}
              certified={stage >= 3 || (stage >= 2 && n.critical)}
              selected={selected === n.id}
              dimmed={selected !== null && selected !== n.id}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
