import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const BrainCanvas = lazy(() => import("@/components/home-brain-scene"));

export function HomeNeuralVisual() {
  const visualRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);
    return () => media.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "120px" });
    observer.observe(visual);
    return () => observer.disconnect();
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--neural-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 0.8}deg`);
    event.currentTarget.style.setProperty("--neural-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -0.6}deg`);
  };

  const resetPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--neural-x", "0");
    event.currentTarget.style.setProperty("--neural-y", "0");
  };

  return (
    <div
      ref={visualRef}
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="home-neural-visual absolute -right-10 top-4 z-20 w-[72%] max-w-[26rem] sm:-right-12 sm:top-8"
    >
      <div className="absolute inset-[12%] rounded-full bg-amber-300/20 blur-3xl" />
      <div className="relative aspect-square w-full">
        {visible && <Suspense fallback={null}><BrainCanvas reducedMotion={reducedMotion} onReady={() => setLoaded(true)} /></Suspense>}
      </div>
      {!loaded && <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(231,193,119,.32),rgba(231,193,119,0)_70%)]" />}
    </div>
  );
}
