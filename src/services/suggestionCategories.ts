import type { SuggestionCategory } from "../types";

export const SUGGESTION_CATEGORY_LIST: SuggestionCategory[] = ["equipment", "rentals", "local", "rules", "other"];

export const SUGGESTION_CATEGORY_LABEL_MAP: Record<SuggestionCategory, string> = {
  equipment: "Équipement de la maison",
  rentals: "Gestion des locations",
  local: "Sorties, restos & activités",
  rules: "Vie de la maison & règles",
  other: "Autre",
};

export const SUGGESTION_CATEGORY_DESCRIPTION_MAP: Record<SuggestionCategory, string> = {
  equipment: "Mobilier, électroménager, réparations et projets de rénovation.",
  rentals: "Calendrier, disponibilités et remise des clés.",
  local: "Restaurants, balades et activités à l'extérieur de la maison.",
  rules: "Fonctionnement, consignes et ménage.",
  other: "Les idées qui ne rentrent dans aucune autre catégorie.",
};

type SuggestionCategoryBadgeVariant = "default" | "primary" | "success" | "warning";

export const SUGGESTION_CATEGORY_BADGE_VARIANT_MAP: Record<SuggestionCategory, SuggestionCategoryBadgeVariant> = {
  equipment: "warning",
  rentals: "primary",
  local: "success",
  rules: "primary",
  other: "default",
};
