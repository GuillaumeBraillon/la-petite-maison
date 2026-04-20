import type { RentalStatus } from "../types";

export const RENTAL_STATUS_LIST: RentalStatus[] = ["pending", "confirmed", "completed", "rejected"];

export const ACTIVE_STATUSES: RentalStatus[] = ["confirmed", "completed"];

type RentalStatusBadgeVariant = "warning" | "success" | "danger" | "default";

export const RENTAL_STATUS_LABEL_MAP: Record<RentalStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  rejected: "Rejeté",
};

export const RENTAL_STATUS_BADGE_VARIANT_MAP: Record<RentalStatus, RentalStatusBadgeVariant> = {
  pending: "warning",
  confirmed: "success",
  completed: "default",
  rejected: "danger",
};

export const RENTAL_STATUS_TEXT_COLOR_MAP: Record<RentalStatus, string> = {
  pending: "text-gray-700",
  confirmed: "text-blue-700",
  completed: "text-green-800",
  rejected: "text-red-800",
};

export const RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP: Record<RentalStatus, string> = {
  pending: "text-gray-600",
  confirmed: "text-blue-600",
  completed: "text-green-700",
  rejected: "text-red-700",
};

export const RENTAL_STATUS_BG_COLOR_MAP: Record<RentalStatus, string> = {
  pending: "bg-gray-200",
  confirmed: "bg-blue-100",
  completed: "bg-green-200",
  rejected: "bg-red-200",
};

export const getRentalStatusLabel = (status: RentalStatus): string => RENTAL_STATUS_LABEL_MAP[status];

export const RENTAL_STATUS_BADGE_COLOR_MAP: Record<RentalStatus, string> = {
  pending: "bg-gray-200 text-gray-700 border-gray-400",
  confirmed: "bg-blue-100 text-blue-900 border-blue-300",
  rejected: "bg-red-200 text-red-900 border-red-400",
  completed: "bg-green-200 text-green-900 border-green-400",
};
