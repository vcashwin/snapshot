export type CaptureStatus = "success" | "error" | "aborted" | "cancelled";

export type CaptureSuccess = {
  status: "success";
  html: string;
  warning?: string;
};

export type CaptureError = {
  status: "error";
  error: string;
};

export type CaptureAborted = {
  status: "aborted";
};

export type CaptureCancelled = {
  status: "cancelled";
};

export type CaptureResult =
  | CaptureSuccess
  | CaptureError
  | CaptureAborted
  | CaptureCancelled;

export type ClipboardResult =
  | { status: "success" }
  | { status: "error"; error: string };

export type SerializeProgress = {
  processed: number;
  total: number;
  percent: number;
};

export type PickerOptions = {
  /** Document to pick from. Defaults to `window.document`. */
  document?: Document;
  /** Called each animation frame while an element is highlighted. */
  onHighlight?: (info: {
    element: Element;
    rect: DOMRectReadOnly;
  }) => void;
  /** Abort signal to cancel picking externally. */
  signal?: AbortSignal;
};

export type SerializeOptions = {
  /** Document root for queries and style resolution. Defaults to `window.document`. */
  document?: Document;
  /** Progress callback during serialization (after dry-run total is known). */
  onProgress?: (progress: SerializeProgress) => void;
  /** Abort signal — Escape during capture also aborts. */
  signal?: AbortSignal;
  /** Delay in ms before real serialization after dry-run. Default 500. */
  warmupDelay?: number;
};

export type CaptureOptions = PickerOptions &
  SerializeOptions & {
    /** CSS selector to capture directly, skipping the picker. */
    selector?: string;
  };

export type CopyHtmlOptions = {
  /** Wrap HTML for Paper desktop paste. Default true. */
  wrap?: boolean;
};

export type NodeSerializeResult = {
  html: string;
  processedNodes: number;
};

export type StyleRecord = Record<string, string>;

/** Runtime marker so the types entry is not an empty chunk. Tree-shakeable. */
export const SNAPSHOT_CORE_TYPES = "@snapshot/core/types" as const;
