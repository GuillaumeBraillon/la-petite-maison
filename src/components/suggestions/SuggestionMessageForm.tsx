import { useState } from "react";
import { Button } from "../ui/Button";

interface SuggestionMessageFormProps {
  submitting: boolean;
  onSubmit: (body: string) => Promise<void>;
}

export const SuggestionMessageForm = ({ submitting, onSubmit }: SuggestionMessageFormProps) => {
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
        <label htmlFor="suggestion-body" className="text-xs font-medium text-gray-600">
          Message
        </label>
        <textarea
          id="suggestion-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Partagez une idée, une remarque, un bon plan..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!body.trim()}>
          Publier
        </Button>
      </div>
    </form>
  );
};
