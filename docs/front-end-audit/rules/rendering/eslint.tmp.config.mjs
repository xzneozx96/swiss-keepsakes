import { createRequire } from "node:module";
const require = createRequire("/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/package.json");
const react = require("eslint-plugin-react");
const tsParser = require("@typescript-eslint/parser");
export default [{
  files: ["**/*.tsx"],
  languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { react },
  rules: { "react/jsx-no-leaked-render": ["error", { validStrategies: ["ternary", "coerce"] }] },
}];
