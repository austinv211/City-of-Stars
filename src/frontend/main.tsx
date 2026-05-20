import "@/styles/globals.scss";

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

// Boot via dynamic import so a module-level crash (e.g. missing Supabase env
// vars causing createClient to throw) shows an error message instead of a
// blank screen.
const rootEl = document.getElementById("root")!;

async function boot() {
  try {
    const [{ createRoot }, { default: App }] = await Promise.all([
      import("react-dom/client"),
      import("./App"),
    ]);
    createRoot(rootEl).render(<App />);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    rootEl.innerHTML = `<div style="padding:2rem;font-family:monospace;color:#f38ba8;background:#181825;min-height:100vh"><h2 style="margin:0 0 1rem">App failed to start</h2><pre style="white-space:pre-wrap;word-break:break-all">${msg}</pre></div>`;
  }
}

boot();
