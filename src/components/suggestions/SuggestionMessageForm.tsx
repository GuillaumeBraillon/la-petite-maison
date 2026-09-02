import { useState } from "react";
import { Button } from "../ui/Button";
import { RichTextArea } from "../publicPage/RichTextArea";

interface SuggestionMessageFormProps {
  submitting: boolean;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}

export const SuggestionMessageForm = ({ submitting, onSubmit, onCancel }: SuggestionMessageFormProps) => {
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    await onSubmit(body.trim());
    setBody("");
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-1">
        <RichTextArea id="suggestion-body" value={body} onChange={setBody} rows={6} compact autoFocus placeholder="Partagez une idée ou une remarque..." />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={submitting} disabled={!body.trim()}>
          Publier
        </Button>
      </div>
    </form>
  );
};
