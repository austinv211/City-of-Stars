import { defineConfig } from "vitest/config";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";

/**
 * The db project's environment: .env.e2e and nothing else. Deliberately not
 * vite's loadEnv, which would layer the real .env (production URL and keys)
 * underneath and leave any key .env.e2e forgot pointing at production.
 */
const e2eEnv = existsSync(".env.e2e")
  ? (parseEnv(readFileSync(".env.e2e", "utf8")) as Record<string, string>)
  : {};

/**
 * The unit and component layers touch no database, so they get placeholder
 * Supabase settings and load NO .env file: `envDir` points at a directory
 * without one. Before this, importing anything that imports lib/supabase
 * read the developer's real .env -- production keys -- and in CI, which has
 * no .env, crashed on an undefined URL.
 */
const OFFLINE_ENV_DIR = path.resolve(import.meta.dirname, "./src/test");
const offlineEnv = {
  VITE_SUPABASE_URL: "http://127.0.0.1:1",
  VITE_SUPABASE_ANON_KEY: "unit-test-placeholder",
};

/**
 * Two projects so the fast layer stays fast.
 *
 *   unit       pure logic — rules maths, stat derivation. node env, no DOM.
 *   component  hooks and components. jsdom, with the fake Supabase client.
 *   db         RLS policies, grants and triggers, against the LOCAL stack
 *              (`npm run e2e:up` first). Guarded: refuses any target that is
 *              not provably local. Not part of `npm test`, since it needs
 *              Docker; run it with `npm run test:db`.
 *
 * `npm run test:unit` runs only the first, which is what you want in a watch
 * loop; `npm test` runs both.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src/frontend") },
  },
  test: {
    projects: [
      {
        envDir: OFFLINE_ENV_DIR,
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname, "./src/frontend") },
        },
        test: {
          name: "unit",
          env: offlineEnv,
          environment: "node",
          include: ["src/frontend/**/*.test.ts"],
          exclude: ["**/*.component.test.ts?(x)"],
        },
      },
      {
        envDir: OFFLINE_ENV_DIR,
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname, "./src/frontend") },
        },
        test: {
          name: "component",
          env: offlineEnv,
          environment: "jsdom",
          include: ["src/frontend/**/*.component.test.ts?(x)"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname, "./src/frontend") },
        },
        test: {
          name: "db",
          environment: "node",
          include: ["src/test/db/**/*.db.test.ts"],
          env: e2eEnv,
          globalSetup: ["./src/test/db/global-setup.mjs"],
          // Files share one database; running them in parallel would let one
          // file's fixture teardown race another's assertions.
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 30000,
        },
      },
    ],
  },
});
