import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { AppError } from "../types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface ErrorContextValue {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  clearError: () => void;
}

// ------------------------------------------------------------
// Context
// ------------------------------------------------------------

const ErrorContext = createContext<ErrorContextValue | null>(null);

// ------------------------------------------------------------
// Provider
// ------------------------------------------------------------

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider = ({ children }: ErrorProviderProps) => {
  const [error, setErrorState] = useState<AppError | null>(null);

  const setError = useCallback((e: AppError | null) => {
    setErrorState(e);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  return <ErrorContext.Provider value={{ error, setError, clearError }}>{children}</ErrorContext.Provider>;
};

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export const useError = (): ErrorContextValue => {
  const ctx = useContext(ErrorContext);
  if (!ctx) {
    throw new Error("useError doit être utilisé à l'intérieur d'un ErrorProvider.");
  }
  return ctx;
};
