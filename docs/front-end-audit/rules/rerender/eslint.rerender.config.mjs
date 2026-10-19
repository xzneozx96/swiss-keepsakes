// Temporary eslint config for the rerender audit. Never used by the app; the repo config is untouched.
// Run from front-end/:
//   node node_modules/eslint/bin/eslint.js --no-fix --no-config-lookup \
//     -c ../docs/audit/rules/rerender/eslint.rerender.config.mjs -f json src
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontEnd = path.resolve(here, "../../../../front-end");
const require = createRequire(path.join(frontEnd, "package.json"));

const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const tsParser = require("@typescript-eslint/parser");

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/routeTree.gen.ts"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "19.3" } },
    linterOptions: { reportUnusedDisableDirectives: "off", noInlineConfig: true },
    rules: {
      // rerender-no-inline-components
      "react/no-unstable-nested-components": ["warn", { allowAsProps: false }],
      "react-hooks/static-components": "warn",
      // context values built per render (re-renders every consumer)
      "react/jsx-no-constructed-context-values": "warn",
      // rerender-memo-with-default-value
      "react/no-object-type-as-default-prop": "warn",
      // rerender-derived-state-no-effect
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/no-deriving-state-in-effects": "warn",
      // rerender-dependencies (context only): missing/extra deps and deps that are not memoized
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/memoized-effect-dependencies": "warn",
      "react-hooks/exhaustive-effect-dependencies": "warn",
    },
  },
];
