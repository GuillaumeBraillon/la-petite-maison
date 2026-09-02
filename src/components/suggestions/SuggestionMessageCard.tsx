import { useState } from "react";
import { Heart, Pencil, Trash2 } from "lucide-react";
import type { Member, SuggestionMessage } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { RichTextArea } from "../publicPage/RichTextArea";
import { MarkdownContent } from "../publicPage/MarkdownContent";
import { SUGGESTION_CATEGORY_BADGE_VARIANT_MAP, SUGGESTION_CATEGORY_LABEL_MAP } from "../../services/suggestionCategories";

interface SuggestionMessageCardProps {
  message: SuggestionMessage;
  author?: Member;
  voteCount: number;
  hasCurrentUserVoted: boolean;
  canVote: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isReply?: boolean;
  showCategory?: boolean;
  onVote: () => void;
  onEditingChange: (isEditing: boolean) => void;
  onSaveEdit: (body: string) => Promise<void>;
  onDelete: () => void;
}

export const SuggestionMessageCard = ({
  message,
  author,
  voteCount,
  hasCurrentUserVoted,
  canVote,
  canEdit,
  canDelete,
  isReply = false,
  showCategory = false,
  onVote,
  onEditingChange,
  onSaveEdit,
  onDelete,
}: SuggestionMessageCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [saving, setSaving] = useState(false);

  const authorName = author ? `${author.firstName} ${author.lastName}`.trim() : "Membre supprimé";
  const formattedDate = new Date(message.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const startEdit = () => {
    setDraft(message.body);
    setIsEditing(true);
    onEditingChange(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(message.body);
    onEditingChange(false);
  };

  const saveEdit = async () => {
    if (!draft.trim() || saving) return;
    try {
      setSaving(true);
      await onSaveEdit(draft.trim());
      setIsEditing(false);
      onEditingChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={["flex gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4", isReply ? "ml-6 sm:ml-10" : ""].join(" ")}>
      {/* Votes */}
      <div className="flex shrink-0 items-center gap-1 pt-1">
        <button
          type="button"
          disabled={!canVote}
          onClick={onVote}
          aria-label={hasCurrentUserVoted ? "Retirer mon soutien" : "Soutenir cette idée"}
          aria-pressed={hasCurrentUserVoted}
          title={hasCurrentUserVoted ? "Retirer mon soutien" : "Soutenir cette idée"}
          className={[
            "rounded-md p-1.5 transition-colors",
            hasCurrentUserVoted ? "text-red-600 bg-red-50" : "text-gray-500 hover:bg-gray-100",
            !canVote ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        >
          <Heart size={18} fill={hasCurrentUserVoted ? "currentColor" : "none"} />
        </button>
        <span className="min-w-4 text-center text-xs font-medium text-gray-500">{voteCount}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{authorName}</span>
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
            <RichTextArea id={`suggestion-edit-${message.id}`} value={draft} onChange={setDraft} rows={15} compact autoFocus />
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
          <MarkdownContent text={message.body} className="mt-1 text-sm" />
        )}
      </div>
    </div>
  );
};
