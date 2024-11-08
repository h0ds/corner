import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tailwindcss from "eslint-plugin-tailwindcss";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "simple-import-sort": simpleImportSort,
      tailwindcss
    },
    rules: {
      // JavaScript
      "no-unused-vars": "off", // Handled by TypeScript
      "no-undef": "off", // Handled by TypeScript
      
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["error", {
        "args": "all",
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      
      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      
      // Import sorting
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      
      // Tailwind
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/classnames-order": "error"
    }
  },
  ...tseslint.configs.recommended,
  ...react.configs.recommended,
  ...reactHooks.configs.recommended
];