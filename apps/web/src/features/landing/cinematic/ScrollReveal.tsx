import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Dir = "left" | "right" | "up" | "down";

export function ScrollReveal({
  children,
  className,
  dir = "up",
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  dir?: Dir;
  delay?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();

  const offset = 22;
  const initial =
    reduce
      ? { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }
      : {
          opacity: 0,
          x: dir === "left" ? -offset : dir === "right" ? offset : 0,
          y: dir === "up" ? offset : dir === "down" ? -offset : 0,
          filter: "blur(10px)",
        };

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount: 0.25, margin: "-80px" }}
      transition={{
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
