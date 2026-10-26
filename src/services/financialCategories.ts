import type { FinancialCategory } from "../types";

const PROTECTED_INCOME_CATEGORY_NAMES = new Set(["locations", "versements des propriétaires"]);

export const isProtectedFinancialCategory = (category: Pick<FinancialCategory, "type" | "name">): boolean =>
  category.type === "income" && PROTECTED_INCOME_CATEGORY_NAMES.has(category.name.trim().toLocaleLowerCase("fr-FR"));
