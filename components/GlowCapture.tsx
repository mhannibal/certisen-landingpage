"use client";

import { useRef, useCallback, type ReactNode } from "react";

interface GlowCaptureProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCapture({ children, className = "", glowColor = "#dd5138" }: GlowCaptureProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const capture = captureRef.current;
    if (!capture) return;

    const rect = capture.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const overlay = capture.querySelector(".glow-overlay") as HTMLElement;
    if (overlay) {
      overlay.style.setProperty("--glow-x", `${x}px`);
      overlay.style.setProperty("--glow-y", `${y}px`);
      overlay.style.setProperty("--glow-opacity", "1");
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const overlay = captureRef.current?.querySelector(".glow-overlay") as HTMLElement;
    if (overlay) {
      overlay.style.setProperty("--glow-opacity", "0");
    }
  }, []);

  return (
    <div
      ref={captureRef}
      className={`glow-capture relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div
        className="glow-overlay rounded-xl"
        style={{ "--glow-color": glowColor } as React.CSSProperties}
        aria-hidden="true"
        data-nosnippet
      >
        {children}
      </div>
    </div>
  );
}
