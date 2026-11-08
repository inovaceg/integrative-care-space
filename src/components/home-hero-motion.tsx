import { useEffect, useState, type ReactNode } from "react";

export function HomeHeroMotion({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return;
    }
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div className={`home-hero-motion ${ready ? "is-visible" : ""} ${className}`} style={{ "--hero-delay": `${delay}ms` } as React.CSSProperties}>{children}</div>;
}
