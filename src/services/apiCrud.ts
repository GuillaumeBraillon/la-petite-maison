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
} from "./apiMappers";
import type { DbMember, DbRental } from "./dbTypes";
import type { Member, Rental } from "../types";

// ------------------------------------------------------------
// Member CRUD
// ------------------------------------------------------------

export const createMember = async (
  member: Omit<Member, "id" | "createdAt" | "updatedAt">,
): Promise<Member> => {
  const dbPayload = mapMemberToDb(member);
  const { data, error } = await supabase
    .from("members")
    .insert(dbPayload)
    .select()
    .single();

  if (error) throw error;
  return mapMemberFromDb(data as DbMember);
};

export const updateMember = async (
  id: string,
  updates: Partial<Omit<Member, "id" | "createdAt" | "updatedAt">>,
): Promise<Member> => {
  const dbPayload = mapMemberToDb(updates);
  const { data, error } = await supabase
    .from("members")
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();

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

export const createRental = async (
  rental: Omit<Rental, "id" | "createdAt" | "updatedAt">,
): Promise<Rental> => {
  const dbPayload = mapRentalToDb(rental);
  const { data, error } = await supabase
    .from("rentals")
    .insert(dbPayload)
    .select()
    .single();

  if (error) throw error;
  return mapRentalFromDb(data as DbRental);
};

export const updateRental = async (
  id: string,
  updates: Partial<Omit<Rental, "id" | "createdAt" | "updatedAt">>,
): Promise<Rental> => {
  const dbPayload = mapRentalToDb(updates);
  const { data, error } = await supabase
    .from("rentals")
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapRentalFromDb(data as DbRental);
};

export const deleteRental = async (id: string): Promise<void> => {
  const { error } = await supabase.from("rentals").delete().eq("id", id);

  if (error) throw error;
};
