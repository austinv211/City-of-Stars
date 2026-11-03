import { useEffect } from "react";
import { toast } from "sonner";
import { usePlatform } from "@/core/hooks/usePlatform";

/** What the email confirmation page opens: see site/index.html. */
const EMAIL_CONFIRMED = "cityofstars://auth/confirmed";

function handle(urls: string[]) {
  if (urls.some((u) => u.startsWith(EMAIL_CONFIRMED))) {
    toast.success("Email confirmed", {
      description: "Sign in with your email and password.",
    });
  }
}

/**
 * cityofstars:// links: the app opened (or focused) from a web page. Covers
 * a link that launched the app as well as one arriving while it runs.
 */
export function useDeepLinks() {
  const { isTauri } = usePlatform();

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    let live = true;
    void import("@tauri-apps/plugin-deep-link").then(async ({ getCurrent, onOpenUrl }) => {
      const launchedWith = await getCurrent();
      if (launchedWith) handle(launchedWith);
      const stop = await onOpenUrl(handle);
      if (live) unlisten = stop;
      else stop();
    });
    return () => {
      live = false;
      unlisten?.();
    };
  }, [isTauri]);
}
