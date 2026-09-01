import type { SuggestionCategory } from "../types";

export const SUGGESTION_CATEGORY_LIST: SuggestionCategory[] = ["equipment", "rentals", "deals", "other"];

export const SUGGESTION_CATEGORY_LABEL_MAP: Record<SuggestionCategory, string> = {
  equipment: "Équipement de la maison",
  rentals: "Gestion des locations",
  deals: "Bons plans autour de la maison",
  other: "Autre",
};
