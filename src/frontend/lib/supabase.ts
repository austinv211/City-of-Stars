import { createClient } from "@supabase/supabase-js";
import { emitDebugEvent } from "./realtimeDebug";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// supabase-js treats a 429 on the token-refresh endpoint as immediately fatal
// and fires SIGNED_OUT without retrying. On Windows/WebView2 the previous
// duplicate-GoTrueClient bug could exhaust the rate-limit window, causing every
// subsequent refresh to fail. Retry up to 3 times with backoff so a transient
// 429 doesn't log the user out.
async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  let response = await fetch(input, init);

  if (response.status === 429 && url.includes("/auth/v1/token")) {
    const delays = [5_000, 10_000, 20_000];
    for (const delay of delays) {
      await new Promise((r) => setTimeout(r, delay));
      response = await fetch(input, init);
      if (response.status !== 429) break;
    }
  }

  return response;
}

// TAURI_ENV_PLATFORM is injected at build time by the Tauri CLI and exposed
// via Vite's envPrefix. Undefined in a plain Vite dev server (no Tauri window).
const isWindows = import.meta.env.TAURI_ENV_PLATFORM === "windows";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Tauri uses React Router (History API) — no hash/query tokens in URLs.
    detectSessionInUrl: false,
    // Disable built-in auto-refresh on Windows only. WebView2 fires
    // visibilitychange on every focus event, triggering _recoverAndRefresh()
    // repeatedly and exhausting the Supabase rate limit. AuthContext's proactive
    // timer handles refresh instead. On Linux and Android, keep the default so
    // backgrounded sessions (Android >1 h) still refresh automatically.
    autoRefreshToken: !isWindows,
  },
  global: {
    fetch: fetchWithAuthRetry,
  },
});

// Intercept every channel event in dev mode so RealtimeDebugOverlay can display them.
// Vite eliminates this entire block at build time when import.meta.env.DEV is false.
if (import.meta.env.DEV) {
  const _origChannel = supabase.channel.bind(supabase);
  (supabase as any).channel = (
    name: string,
    opts?: Parameters<typeof supabase.channel>[1],
  ) => {
    const ch = _origChannel(name, opts);
    const _origOn = ch.on.bind(ch);
    (ch as any).on = (
      type: string,
      filter: Record<string, unknown>,
      callback?: (payload: unknown) => void,
    ) => {
      if (typeof callback !== "function") {
        return _origOn(type as any, filter as any, callback as any);
      }
      return _origOn(type as any, filter as any, (payload: unknown) => {
        emitDebugEvent({
          id: crypto.randomUUID(),
          channelName: name,
          eventType: (filter?.event as string) ?? type,
          table: filter?.table as string | undefined,
          payload,
          receivedAt: new Date(),
        });
        callback(payload);
      });
    };
    return ch;
  };
}
