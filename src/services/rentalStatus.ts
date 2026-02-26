import type { RentalStatus } from "../types";

export const RENTAL_STATUS_LIST: RentalStatus[] = [
  "pending",
  "confirmed",
  "rejected",
  "completed",
];

type RentalStatusBadgeVariant = "warning" | "success" | "danger" | "default";

export const RENTAL_STATUS_LABEL_MAP: Record<RentalStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  rejected: "Refusé",
  completed: "Terminé",
};

export const RENTAL_STATUS_BADGE_VARIANT_MAP: Record<
  RentalStatus,
  RentalStatusBadgeVariant
> = {
  pending: "warning",
  confirmed: "success",
  rejected: "danger",
  completed: "default",
};

export const RENTAL_STATUS_TEXT_COLOR_MAP: Record<RentalStatus, string> = {
  pending: "text-amber-700",
  confirmed: "text-green-700",
  rejected: "text-red-700",
  completed: "text-gray-700",
};

export const RENTAL_STATUS_TEXT_COLOR_SUBTLE_MAP: Record<RentalStatus, string> =
  {
    pending: "text-amber-600",
    confirmed: "text-green-600",
    rejected: "text-red-600",
    completed: "text-gray-600",
  };

export const getRentalStatusLabel = (status: RentalStatus): string =>
  RENTAL_STATUS_LABEL_MAP[status];
