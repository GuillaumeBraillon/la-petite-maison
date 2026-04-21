/**
 * emailNotifications.ts — Orchestrateur des emails transactionnels métier
 *
 * Fonctions publiques (fire-and-forget, miroir de rentalNotifications.ts) :
 * - `notifyEmailNewRental(rental)` : notifie les acteurs d'une nouvelle demande
 * - `notifyEmailStatusChange(rental, previousStatus?)` : changement de statut
 * - `notifyEmailCompleted(rental)` : récapitulatif de clôture
 * - `notifyEmailDeletedRental(rental)` : suppression d'une location
 *
 * Les destinataires sont filtrés côté Edge Function selon `email_notifications_enabled`.
 */

import { invokeEmailSend } from "./emailService";
import { getNotificationAudiences, getRentalActors } from "./rentalActorsService";
import { completedTemplate, deletedRentalTemplate, newRentalTemplate, statusChangeTemplate, welcomeTemplate } from "./emailTemplates";
import type { EmailTemplate } from "./emailTemplates";
import { getObserverRecipients } from "../utils/notificationUtils";
import { formatDate, formatEuro, getDurationDays, pluralize } from "../utils/rentalUtils";
import { logger } from "./logger";
import type { Rental, RentalStatus } from "../types";

// ------------------------------------------------------------
// Helper interne
// ------------------------------------------------------------

const sendEmail = (emails: string[], template: EmailTemplate): void => {
  if (emails.length === 0) return;
  invokeEmailSend({ memberEmails: emails, ...template });
};

const getGuestLabel = (count: number): string => `${count} ${pluralize(count, "personne", "personnes")}`;

// ------------------------------------------------------------
// Déclencheur 1 — Nouvelle demande de location
// ------------------------------------------------------------

export const notifyEmailNewRental = async (rental: Rental): Promise<void> => {
  try {
    const { ownerName, subMemberName, ownerEmail, subMemberEmail } = await getRentalActors(rental);
    const { ownerEmails, validatorEmails } = await getNotificationAudiences();
    const startDate = formatDate(rental.startDate);
    const endDate = formatDate(rental.endDate);
    const guests = rental.guestCount;

    const personalRecipients = new Set([ownerEmail, subMemberEmail].filter((e): e is string => e !== null));
    const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
      ownerEmails,
      validatorEmails,
      excludedEmails: personalRecipients,
    });

    // Validateurs
    sendEmail(validatorRecipients, newRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "validator" }));

    // Propriétaires observateurs
    sendEmail(ownerObserverRecipients, newRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "observer" }));

    // Propriétaire principal (message personnalisé)
    if (ownerEmail) {
      sendEmail([ownerEmail], newRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "owner" }));
    }

    // Membre demandeur (message personnalisé)
    if (subMemberEmail && subMemberEmail !== ownerEmail) {
      sendEmail([subMemberEmail], newRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "sub_member" }));
    }
  } catch (err: unknown) {
    logger.error("[emailNotifications] notifyEmailNewRental:", err);
  }
};

// ------------------------------------------------------------
// Déclencheur 2 — Changement de statut
// ------------------------------------------------------------

export const notifyEmailStatusChange = async (rental: Rental, previousStatus?: RentalStatus): Promise<void> => {
  if (previousStatus !== undefined && rental.status === previousStatus) return;
  if (rental.status === "completed") return; // géré par notifyEmailCompleted

  const status = rental.status;
  if (status !== "confirmed" && status !== "rejected" && status !== "pending") return;

  try {
    const { ownerName, subMemberName, ownerEmail, subMemberEmail } = await getRentalActors(rental);
    const { ownerEmails, validatorEmails } = await getNotificationAudiences();
    const startDate = formatDate(rental.startDate);
    const endDate = formatDate(rental.endDate);
    const guests = rental.guestCount;

    const sentEmails = new Set<string>();

    if (ownerEmail) {
      sendEmail([ownerEmail], statusChangeTemplate({ ownerName, subMemberName, startDate, endDate, guests, status, recipientRole: "owner" }));
      sentEmails.add(ownerEmail);
    }

    if (subMemberEmail && !sentEmails.has(subMemberEmail)) {
      sendEmail([subMemberEmail], statusChangeTemplate({ ownerName, subMemberName, startDate, endDate, guests, status, recipientRole: "sub_member" }));
      sentEmails.add(subMemberEmail);
    }

    // Broadcast uniquement pour confirmed/rejected
    if (status === "confirmed" || status === "rejected") {
      const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
        ownerEmails,
        validatorEmails,
        excludedEmails: sentEmails,
      });

      sendEmail(ownerObserverRecipients, statusChangeTemplate({ ownerName, subMemberName, startDate, endDate, guests, status, recipientRole: "observer" }));
      sendEmail(validatorRecipients, statusChangeTemplate({ ownerName, subMemberName, startDate, endDate, guests, status, recipientRole: "validator" }));
    }
  } catch (err: unknown) {
    logger.error("[emailNotifications] notifyEmailStatusChange:", err);
  }
};

