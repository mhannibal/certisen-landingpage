"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Prépare la scène dès son montage, même si elle est hors écran : compile tous les
 * shaders puis calcule une image complète (post-traitement compris). Signale ensuite
 * la fin à l'écran de chargement. À placer en DERNIER dans le <Canvas>.
 */
export function Precompile({ onReady }: { onReady?: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const advance = useThree((s) => s.advance);

  useEffect(() => {
    if (!onReady) return;
    const raf = requestAnimationFrame(() => {
      try {
        gl.compile(scene, camera);
        advance(performance.now());
      } finally {
        onReady();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera, advance, onReady]);

  return null;
}
