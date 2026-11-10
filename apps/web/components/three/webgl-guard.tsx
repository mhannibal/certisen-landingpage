"use client";

import { Component, useEffect, useSyncExternalStore, type ReactNode } from "react";

let support: boolean | undefined;

/** WebGL disponible ? (testé une fois ; le contexte d'essai est aussitôt libéré). */
function hasWebGL() {
  if (support !== undefined) return support;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    support = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    support = false;
  }
  return support;
}

const noop = () => () => {};

class Boundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Protège une scène 3D : si WebGL est indisponible (désactivé par une stratégie
 * d'entreprise, pilote graphique, navigateur ancien) ou si la scène lève une erreur,
 * on affiche `fallback` au lieu de faire tomber toute la page. `onFallback` permet
 * de prévenir l'écran de chargement que la scène ne viendra pas.
 */
export function WebGLGuard({
  children,
  fallback,
  onFallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
  onFallback?: () => void;
}) {
  // null côté serveur et à l'hydratation, puis le vrai résultat côté client.
  const ok = useSyncExternalStore(noop, hasWebGL, () => null);
  useEffect(() => {
    if (ok === false) onFallback?.();
  }, [ok, onFallback]);
  if (ok === null) return null;
  if (!ok) return <>{fallback}</>;
  return (
    <Boundary fallback={fallback} onError={onFallback}>
      {children}
    </Boundary>
  );
}
