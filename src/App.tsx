import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { getOrCreateClientId } from "./lib/client-id";
import { formatCount } from "./lib/count-format";

/** Main single-screen interaction for the PulseForge counter experiment. */
function App() {
  const stageRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticDelta, setOptimisticDelta] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);

  const counter = useQuery(api.counter.getTotal);
  const increment = useMutation(api.counter.increment);

  const displayCount = useMemo(
    () => (counter?.total ?? 0) + optimisticDelta,
    [counter?.total, optimisticDelta],
  );

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".press-shell",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      );

      gsap.fromTo(
        ".press-mark",
        { scale: 0.92, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, delay: 0.1, ease: "power2.out" },
      );
    }, stage);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!button || reducedMotion) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const rect = button.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

      gsap.to(button, {
        x: offsetX * 8,
        y: offsetY * 8,
        duration: 0.25,
        ease: "power3.out",
      });
    };

    const onLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.35,
        ease: "power3.out",
      });
    };

    button.addEventListener("pointermove", onMove);
    button.addEventListener("pointerleave", onLeave);

    return () => {
      button.removeEventListener("pointermove", onMove);
      button.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const handlePress = async () => {
    if (isSubmitting || !clientId) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setOptimisticDelta((count) => count + 1);

    try {
      await increment({
        clientId,
      });
      setOptimisticDelta(0);
    } catch (error) {
      setOptimisticDelta(0);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not register this press. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main ref={stageRef} className="press-root">
      <section className="press-shell" aria-live="polite">
        <img src="/logo.svg" alt="PulseForge logo" className="press-mark" />
        <p className="press-label">PulseForge</p>
        <p className="press-count">{counter ? formatCount(displayCount) : "..."}</p>

        <button
          ref={buttonRef}
          className="press-button"
          type="button"
          onClick={handlePress}
          disabled={isSubmitting || !counter || !clientId}
        >
          {isSubmitting ? "Registering..." : "Press"}
        </button>

        <p className="press-meta">Server-side rate limits are active.</p>
        {errorMessage ? <p className="press-error">{errorMessage}</p> : null}
      </section>
    </main>
  );
}

export default App;
