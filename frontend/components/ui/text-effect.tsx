"use client";

import { motion } from "motion/react";

type TextEffectProps = {
  text: string;
  className?: string;
};

export function TextEffect({ text, className }: TextEffectProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {text}
    </motion.span>
  );
}
