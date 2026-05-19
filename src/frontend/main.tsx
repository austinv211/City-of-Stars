import "@/styles/globals.scss";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

if (import.meta.env.DEV) {
  window.addEventListener("keydown", async (e) => {
    if (e.key === "F12") {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (getCurrentWindow() as any).openDevtools();
      } catch {
        // browser fallback — devtools already handled by the browser
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
