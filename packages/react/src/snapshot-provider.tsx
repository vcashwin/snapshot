import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useSnapshotCapture,
  type UseSnapshotCaptureOptions,
  type UseSnapshotCaptureReturn,
} from "./use-snapshot-capture.js";

const SnapshotContext = createContext<UseSnapshotCaptureReturn | null>(null);

export type SnapshotProviderProps = UseSnapshotCaptureOptions & {
  children: ReactNode;
};

export function SnapshotProvider({
  children,
  ...options
}: SnapshotProviderProps) {
  const snapshot = useSnapshotCapture(options);
  const value = useMemo(() => snapshot, [snapshot]);

  return (
    <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>
  );
}

export function useSnapshot(): UseSnapshotCaptureReturn {
  const context = useContext(SnapshotContext);
  if (!context) {
    throw new Error("useSnapshot must be used within a SnapshotProvider");
  }
  return context;
}

export { useSnapshotCapture };
