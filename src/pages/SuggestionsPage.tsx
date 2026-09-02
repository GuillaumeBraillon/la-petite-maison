import { useEffect, useState, useCallback } from "react";
import type { SuggestionCategory, SuggestionMessage, SuggestionsPageProps } from "../types";
import { getPermissions } from "../services/permissions";
import { fetchSuggestionMessages, fetchSuggestionVotes } from "../services/api";
import { createSuggestionMessage, updateSuggestionMessage, deleteSuggestionMessage, setSuggestionVote } from "../services/apiCrud";
import { TOAST_MESSAGES } from "../services/messageCatalog";
import { SUGGESTION_CATEGORY_DESCRIPTION_MAP, SUGGESTION_CATEGORY_LIST, SUGGESTION_CATEGORY_LABEL_MAP } from "../services/suggestionCategories";
import { SuggestionMessageForm } from "../components/suggestions/SuggestionMessageForm";
import { SuggestionMessageList } from "../components/suggestions/SuggestionMessageList";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { Select } from "../components/ui/Select";
import { useError } from "../contexts/ErrorContext";
import { useToast } from "../contexts/ToastContext";

const messageCountFor = (messages: SuggestionMessage[], category: SuggestionCategory): number =>
  messages.filter((message) => message.category === category).length;

export const SuggestionsPage = ({ members, currentMember }: SuggestionsPageProps) => {
  const [messages, setMessages] = useState<SuggestionMessage[]>([]);
  const [votes, setVotes] = useState<Awaited<ReturnType<typeof fetchSuggestionVotes>>>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | "all">("local");
  const [posting, setPosting] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<SuggestionMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [isNewTopicFormOpen, setIsNewTopicFormOpen] = useState(false);
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
  const selectedCategoryMessageCount = categoryFilter === "all" ? 0 : messageCountFor(messages, categoryFilter);
  const orderedCategories = [...SUGGESTION_CATEGORY_LIST].sort((firstCategory, secondCategory) => {
    const countDifference = messageCountFor(messages, secondCategory) - messageCountFor(messages, firstCategory);
    if (countDifference !== 0) return countDifference;
    if (firstCategory === "local") return -1;
    if (secondCategory === "local") return 1;
    return 0;
  });

  const handleCreate = async (body: string) => {
    if (!currentMember || categoryFilter === "all") return;
    try {
      setPosting(true);
      await createSuggestionMessage({ authorId: currentMember.id, category: categoryFilter, body });
      await loadData();
      setIsNewTopicFormOpen(false);
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

  const handleVote = async (messageId: string) => {
    if (!currentMember) return;
    try {
      await setSuggestionVote(messageId, currentMember.id, 1);
      await loadData();
    } catch (err) {
      showToast({ variant: "error", ...TOAST_MESSAGES.suggestion.voteError });
      setError({
        message: err instanceof Error ? err.message : "Une erreur est survenue.",
        context: "Vote",
      });
    }
  };

  const handleEditingChange = (isEditing: boolean) => {
    setIsEditingMessage(isEditing);
    if (isEditing) setIsNewTopicFormOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suggestions</h1>
        <p className="text-sm text-gray-500 mt-1">Les idées de chacun pour faire vivre la maison.</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <div className="flex flex-col gap-2">
        <div className="md:hidden">
          <Select
            id="suggestion-category-mobile"
            label="Catégorie"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as SuggestionCategory | "all")}
          >
            <option value="all">Toutes les suggestions</option>
            {orderedCategories.map((category) => (
              <option key={category} value={category}>
                {SUGGESTION_CATEGORY_LABEL_MAP[category]} ({messageCountFor(messages, category)})
              </option>
            ))}
          </Select>
        </div>

        <div className="hidden flex-wrap gap-2 md:flex">
          {orderedCategories.map((c) => (
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
              <span
                className={[
                  "ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                  categoryFilter === c ? "bg-white/20 text-white" : "bg-white text-gray-500",
                ].join(" ")}
              >
                {messageCountFor(messages, c)}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className="hidden self-start rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 md:block"
        >
          Voir toutes les suggestions
        </button>
      </div>

      {categoryFilter !== "all" && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5">
          <p className="text-xs leading-relaxed text-gray-600">{SUGGESTION_CATEGORY_DESCRIPTION_MAP[categoryFilter]}</p>
        </div>
      )}

      {categoryFilter !== "all" && filteredMessages.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800">Sujets en cours</h2>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Chargement...</p>
      ) : filteredMessages.length === 0 && categoryFilter !== "all" ? (
        <p className="text-sm text-gray-500">Soyez le premier à laisser un message.</p>
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
          onEditingChange={handleEditingChange}
          onVote={(messageId) => void handleVote(messageId)}
          onSaveEdit={handleSaveEdit}
          onDelete={setMessageToDelete}
          onReply={handleReply}
        />
      )}

      {permissions.createSuggestions && !isEditingMessage && categoryFilter !== "all" && (
        <div>
          {selectedCategoryMessageCount > 0 && !isNewTopicFormOpen ? (
            <button
              type="button"
              onClick={() => setIsNewTopicFormOpen(true)}
              className="text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
            >
              Commencer un nouveau sujet
            </button>
          ) : (
            <SuggestionMessageForm
              submitting={posting}
              onSubmit={handleCreate}
              onCancel={selectedCategoryMessageCount > 0 ? () => setIsNewTopicFormOpen(false) : undefined}
            />
          )}
        </div>
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
