// ============================================================
// WhatsNewModal.tsx — Modal "Nouveautés" affichée une fois par version
// ============================================================

import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import type { ParsedChangelog } from "../../services/changelogParser";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface WhatsNewModalProps {
  entry: ParsedChangelog;
  onDismiss: () => void;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Convertit le markdown basique `**texte**` en fragments React avec <strong>.
 * Pas de dépendance externe — regex uniquement.
 */
const renderMarkdownInline = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const WhatsNewModal = ({ entry, onDismiss }: WhatsNewModalProps) => {
  return (
    <Modal
      isOpen
      onClose={onDismiss}
      title={`🎉 Nouveautés — v${entry.version}`}
      size="md"
      footer={
        <div className="flex justify-center">
          <Button onClick={onDismiss} className="w-full sm:w-auto">
            C&apos;est noté !
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Date */}
        <p className="text-xs text-gray-400 -mt-1">{entry.date}</p>

        {/* Sections */}
        {entry.sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.title}</p>
            <ul className="flex flex-col gap-1.5">
              {section.items.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 text-gray-400 shrink-0">·</span>
                  <span>{renderMarkdownInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
};
