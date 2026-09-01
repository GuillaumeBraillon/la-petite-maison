import { useEffect, useState, useCallback } from "react";
import type { SuggestionCategory, SuggestionMessage, SuggestionsPageProps } from "../types";
import { getPermissions } from "../services/permissions";
import { fetchSuggestionMessages, fetchSuggestionVotes } from "../services/api";
import { createSuggestionMessage, updateSuggestionMessage, deleteSuggestionMessage, setSuggestionVote } from "../services/apiCrud";
import { TOAST_MESSAGES } from "../services/messageCatalog";
import { SUGGESTION_CATEGORY_LIST, SUGGESTION_CATEGORY_LABEL_MAP } from "../services/suggestionCategories";
import { SuggestionMessageForm } from "../components/suggestions/SuggestionMessageForm";
import { SuggestionMessageList } from "../components/suggestions/SuggestionMessageList";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useError } from "../contexts/ErrorContext";
import { useToast } from "../contexts/ToastContext";

export const SuggestionsPage = ({ members, currentMember }: SuggestionsPageProps) => {
  const [messages, setMessages] = useState<SuggestionMessage[]>([]);
  const [votes, setVotes] = useState<Awaited<ReturnType<typeof fetchSuggestionVotes>>>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | "all">("all");
  const [posting, setPosting] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<SuggestionMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { error, setError, clearError } = useError();
  const { showToast } = useToast();

  const permissions = getPermissions(currentMember ?? null);

  const loadData = useCallback(async () => {
    try {
      const [messagesData, votesData] = await Promise.all([fetchSuggestionMessages(), fetchSuggestionVotes()]);
      setMessages(messagesData);
      setVotes(votesData);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Chargement des suggestions",
      });
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredMessages = categoryFilter === "all" ? messages : messages.filter((m) => m.category === categoryFilter);

  const handleCreate = async (body: string) => {
    if (!currentMember || categoryFilter === "all") return;
    try {
      setPosting(true);
      await createSuggestionMessage({ authorId: currentMember.id, category: categoryFilter, body });
      await loadData();
      showToast({ variant: "success", ...TOAST_MESSAGES.suggestion.created });
    } catch (err) {
      showToast({ variant: "error", ...TOAST_MESSAGES.suggestion.saveError });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Publication du message",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId: string, body: string) => {
    if (!currentMember) return;
    const parent = messages.find((m) => m.id === parentId);
    if (!parent) return;
    try {
      await createSuggestionMessage({ authorId: currentMember.id, category: parent.category, body, parentId });
      await loadData();
      showToast({ variant: "success", ...TOAST_MESSAGES.suggestion.created });
    } catch (err) {
      showToast({ variant: "error", ...TOAST_MESSAGES.suggestion.saveError });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Réponse au message",
      });
    }
  };

  const handleSaveEdit = async (messageId: string, body: string) => {
    try {
      await updateSuggestionMessage(messageId, body);
      await loadData();
      showToast({ variant: "success", ...TOAST_MESSAGES.suggestion.updated });
    } catch (err) {
      showToast({ variant: "error", ...TOAST_MESSAGES.suggestion.saveError });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Modification du message",
      });
    }
  };

  const confirmDelete = async () => {
    if (!messageToDelete || deleting) return;
    try {
      setDeleting(true);
      await deleteSuggestionMessage(messageToDelete.id);
      await loadData();
      setMessageToDelete(null);
      showToast({ variant: "success", ...TOAST_MESSAGES.suggestion.deleted });
    } catch (err) {
      showToast({ variant: "error", ...TOAST_MESSAGES.suggestion.deleteError });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Suppression du message",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleVote = async (messageId: string, value: 1 | -1) => {
    if (!currentMember) return;
    try {
      await setSuggestionVote(messageId, currentMember.id, value);
      await loadData();
    } catch (err) {
      showToast({ variant: "error", ...TOAST_MESSAGES.suggestion.voteError });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Vote",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suggestions</h1>
        <p className="text-sm text-gray-500 mt-1">Idées, remarques et bons plans pour la maison.</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={[
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            categoryFilter === "all" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          ].join(" ")}
        >
          Toutes
        </button>
        {SUGGESTION_CATEGORY_LIST.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              categoryFilter === c ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            {SUGGESTION_CATEGORY_LABEL_MAP[c]}
          </button>
        ))}
      </div>

      {permissions.createSuggestions &&
        (categoryFilter === "all" ? (
          <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 px-4 py-3">
            Choisissez une catégorie ci-dessus pour publier un message.
          </p>
        ) : (
          <SuggestionMessageForm submitting={posting} onSubmit={handleCreate} />
        ))}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Chargement...</p>
      ) : (
        <SuggestionMessageList
          messages={filteredMessages}
          votes={votes}
          members={members}
          currentMember={currentMember}
          canVote={permissions.viewSuggestions}
          canPost={permissions.createSuggestions}
          isAdmin={currentMember?.role === "admin"}
          showCategory={categoryFilter === "all"}
          onVote={(messageId, value) => void handleVote(messageId, value)}
          onSaveEdit={handleSaveEdit}
          onDelete={setMessageToDelete}
          onReply={handleReply}
        />
      )}

      <ConfirmDialog
        isOpen={messageToDelete !== null}
        title="Confirmer la suppression"
        message="Supprimer ce message ? Les réponses associées seront également supprimées."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setMessageToDelete(null)}
        loading={deleting}
      />
    </div>
  );
};
