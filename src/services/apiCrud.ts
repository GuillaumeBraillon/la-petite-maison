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
import type { Member, Rental, RentalStatus } from "../types";
import {
  notifyNewRental,
  notifyStatusChange,
  notifyCompleted,
} from "./rentalNotifications";

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

  const created = mapRentalFromDb(data as DbRental);
  void notifyNewRental(created);
  return created;
};

export const updateRental = async (
  id: string,
  updates: Partial<Omit<Rental, "id" | "createdAt" | "updatedAt">>,
  previousStatus?: RentalStatus,
): Promise<Rental> => {
  const dbPayload = mapRentalToDb(updates);
  const { data, error } = await supabase
    .from("rentals")
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const updated = mapRentalFromDb(data as DbRental);

  if (updates.status !== undefined) {
    if (updates.status === "completed") {
      void notifyCompleted(updated);
    } else {
      void notifyStatusChange(updated, previousStatus);
    }
  }

  return updated;
};

export const deleteRental = async (id: string): Promise<void> => {
  const { error } = await supabase.from("rentals").delete().eq("id", id);

  if (error) throw error;
};
