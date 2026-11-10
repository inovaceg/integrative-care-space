import { useEffect, useRef } from "react";

const neurons = [
  [25, 40], [39, 25], [48, 44], [62, 26], [76, 39], [34, 59], [51, 64], [68, 56], [44, 82], [59, 79], [82, 61], [20, 57],
];
const links = [[0, 1], [0, 5], [1, 2], [1, 3], [2, 3], [2, 5], [2, 6], [3, 4], [3, 6], [3, 7], [4, 7], [5, 6], [5, 8], [6, 7], [6, 8], [6, 9], [7, 9], [7, 10], [8, 9], [9, 10], [0, 11], [4, 10]];

export function HomeNeuralVisual() {
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = visual.parentElement;
    if (!stage) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = visual.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        stage.style.setProperty("--neural-x", `${x * 10}px`);
        stage.style.setProperty("--neural-y", `${y * 10}px`);
      });
    };
    const reset = () => {
      stage.style.setProperty("--neural-x", "0px");
      stage.style.setProperty("--neural-y", "0px");
    };
    visual.addEventListener("pointermove", move, { passive: true });
    visual.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(frame);
      visual.removeEventListener("pointermove", move);
      visual.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <div ref={visualRef} aria-hidden="true" className="home-neural-visual absolute -right-10 top-4 z-20 w-[72%] max-w-[26rem] sm:-right-12 sm:top-8">
      <div className="absolute inset-1/4 rounded-full bg-amber-300/20 blur-3xl" />
      <svg viewBox="0 0 100 105" className="relative w-full overflow-visible drop-shadow-[0_0_18px_rgba(217,170,91,0.24)]">
        <defs>
          <radialGradient id="brainGlow"><stop stopColor="#f4d89b" stopOpacity=".24" /><stop offset="1" stopColor="#d9aa5b" stopOpacity="0" /></radialGradient>
          <linearGradient id="neuralLine" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f4d89b" stopOpacity=".2" /><stop offset=".5" stopColor="#e3bd78" stopOpacity=".8" /><stop offset="1" stopColor="#fff1c8" stopOpacity=".28" /></linearGradient>
        </defs>
        <ellipse cx="51" cy="53" rx="43" ry="43" fill="url(#brainGlow)" />
        <g fill="none" stroke="url(#neuralLine)" strokeLinecap="round" strokeWidth=".7">
          <path d="M48 17c-9-7-20-1-20 8-9 0-13 9-9 16-8 6-6 17 1 21-3 9 3 17 12 17 2 9 12 12 19 6V20c-1-2-2-3-3-3Z" />
          <path d="M52 17c9-7 20-1 20 8 9 0 13 9 9 16 8 6 6 17-1 21 3 9-3 17-12 17-2 9-12 12-19 6V20c1-2 2-3 3-3Z" />
          <path d="M31 29c7 1 8 7 5 11m-19 1c7-2 12 1 13 7m-9 14c5-5 11-4 14 1m-6 15c3-6 9-7 14-4M68 29c-7 1-8 7-5 11m19 1c-7-2-12 1-13 7m9 14c-5-5-11-4-14 1m6 15c-3-6-9-7-14-4M36 47c5-4 10-3 14 1m-13 17c4-4 9-5 13-2m14-15c-5-4-10-3-14 1m13 17c-4-4-9-5-13-2" />
        </g>
        <g stroke="#e6c27f" strokeOpacity=".48" strokeWidth=".35">
          {links.map(([a, b]) => <line key={`${a}-${b}`} x1={neurons[a][0]} y1={neurons[a][1]} x2={neurons[b][0]} y2={neurons[b][1]} />)}
        </g>
        <g fill="#ffe4a8">
          {neurons.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i % 4 === 0 ? 1.15 : .72} className="neural-node" style={{ animationDelay: `${i * 170}ms` }} />)}
        </g>
      </svg>
      <span className="neural-particle neural-particle-one" />
      <span className="neural-particle neural-particle-two" />
      <span className="neural-particle neural-particle-three" />
    </div>
  );
}
