module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  plugins: [
    "@typescript-eslint/eslint-plugin",
    "unused-imports",
    "perfectionist",
  ],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "perfectionist/sort-imports": [
      "error",
      {
        type: "line-length",
        order: "asc",
        groups: [["builtin", "external"], "internal", "ruleSets"],
        "custom-groups": {
          value: {
            ruleSets: "./rulesets/**",
          },
        },
        "newlines-between": "always",
        "max-line-length": 120,
      },
    ],
    "perfectionist/sort-named-imports": [
      "error",
      {
        type: "line-length",
        order: "asc",
      },
    ],
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-function": "off",
    "prefer-rest-params": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/ban-types": [
      "error",
      {
        types: {
          Symbol: false,
          Function: false,
        },
        extendDefaults: true,
      },
    ],
  },
};
