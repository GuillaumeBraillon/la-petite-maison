import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { AppError } from "../../types";
import { formatAppErrorForShare } from "../../services/appError";

interface ErrorShareButtonProps {
  error: AppError;
  compact?: boolean;
}

export const ErrorShareButton = ({ error, compact = false }: ErrorShareButtonProps) => {
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");

  const handleShare = async (): Promise<void> => {
    const shareText = formatAppErrorForShare(error);

    try {
      if (navigator.share) {
        await navigator.share({
          title: error.context ?? "Erreur La Petite Maison",
          text: shareText,
        });
        setShareState("shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareState("copied");
      } else {
        window.prompt("Copiez ce message :", shareText);
      }
    } catch {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareState("copied");
      }
    }

    window.setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        compact ? "px-2 py-1 text-xs text-red-700 bg-red-100 hover:bg-red-200" : "w-full px-4 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100",
      ].join(" ")}
    >
      {shareState === "idle" && <Share2 size={compact ? 13 : 14} />}
      {shareState !== "idle" && <Check size={compact ? 13 : 14} />}
      {shareState === "idle" && "Partager l'erreur"}
      {shareState === "copied" && "Erreur copiée"}
      {shareState === "shared" && "Erreur partagée"}
    </button>
  );
};
