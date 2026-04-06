import { useState } from "react";
import { ArrowLeft, Pencil, Share2, Check } from "lucide-react";
import type { PublicPageViewProps } from "../../types";
import { PublicPageImageGrid } from "./PublicPageImageGrid";
import { MarkdownContent } from "./MarkdownContent";

export const PublicPageView = ({ content, images, canEdit, hasSession, onEditClick }: PublicPageViewProps) => {
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");

  const handleBack = () => {
    window.location.href = "/";
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: content.title,
          text: content.subtitle ?? "La Petite Maison",
          url: shareUrl,
        });
        setShareState("shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
      } else {
        window.prompt("Copiez ce lien :", shareUrl);
      }
    } catch {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
      }
    }

    window.setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="La Petite Maison" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-semibold text-gray-900 text-sm">La Petite Maison</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
              {shareState === "idle" && <Share2 size={14} />}
              {shareState !== "idle" && <Check size={14} />}
              {shareState === "idle" && "Partager"}
              {shareState === "copied" && "Lien copié"}
              {shareState === "shared" && "Partagé"}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={onEditClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Pencil size={14} />
                Modifier
              </button>
            )}
            {hasSession && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={14} />
                Retour
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{content.title}</h1>
          {content.subtitle && <p className="text-lg text-gray-500">{content.subtitle}</p>}
        </div>

        {/* Images */}
        <PublicPageImageGrid images={images} />

        {/* Description */}
        {content.description && (
          <section>
            <MarkdownContent text={content.description} className="space-y-1" />
          </section>
        )}

        {/* Practical info */}
        {content.practicalInfo && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">En résumé</h2>
            <MarkdownContent text={content.practicalInfo} className="space-y-1" />
          </section>
        )}

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-100 text-center text-xs text-gray-400">La Petite Maison</footer>
      </main>
    </div>
  );
};
