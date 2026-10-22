import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Two projects so the fast layer stays fast.
 *
 *   unit       pure logic — rules maths, stat derivation. node env, no DOM.
 *   component  hooks and components. jsdom, with the fake Supabase client.
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
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname, "./src/frontend") },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/frontend/**/*.test.ts"],
          exclude: ["**/*.component.test.ts?(x)"],
        },
      },
      {
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname, "./src/frontend") },
        },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/frontend/**/*.component.test.ts?(x)"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
