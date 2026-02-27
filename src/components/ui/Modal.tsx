import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

// ------------------------------------------------------------
// Size map
// ------------------------------------------------------------

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const Modal = ({ isOpen, onClose, title, children, footer, size = "md" }: ModalProps) => {
  // Fermeture au clavier (Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Bloquer le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 sm:px-6 py-4 flex-1">{children}</div>

        {/* Footer */}
        {footer && <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
