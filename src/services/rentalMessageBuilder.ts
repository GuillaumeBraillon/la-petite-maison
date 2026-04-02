import { PUSH_MESSAGES } from "./messageCatalog";
import { formatDate, formatEuro, formatEuroPerDay, getDurationDays, pluralize } from "../utils/rentalUtils";
import type { Rental, RentalStatus } from "../types";

/**
 * Type interne décrivant le payload simplifié d'une notification de statut.
 */
export type StatusMessage = {
  title: string;
  body: string;
  type: "rental_confirmed" | "rental_rejected" | "request_pending" | "rental_completed";
};

/**
 * Convertit un `RentalStatus` en type de notification push.
 * @param status - Statut de la location.
 * @returns Le type de notification push correspondant, ou `null` si non applicable.
 */
export const getStatusNotificationType = (status: RentalStatus): StatusMessage["type"] | null => {
  switch (status) {
    case "confirmed":
      return "rental_confirmed";
    case "rejected":
      return "rental_rejected";
    case "pending":
      return "request_pending";
    default:
      return null;
  }
};

/**
 * Retourne le titre localisé associé à un statut de location.
 * @param status - Statut de la location.
 * @returns Le titre de notification ou `null` si non applicable.
 */
export const getStatusNotificationTitle = (status: RentalStatus): string | null => {
  switch (status) {
    case "confirmed":
      return PUSH_MESSAGES.rental.statusConfirmedTitle;
    case "rejected":
      return PUSH_MESSAGES.rental.statusRejectedTitle;
    case "pending":
      return PUSH_MESSAGES.rental.statusPendingTitle;
    default:
      return null;
  }
};

/**
 * Indique si un statut doit déclencher une diffusion aux observers/validateurs.
 * @param status - Statut de la location.
 * @returns `true` si le statut est diffuse (pending/confirmed/rejected).
 */
export const isBroadcastStatus = (status: RentalStatus): status is "pending" | "confirmed" | "rejected" => {
  return status === "pending" || status === "confirmed" || status === "rejected";
};

/**
 * Construit le message (titre + corps + type) à envoyer à un destinataire
 * personnel (propriétaire ou membre) en fonction du statut.
 *
 * @param rental - Objet `Rental` concerné.
 * @param recipient - Type de destinataire : `owner` ou `sub_member`.
 * @param subMemberName - Nom du membre si présent.
 * @returns Un objet `StatusMessage` ou `null` si aucun message applicable.
 */
export const buildStatusMessage = (rental: Rental, recipient: "owner" | "sub_member", subMemberName: string | null): StatusMessage | null => {
  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const guests = `${rental.guestCount} ${pluralize(rental.guestCount, "personne", "personnes")}`;

  const { demand, stay } = PUSH_MESSAGES.rental.statusBodyPrefix({
    recipient,
    subMemberName,
    startDate: sd,
    endDate: ed,
    guests,
  });

  switch (rental.status) {
    case "confirmed":
      return {
        type: "rental_confirmed",
        title: PUSH_MESSAGES.rental.statusConfirmedTitle,
        body: `${stay} est confirmé.`,
      };
    case "rejected":
      return {
        type: "rental_rejected",
        title: PUSH_MESSAGES.rental.statusRejectedTitle,
        body: `${demand} a été refusée.`,
      };
    case "pending":
      return {
        type: "request_pending",
        title: PUSH_MESSAGES.rental.statusPendingTitle,
        body: `${demand} est en attente de validation.`,
      };
    default:
      return null;
  }
};

/**
 * Construit le corps textuel détaillé envoyé lors de la clôture d'une
 * location (`completed`). Inclut dates, durée, prix et consommation.
 *
 * @param rental - Objet `Rental` avec les champs financiers et dates.
 * @param recipient - `owner` ou `sub_member` pour adapter l'en-tête.
 * @param subMemberName - Nom du membre si applicable.
 * @returns Le texte complet du message (multi-lignes).
 */
export const buildCompletedBody = (rental: Rental, recipient: "owner" | "sub_member", subMemberName: string | null): string => {
  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const asd = rental.actualStartDate ? formatDate(rental.actualStartDate) : null;
  const aed = rental.actualEndDate ? formatDate(rental.actualEndDate) : null;

  const datesChanged = Boolean(asd && aed && (asd !== sd || aed !== ed));
  const effectiveStartDate = rental.actualStartDate ?? rental.startDate;
  const effectiveEndDate = rental.actualEndDate ?? rental.endDate;
  const durationDays = getDurationDays(effectiveStartDate, effectiveEndDate);
  const electricityPerDay = rental.electricityCost !== undefined && rental.electricityCost !== null ? rental.electricityCost / durationDays : null;

  const lines: string[] = [];
  lines.push(PUSH_MESSAGES.rental.completedHeader({ recipient, subMemberName }));
  lines.push("");
  lines.push(`Dates prévues : ${sd} → ${ed}`);
  if (datesChanged) {
    lines.push(`Dates réelles : ${asd} → ${aed}`);
  }
  lines.push("");
  lines.push(`Durée : ${durationDays} ${pluralize(durationDays, "nuit", "nuits")}`);
  lines.push(`Nombre de personnes : ${rental.guestCount}`);
  lines.push(`Location : ${formatEuro(rental.price)}`);
  if (rental.electricityCost !== undefined && rental.electricityCost !== null) {
    lines.push(`Consommation électrique : ${formatEuro(rental.electricityCost)} (${formatEuroPerDay(electricityPerDay ?? 0)})`);
  }
  const total = rental.totalPrice ?? rental.price;
  lines.push(`Total : ${formatEuro(total)}`);

  return lines.join("\n");
};
