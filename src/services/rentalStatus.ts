import type { RentalStatus } from "../types";

export const RENTAL_STATUS_LIST: RentalStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "rejected",
];

type RentalStatusBadgeVariant = "warning" | "success" | "danger" | "default";

export const RENTAL_STATUS_LABEL_MAP: Record<RentalStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  rejected: "Refusé",
};

export const RENTAL_STATUS_BADGE_VARIANT_MAP: Record<
  RentalStatus,
  RentalStatusBadgeVariant
> = {
  pending: "warning",
  confirmed: "success",
  completed: "default",
  rejected: "danger",
};

export const RENTAL_STATUS_TEXT_COLOR_MAP: Record<RentalStatus, string> = {
  pending: "text-amber-700",
  confirmed: "text-green-700",
  completed: "text-gray-700",
  rejected: "text-red-700",
};

export const RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP: Record<RentalStatus, string> =
  {
    pending: "text-amber-600",
    confirmed: "text-green-600",
    completed: "text-gray-600",
    rejected: "text-red-600",
  };

export const RENTAL_STATUS_BG_COLOR_MAP: Record<RentalStatus, string> = {
  pending: "bg-amber-100",
  confirmed: "bg-green-100",
  completed: "bg-gray-100",
  rejected: "bg-red-100",
};

export const getRentalStatusLabel = (status: RentalStatus): string =>
  RENTAL_STATUS_LABEL_MAP[status];
