// ============================================================
// api.ts — READ uniquement
// Toutes les conversions passent par apiMappers.ts
// ============================================================

import { supabase } from "./supabaseClient";
import { mapMemberFromDb, mapRentalFromDb, mapPublicPageFromDb, mapPublicPageImageFromDb } from "./apiMappers";
import type { DbMember, DbRental, DbPublicPage, DbPublicPageImage } from "./dbTypes";
import type { Member, Rental, PublicPageData } from "../types";

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase.from("members").select("*").order("last_name", { ascending: true });

  if (error) throw error;
  return ((data as DbMember[]) ?? []).map(mapMemberFromDb);
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
