import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { formatCount } from "./lib/count-format";

/** Main single-screen interaction for the PulseForge counter experiment. */
function App() {
  const stageRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPresses, setPendingPresses] = useState(0);

  const counter = useQuery(api.counter.getTotal);
  const increment = useMutation(api.counter.increment);

  const displayCount = useMemo(
    () => (counter?.total ?? 0) + pendingPresses,
    [counter?.total, pendingPresses],
  );

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

  const handlePress = () => {
    if (!counter) {
      return;
    }

    setErrorMessage(null);
    setPendingPresses((count) => count + 1);

    void increment({})
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not register this press. Try again.",
        );
      })
      .finally(() => {
        setPendingPresses((count) => Math.max(0, count - 1));
      });
  };

  return (
    <main ref={stageRef} className="press-root">
      <section className="press-shell" aria-live="polite">
        <img src="/logo.png" alt="PulseForge logo" className="press-mark" />
        <p className="press-label">PulseForge</p>
        <p className="press-count">{counter ? formatCount(displayCount) : "..."}</p>

        <button
          ref={buttonRef}
          className="press-button"
          type="button"
          onClick={handlePress}
          disabled={!counter}
        >
          Press
        </button>

        <p className="press-meta">Global press stream is live.</p>
        <p className="press-description">
          This experiment is a single global count of how many times the button
          has been pressed.
        </p>
        <a
          className="press-github"
          href="https://github.com/grezxune/pulseforge"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View PulseForge on GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="press-github-icon">
            <path
              fill="currentColor"
              d="M12 0.3C5.37 0.3 0 5.67 0 12.3C0 17.6 3.44 22.1 8.21 23.68C8.81 23.79 9.03 23.42 9.03 23.1C9.03 22.81 9.02 22.03 9.02 21C5.67 21.73 4.97 19.38 4.97 19.38C4.42 17.99 3.63 17.62 3.63 17.62C2.55 16.88 3.71 16.9 3.71 16.9C4.91 16.98 5.54 18.14 5.54 18.14C6.6 19.96 8.31 19.43 8.99 19.12C9.1 18.35 9.4 17.82 9.74 17.52C7.07 17.22 4.26 16.18 4.26 11.55C4.26 10.23 4.73 9.15 5.52 8.29C5.4 7.99 4.99 6.78 5.64 5.14C5.64 5.14 6.65 4.82 8.99 6.4C9.96 6.13 11 6 12.03 6C13.06 6 14.1 6.13 15.08 6.4C17.41 4.82 18.42 5.14 18.42 5.14C19.07 6.78 18.66 7.99 18.54 8.29C19.33 9.15 19.8 10.23 19.8 11.55C19.8 16.19 16.98 17.22 14.3 17.51C14.73 17.88 15.12 18.62 15.12 19.75C15.12 21.38 15.1 22.69 15.1 23.1C15.1 23.42 15.32 23.8 15.93 23.68C20.7 22.1 24.14 17.6 24.14 12.3C24.14 5.67 18.77 0.3 12.14 0.3H12Z"
            />
          </svg>
          <span>View Source on GitHub</span>
        </a>
        {errorMessage ? <p className="press-error">{errorMessage}</p> : null}
      </section>
    </main>
  );
}

export default App;
