import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { inject } from "@vercel/analytics";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

const root = createRoot(rootElement);
inject();

if (!convexUrl) {
  root.render(
    <StrictMode>
      <main className="press-root">
        <section className="press-shell">
          <img src="/logo.png" alt="PulseForge logo" className="press-mark" />
          <p className="press-label">PulseForge</p>
          <p className="press-error">Missing VITE_CONVEX_URL in environment.</p>
        </section>
      </main>
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  );
}
