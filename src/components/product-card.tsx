"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

// Adapted from ReactBits Tilted Card: pointer offset -> rotateX / rotateY.
// https://reactbits.dev/components/tilted-card
// Only the image moves, keeping the product text and controls steady.
export function ProductCard({ children }: { children: ReactNode }) {
  const frame = useRef<number | null>(null);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function reset(event: PointerEvent<HTMLElement>) {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    event.currentTarget.style.removeProperty("--skin-rotate-x");
    event.currentTarget.style.removeProperty("--skin-rotate-y");
  }

  function tilt(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      card.style.setProperty("--skin-rotate-x", `${-y * 8}deg`);
      card.style.setProperty("--skin-rotate-y", `${x * 8}deg`);
      frame.current = null;
    });
  }

  return <article className="product-card" onPointerMove={tilt} onPointerLeave={reset} onPointerCancel={reset}>{children}</article>;
}
