// ============================================================
// apiMappers.ts — Conversions DB (snake_case) ↔ App (camelCase)
// C'est LE SEUL endroit autorisé pour ces conversions.
// ============================================================

import type {
  Member,
  Rental,
  MemberRole,
  MemberStatus,
  RentalStatus,
} from "../types";
import type { DbMember, DbRental } from "./dbTypes";

// ------------------------------------------------------------
// Member mappers
// ------------------------------------------------------------

export const mapMemberFromDb = (db: DbMember): Member => ({
  id: db.id,
  isAllowed: db.is_allowed,
  label: db.label,
  firstName: db.first_name,
  lastName: db.last_name,
  role: db.role as MemberRole,
  status: db.status as MemberStatus,
  email: db.email,
  avatarUrl: db.avatar_url ?? undefined,
  address: db.address ?? undefined,
  ownerId: db.owner_id ?? undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const mapMemberToDb = (
  member: Partial<Omit<Member, "id" | "createdAt" | "updatedAt">>,
): Partial<Omit<DbMember, "id" | "created_at" | "updated_at">> => ({
  ...(member.isAllowed !== undefined && { is_allowed: member.isAllowed }),
  ...(member.label !== undefined && { label: member.label }),
  ...(member.firstName !== undefined && { first_name: member.firstName }),
  ...(member.lastName !== undefined && { last_name: member.lastName }),
  ...(member.role !== undefined && { role: member.role }),
  ...(member.status !== undefined && { status: member.status }),
  ...(member.email !== undefined && { email: member.email }),
  ...(member.avatarUrl !== undefined && {
    avatar_url: member.avatarUrl ?? null,
  }),
  ...(member.address !== undefined && { address: member.address ?? null }),
  ...(member.ownerId !== undefined && { owner_id: member.ownerId ?? null }),
});

// ------------------------------------------------------------
// Rental mappers
// ------------------------------------------------------------

export const mapRentalFromDb = (db: DbRental): Rental => ({
  id: db.id,
  startDate: db.start_date,
  endDate: db.end_date,
  ownerId: db.owner_id,
  subMemberId: db.sub_member_id ?? undefined,
  guestCount: db.guest_count,
  price: db.price,
  status: db.status as RentalStatus,
  notes: db.notes ?? undefined,
  electricityStart: db.electricity_start ?? undefined,
  electricityEnd: db.electricity_end ?? undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const mapRentalToDb = (
  rental: Partial<Omit<Rental, "id" | "createdAt" | "updatedAt">>,
): Partial<Omit<DbRental, "id" | "created_at" | "updated_at">> => ({
  ...(rental.startDate !== undefined && { start_date: rental.startDate }),
  ...(rental.endDate !== undefined && { end_date: rental.endDate }),
  ...(rental.ownerId !== undefined && { owner_id: rental.ownerId }),
  ...(rental.subMemberId !== undefined && {
    sub_member_id: rental.subMemberId ?? null,
  }),
  ...(rental.guestCount !== undefined && { guest_count: rental.guestCount }),
  ...(rental.price !== undefined && { price: rental.price }),
  ...(rental.status !== undefined && { status: rental.status }),
  ...(rental.notes !== undefined && { notes: rental.notes ?? null }),
  ...(rental.electricityStart !== undefined && {
    electricity_start: rental.electricityStart ?? null,
  }),
  ...(rental.electricityEnd !== undefined && {
    electricity_end: rental.electricityEnd ?? null,
  }),
});
