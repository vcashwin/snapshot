# snapshot

Tree-shakeable monorepo for capturing live DOM elements as inline-styled HTML — the same engine behind [Paper Snapshot](https://paper.design/snapshot-extension). Paste the result into Paper desktop or any HTML-aware editor.

## Packages

| Package | Import | Purpose |
|---------|--------|---------|
| [`@snapshot/core`](./packages/core) | `@snapshot/core/picker` | Element picker, serializer, clipboard |
| [`@snapshot/react`](./packages/react) | `@snapshot/react/use-snapshot-capture` | React hook + toast UI |
| [`@snapshot/electron`](./packages/electron) | `@snapshot/electron/clipboard` | Native Electron clipboard |

Each subpath is a **separate ESM entry** with `"sideEffects": false` — bundlers only include what you import.

## Install

```bash
pnpm add @snapshot/core
pnpm add @snapshot/react
pnpm add @snapshot/electron   # optional
```

## Quick start (vanilla)

```ts
import { captureAndCopy } from "@snapshot/core/capture";

const result = await captureAndCopy();
if (result.status === "success") {
  console.log("Copied — paste into Paper");
}
```

## Pick only / serialize only

```ts
import { runElementPicker } from "@snapshot/core/picker";
import { captureBySelector } from "@snapshot/core/serialize";
import { wrapForPaper } from "@snapshot/core/wrap";
import { copyHtmlToClipboard } from "@snapshot/core/clipboard";

const selector = await runElementPicker();
if (!selector) return;

const captured = await captureBySelector(selector, {
  onProgress: ({ percent }) => console.log(percent),
});

if (captured.status === "success") {
  await copyHtmlToClipboard(wrapForPaper(captured.html));
}
```

## React

```tsx
import { useSnapshotCapture } from "@snapshot/react/use-snapshot-capture";
import { SnapshotHud } from "@snapshot/react/snapshot-ui";

function Toolbar() {
  const snapshot = useSnapshotCapture({ copyToClipboard: true });

  return (
    <>
      <button onClick={snapshot.start} disabled={snapshot.isActive}>
        Capture
      </button>
      <SnapshotHud snapshot={snapshot} />
    </>
  );
}
```

With context:

```tsx
import { SnapshotProvider, useSnapshot } from "@snapshot/react/snapshot-provider";
import { SnapshotHud } from "@snapshot/react/snapshot-ui";

function App() {
  return (
    <SnapshotProvider copyToClipboard>
      <Toolbar />
      <Hud />
    </SnapshotProvider>
  );
}

function Hud() {
  const snapshot = useSnapshot();
  return <SnapshotHud snapshot={snapshot} />;
}
```

## Electron

```ts
import { createElectronClipboardWriter } from "@snapshot/electron/clipboard";
import { useSnapshotCapture } from "@snapshot/react/use-snapshot-capture";

const snapshot = useSnapshotCapture({
  writeClipboard: createElectronClipboardWriter(),
});
```

For `<webview>` guest pages, expose `@snapshot/core` in a preload script and call `@snapshot/electron/inject` — see [packages/electron/src/inject.ts](./packages/electron/src/inject.ts).

## Tree-shaking

```ts
// ✅ ~picker only
import { runElementPicker } from "@snapshot/core/picker";

// ✅ ~serialize only — no picker, no clipboard
import { captureBySelector } from "@snapshot/core/serialize";

// ✅ clipboard fallback only
import { copyHtmlViaCopyEvent } from "@snapshot/core/clipboard/copy-via-event";

// ❌ avoid — no root barrel export exists by design
// import { everything } from "@snapshot/core";
```

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
```

## Publish to npm

One-time: create the [`@snapshot` npm org](https://www.npmjs.com/org/create) and ensure 2FA is configured.

```bash
pnpm publish:packages --otp=123456   # code from your authenticator app
```

This publishes `@snapshot/core`, `@snapshot/react`, and `@snapshot/electron@0.1.0` to the public npm registry. Install from any client:

```bash
pnpm add @snapshot/core @snapshot/react
```

## License

MIT
