import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Dir = "left" | "right" | "up";

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
  const from =
    dir === "left"
      ? { x: -28, y: 0 }
      : dir === "right"
      ? { x: 28, y: 0 }
      : { x: 0, y: 18 };

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, filter: "blur(6px)", ...from }}
      whileInView={{ opacity: 1, filter: "blur(0px)", x: 0, y: 0 }}
      viewport={{ once, amount: 0.25 }}
      transition={{
        type: "spring",
        stiffness: 140,
        damping: 22,
        mass: 0.7,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
