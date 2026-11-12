import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import "./animated-banner.css";

type Props = { children: ReactNode; className?: string; compact?: boolean };

export function AnimatedBanner({ children, className = "", compact = false }: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    surface.current?.style.setProperty("--banner-rx", "0deg");
    surface.current?.style.setProperty("--banner-ry", "0deg");
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      surface.current?.style.setProperty("--banner-rx", `${-y * 3}deg`);
      surface.current?.style.setProperty("--banner-ry", `${x * 3}deg`);
      frame.current = null;
    });
  }

  return (
    <div className={`animated-banner ${compact ? "animated-banner--compact" : ""} ${className}`} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <div ref={surface} className="animated-banner__surface" style={{ "--banner-rx": "0deg", "--banner-ry": "0deg" } as CSSProperties}>
        <div aria-hidden="true" className="animated-banner__decoration"><span /><span /></div>
        <div className="animated-banner__content">{children}</div>
      </div>
    </div>
  );
}
