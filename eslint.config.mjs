// @ts-check

import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  {
    ignores: [
      "dist/",
      "coverage/",
      "node_modules/",
      "public/icons/",
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
    ],
  },
  { languageOptions: { globals: globals.node } },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
);
