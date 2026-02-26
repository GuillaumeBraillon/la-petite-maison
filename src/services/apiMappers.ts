// ============================================================
// apiMappers.ts — Conversions DB (snake_case) ↔ App (camelCase)
// C'est LE SEUL endroit autorisé pour ces conversions.
// ============================================================

import type {
  Member,
  Rental,
  MemberRole,
  RentalStatus,
  PushSubscriptionRecord,
  UserNotification,
} from "../types";
import type {
  DbMember,
  DbRental,
  DbPushSubscription,
  DbUserNotification,
} from "./dbTypes";

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
  email: db.email ?? undefined,
  avatarUrl: db.avatar_url ?? undefined,
  lastLogin: db.last_login ?? undefined,
  address: db.address ?? undefined,
  ownerId: db.owner_id ?? undefined,
  isEditor: db.is_editor ?? false,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const mapMemberToDb = (
  member: Partial<Omit<Member, "id" | "createdAt" | "updatedAt">>,
): Partial<Omit<DbMember, "id" | "created_at" | "updated_at">> => {
  const mapped: Partial<Omit<DbMember, "id" | "created_at" | "updated_at">> = {
    ...(member.isAllowed !== undefined && { is_allowed: member.isAllowed }),
    ...(member.label !== undefined && { label: member.label }),
    ...(member.firstName !== undefined && { first_name: member.firstName }),
    ...(member.lastName !== undefined && { last_name: member.lastName }),
    ...(member.role !== undefined && { role: member.role }),
    // 'email' in member distingue "champ absent d'un update partiel" (pas inclus)
    // de "champ undefined dans un create" → on envoie null pour insérer NULL en DB
    ...("email" in member && { email: member.email ?? null }),
    ...(member.avatarUrl !== undefined && {
      avatar_url: member.avatarUrl ?? null,
    }),
    ...(member.lastLogin !== undefined && {
      last_login: member.lastLogin ?? null,
    }),
    ...(member.address !== undefined && { address: member.address ?? null }),
    ...("ownerId" in member && { owner_id: member.ownerId ?? null }),
  };

  // isEditor n'existe que pour role = "owner"
  // Si le rôle est fourni et n'est pas "owner", forcer is_editor à false en DB
  if (member.role !== undefined && member.role !== "owner") {
    mapped.is_editor = false;
  } else if (member.isEditor !== undefined) {
    mapped.is_editor = member.isEditor;
  }

  return mapped;
};

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
  electricityCost: db.electricity_cost ?? undefined,
  totalPrice: db.total_price ?? undefined,
  actualStartDate: db.actual_start_date ?? undefined,
  actualEndDate: db.actual_end_date ?? undefined,
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
  ...("electricityCost" in rental && {
    electricity_cost: rental.electricityCost ?? null,
  }),
  ...("totalPrice" in rental && {
    total_price: rental.totalPrice ?? null,
  }),
  ...("actualStartDate" in rental && {
    actual_start_date: rental.actualStartDate ?? null,
  }),
  ...("actualEndDate" in rental && {
    actual_end_date: rental.actualEndDate ?? null,
  }),
});

// ------------------------------------------------------------
// Push subscription mappers
// ------------------------------------------------------------

export const mapPushSubscriptionFromDb = (
  db: DbPushSubscription,
): PushSubscriptionRecord => ({
  id: db.id,
  userId: db.user_id,
  endpoint: db.endpoint,
  p256dh: db.p256dh,
  auth: db.auth,
  createdAt: db.created_at,
});

export const mapUserNotificationFromDb = (
  db: DbUserNotification,
): UserNotification => ({
  id: db.id,
  userId: db.user_id,
  type: db.type as UserNotification["type"],
  title: db.title,
  body: db.body,
  url: db.url ?? undefined,
  isRead: db.is_read,
  createdAt: db.created_at,
});
