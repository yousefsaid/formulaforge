"use client";

import dynamic from "next/dynamic";
import { StaticFallback } from "./HeroCanvas";

const HeroCanvas = dynamic(
  () => import("./HeroCanvas").then((mod) => mod.HeroCanvas),
  { ssr: false, loading: () => <StaticFallback /> },
);

export function HeroCanvasLoader() {
  return <HeroCanvas />;
}
