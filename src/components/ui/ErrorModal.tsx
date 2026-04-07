import { AlertTriangle } from "lucide-react";
import type { ErrorModalProps } from "../../types";

// ------------------------------------------------------------
// ErrorModal — modal pour erreurs critiques (handlers, mutations)
// ------------------------------------------------------------

export const ErrorModal = ({ error, onClose }: ErrorModalProps) => {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="error-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
            <AlertTriangle className="text-red-600" size={24} />
          </div>

          <h2 id="error-modal-title" className="text-lg font-semibold text-gray-900">
            Une erreur est survenue
          </h2>

          <p className="text-sm text-gray-600">{error.message}</p>

          {error.context && <p className="text-xs text-gray-400">{error.context}</p>}

          {error.code && <p className="text-xs font-mono text-gray-400">Code : {error.code}</p>}

          {error.details && <p className="text-xs text-gray-500 break-words">Détails : {error.details}</p>}

          {error.hint && <p className="text-xs text-amber-700">Indice : {error.hint}</p>}
        </div>

        <button onClick={onClose} className="mt-5 w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Fermer
        </button>
      </div>
    </div>
  );
};
