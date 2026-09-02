import { useState } from "react";
import type { Member, SuggestionMessage, SuggestionVote } from "../../types";
import { SuggestionMessageCard } from "./SuggestionMessageCard";
import { Button } from "../ui/Button";
import { RichTextArea } from "../publicPage/RichTextArea";

interface SuggestionMessageListProps {
  messages: SuggestionMessage[];
  votes: SuggestionVote[];
  members: Member[];
  currentMember?: Member;
  canVote: boolean;
  canPost: boolean;
  isAdmin: boolean;
  showCategory: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onVote: (messageId: string) => void;
  onSaveEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (message: SuggestionMessage) => void;
  onReply: (parentId: string, body: string) => Promise<void>;
}

const hasCurrentUserVoted = (votes: SuggestionVote[], messageId: string, memberId?: string): boolean => {
  return memberId ? votes.some((v) => v.messageId === messageId && v.memberId === memberId) : false;
};

const voteCountFor = (votes: SuggestionVote[], messageId: string): number => votes.filter((v) => v.messageId === messageId && v.value === 1).length;

const ReplyComposer = ({ id, onSubmit }: { id: string; onSubmit: (body: string) => Promise<void> }) => {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="ml-6 sm:ml-10 text-xs font-medium text-primary-700 hover:underline">
        Répondre
      </button>
    );
  }

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit(body.trim());
      setBody("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ml-6 sm:ml-10 flex flex-col gap-2">
      <RichTextArea id={id} value={body} onChange={setBody} rows={6} placeholder="Votre réponse..." compact autoFocus />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen(false);
            setBody("");
          }}
          disabled={submitting}
        >
          Annuler
        </Button>
        <Button type="button" size="sm" loading={submitting} onClick={() => void handleSubmit()}>
          Répondre
        </Button>
      </div>
    </div>
  );
};

export const SuggestionMessageList = ({
  messages,
  votes,
  members,
  currentMember,
  canVote,
  canPost,
  isAdmin,
  showCategory,
  onEditingChange,
  onVote,
  onSaveEdit,
  onDelete,
  onReply,
}: SuggestionMessageListProps) => {
  const rootMessages = messages.filter((m) => !m.parentId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const repliesFor = (rootId: string) =>
    messages.filter((m) => m.parentId === rootId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const authorFor = (authorId?: string) => (authorId ? members.find((m) => m.id === authorId) : undefined);

  const canEditMessage = (message: SuggestionMessage) => isAdmin || (!!currentMember && message.authorId === currentMember.id);

  if (rootMessages.length === 0) {
    return <p className="text-sm text-gray-500 text-center">Aucun message pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {rootMessages.map((root) => (
        <div key={root.id} className="flex flex-col gap-2">
          <SuggestionMessageCard
            message={root}
            author={authorFor(root.authorId)}
            voteCount={voteCountFor(votes, root.id)}
            hasCurrentUserVoted={hasCurrentUserVoted(votes, root.id, currentMember?.id)}
            canVote={canVote}
            canEdit={canEditMessage(root)}
            canDelete={canEditMessage(root)}
            showCategory={showCategory}
            onVote={() => onVote(root.id)}
            onEditingChange={onEditingChange}
            onSaveEdit={(body) => onSaveEdit(root.id, body)}
            onDelete={() => onDelete(root)}
          />

          {repliesFor(root.id).map((reply) => (
            <SuggestionMessageCard
              key={reply.id}
              message={reply}
              author={authorFor(reply.authorId)}
              voteCount={voteCountFor(votes, reply.id)}
              hasCurrentUserVoted={hasCurrentUserVoted(votes, reply.id, currentMember?.id)}
              canVote={canVote}
              canEdit={canEditMessage(reply)}
              canDelete={canEditMessage(reply)}
              isReply
              showCategory={showCategory}
              onVote={() => onVote(reply.id)}
              onEditingChange={onEditingChange}
              onSaveEdit={(body) => onSaveEdit(reply.id, body)}
              onDelete={() => onDelete(reply)}
            />
          ))}

          {canPost && <ReplyComposer id={`suggestion-reply-${root.id}`} onSubmit={(body) => onReply(root.id, body)} />}
        </div>
      ))}
    </div>
  );
};
