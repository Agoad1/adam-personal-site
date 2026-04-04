"use client";

import { useScroll, useTransform, motion } from "framer-motion";

export default function ScrollOverlay() {
  const { scrollY } = useScroll();
  // Adjust 0, 500 to control how fast it gets dark relative to scroll
  const opacity = useTransform(scrollY, [0, 500], [0, 0.45]);

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        opacity,
        zIndex: -1, // Sits above the background but behind the content
        pointerEvents: "none",
      }}
    />
  );
}
