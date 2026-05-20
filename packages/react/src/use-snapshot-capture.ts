import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureAndCopy,
  captureSelection,
  type CaptureAndCopyOptions,
} from "@snapshot/core/capture";
import { copyHtmlToClipboard } from "@snapshot/core/clipboard";
import { wrapForPaper } from "@snapshot/core/wrap";
import type {
  CaptureResult,
  ClipboardResult,
  SerializeProgress,
} from "@snapshot/core/types";

export type SnapshotPhase =
  | "idle"
  | "picking"
  | "capturing"
  | "copying"
  | "success"
  | "error"
  | "cancelled";

export type UseSnapshotCaptureOptions = Omit<
  CaptureAndCopyOptions,
  "onProgress"
> & {
  /** Called when capture completes successfully (before optional clipboard write). */
  onCapture?: (result: Extract<CaptureResult, { status: "success" }>) => void;
  /** Called after clipboard write when copyToClipboard is true. */
  onCopied?: (result: {
    html: string;
    wrappedHtml: string;
    clipboard: ClipboardResult;
  }) => void;
  /** Called for any terminal outcome. */
  onComplete?: (result: CaptureResult) => void;
  /** Called when capture is cancelled or aborted. */
  onCancel?: () => void;
  /** Custom clipboard writer — use @snapshot/electron in Electron apps. */
  writeClipboard?: (html: string) => Promise<ClipboardResult> | ClipboardResult;
};

export type UseSnapshotCaptureReturn = {
  phase: SnapshotPhase;
  progress: SerializeProgress | null;
  error: string | null;
  warning: string | null;
  /** Start interactive pick → capture flow. */
  start: () => Promise<CaptureResult>;
  /** Capture a known selector without opening the picker. */
  captureSelector: (selector: string) => Promise<CaptureResult>;
  /** Cancel in-flight pick or capture. */
  cancel: () => void;
  isActive: boolean;
};

export function useSnapshotCapture(
  options: UseSnapshotCaptureOptions = {},
): UseSnapshotCaptureReturn {
  const [phase, setPhase] = useState<SnapshotPhase>("idle");
  const [progress, setProgress] = useState<SerializeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("cancelled");
    setProgress(null);
    optionsRef.current.onCancel?.();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const runCapture = useCallback(
    async (selector?: string): Promise<CaptureResult> => {
      const current = optionsRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setWarning(null);
      setProgress(null);
      setPhase("picking");

      try {
        if (!selector) {
          // Picker phase — captureSelection handles pick + serialize
          setPhase("picking");
        }

        const captureOptions = {
          ...current,
          selector,
          signal: controller.signal,
          onProgress: (value: SerializeProgress) => {
            setPhase("capturing");
            setProgress(value);
          },
        };

        const shouldCopy = current.copyToClipboard ?? true;

        if (shouldCopy && !current.writeClipboard) {
          setPhase("capturing");
          const result = await captureAndCopy({
            ...captureOptions,
            copyToClipboard: true,
          });

          if (result.status === "success") {
            const wrappedHtml =
              current.wrap === false
                ? result.html
                : wrapForPaper(result.html);

            setWarning(result.warning ?? null);
            current.onCapture?.(result);

            const clipboard =
              "clipboard" in result ? result.clipboard : { status: "success" as const };

            current.onCopied?.({
              html: result.html,
              wrappedHtml,
              clipboard,
            });
            current.onComplete?.(result);
            setPhase("success");
            return result;
          }

          if (result.status === "cancelled") {
            setPhase("cancelled");
            current.onCancel?.();
            return result;
          }

          if (result.status === "aborted") {
            setPhase("cancelled");
            current.onCancel?.();
            return result;
          }

          setError(result.error);
          setPhase("error");
          current.onComplete?.(result);
          return result;
        }

        setPhase("capturing");
        const result = await captureSelection(captureOptions);

        if (result.status === "success") {
          setWarning(result.warning ?? null);
          current.onCapture?.(result);

          if (shouldCopy) {
            setPhase("copying");
            const wrappedHtml =
              current.wrap === false ? result.html : wrapForPaper(result.html);
            const write = current.writeClipboard ?? copyHtmlToClipboard;
            const clipboard = await write(wrappedHtml);
            current.onCopied?.({ html: result.html, wrappedHtml, clipboard });
          }

          current.onComplete?.(result);
          setPhase("success");
          return result;
        }

        if (result.status === "cancelled" || result.status === "aborted") {
          setPhase("cancelled");
          current.onCancel?.();
          return result;
        }

        setError(result.error);
        setPhase("error");
        current.onComplete?.(result);
        return result;
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  const start = useCallback(() => runCapture(), [runCapture]);

  const captureSelector = useCallback(
    (selector: string) => runCapture(selector),
    [runCapture],
  );

  const isActive =
    phase === "picking" || phase === "capturing" || phase === "copying";

  return {
    phase,
    progress,
    error,
    warning,
    start,
    captureSelector,
    cancel,
    isActive,
  };
}
