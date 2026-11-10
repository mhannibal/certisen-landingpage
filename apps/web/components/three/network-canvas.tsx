"use client";

import { Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useInView } from "motion/react";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Precompile } from "./precompile";
import { buildNetwork, pointAt, type V3 } from "@/lib/network";

const PACKETS_PER_FLOW = 3;
const GATE_PERIOD = 2.6;

/** Tons de gris : plus le flux est prioritaire, plus il est clair. */
const C = {
  critical: new THREE.Color("#ffffff").multiplyScalar(1.6),
  control: new THREE.Color("#bdbdbd"),
  best: new THREE.Color("#6e6e6e"),
};

function Network() {
  const net = useMemo(() => buildNetwork(), []);
  const group = useRef<THREE.Group>(null);
  const packets = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const stationRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo<V3>(() => [0, 0, 0], []);
  const flows = useMemo(() => [...net.flows, net.critical], [net]);
  const total = flows.length * PACKETS_PER_FLOW;

  useLayoutEffect(() => {
    const mesh = packets.current;
    if (!mesh) return;
    let k = 0;
    flows.forEach((f) => {
      for (let j = 0; j < PACKETS_PER_FLOW; j++)
        mesh.setColorAt(k++, C[f.kind]);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [flows]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (g) {
      const wide = viewport.width > 11;
      const s = THREE.MathUtils.clamp(viewport.width / 17, 0.5, 0.78);
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, 0.05));
      g.position.x = THREE.MathUtils.lerp(
        g.position.x,
        wide ? viewport.width * 0.22 : 0,
        0.05,
      );
      g.rotation.y = THREE.MathUtils.lerp(
        g.rotation.y,
        Math.sin(t * 0.1) * 0.3 + state.pointer.x * 0.2,
        0.04,
      );
      g.rotation.x = THREE.MathUtils.lerp(
        g.rotation.x,
        0.08 - state.pointer.y * 0.1,
        0.04,
      );
    }
    net.switches.forEach((_, i) => {
      const ring = rings.current[i];
      if (!ring) return;
      const k = ((t + i * 0.43) % GATE_PERIOD) / 1.2;
      ring.visible = k < 1;
      ring.scale.setScalar(1 + k * 1.8);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.35;
    });
    stationRefs.current.forEach((m, i) => {
      if (m) m.rotation.set(t * 0.3, t * 0.5 + i, 0);
    });
    const mesh = packets.current;
    if (mesh) {
      let k = 0;
      flows.forEach((f, fi) => {
        for (let j = 0; j < PACKETS_PER_FLOW; j++) {
          pointAt(
            f,
            t * f.speed * 0.8 + (j / PACKETS_PER_FLOW) * f.total + fi * 1.7,
            tmp,
          );
          dummy.position.set(tmp[0], tmp[1], tmp[2]);
          dummy.updateMatrix();
          mesh.setMatrixAt(k++, dummy.matrix);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <Line
        points={net.links}
        segments
        color="#4a4a4a"
        lineWidth={1}
        transparent
        opacity={0.9}
      />
      {net.switches.map((s, i) => (
        <group key={`sw-${i}`} position={s}>
          {/* commutateur : petit cercle clair cerclé d'un anneau fin */}
          <mesh>
            <sphereGeometry args={[0.09, 24, 24]} />
            <meshBasicMaterial color="#e5e5e5" />
          </mesh>
          <mesh>
            <ringGeometry args={[0.15, 0.162, 48]} />
            <meshBasicMaterial
              color="#8a8a8a"
              transparent
              opacity={0.8}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh ref={(el) => void (rings.current[i] = el)}>
            <ringGeometry args={[0.2, 0.21, 64]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.3}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      {net.stations.map((s, i) => (
        <mesh
          key={`st-${i}`}
          position={s}
          ref={(el) => void (stationRefs.current[i] = el)}
        >
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#9a9a9a" />
        </mesh>
      ))}
      <instancedMesh
        ref={packets}
        args={[undefined, undefined, total]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export default function NetworkCanvas({
  className,
  onReady,
}: {
  className?: string;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "120px" });
  return (
    <div ref={ref} className={className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 11], fov: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 9, 22]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 8]} intensity={1.6} />
        <Network />
        <EffectComposer multisampling={0}>
          <Bloom
            mipmapBlur
            intensity={0.45}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.6} />
        </EffectComposer>
        <Precompile onReady={onReady} />
      </Canvas>
    </div>
  );
}
