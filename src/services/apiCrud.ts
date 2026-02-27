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
  notifyDeletedRental,
} from "./rentalNotifications";

const isLocalEnv = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const explicitToggle = import.meta.env.VITE_DISABLE_PUSH_IN_DEV === "true";
  return (
    import.meta.env.DEV ||
    explicitToggle ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
};

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

  if (error) {
    const isConflict = error.code === "23505" || error.code === "409";
    const normalizedEmail = member.email?.trim().toLowerCase();

    if (isConflict && normalizedEmail) {
      const { data: existingMember, error: existingMemberError } =
        await supabase
          .from("members")
          .select("id")
          .ilike("email", normalizedEmail)
          .maybeSingle();

      if (existingMemberError) {
        throw existingMemberError;
      }

      if (existingMember?.id) {
        const { data: updatedData, error: updateError } = await supabase
          .from("members")
          .update(dbPayload)
          .eq("id", existingMember.id)
          .select()
          .single();

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
  if (!isLocalEnv()) void notifyNewRental(created);
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
      if (!isLocalEnv()) void notifyCompleted(updated);
    } else {
      if (!isLocalEnv()) void notifyStatusChange(updated, previousStatus);
    }
  }

  return updated;
};

export const deleteRental = async (id: string): Promise<void> => {
  const { data: existingData, error: fetchError } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase.from("rentals").delete().eq("id", id);

  if (error) throw error;

  const deletedRental = mapRentalFromDb(existingData as DbRental);
  if (!isLocalEnv()) void notifyDeletedRental(deletedRental);
};
