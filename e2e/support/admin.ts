import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/frontend/types/database";

/**
 * The service-role client specs arrange and inspect data with. Bypasses RLS:
 * for setting up a scene and reading ground truth, never for the action under
 * test -- that goes through the UI, as the user.
 *
 * process.env is .env.e2e (playwright.config.ts loads it) and global-setup has
 * already refused to run unless it points at the local stack.
 */
export type Admin = SupabaseClient<Database>;

let client: Admin | undefined;

export function admin(): Admin {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset -- is .env.e2e present?",
    );
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Unwrap a supabase-js result, failing the arrangement loudly. */
export function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error || result.data === null) {
    throw new Error(
      `e2e arrange: ${what}: ${result.error?.message ?? "no row returned"}`,
    );
  }
  return result.data as NonNullable<T>;
}
