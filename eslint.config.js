// @ts-check
/**
 * ESLint flat config — City of Stars.
 *
 * Two tiers on purpose (see the plan's §2.7, "ratchets, not targets"):
 *
 *   error  — rules the codebase already satisfies, or that catch real bugs.
 *            These must stay at zero.
 *   warn   — accumulated debt: file size, cognitive complexity, architecture
 *            boundaries, data access in presentational components, a11y.
 *            Counted, not ignored. `npm run lint` pins the count via
 *            --max-warnings, and that number may only ever go DOWN.
 *
 * Making the debt rules `error` on day one would just get them switched off.
 * Counting them makes every PR either improve the number or leave it alone.
 */

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sonarjs from "eslint-plugin-sonarjs";
import importX from "eslint-plugin-import-x";
import boundaries from "eslint-plugin-boundaries";

/**
 * Re-severity a preset's rules to "warn".
 *
 * jsx-a11y's recommended preset ships at "error". The accessibility baseline
 * here is one `aria-label` across the whole frontend, so adopting it as errors
 * would block every commit on day one. Counting it instead keeps it on the
 * ratchet with everything else.
 */
const asWarnings = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([rule, setting]) => [
      rule,
      Array.isArray(setting) ? ["warn", ...setting.slice(1)] : "warn",
    ]),
  );

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src/tauri/**",
      "supabase/**",
      "public/assets/**",
      "coverage/**",
      "*.config.js",
      "*.config.ts",
    ],
  },

  // ── Frontend: type-aware ───────────────────────────────────────────────────
  {
    files: ["src/frontend/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "boundaries/elements": [
        { type: "lib", pattern: "src/frontend/lib/*" },
        { type: "types", pattern: "src/frontend/types/*" },
        { type: "core", pattern: "src/frontend/core/**" },
        {
          type: "feature",
          pattern: "src/frontend/features/*/**",
          capture: ["featureName"],
        },
        { type: "app", pattern: "src/frontend/*" },
      ],
      "import-x/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      sonarjs,
      "import-x": importX,
      boundaries,
    },
    rules: {
      // ── tier: error — real bugs ────────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-self-import": "error",
      "import-x/no-cycle": ["error", { maxDepth: 4 }],

      // ── tier: warn — accumulated debt, ratcheted ───────────────────────────

      // Size & complexity. The real targets are ActionPanel.tsx (1251 lines),
      // DmMonstersPage.tsx (917), CharacterQuickRef.tsx (772),
      // DmEncountersPage.tsx (736), dnd5eApi.ts (608), EncounterPage.tsx (558),
      // RulesLookup.tsx (509). Phase 3 clears the two encounter files.
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["warn", 4],
      complexity: ["warn", 15],
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/prefer-immediate-return": "warn",

      // Accessibility. Starting point is one aria-label in the whole frontend,
      // so this is a large warning count by design. It is also what makes the
      // E2E selectors in §2.5 stable, so the two efforts are the same effort.
      ...asWarnings(jsxA11y.flatConfigs.recommended.rules),

      // Architecture — enforces what CLAUDE.md already declares.
      "boundaries/element-types": [
        "warn",
        {
          default: "allow",
          rules: [
            {
              from: ["core"],
              disallow: ["feature"],
              message:
                "core must not import from features (${dependency.featureName}). Lift the shared piece into core.",
            },
            {
              from: ["feature"],
              disallow: [["feature", { featureName: "!${from.featureName}" }]],
              message:
                "features/${from.featureName} must not import from features/${dependency.featureName}. Lift the shared piece into core.",
            },
            {
              from: ["lib", "types"],
              disallow: ["core", "feature"],
              message: "lib and types must not depend on core or features.",
            },
          ],
        },
      ],

      // Unused code — `warn` because the type-aware pass flags a lot initially.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // strictTypeChecked is deliberately loud here; these are the members
      // that fire most on this codebase. Demoted to warn so the baseline is
      // measurable rather than a wall of errors.
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/no-deprecated": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-dynamic-delete": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "warn",
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
      "@typescript-eslint/no-unnecessary-type-parameters": "warn",

      // OFF, not ratcheted: fires 332 times on the ordinary React idiom
      // `onClick={() => setOpen(true)}`. It measures nothing useful here, and
      // leaving it on would drown every signal that does matter.
      "@typescript-eslint/no-confusing-void-expression": "off",

      // react-hooks: the correctness rules stay loud, but note that
      // `rules-of-hooks` reports FALSE POSITIVES on this codebase --
      // `useAction` (ActionPanel.tsx:611) and `useAbility` (VoidPanel.tsx) are
      // plain functions that merely start with "use", so the heuristic treats
      // them as hooks. The real defect there is the misleading name; both
      // should be renamed (spendAction / spendAbility), after which these
      // reports disappear on their own.
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },

  // ── The data-access boundary ───────────────────────────────────────────────
  // The single highest-value rule here. `supabase.from/.rpc/.channel/.storage`
  // appears ~101 times across ~40 files, including inside presentational
  // components (HPPanel, VoidPanel, SpellsPanel, AttacksPanel, DefensesPanel,
  // StatusPanel, InventoryPanel, …). Components should render; hooks and a
  // service layer should fetch.
  //
  // This turns "we should have a data layer" from an aspiration into a
  // measurable, shrinking number.
  {
    files: ["src/frontend/**/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/lib/supabase",
              message:
                "Components should not query the database directly. Move the query into a hook (features/*/hooks) or a service module, and pass data in as props.",
            },
          ],
        },
      ],
    },
  },

  // ── Node-side scripts ──────────────────────────────────────────────────────
  // Not type-aware: these sit outside tsconfig's `include`, so asking for type
  // information would just fail to resolve a project for them.
  {
    files: ["scripts/**/*.{js,mjs,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: { project: null, projectService: false },
    },
    rules: {
      // Scripts are CLIs; printing is their job.
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
