// ESLint (P1-9): bắt lỗi hook React sai quy tắc, khối catch rỗng không ghi chú, biến khai báo không dùng.
// Cố ý tối thiểu để chạy được ngay trên mã hiện có; siết dần theo docs/17.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/**", "src-tauri/**", "node_modules/**", "public/**"] },
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts", "e2e/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "react-hooks": reactHooks, "@typescript-eslint": tseslint.plugin },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-debugger": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
);
