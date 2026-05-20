# paper-snapshot

Tree-shakeable monorepo for capturing live DOM elements as inline-styled HTML — the same engine behind [Paper Snapshot](https://paper.design/snapshot-extension). Paste the result into Paper desktop or any HTML-aware editor.

## Packages

| Package | Import | Purpose |
|---------|--------|---------|
| [`@paper-snapshot/core`](./packages/core) | `@paper-snapshot/core/picker` | Element picker, serializer, clipboard |
| [`@paper-snapshot/react`](./packages/react) | `@paper-snapshot/react/use-snapshot-capture` | React hook + toast UI |
| [`@paper-snapshot/electron`](./packages/electron) | `@paper-snapshot/electron/clipboard` | Native Electron clipboard |

Each subpath is a **separate ESM entry** with `"sideEffects": false` — bundlers only include what you import.

## Install

```bash
pnpm add @paper-snapshot/core
pnpm add @paper-snapshot/react
pnpm add @paper-snapshot/electron   # optional
```

## Quick start (vanilla)

```ts
import { captureAndCopy } from "@paper-snapshot/core/capture";

const result = await captureAndCopy();
if (result.status === "success") {
  console.log("Copied — paste into Paper");
}
```

## React

```tsx
import { useSnapshotCapture } from "@paper-snapshot/react/use-snapshot-capture";
import { SnapshotHud } from "@paper-snapshot/react/snapshot-ui";

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

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm dev:demo
```

## Publish to npm

See **[PUBLISHING.md](./PUBLISHING.md)**.

## License

MIT
