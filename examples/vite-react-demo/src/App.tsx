import { useSnapshotCapture } from "@snapshot/react/use-snapshot-capture";
import { SnapshotHud } from "@snapshot/react/snapshot-ui";

export function App() {
  const snapshot = useSnapshotCapture({
    copyToClipboard: true,
    onCopied: ({ wrappedHtml }) => {
      console.log("Copied HTML length:", wrappedHtml.length);
    },
  });

  const statusText = (() => {
    switch (snapshot.phase) {
      case "idle":
        return "Ready — click Capture, then click any element below.";
      case "picking":
        return "Picker active — hover and click an element.";
      case "capturing":
        return snapshot.progress
          ? `Serializing… ${snapshot.progress.percent}%`
          : "Serializing…";
      case "copying":
        return "Writing to clipboard…";
      case "success":
        return "Done — paste into Paper desktop with ⌘V / Ctrl+V.";
      case "error":
        return snapshot.error ?? "Something went wrong.";
      case "cancelled":
        return "Cancelled.";
      default:
        return "";
    }
  })();

  return (
    <div className="page">
      <header className="hero">
        <h1>@snapshot local demo</h1>
        <p>
          This Vite app links to the local workspace packages via{" "}
          <code>workspace:*</code>. Capture any element below and paste the
          HTML into Paper.
        </p>
      </header>

      <div className="toolbar">
        <button
          className="primary"
          onClick={() => void snapshot.start()}
          disabled={snapshot.isActive}
        >
          Capture element
        </button>
        <button onClick={snapshot.cancel} disabled={!snapshot.isActive}>
          Cancel
        </button>
      </div>

      <div className="status" aria-live="polite">
        {statusText}
        {snapshot.warning ? ` (${snapshot.warning})` : null}
      </div>

      <section className="demo-card" aria-label="Sample content to capture">
        <h2>Pricing card</h2>
        <p>
          Try capturing this whole card, or just the button, badge, or heading.
        </p>
        <div className="demo-row">
          <span className="chip">Popular</span>
          <strong>$19 / month</strong>
          <button type="button" className="cta">
            Start trial
          </button>
        </div>
      </section>

      <p className="hint">
        Open DevTools → Console to see the wrapped HTML length after copy.
      </p>

      <SnapshotHud snapshot={snapshot} />
    </div>
  );
}
