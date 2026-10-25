import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Supabase clients for the db suite: one per role a policy distinguishes.
 *
 * Policies are exercised through supabase-js, the same path the app uses,
 * rather than through pgTAP -- a policy that holds for a hand-written SQL
 * session but not for a PostgREST request is the case that matters.
 *
 * process.env here is .env.e2e only (see vitest.config.ts), and global-setup
 * has already refused to run unless it points at the local test stack.
 */

export type Client = SupabaseClient<Database>;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- is .env.e2e present?`);
  return value;
}

const url = env("SUPABASE_URL");
const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Bypasses RLS. For arranging fixtures and reading ground truth only. */
export const service: Client = createClient<Database>(
  url,
  env("SUPABASE_SERVICE_ROLE_KEY"),
  options,
);

/** No session: the `anon` role, as an unauthenticated caller would be. */
export function anonClient(): Client {
  return createClient<Database>(url, env("VITE_SUPABASE_ANON_KEY"), options);
}

/**
 * The deterministic users from scripts/seed-test-users.mjs. Duplicated rather
 * than imported because that module is untyped .mjs; the ids are fixed, so
 * drift would fail loudly at sign-in.
 */
export const USERS = {
  dm: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "dm@test.local",
    password: "test-password-dm",
  },
  player1: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "player1@test.local",
    password: "test-password-p1",
  },
  player2: {
    id: "00000000-0000-4000-8000-000000000003",
    email: "player2@test.local",
    password: "test-password-p2",
  },
} as const;

export type TestUser = (typeof USERS)[keyof typeof USERS];

/** A client carrying `user`'s session: the `authenticated` role, as that user. */
export async function signedIn(user: TestUser): Promise<Client> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(
      `sign-in as ${user.email} failed (${error.message}) -- run \`npm run e2e:users\``,
    );
  }
  return client;
}
