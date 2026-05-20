import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "use-snapshot-capture": "src/use-snapshot-capture.ts",
    "snapshot-provider": "src/snapshot-provider.tsx",
    "snapshot-ui": "src/snapshot-ui.tsx",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: ["react", "react-dom", "@snapshot/core"],
  target: "es2022",
});
