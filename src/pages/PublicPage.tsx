import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { fetchPublicPage } from "../services/api";
import { updatePublicPageContent, uploadPublicPageImage, deletePublicPageImage } from "../services/apiCrud";
import type { PublicPageContent, PublicPageImage } from "../types";
import { PublicPageView } from "../components/publicPage/PublicPageView";
import { PublicPageEditor } from "../components/publicPage/PublicPageEditor";

export const PublicPage = () => {
  const [content, setContent] = useState<PublicPageContent | null>(null);
  const [images, setImages] = useState<PublicPageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Chargement du contenu (accessible sans auth)
  useEffect(() => {
    const load = async () => {
      try {
        const pageData = await fetchPublicPage();
        setContent(pageData.content);
        setImages(pageData.images);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Vérification session + permission d'édition
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;
      setHasSession(true);

      const { data: member } = await supabase.from("members").select("role").eq("auth_user_id", session.user.id).maybeSingle();

      if (member && (member.role === "admin" || member.role === "owner")) {
        setCanEdit(true);
      }
    };
    void checkAuth();
  }, []);

  const handleSave = async (updates: Partial<Pick<PublicPageContent, "title" | "subtitle" | "description" | "practicalInfo">>) => {
    setSaving(true);
    try {
      const updated = await updatePublicPageContent(updates);
      setContent(updated);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async (file: File) => {
    const newImage = await uploadPublicPageImage(file);
    setImages((prev) => [...prev, newImage]);
  };

  const handleDeleteImage = async (image: PublicPageImage) => {
    await deletePublicPageImage(image);
    setImages((prev) => prev.filter((img) => img.id !== image.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-gray-600">Impossible de charger la page.</p>
          <p className="text-sm text-gray-400">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!content) return null;

  if (isEditing) {
    return (
      <PublicPageEditor
        content={content}
        images={images}
        saving={saving}
        onSave={handleSave}
        onAddImage={handleAddImage}
        onDeleteImage={handleDeleteImage}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return <PublicPageView content={content} images={images} canEdit={canEdit} hasSession={hasSession} onEditClick={() => setIsEditing(true)} />;
};
