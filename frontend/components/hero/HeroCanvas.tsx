"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { HeroScene } from "./HeroScene";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  useEffect(() => {
    function handleVisibility() {
      setVisible(document.visibilityState === "visible");
    }
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);
  return visible;
}

export function HeroCanvas() {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const pageVisible = usePageVisible();

  if (reducedMotion) {
    return <StaticFallback />;
  }

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.4, 6], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={inView && pageVisible ? "always" : "never"}
        gl={{ antialias: true, alpha: true }}
      >
        <HeroScene />
      </Canvas>
    </div>
  );
}

export function StaticFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60"
    />
  );
}
