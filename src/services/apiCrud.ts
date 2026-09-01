// ============================================================
// apiCrud.ts — CREATE / UPDATE / DELETE
// Toutes les conversions passent par apiMappers.ts
// ============================================================

import { supabase } from "./supabaseClient";
import {
  mapMemberFromDb,
  mapMemberToDb,
  mapRentalFromDb,
  mapRentalToDb,
  mapPublicPageFromDb,
  mapPublicPageImageFromDb,
  mapSuggestionMessageFromDb,
  mapSuggestionMessageToDb,
  mapSuggestionVoteFromDb,
} from "./apiMappers";
import type { DbMember, DbRental, DbPublicPage, DbPublicPageImage, DbFeedbackMessage, DbFeedbackVote } from "./dbTypes";
import type { Member, Rental, RentalStatus, PublicPageContent, PublicPageImage, SuggestionMessage, SuggestionVote } from "../types";
import { notifyNewRental, notifyStatusChange, notifyCompleted, notifyDeletedRental } from "./rentalNotifications";
import { notifyEmailNewRental, notifyEmailStatusChange, notifyEmailCompleted, notifyEmailDeletedRental } from "./emailNotifications";

const isLocalEnv = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const explicitToggle = import.meta.env.VITE_DISABLE_PUSH_IN_DEV === "true";
  return import.meta.env.DEV || explicitToggle || host === "localhost" || host === "127.0.0.1";
};

// ------------------------------------------------------------
// Member CRUD
// ------------------------------------------------------------

export const createMember = async (member: Omit<Member, "id" | "createdAt" | "updatedAt">): Promise<Member> => {
  const dbPayload = mapMemberToDb(member);
  const { data, error } = await supabase.from("members").insert(dbPayload).select().single();

  if (error) {
    const isConflict = error.code === "23505" || error.code === "409";
    const normalizedEmail = member.email?.trim().toLowerCase();

    if (isConflict && normalizedEmail) {
      const { data: existingMember, error: existingMemberError } = await supabase.from("members").select("id").ilike("email", normalizedEmail).maybeSingle();

      if (existingMemberError) {
        throw existingMemberError;
      }

      if (existingMember?.id) {
        const { data: updatedData, error: updateError } = await supabase.from("members").update(dbPayload).eq("id", existingMember.id).select().single();

        if (updateError) {
          throw updateError;
        }

        return mapMemberFromDb(updatedData as DbMember);
      }
    }

    throw error;
  }

  return mapMemberFromDb(data as DbMember);
};

export const updateMember = async (id: string, updates: Partial<Omit<Member, "id" | "createdAt" | "updatedAt">>): Promise<Member> => {
  const dbPayload = mapMemberToDb(updates);
  const { data, error } = await supabase.from("members").update(dbPayload).eq("id", id).select().single();

  if (error) throw error;
  return mapMemberFromDb(data as DbMember);
};

export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) throw error;
};

// ------------------------------------------------------------
// Rental CRUD
// ------------------------------------------------------------

export const createRental = async (rental: Omit<Rental, "id" | "createdAt" | "updatedAt">): Promise<Rental> => {
  const dbPayload = mapRentalToDb(rental);
  const { data, error } = await supabase.from("rentals").insert(dbPayload).select().single();

  if (error) throw error;

  const created = mapRentalFromDb(data as DbRental);
  if (!isLocalEnv()) {
    void notifyNewRental(created);
    void notifyEmailNewRental(created);
  }
  return created;
};

export const updateRental = async (
  id: string,
  updates: Partial<Omit<Rental, "id" | "createdAt" | "updatedAt">>,
  previousStatus?: RentalStatus
): Promise<Rental> => {
  const dbPayload = mapRentalToDb(updates);
  const { data, error } = await supabase.from("rentals").update(dbPayload).eq("id", id).select().single();

  if (error) throw error;

  const updated = mapRentalFromDb(data as DbRental);

  // Vérification stricte : le statut doit être fourni ET différent du statut précédent
  if (updates.status !== undefined && updates.status !== previousStatus) {
    if (updates.status === "completed") {
      if (!isLocalEnv()) {
        void notifyCompleted(updated);
        void notifyEmailCompleted(updated);
      }
    } else {
      if (!isLocalEnv()) {
        void notifyStatusChange(updated, previousStatus);
        void notifyEmailStatusChange(updated, previousStatus);
      }
    }
  }

  return updated;
};

