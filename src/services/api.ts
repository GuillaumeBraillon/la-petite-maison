// ============================================================
// api.ts — READ uniquement
// Toutes les conversions passent par apiMappers.ts
// ============================================================

import { supabase } from "./supabaseClient";
import { mapMemberFromDb, mapRentalFromDb } from "./apiMappers";
import type { DbMember, DbRental } from "./dbTypes";
import type { Member, Rental } from "../types";

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) throw error;
  return ((data as DbMember[]) ?? []).map(mapMemberFromDb);
};

export const fetchRentals = async (): Promise<Rental[]> => {
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) throw error;
  return ((data as DbRental[]) ?? []).map(mapRentalFromDb);
};
