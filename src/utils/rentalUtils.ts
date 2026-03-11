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

/**
 * Formate une date ISO en format court pour affichage (ex: "31 déc. 2024").
 * Le mois est abrégé (ex: "déc." au lieu de "12").
 *
 * @param iso - Date ISO
 * @returns Chaîne formatée (ex. "31 déc. 2024")
 */
export const formatDateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Formate une date ISO en format long pour affichage détaillé (ex: "mercredi 31 décembre 2024, 14:30").
 *
 * @param iso - Date ISO
 * @returns Chaîne formatée avec jour de semaine, mois entier et heure
 */
export const formatDateLong = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Formate une date ISO pour affichage label (jour entier, mois entier, année sans heure).
 * Capitalise la première lettre (ex: "Mercredi 31 décembre 2024").
 *
 * @param iso - Date ISO
 * @returns Chaîne formatée et capitalisée
 */
export const formatDateLabelLong = (iso: string): string => {
  try {
    const date = new Date(iso);
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return "";
  }
};

/**
 * Convertit une date ISO en format datetime-local (pour input HTML).
 * Ex: "2024-12-31T14:30:00Z" -> "2024-12-31T14:30"
 *
 * @param iso - Date ISO
 * @returns Chaîne formatée pour datetime-local
 */
export const toDatetimeLocal = (iso: string): string => {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Calcule le dimanche midi suivant (ou ce dimanche midi si actuellement samedi 12h+).
 * Utilisé par le formulaire de location pour les dates par défaut.
 *
 * @param fromDate - Date de référence
 * @returns Date du dimanche midi
 */
export const nextSunday = (fromDate: Date): Date => {
  const d = new Date(fromDate);
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(12, 0, 0, 0);
  return d;
};

/**
 * Calcule le prix automatique d'une location.
 * Prix = nombre de nuits × nombre de personnes × prix unitaire (5€/nuit/personne).
 *
 * @param startIso - Date de début en ISO
 * @param endIso - Date de fin en ISO
 * @param guestCount - Nombre de personnes
 * @returns Prix calculé en euros
 */
export const getAutoRentalPrice = (startIso: string, endIso: string, guestCount: number): number => {
  const nights = getDurationDays(startIso, endIso);
  const PRICE_PER_NIGHT_PER_PERSON = 5; // € par nuit et par personne
  return nights * guestCount * PRICE_PER_NIGHT_PER_PERSON;
};

/**
 * Récupère les dates effectives d'une location (réelles ou prévues selon le statut).
 * Si statut = "completed", utilise les dates réelles, sinon les dates prévues.
 *
 * @param values - Objet partiel de location
 * @returns Objet avec start et end dates (string | undefined)
 */
export const getEffectiveRentalDates = (
  values?: Partial<{
    status: string;
    startDate?: string;
    endDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
  }>
): { start: string | undefined; end: string | undefined } => {
  const v = values ?? {};
  if (v.status === "completed") {
    return {
      start: v.actualStartDate ?? v.startDate,
      end: v.actualEndDate ?? v.endDate,
    };
  }
  return {
    start: v.startDate,
    end: v.endDate,
  };
};

/**
 * Calcule le nombre de jours pour une location (utilise les dates réelles si présentes).
 * Prend le maximum de 0 (pas de durée négative).
 *
 * @param rental - Objet location
 * @returns Nombre de jours (>= 0)
 */
export const getDaysForRental = (rental: { actualStartDate?: string; actualEndDate?: string; startDate: string; endDate: string }): number => {
  const start = rental.actualStartDate ?? rental.startDate;
  const end = rental.actualEndDate ?? rental.endDate;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, diff);
};
