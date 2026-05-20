import type { CSSProperties, ReactNode } from "react";
import type { SnapshotPhase, UseSnapshotCaptureReturn } from "./use-snapshot-capture.js";

export type SnapshotToastProps = {
  phase: SnapshotPhase;
  progress?: UseSnapshotCaptureReturn["progress"];
  error?: string | null;
  warning?: string | null;
  className?: string;
  style?: CSSProperties;
};

const toastStyle: CSSProperties = {
  position: "fixed",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 2147483647,
  background: "rgb(255 255 255)",
  borderRadius: 8,
  boxShadow:
    "rgb(0 0 0 / 25%) 0px 4px 20px -4px, rgb(0 0 0 / 10%) 0px 0px 0px 1px",
  padding: "12px 20px",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  color: "rgba(0,0,0,0.85)",
  pointerEvents: "none",
  userSelect: "none",
  maxWidth: "min(92vw, 640px)",
};

function messageForPhase(props: SnapshotToastProps): ReactNode {
  const { phase, progress, error, warning } = props;

  switch (phase) {
    case "picking":
      return (
        <>Click or Enter to capture · ↑↓ to fine-tune · Esc to cancel</>
      );
    case "capturing":
      return (
        <>
          Capturing selection…
          {progress && progress.total > 50 ? ` ${progress.percent}%` : null}
        </>
      );
    case "copying":
      return <>Copying to clipboard…</>;
    case "success":
      return (
        <>
          Copied to clipboard. Ready to paste into Paper.
          {warning ? ` ${warning}` : null}
        </>
      );
    case "error":
      return <>{error ?? "Capture failed."}</>;
    case "cancelled":
      return <>Capture cancelled.</>;
    default:
      return null;
  }
}

/** Lightweight toast driven by useSnapshotCapture phase. */
export function SnapshotToast(props: SnapshotToastProps) {
  const content = messageForPhase(props);
  if (!content || props.phase === "idle") return null;

  return (
    <div
      className={props.className}
      style={{ ...toastStyle, ...props.style }}
      data-snapshot-toast=""
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
}

export type SnapshotHudProps = {
  snapshot: Pick<
    UseSnapshotCaptureReturn,
    "phase" | "progress" | "error" | "warning" | "isActive"
  >;
  toastStyle?: CSSProperties;
  toastClassName?: string;
};

/** Renders SnapshotToast from a snapshot hook return value. */
export function SnapshotHud({
  snapshot,
  toastStyle: styleOverride,
  toastClassName,
}: SnapshotHudProps) {
  return (
    <SnapshotToast
      phase={snapshot.phase}
      progress={snapshot.progress}
      error={snapshot.error}
      warning={snapshot.warning}
      style={styleOverride}
      className={toastClassName}
    />
  );
}
