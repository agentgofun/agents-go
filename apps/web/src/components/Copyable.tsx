"use client";

import { useState } from "react";

export function Copyable({ text, label = "copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <span
      className="copy"
      role="button"
      tabIndex={0}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "copied" : label}
    </span>
  );
}

export function CodeCopy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span
      className="cp"
      role="button"
      tabIndex={0}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "✓ copied" : "copy"}
    </span>
  );
}
