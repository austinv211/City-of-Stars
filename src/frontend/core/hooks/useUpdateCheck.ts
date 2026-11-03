import { useEffect } from "react";
import { toast } from "sonner";
import { usePlatform } from "@/core/hooks/usePlatform";
import {
  checkForUpdate,
  installUpdate,
  openDownload,
  type UpdateCheck,
} from "@/core/lib/updates";

/** Long enough not to nag, short enough that a table left open all evening hears about a hotfix. */
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

const TOAST_ID = "app-update";

const dismiss = () => {
  toast.dismiss(TOAST_ID);
};

/**
 * The version the user has already been told about. Module-level so the
 * periodic check, StrictMode's double mount and AccountDialog's manual check
 * don't show the same notice twice. A manual check passes `force`.
 */
let notifiedVersion: string | null = null;

/** Shows the update toast for a check result. False when there was nothing to show. */
export function notifyUpdate(result: UpdateCheck, { force = false } = {}): boolean {
  if (result.kind === "none") return false;
  if (!force && result.version === notifiedVersion) return false;
  notifiedVersion = result.version;

  if (result.kind === "link") {
    toast(`Version ${result.version} is available`, {
      id: TOAST_ID,
      description: "Download and install it to update.",
      duration: Infinity,
      action: {
        label: "Download",
        onClick: () => {
          openDownload(result.url).catch((err: unknown) => {
            console.warn("[updater] could not open download", err);
          });
        },
      },
      cancel: { label: "Later", onClick: dismiss },
    });
    return true;
  }

  const { update, version } = result;
  toast(`Version ${version} is available`, {
    id: TOAST_ID,
    description: "The app will restart to finish updating.",
    duration: Infinity,
    action: {
      label: "Update now",
      onClick: (event) => {
        // Sonner deletes the toast after an action unless prevented, which
        // would take the progress toast that reuses this id down with it.
        event.preventDefault();
        toast.loading(`Downloading ${version}…`, { id: TOAST_ID, duration: Infinity });
        installUpdate(update, (percent) => {
          const progress = percent === null ? "" : ` ${String(percent)}%`;
          toast.loading(`Downloading ${version}…${progress}`, { id: TOAST_ID, duration: Infinity });
        }).catch((err: unknown) => {
          console.warn("[updater] install failed", err);
          toast.error("Update failed", {
            id: TOAST_ID,
            description: "Try again later, or download it from GitHub.",
            duration: 8000,
          });
        });
      },
    },
    cancel: { label: "Later", onClick: dismiss },
  });
  return true;
}

/**
 * Checks for a new release on launch and every few hours while the app is
 * open. Silent on failure: an offline launch is normal and not worth a toast.
 * Off in the dev server, where the running version is never a release.
 */
export function useUpdateCheck() {
  const { platform } = usePlatform();

  useEffect(() => {
    if (import.meta.env.DEV || platform === "browser") return;

    const run = () => {
      checkForUpdate(platform)
        .then((result) => notifyUpdate(result))
        .catch((err: unknown) => {
          console.warn("[updater] check failed", err);
        });
    };

    run();
    const id = setInterval(run, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(id);
    };
  }, [platform]);
}
