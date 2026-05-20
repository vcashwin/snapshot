import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    clipboard: "src/clipboard.ts",
    inject: "src/inject.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: ["electron", "@paper-snapshot/core"],
  target: "es2022",
});