export const deleteRental = async (id: string): Promise<void> => {
  const { data: existingData, error: fetchError } = await supabase.from("rentals").select("*").eq("id", id).single();

  if (fetchError) throw fetchError;

  const { error } = await supabase.from("rentals").delete().eq("id", id);

  if (error) throw error;

  const deletedRental = mapRentalFromDb(existingData as DbRental);
  if (!isLocalEnv()) {
    void notifyDeletedRental(deletedRental);
    void notifyEmailDeletedRental(deletedRental);
  }
};

// ------------------------------------------------------------
// Public page CRUD
// ------------------------------------------------------------

export const updatePublicPageContent = async (
  updates: Partial<Pick<PublicPageContent, "title" | "subtitle" | "description" | "practicalInfo">>
): Promise<PublicPageContent> => {
  const dbPayload: Partial<Omit<DbPublicPage, "id" | "updated_at">> = {};
  if (updates.title !== undefined) dbPayload.title = updates.title;
  if ("subtitle" in updates) dbPayload.subtitle = updates.subtitle ?? null;
  if ("description" in updates) dbPayload.description = updates.description ?? null;
  if ("practicalInfo" in updates) dbPayload.practical_info = updates.practicalInfo ?? null;

  const { data, error } = await supabase.from("public_page").update(dbPayload).eq("id", 1).select().single();

  if (error) throw error;
  return mapPublicPageFromDb(data as DbPublicPage);
};

export const uploadPublicPageImage = async (file: File, caption?: string): Promise<PublicPageImage> => {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("public-page-images").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) throw uploadError;

  const { data: lastImg } = await supabase.from("public_page_images").select("position").order("position", { ascending: false }).limit(1).maybeSingle();

  const nextPosition = (lastImg?.position ?? -1) + 1;

  const { data, error: dbError } = await supabase
    .from("public_page_images")
    .insert({ storage_path: path, caption: caption ?? null, position: nextPosition })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from("public-page-images").remove([path]);
    throw dbError;
  }

  const { data: urlData } = supabase.storage.from("public-page-images").getPublicUrl(path);
  return mapPublicPageImageFromDb(data as DbPublicPageImage, urlData.publicUrl);
};

export const deletePublicPageImage = async (image: PublicPageImage): Promise<void> => {
  const { error: dbError } = await supabase.from("public_page_images").delete().eq("id", image.id);

  if (dbError) throw dbError;

  const { error: storageError } = await supabase.storage.from("public-page-images").remove([image.storagePath]);

  if (storageError) {
    console.error("Échec suppression image du storage:", storageError);
  }
};

// ------------------------------------------------------------
// Suggestion CRUD
// ------------------------------------------------------------

export const createSuggestionMessage = async (message: Omit<SuggestionMessage, "id" | "createdAt" | "updatedAt">): Promise<SuggestionMessage> => {
  const dbPayload = mapSuggestionMessageToDb(message);
  const { data, error } = await supabase.from("feedback_messages").insert(dbPayload).select().single();

  if (error) throw error;
  return mapSuggestionMessageFromDb(data as DbFeedbackMessage);
};

export const updateSuggestionMessage = async (id: string, body: string): Promise<SuggestionMessage> => {
  const { data, error } = await supabase.from("feedback_messages").update({ body }).eq("id", id).select().single();

  if (error) throw error;
  return mapSuggestionMessageFromDb(data as DbFeedbackMessage);
};

export const deleteSuggestionMessage = async (id: string): Promise<void> => {
  const { error } = await supabase.from("feedback_messages").delete().eq("id", id);

  if (error) throw error;
};

/**
 * Vote sur un message ou une réponse.
 * - Pas de vote existant → insertion
 * - Vote existant avec la même valeur → suppression (on retire le vote)
 * - Vote existant avec une valeur différente → mise à jour
 */
export const setSuggestionVote = async (messageId: string, memberId: string, value: 1 | -1): Promise<SuggestionVote | null> => {
  const { data: existing, error: fetchError } = await supabase
    .from("feedback_votes")
    .select("*")
    .eq("message_id", messageId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    const { data, error } = await supabase.from("feedback_votes").insert({ message_id: messageId, member_id: memberId, value }).select().single();

    if (error) throw error;
    return mapSuggestionVoteFromDb(data as DbFeedbackVote);
  }

  if (existing.value === value) {
    const { error } = await supabase.from("feedback_votes").delete().eq("id", existing.id);
    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase.from("feedback_votes").update({ value }).eq("id", existing.id).select().single();

  if (error) throw error;
  return mapSuggestionVoteFromDb(data as DbFeedbackVote);
};
