"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-triggered reveal. Adds .in when the element enters the viewport.
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
  as?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <div ref={ref} className={`sr ${seen ? "in" : ""} ${className}`}>
      {children}
    </div>
  );
}
