import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PublicPageImageGridProps } from "../../types";
import { Lightbox } from "./Lightbox";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export const PublicPageImageGrid = ({ images, editMode = false, uploading = false, onAdd, onDelete }: PublicPageImageGridProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAdd) return;

    setFileError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`Taille maximale : ${MAX_FILE_SIZE_MB} Mo.`);
      e.target.value = "";
      return;
    }

    try {
      await onAdd(file);
    } catch {
      setFileError("Échec de l'envoi de l'image.");
    } finally {
      e.target.value = "";
    }
  };

  if (images.length === 0 && !editMode) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div key={image.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
            <img
              src={image.publicUrl}
              alt={image.caption ?? "Photo"}
              className={["w-full h-full object-cover", !editMode ? "cursor-zoom-in" : ""].join(" ")}
              loading="lazy"
              onClick={!editMode ? () => setLightboxIndex(index) : undefined}
            />
            {image.caption && <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1 truncate">{image.caption}</div>}
            {editMode && onDelete && (
              <button
                type="button"
                onClick={() => void onDelete(image)}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                aria-label="Supprimer l'image"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}

        {editMode && onAdd && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            ) : (
              <>
                <Plus size={24} />
                <span className="text-xs font-medium">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      {fileError && <p className="text-sm text-red-600">{fileError}</p>}

      <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={(e) => void handleFileChange(e)} />

      {lightboxIndex !== null && <Lightbox images={images} currentIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />}
    </div>
  );
};
