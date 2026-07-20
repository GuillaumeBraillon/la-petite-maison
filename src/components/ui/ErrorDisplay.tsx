import { X, AlertCircle } from "lucide-react";
import type { ErrorDisplayProps } from "../../types";
import { ErrorShareButton } from "./ErrorShareButton";

// ------------------------------------------------------------
// ErrorDisplay — composant réutilisable d'affichage d'erreur inline
// ------------------------------------------------------------

export const ErrorDisplay = ({ error, onDismiss, className = "" }: ErrorDisplayProps) => {
  return (
    <div role="alert" className={`flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-700">{error.message}</p>
        {error.context && <p className="text-xs text-red-500 mt-0.5">{error.context}</p>}
        {error.code && <p className="text-xs text-red-400 mt-0.5 font-mono">Code : {error.code}</p>}
        {typeof error.status === "number" && <p className="text-xs text-red-400 mt-0.5 font-mono">Statut : {error.status}</p>}
        {error.details && <p className="text-xs text-red-500 mt-0.5 break-words">Détails : {error.details}</p>}
        {error.hint && <p className="text-xs text-red-500 mt-0.5">Indice : {error.hint}</p>}
        {(error.operationId || error.timestamp || error.page) && (
          <p className="text-[11px] text-red-400 mt-1 break-all">
            {error.operationId ? `Réf: ${error.operationId}` : ""}
            {error.timestamp ? `${error.operationId ? " · " : ""}${new Date(error.timestamp).toLocaleString("fr-FR")}` : ""}
            {error.page ? ` · ${error.page}` : ""}
          </p>
        )}
        <div className="mt-2">
          <ErrorShareButton error={error} compact />
        </div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Fermer l'erreur" className="text-red-400 hover:text-red-600 transition-colors shrink-0">
          <X size={16} />
        </button>
      )}
    </div>
  );
};
