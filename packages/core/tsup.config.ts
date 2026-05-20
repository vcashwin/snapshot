import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    types: "src/types.ts",
    constants: "src/constants.ts",
    escape: "src/escape.ts",
    selector: "src/selector.ts",
    wrap: "src/wrap.ts",
    picker: "src/picker.ts",
    serialize: "src/serialize.ts",
    capture: "src/capture.ts",
    "clipboard/browser": "src/clipboard/browser.ts",
    "clipboard/copy-via-event": "src/clipboard/copy-via-event.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: true,
  treeshake: true,
  sourcemap: true,
  minify: false,
  target: "es2022",
});