// ------------------------------------------------------------
// Déclencheur 3 — Clôture de location
// ------------------------------------------------------------

export const notifyEmailCompleted = async (rental: Rental): Promise<void> => {
  try {
    const { ownerName, subMemberName, ownerEmail, subMemberEmail } = await getRentalActors(rental);
    const { ownerEmails, validatorEmails } = await getNotificationAudiences();
    const startDate = formatDate(rental.startDate);
    const endDate = formatDate(rental.endDate);
    const actualStartDate = rental.actualStartDate ? formatDate(rental.actualStartDate) : undefined;
    const actualEndDate = rental.actualEndDate ? formatDate(rental.actualEndDate) : undefined;
    const guests = rental.guestCount;
    const effectiveStart = rental.actualStartDate ?? rental.startDate;
    const effectiveEnd = rental.actualEndDate ?? rental.endDate;
    const durationDays = getDurationDays(effectiveStart, effectiveEnd);
    const total = formatEuro(rental.totalPrice ?? rental.price);
    const electricityCost = rental.electricityCost != null ? formatEuro(rental.electricityCost) : undefined;

    const sentEmails = new Set<string>();

    if (ownerEmail) {
      sendEmail(
        [ownerEmail],
        completedTemplate({
          ownerName,
          subMemberName,
          startDate,
          endDate,
          actualStartDate,
          actualEndDate,
          guests,
          durationDays,
          total,
          electricityCost,
          recipientRole: "owner",
        })
      );
      sentEmails.add(ownerEmail);
    }

    if (subMemberEmail && subMemberEmail !== ownerEmail) {
      sendEmail(
        [subMemberEmail],
        completedTemplate({
          ownerName,
          subMemberName,
          startDate,
          endDate,
          actualStartDate,
          actualEndDate,
          guests,
          durationDays,
          total,
          electricityCost,
          recipientRole: "sub_member",
        })
      );
      sentEmails.add(subMemberEmail);
    }

    const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
      ownerEmails,
      validatorEmails,
      excludedEmails: sentEmails,
    });

    const observerParams = {
      ownerName,
      subMemberName,
      startDate,
      endDate,
      actualStartDate,
      actualEndDate,
      guests,
      durationDays,
      total,
      electricityCost,
    };

    sendEmail(ownerObserverRecipients, completedTemplate({ ...observerParams, recipientRole: "observer" }));
    sendEmail(validatorRecipients, completedTemplate({ ...observerParams, recipientRole: "validator" }));
  } catch (err: unknown) {
    logger.error("[emailNotifications] notifyEmailCompleted:", err);
  }
};

// ------------------------------------------------------------
// Déclencheur 4 — Suppression de location
// ------------------------------------------------------------

export const notifyEmailDeletedRental = async (rental: Rental): Promise<void> => {
  try {
    const { ownerName, subMemberName, ownerEmail, subMemberEmail } = await getRentalActors(rental);
    const { ownerEmails, validatorEmails } = await getNotificationAudiences();
    const startDate = formatDate(rental.startDate);
    const endDate = formatDate(rental.endDate);
    const guests = rental.guestCount;

    const sentEmails = new Set<string>();

    if (ownerEmail) {
      sendEmail([ownerEmail], deletedRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "owner" }));
      sentEmails.add(ownerEmail);
    }

    if (subMemberEmail && subMemberEmail !== ownerEmail) {
      sendEmail([subMemberEmail], deletedRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "sub_member" }));
      sentEmails.add(subMemberEmail);
    }

    const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
      ownerEmails,
      validatorEmails,
      excludedEmails: sentEmails,
    });

    sendEmail(ownerObserverRecipients, deletedRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "observer" }));
    sendEmail(validatorRecipients, deletedRentalTemplate({ ownerName, subMemberName, startDate, endDate, guests, recipientRole: "validator" }));
  } catch (err: unknown) {
    logger.error("[emailNotifications] notifyEmailDeletedRental:", err);
  }
};

// ------------------------------------------------------------
// Déclencheur 5 — Accès membre autorisé (bienvenue)
// ------------------------------------------------------------

/**
 * Envoie un email de bienvenue à un membre dont l'accès vient d'être autorisé.
 * Bypass le filtre `email_notifications_enabled` via `directEmails` (le membre
 * n'a pas encore pu activer les notifs puisqu'il ne s'est pas encore connecté).
 */
export const notifyEmailMemberAuthorized = (member: { email?: string | null; firstName: string; lastName: string; ownerName?: string }): void => {
  if (!member.email) return;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (import.meta.env.DEV || host === "localhost" || host === "127.0.0.1") return;
  }
  try {
    const template = welcomeTemplate({ firstName: member.firstName, lastName: member.lastName, ownerName: member.ownerName, email: member.email ?? undefined });
    invokeEmailSend({ memberEmails: [], directEmails: [member.email], ...template });
  } catch (err: unknown) {
    logger.error("[emailNotifications] notifyEmailMemberAuthorized:", err);
  }
};

// Ré-export pour cohérence de nommage
export { getGuestLabel };
