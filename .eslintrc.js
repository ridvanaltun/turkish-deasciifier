module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    browser: true,
  },
  plugins: ["prettier"],
  extends: [
    "eslint:recommended",
    // "plugin:prettier/recommended", // resolve conflicts between prettier and eslint
  ],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {},
};
