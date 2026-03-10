// ============================================================
// rentalUtils.ts — Utilitaires purs pour locations/notifications
// ============================================================

/**
 * Formate une date ISO en chaîne lisible FR (JJ/MM/AAAA).
 * Retourne "date inconnue" si la valeur est absente ou invalide.
 *
 * @param iso - Date ISO ou undefined
 * @returns Chaîne formatée (ex. "31/12/2024") ou "date inconnue"
 */
export const formatDate = (iso: string | undefined): string => {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

/**
 * Retourne le bon libellé selon le nombre (singulier / pluriel).
 *
 * @param count - Nombre à tester
 * @param singular - Forme singulière
 * @param plural - Forme plurielle
 * @returns `singular` si count <= 1, sinon `plural`
 */
export const pluralize = (count: number, singular: string, plural: string): string => (count <= 1 ? singular : plural);

/**
 * Formate un nombre en chaîne euro simple (ex: 12 → "12 €").
 *
 * @param value - Valeur numérique en euros
 * @returns Chaîne formatée en euros
 */
export const formatEuro = (value: number): string => `${value} €`;

/**
 * Formate un montant journalier en euros avec deux décimales (ex: 1.5 → "1.50 €/j").
 *
 * @param value - Montant numérique
 * @returns Chaîne formatée avec "/j"
 */
export const formatEuroPerDay = (value: number): string => `${value.toFixed(2)} €/j`;

/**
 * Calcule le nombre de jours entre deux dates ISO.
 * Arrondit au jour le plus proche et garantit au moins 1 jour.
 *
 * @param startIso - Date de début en ISO
 * @param endIso - Date de fin en ISO
 * @returns Nombre de jours (>= 1)
 */
export const getDurationDays = (startIso: string, endIso: string): number => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const dayInMs = 1000 * 60 * 60 * 24;
  const diffInDays = (end - start) / dayInMs;
  return Math.max(1, Math.round(diffInDays));
};

/**
 * Normalise un email : trim + lowercase. Retourne `null` si vide.
 *
 * @param email - Email brut ou null/undefined
 * @returns Email normalisé ou null
 */
export const normalizeEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};
