import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { logger } from "../services/logger";

// ------------------------------------------------------------
// Props & State
// ------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ------------------------------------------------------------
// ErrorBoundary — capture les erreurs React non gérées
// ------------------------------------------------------------

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("[ErrorBoundary]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Une erreur est survenue</h1>
            <p className="text-gray-600 mb-4">L&apos;application a rencontré un problème inattendu.</p>
            {this.state.error && <pre className="text-left text-xs bg-red-50 text-red-700 rounded p-3 overflow-auto mb-4">{this.state.error.message}</pre>}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
