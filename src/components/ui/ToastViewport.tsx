import { X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

const variantClasses: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-primary-200 bg-primary-50 text-primary-800",
};

export const ToastViewport = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={["rounded-xl border p-3 shadow-sm backdrop-blur-sm", variantClasses[toast.variant] ?? variantClasses.info].join(" ")}
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {toast.title && <p className="text-xs font-semibold leading-tight">{toast.title}</p>}
              <p className="text-xs leading-snug break-words">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 hover:bg-black/5 transition-colors"
              aria-label="Fermer la notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
