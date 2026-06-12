import next from "eslint-config-next";
import prettier from "eslint-config-prettier";

const config = [
  ...next,
  prettier,
  {
    ignores: [".next/**", "node_modules/**", "build/**", "out/**"],
    rules: {
      "@next/next/no-img-element": "off",
      // Existing violations across the codebase — downgrade to warnings so the
      // tool surfaces them without blocking. Promote back to "error" as they're cleaned up.
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];

export default config;
