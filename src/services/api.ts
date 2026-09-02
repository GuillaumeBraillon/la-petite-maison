// ============================================================
// api.ts — READ uniquement
// Toutes les conversions passent par apiMappers.ts
// ============================================================

import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import {
  mapMemberFromDb,
  mapRentalFromDb,
  mapPublicPageFromDb,
  mapPublicPageImageFromDb,
  mapSuggestionMessageFromDb,
  mapSuggestionVoteFromDb,
} from "./apiMappers";
import type { DbMember, DbRental, DbPublicPage, DbPublicPageImage, DbFeedbackMessage, DbFeedbackVote } from "./dbTypes";
import type { Member, Rental, PublicPageData, SuggestionMessage, SuggestionVote } from "../types";

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase.from("members").select("*").order("last_name", { ascending: true });

  if (error) throw error;
  return ((data as DbMember[]) ?? []).map(mapMemberFromDb);
};

export const fetchCurrentMember = async (session: Session): Promise<Member | null> => {
  const normalizedEmail = session.user.email?.trim().toLowerCase();

  const { data: byAuthUserId, error: byAuthUserIdError } = await supabase.from("members").select("*").eq("auth_user_id", session.user.id).maybeSingle();

  if (byAuthUserIdError) throw byAuthUserIdError;
  if (byAuthUserId) return mapMemberFromDb(byAuthUserId as DbMember);

  if (!normalizedEmail) return null;

  const { data: byEmail, error: byEmailError } = await supabase.from("members").select("*").ilike("email", normalizedEmail).maybeSingle();

  if (byEmailError) throw byEmailError;
  if (!byEmail) return null;
  return mapMemberFromDb(byEmail as DbMember);
};

export const fetchRentals = async (): Promise<Rental[]> => {
  const { data, error } = await supabase.from("rentals").select("*").order("start_date", { ascending: true });

  if (error) throw error;
  return ((data as DbRental[]) ?? []).map(mapRentalFromDb);
};

export const fetchPublicPage = async (): Promise<PublicPageData> => {
  const [pageResult, imagesResult] = await Promise.all([
    supabase.from("public_page").select("*").single(),
    supabase.from("public_page_images").select("*").order("position", { ascending: true }).order("created_at", { ascending: true }),
  ]);

  if (pageResult.error) throw pageResult.error;
  if (imagesResult.error) throw imagesResult.error;

  const images = ((imagesResult.data as DbPublicPageImage[]) ?? []).map((img) => {
    const { data: urlData } = supabase.storage.from("public-page-images").getPublicUrl(img.storage_path);
    return mapPublicPageImageFromDb(img, urlData.publicUrl);
  });

  return {
    content: mapPublicPageFromDb(pageResult.data as DbPublicPage),
    images,
  };
};

export const fetchSuggestionMessages = async (): Promise<SuggestionMessage[]> => {
  const { data, error } = await supabase.from("feedback_messages").select("*").order("created_at", { ascending: true });

  if (error) throw error;
  return ((data as DbFeedbackMessage[]) ?? []).map(mapSuggestionMessageFromDb);
};

export const fetchSuggestionMessageCount = async (): Promise<number> => {
  const { count, error } = await supabase.from("feedback_messages").select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
};

export const fetchSuggestionVotes = async (): Promise<SuggestionVote[]> => {
  const { data, error } = await supabase.from("feedback_votes").select("*");

  if (error) throw error;
  return ((data as DbFeedbackVote[]) ?? []).map(mapSuggestionVoteFromDb);
};
