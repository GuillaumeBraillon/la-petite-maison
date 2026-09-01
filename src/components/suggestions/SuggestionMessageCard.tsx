import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowBigUp, ArrowBigDown, Pencil, Trash2 } from "lucide-react";
import type { Member, SuggestionMessage } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SUGGESTION_CATEGORY_BADGE_VARIANT_MAP, SUGGESTION_CATEGORY_LABEL_MAP } from "../../services/suggestionCategories";

const URL_PATTERN = /https?:\/\/[^\s<]+/g;

const renderLinkedMessage = (body: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_PATTERN.exec(body)) !== null) {
    const url = match[0].replace(/[),.!?;:]+$/, "");

    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }

    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary-700 underline hover:text-primary-900"
      >
        {url}
      </a>
    );

    const trailingText = match[0].slice(url.length);
    if (trailingText) {
      parts.push(trailingText);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts;
};

interface SuggestionMessageCardProps {
  message: SuggestionMessage;
  author?: Member;
  score: number;
  currentUserVote?: 1 | -1;
  canVote: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isReply?: boolean;
  showCategory?: boolean;
  onVote: (value: 1 | -1) => void;
  onSaveEdit: (body: string) => Promise<void>;
  onDelete: () => void;
}

export const SuggestionMessageCard = ({
  message,
  author,
  score,
  currentUserVote,
  canVote,
  canEdit,
  canDelete,
  isReply = false,
  showCategory = false,
  onVote,
  onSaveEdit,
  onDelete,
}: SuggestionMessageCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [saving, setSaving] = useState(false);

  const authorLabel = author ? author.label : "Membre supprimé";
  const formattedDate = new Date(message.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const startEdit = () => {
    setDraft(message.body);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(message.body);
  };

  const saveEdit = async () => {
    if (!draft.trim() || saving) return;
    try {
      setSaving(true);
      await onSaveEdit(draft.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={["flex gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4", isReply ? "ml-6 sm:ml-10" : ""].join(" ")}>
      {/* Votes */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
        <button
          type="button"
          disabled={!canVote}
          onClick={() => onVote(1)}
          aria-label="Voter pour"
          className={[
            "p-1 rounded-md transition-colors",
            currentUserVote === 1 ? "text-primary-600 bg-primary-50" : "text-gray-400 hover:bg-gray-100",
            !canVote ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        >
          <ArrowBigUp size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{score}</span>
        <button
          type="button"
          disabled={!canVote}
          onClick={() => onVote(-1)}
          aria-label="Voter contre"
          className={[
            "p-1 rounded-md transition-colors",
            currentUserVote === -1 ? "text-red-600 bg-red-50" : "text-gray-400 hover:bg-gray-100",
            !canVote ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        >
          <ArrowBigDown size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{authorLabel}</span>
            <span>·</span>
            <span>{formattedDate}</span>
            {showCategory && <Badge variant={SUGGESTION_CATEGORY_BADGE_VARIANT_MAP[message.category]}>{SUGGESTION_CATEGORY_LABEL_MAP[message.category]}</Badge>}
          </div>
          {(canEdit || canDelete) && !isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              {canEdit && (
                <button type="button" onClick={startEdit} aria-label="Modifier" className="p-1 text-gray-400 hover:text-gray-600">
                  <Pencil size={14} />
                </button>
              )}
              {canDelete && (
                <button type="button" onClick={onDelete} aria-label="Supprimer" className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={cancelEdit} disabled={saving}>
                Annuler
              </Button>
              <Button type="button" size="sm" loading={saving} onClick={() => void saveEdit()}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">{renderLinkedMessage(message.body)}</p>
        )}
      </div>
    </div>
  );
};
