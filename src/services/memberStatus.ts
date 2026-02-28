import type { MemberRole } from "../types";

export const MEMBER_ROLE_LIST: MemberRole[] = ["admin", "owner", "sub_member"];

type MemberRoleBadgeVariant = "warning" | "success" | "danger" | "default";

export const MEMBER_ROLE_LABEL_MAP: Record<MemberRole, string> = {
  admin: "Administrateur",
  owner: "Propriétaire",
  sub_member: "Famille & Amis",
};

export const MEMBER_ROLE_BADGE_VARIANT_MAP: Record<MemberRole, MemberRoleBadgeVariant> = {
  admin: "warning",
  owner: "success",
  sub_member: "default",
};

export const MEMBER_ROLE_TEXT_COLOR_MAP: Record<MemberRole, string> = {
  admin: "text-yellow-700",
  owner: "text-green-700",
  sub_member: "text-gray-700",
};

export const MEMBER_ROLE_TEXT_COLOR_SUBTLE_MAP: Record<MemberRole, string> = {
  admin: "text-yellow-600",
  owner: "text-green-600",
  sub_member: "text-gray-600",
};

export const MEMBER_ROLE_BG_COLOR_MAP: Record<MemberRole, string> = {
  admin: "bg-yellow-100",
  owner: "bg-green-100",
  sub_member: "bg-gray-100",
};

export const getMemberRoleLabel = (role: MemberRole): string => MEMBER_ROLE_LABEL_MAP[role];
