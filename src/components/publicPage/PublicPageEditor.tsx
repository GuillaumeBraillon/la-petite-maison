import { useState } from "react";
import { Save, X } from "lucide-react";
import type { PublicPageEditorProps, PublicPageContent } from "../../types";
import { PublicPageImageGrid } from "./PublicPageImageGrid";
import { RichTextArea } from "./RichTextArea";

export const PublicPageEditor = ({ content, images, saving, onSave, onAddImage, onDeleteImage, onCancel }: PublicPageEditorProps) => {
  const [title, setTitle] = useState(content.title);
  const [subtitle, setSubtitle] = useState(content.subtitle ?? "");
  const [description, setDescription] = useState(content.description ?? "");
  const [practicalInfo, setPracticalInfo] = useState(content.practicalInfo ?? "");
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const updates: Partial<Pick<PublicPageContent, "title" | "subtitle" | "description" | "practicalInfo">> = {
      title: title.trim() || content.title,
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      practicalInfo: practicalInfo.trim() || undefined,
    };

    try {
      await onSave(updates);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    }
  };

  const handleAddImage = async (file: File) => {
    setUploading(true);
    try {
      await onAddImage(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="La Petite Maison" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-semibold text-gray-900 text-sm">Modifier la page</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={14} />
              Annuler
            </button>
            <button
              type="submit"
              form="public-page-editor-form"
              disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form id="public-page-editor-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="public-title" className="block text-sm font-medium text-gray-700">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              id="public-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex : La Petite Maison"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <label htmlFor="public-subtitle" className="block text-sm font-medium text-gray-700">
              Sous-titre
            </label>
            <input
              id="public-subtitle"
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex : Notre maison de vacances en Provence"
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Photos</p>
            <PublicPageImageGrid images={images} editMode uploading={uploading} onAdd={handleAddImage} onDelete={onDeleteImage} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="public-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
              <p>ℹ️ Les boutons de mise en forme ajoutent des petits caractères dans le texte.</p>
              <ul className="space-y-0.5 pl-1">
                <li>
                  <code className="px-1 ">## Mon titre</code> → <span className="text-base font-semibold text-gray-900 mt-4 mb-0.5 first:mt-0">titre</span>
                </li>
                <li>
                  <code className="px-1 ">**mon texte**</code> → <strong>gras</strong>
                </li>
                <li>
                  <code className="px-1 ">*mon texte*</code> → <em>italique</em>
                </li>
                <li>
                  <code className="px-1 ">- mon élément</code> → • liste
                </li>
              </ul>
              <p>Ne vous inquiétez pas, ils disparaîtront une fois la page enregistrée et le résultat sera bien mis en forme.</p>
            </div>
            <RichTextArea
              id="public-description"
              value={description}
              onChange={setDescription}
              rows={30}
              placeholder="Décrivez la maison, le lieu, l'ambiance…"
            />
          </div>

          {/* Practical info */}
          <div className="space-y-1.5">
            <label htmlFor="public-practical" className="block text-sm font-medium text-gray-700">
              En résumé
            </label>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
              <p>
                ℹ️ Les boutons de mise en forme ajoutent des petits caractères dans le texte. Ne vous inquiétez pas, ils disparaîtront une fois la page
                enregistrée et le résultat sera bien mis en forme.
              </p>
              <ul className="space-y-0.5 pl-1">
                <li>
                  <code className="bg-amber-100 px-1 rounded">## Mon titre</code> → titre de section
                </li>
                <li>
                  <code className="bg-amber-100 px-1 rounded">**mon texte**</code> → <strong>texte en gras</strong>
                </li>
                <li>
                  <code className="bg-amber-100 px-1 rounded">*mon texte*</code> → <em>texte en italique</em>
                </li>
                <li>
                  <code className="bg-amber-100 px-1 rounded">- mon élément</code> → • point de liste
                </li>
              </ul>
            </div>
            <RichTextArea id="public-practical" value={practicalInfo} onChange={setPracticalInfo} rows={10} placeholder="Adresse, accès, codes, équipements…" />
          </div>

          {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
        </form>
      </main>
    </div>
  );
};
