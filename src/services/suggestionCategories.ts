import type { SuggestionCategory } from "../types";

export const SUGGESTION_CATEGORY_LIST: SuggestionCategory[] = ["equipment", "rentals", "deals", "other"];

export const SUGGESTION_CATEGORY_LABEL_MAP: Record<SuggestionCategory, string> = {
  equipment: "Équipement de la maison",
  rentals: "Gestion des locations",
  deals: "Bons plans autour de la petite maison",
  other: "Autre",
};

type SuggestionCategoryBadgeVariant = "default" | "primary" | "success" | "warning";

export const SUGGESTION_CATEGORY_BADGE_VARIANT_MAP: Record<SuggestionCategory, SuggestionCategoryBadgeVariant> = {
  equipment: "warning",
  rentals: "primary",
  deals: "success",
  other: "default",
};
