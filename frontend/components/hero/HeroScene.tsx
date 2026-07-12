"use client";

import { ElementRef, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import { damp3 } from "maath/easing";
import * as THREE from "three";

const GLYPHS = ["Σ", "ƒ", "=", "(", ")", ":"];
const GLYPH_COUNT = 40;
const LINE_COLOR = "#e4e4e0";
const GLYPH_COLOR = "#9a9fa5";
const ACCENT_COLOR = "#2a5cff";

function useGlyphs() {
  return useMemo(
    () =>
      Array.from({ length: GLYPH_COUNT }, (_, i) => ({
        glyph: GLYPHS[i % GLYPHS.length],
        position: [
          (Math.random() - 0.5) * 14,
          Math.random() * 3 + 0.4,
          (Math.random() - 0.5) * 14 - 4,
        ] as [number, number, number],
        speed: 0.08 + Math.random() * 0.12,
        offset: Math.random() * Math.PI * 2,
      })),
    [],
  );
}

function GridPlane() {
  const pulseRef = useRef<ElementRef<typeof Line>>(null);
  const pulseIndex = 12;
  const lines = useMemo(() => {
    const segments: [THREE.Vector3, THREE.Vector3][] = [];
    const size = 14;
    const step = 1;
    for (let x = -size; x <= size; x += step) {
      segments.push([
        new THREE.Vector3(x, 0, -size),
        new THREE.Vector3(x, 0, size),
      ]);
    }
    for (let z = -size; z <= size; z += step) {
      segments.push([
        new THREE.Vector3(-size, 0, z),
        new THREE.Vector3(size, 0, z),
      ]);
    }
    return segments;
  }, []);

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = clock.getElapsedTime() % 6;
    const intensity = t < 1.2 ? 1 - Math.abs(t - 0.6) / 0.6 : 0;
    pulseRef.current.material.opacity = Math.max(0.15, intensity);
  });

  return (
    <group position={[0, -1.4, -2]} rotation={[-0.35, 0, 0]}>
      {lines.map(([a, b], index) => {
        const isPulseLine = index === pulseIndex;
        return (
          <Line
            key={index}
            ref={isPulseLine ? pulseRef : undefined}
            points={[a, b]}
            color={isPulseLine ? ACCENT_COLOR : LINE_COLOR}
            transparent
            opacity={isPulseLine ? 0.4 : 0.35}
            lineWidth={1}
          />
        );
      })}
    </group>
  );
}

function DriftingGlyphs() {
  const glyphs = useGlyphs();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const g = glyphs[i];
      child.position.y = g.position[1] + Math.sin(clock.elapsedTime * g.speed + g.offset) * 0.3;
    });
  });

  return (
    <group ref={groupRef}>
      {glyphs.map((g, i) => (
        <Text
          key={i}
          position={g.position}
          fontSize={0.4}
          color={GLYPH_COLOR}
          anchorX="center"
          anchorY="middle"
        >
          {g.glyph}
        </Text>
      ))}
    </group>
  );
}

export function HeroScene() {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.4, 6));

  useFrame((_, delta) => {
    target.current.set(pointer.x * 0.6, 0.4 + pointer.y * 0.3, 6);
    damp3(camera.position, target.current, 0.4, delta);
    camera.lookAt(0, 0, -2);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={0.5} />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />
      <GridPlane />
      <DriftingGlyphs />
    </>
  );
}
