# snapshot

Tree-shakeable monorepo for capturing live DOM elements as inline-styled HTML — the same engine behind [Paper Snapshot](https://paper.design/snapshot-extension). Paste the result into Paper desktop or any HTML-aware editor.

## Packages

| Package | Import | Purpose |
|---------|--------|---------|
| [`@ashwinvc/snapshot-core`](./packages/core) | `@ashwinvc/snapshot-core/picker` | Element picker, serializer, clipboard |
| [`@ashwinvc/snapshot-react`](./packages/react) | `@ashwinvc/snapshot-react/use-snapshot-capture` | React hook + toast UI |
| [`@ashwinvc/snapshot-electron`](./packages/electron) | `@ashwinvc/snapshot-electron/clipboard` | Native Electron clipboard |

Each subpath is a **separate ESM entry** with `"sideEffects": false` — bundlers only include what you import.

## Install

```bash
pnpm add @ashwinvc/snapshot-core
pnpm add @ashwinvc/snapshot-react
pnpm add @ashwinvc/snapshot-electron   # optional
```

## Quick start (vanilla)

```ts
import { captureAndCopy } from "@ashwinvc/snapshot-core/capture";

const result = await captureAndCopy();
if (result.status === "success") {
  console.log("Copied — paste into Paper");
}
```

## Pick only / serialize only

```ts
import { runElementPicker } from "@ashwinvc/snapshot-core/picker";
import { captureBySelector } from "@ashwinvc/snapshot-core/serialize";
import { wrapForPaper } from "@ashwinvc/snapshot-core/wrap";
import { copyHtmlToClipboard } from "@ashwinvc/snapshot-core/clipboard";

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
import { useSnapshotCapture } from "@ashwinvc/snapshot-react/use-snapshot-capture";
import { SnapshotHud } from "@ashwinvc/snapshot-react/snapshot-ui";

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
import { SnapshotProvider, useSnapshot } from "@ashwinvc/snapshot-react/snapshot-provider";
import { SnapshotHud } from "@ashwinvc/snapshot-react/snapshot-ui";

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
import { createElectronClipboardWriter } from "@ashwinvc/snapshot-electron/clipboard";
import { useSnapshotCapture } from "@ashwinvc/snapshot-react/use-snapshot-capture";

const snapshot = useSnapshotCapture({
  writeClipboard: createElectronClipboardWriter(),
});
```

For `<webview>` guest pages, expose `@ashwinvc/snapshot-core` in a preload script and call `@ashwinvc/snapshot-electron/inject` — see [packages/electron/src/inject.ts](./packages/electron/src/inject.ts).

## Tree-shaking

```ts
// ✅ ~picker only
import { runElementPicker } from "@ashwinvc/snapshot-core/picker";

// ✅ ~serialize only — no picker, no clipboard
import { captureBySelector } from "@ashwinvc/snapshot-core/serialize";

// ✅ clipboard fallback only
import { copyHtmlViaCopyEvent } from "@ashwinvc/snapshot-core/clipboard/copy-via-event";

// ❌ avoid — no root barrel export exists by design
// import { everything } from "@ashwinvc/snapshot-core";
```

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm dev:demo
```

## Publish to npm

Published under the **`@ashwinvc` scope** (your npm account). The `@snapshot` org name is already taken on npm.

```bash
pnpm publish:packages --otp=123456   # code from your authenticator app
```

This publishes `@ashwinvc/snapshot-core`, `@ashwinvc/snapshot-react`, and `@ashwinvc/snapshot-electron@0.1.0`.

## License

MIT
