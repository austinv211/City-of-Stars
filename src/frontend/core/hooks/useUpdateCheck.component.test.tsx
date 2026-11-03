import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { checkForUpdate, installUpdate, openDownload } from "@/core/lib/updates";
import { useUpdateCheck } from "./useUpdateCheck";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { loading: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock("@/core/lib/updates", () => ({
  checkForUpdate: vi.fn(),
  installUpdate: vi.fn(() => Promise.resolve()),
  openDownload: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/core/hooks/usePlatform", () => ({
  usePlatform: () => ({ platform: "windows" }),
}));

interface ToastOptions {
  action: { onClick: () => void };
}

/** The options passed to the most recent plain `toast(...)` call. */
function lastToastOptions(): ToastOptions {
  const call = vi.mocked(toast).mock.calls.at(-1);
  if (!call) throw new Error("no toast shown");
  return call[1] as unknown as ToastOptions;
}

// Each test uses its own version, since the hook remembers what it has shown.
describe("useUpdateCheck", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("shows nothing when the app is up to date", async () => {
    vi.mocked(checkForUpdate).mockResolvedValue({ kind: "none" });
    renderHook(() => {
      useUpdateCheck();
    });
    await waitFor(() => {
      expect(checkForUpdate).toHaveBeenCalledWith("windows");
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it("offers to install an installable update", async () => {
    const update = { version: "9.0.0" } as never;
    vi.mocked(checkForUpdate).mockResolvedValue({ kind: "installable", version: "9.0.0", update });
    renderHook(() => {
      useUpdateCheck();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("Version 9.0.0 is available", expect.anything());
    });
    lastToastOptions().action.onClick();
    expect(installUpdate).toHaveBeenCalledWith(update, expect.any(Function));
  });

  it("links to the download when the install can't update itself", async () => {
    vi.mocked(checkForUpdate).mockResolvedValue({ kind: "link", version: "9.1.0", url: "https://dl/apk" });
    renderHook(() => {
      useUpdateCheck();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });
    lastToastOptions().action.onClick();
    expect(openDownload).toHaveBeenCalledWith("https://dl/apk");
  });

  it("does not repeat a notice for a version already shown", async () => {
    vi.mocked(checkForUpdate).mockResolvedValue({ kind: "link", version: "9.2.0", url: "https://dl/apk" });
    const first = renderHook(() => {
      useUpdateCheck();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1);
    });
    first.unmount();
    renderHook(() => {
      useUpdateCheck();
    });
    await waitFor(() => {
      expect(checkForUpdate).toHaveBeenCalledTimes(2);
    });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("does not check in the dev server", () => {
    vi.stubEnv("DEV", true);
    renderHook(() => {
      useUpdateCheck();
    });
    expect(checkForUpdate).not.toHaveBeenCalled();
  });
});
