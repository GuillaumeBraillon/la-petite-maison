import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { logger } from "./services/logger";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Élément #root introuvable dans le DOM.");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((err: unknown) => {
      logger.warn("SW registration failed:", err);
    });
  });
}
