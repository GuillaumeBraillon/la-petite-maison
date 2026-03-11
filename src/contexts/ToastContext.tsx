import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ToastProviderProps } from "../types";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
}

interface ShowToastOptions {
  message: string;
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: ShowToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const DEFAULT_DURATION_MS = 3500;

const createToastId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIdsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutIdsRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({ message, title, variant = "info", durationMs = DEFAULT_DURATION_MS }: ShowToastOptions): string => {
      const id = createToastId();

      setToasts((prev) => [...prev, { id, message, title, variant }]);

      const timeoutId = window.setTimeout(
        () => {
          removeToast(id);
        },
        Math.max(0, durationMs)
      );

      timeoutIdsRef.current.set(id, timeoutId);

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;

    return () => {
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIds.clear();
    };
  }, []);

  return <ToastContext.Provider value={{ toasts, showToast, removeToast, clearToasts }}>{children}</ToastContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé à l'intérieur d'un ToastProvider.");
  }
  return ctx;
};
