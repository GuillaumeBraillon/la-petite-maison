/**
 * rentalNotifications.ts — Orchestrateur des notifications push métier
 *
 * Fonctions publiques :
 * - `notifyNewRental(rental)` : notifie le propriétaire, le(s) membre(s),
 *   les propriétaires observateurs et les validateurs d'une nouvelle demande.
 * - `notifyStatusChange(rental, previousStatus?)` : notifie les acteurs lors
 *   d'un changement de statut (pending/confirmed/rejected).
 * - `notifyCompleted(rental)` : envoie un récapitulatif à la clôture.
 * - `notifyDeletedRental(rental)` : notifie la suppression d'une location.
 *
 * Tous les appels sont "fire-and-forget" : les erreurs sont gérées/loggées
 * côté `pushService` et `rentalActorsService` sans remonter d'exception.
 */

import { PUSH_MESSAGES } from "./messageCatalog";
import { invokeSendPush } from "./pushService";
import { getNotificationAudiences, getRentalActors } from "./rentalActorsService";
import { buildCompletedBody, buildStatusMessage, getStatusNotificationTitle, getStatusNotificationType, isBroadcastStatus } from "./rentalMessageBuilder";
import { getObserverRecipients } from "../utils/notificationUtils";
import { formatDate, formatEuro, getDurationDays, pluralize } from "../utils/rentalUtils";
import type { Rental, RentalStatus } from "../types";

type PushType = "rental_created" | "rental_confirmed" | "rental_rejected" | "request_pending" | "rental_completed" | "rental_deleted";

const sendPush = (emails: string[], type: PushType, title: string, body: string): void => {
  if (emails.length === 0) return;
  invokeSendPush({
    memberEmails: emails,
    payload: { type, title, body },
  });
};

const getRentalDisplayInfo = (rental: Rental): { startDate: string; endDate: string; guests: string } => {
  const startDate = formatDate(rental.startDate);
  const endDate = formatDate(rental.endDate);
  const guests = `${rental.guestCount} ${pluralize(rental.guestCount, "personne", "personnes")}`;
  return { startDate, endDate, guests };
};

// ------------------------------------------------------------
// Déclencheur 1 — Nouvelle demande de location (createRental)
// ------------------------------------------------------------

/**
 * Notifie la création d'une nouvelle demande de location.
 *
 * Notifications envoyées (séparées pour éviter les doublons) :
 * - validateurs (admins + owners éditeurs)
 * - propriétaires observateurs (tous owners)
 * - propriétaire principal
 * - membre demandeur
 *
 * Le contenu des messages est construit via `PUSH_MESSAGES`.
 */
export const notifyNewRental = async (rental: Rental): Promise<void> => {
  const { ownerName, subMemberName, ownerEmail, subMemberEmail } = await getRentalActors(rental);
  const { ownerEmails, validatorEmails } = await getNotificationAudiences();
  const { startDate, endDate, guests } = getRentalDisplayInfo(rental);

  const personalRecipients = new Set([ownerEmail, subMemberEmail].filter((email): email is string => email !== null));
  const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
    ownerEmails,
    validatorEmails,
    excludedEmails: personalRecipients,
  });

  sendPush(
    validatorRecipients,
    "rental_created",
    PUSH_MESSAGES.rental.newRequestTitle,
    PUSH_MESSAGES.rental.newRequestForValidators({
      subMemberName,
      ownerName,
      startDate,
      endDate,
      guests,
    })
  );

  sendPush(
    ownerObserverRecipients,
    "rental_created",
    PUSH_MESSAGES.rental.newRequestTitle,
    PUSH_MESSAGES.rental.newRequestForOwners({
      subMemberName,
      ownerName,
      startDate,
      endDate,
      guests,
    })
  );

  if (ownerEmail) {
    sendPush(
      [ownerEmail],
      "rental_created",
      PUSH_MESSAGES.rental.newRequestTitle,
      PUSH_MESSAGES.rental.newRequestForOwner({
        subMemberName,
        startDate,
        endDate,
        guests,
      })
    );
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush(
      [subMemberEmail],
      "rental_created",
      PUSH_MESSAGES.rental.newRequestTitle,
      PUSH_MESSAGES.rental.newRequestForSubMember({
        startDate,
        endDate,
        guests,
      })
    );
  }
};

// ------------------------------------------------------------
// Déclencheur 2 — Changement de statut (updateRental)
// ------------------------------------------------------------

/**
 * Notifie les parties prenantes d'un changement de statut sur une location.
 *
 * - Si `previousStatus` est fourni et identique au statut courant, aucune
 *   notification n'est envoyée.
 * - Envoie d'abord les notifications personnelles (owner / sub_member),
 *   puis diffuse aux observers/validateurs si le statut est broadcastable.
 */
export const notifyStatusChange = async (rental: Rental, previousStatus?: RentalStatus): Promise<void> => {
  if (previousStatus !== undefined && rental.status === previousStatus) return;

  const { ownerEmail, subMemberEmail, subMemberName, ownerName } = await getRentalActors(rental);
  const { ownerEmails, validatorEmails } = await getNotificationAudiences();

  const sentEmails = new Set<string>();

  if (ownerEmail) {
    const ownerMessage = buildStatusMessage(rental, "owner", subMemberName);
    if (ownerMessage) {
      sendPush([ownerEmail], ownerMessage.type, ownerMessage.title, ownerMessage.body);
      sentEmails.add(ownerEmail);
    }
  }

  if (subMemberEmail && !sentEmails.has(subMemberEmail)) {
    const subMemberMessage = buildStatusMessage(rental, "sub_member", subMemberName);
    if (subMemberMessage) {
      sendPush([subMemberEmail], subMemberMessage.type, subMemberMessage.title, subMemberMessage.body);
      sentEmails.add(subMemberEmail);
    }
  }

  if (!isBroadcastStatus(rental.status)) return;

  const statusType = getStatusNotificationType(rental.status);
  const statusTitle = getStatusNotificationTitle(rental.status);
  if (!statusType || !statusTitle) return;

  const { startDate, endDate, guests } = getRentalDisplayInfo(rental);
  const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
    ownerEmails,
    validatorEmails,
    excludedEmails: sentEmails,
  });

  sendPush(
    ownerObserverRecipients,
    statusType,
    statusTitle,
    PUSH_MESSAGES.rental.statusForOwnerObservers({
      subMemberName,
      ownerName,
      status: rental.status,
      startDate,
      endDate,
      guests,
    })
  );

  sendPush(
    validatorRecipients,
    statusType,
    statusTitle,
    PUSH_MESSAGES.rental.statusForValidators({
      subMemberName,
      ownerName,
      status: rental.status,
      startDate,
      endDate,
      guests,
    })
  );
};

// ------------------------------------------------------------
// Déclencheur 3 — Clôture de location (status → completed)
// ------------------------------------------------------------

/**
 * Envoie le récapitulatif de fin de séjour lorsque la location est clôturée
 * (`status === 'completed'`).
 *
 * Le message inclut : dates prévues / réelles, durée, nombre de personnes,
 * consommation électrique (si renseignée) et total.
 */
export const notifyCompleted = async (rental: Rental): Promise<void> => {
  const { ownerEmail, subMemberEmail, subMemberName, ownerName } = await getRentalActors(rental);
  const { ownerEmails, validatorEmails } = await getNotificationAudiences();
  const sentEmails = new Set<string>();

  if (ownerEmail) {
    sendPush([ownerEmail], "rental_completed", PUSH_MESSAGES.rental.completedTitle, buildCompletedBody(rental, "owner", subMemberName));
    sentEmails.add(ownerEmail);
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush([subMemberEmail], "rental_completed", PUSH_MESSAGES.rental.completedTitle, buildCompletedBody(rental, "sub_member", subMemberName));
    sentEmails.add(subMemberEmail);
  }

  const effectiveStartDate = rental.actualStartDate ?? rental.startDate;
  const effectiveEndDate = rental.actualEndDate ?? rental.endDate;
  const durationDays = getDurationDays(effectiveStartDate, effectiveEndDate);
  const total = formatEuro(rental.totalPrice ?? rental.price);
  const { startDate, endDate } = getRentalDisplayInfo(rental);

  const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
    ownerEmails,
    validatorEmails,
    excludedEmails: sentEmails,
  });

  sendPush(
    ownerObserverRecipients,
    "rental_completed",
    PUSH_MESSAGES.rental.completedTitle,
    PUSH_MESSAGES.rental.completedForOwners({
      subMemberName,
      ownerName,
      startDate,
      endDate,
      guests: rental.guestCount,
      durationDays,
      total,
    })
  );

  sendPush(
    validatorRecipients,
    "rental_completed",
    PUSH_MESSAGES.rental.completedTitle,
    PUSH_MESSAGES.rental.completedForValidators({
      subMemberName,
      ownerName,
      startDate,
      endDate,
      guests: rental.guestCount,
      durationDays,
      total,
    })
  );
};

// ------------------------------------------------------------
// Déclencheur 4 — Suppression de location
// ------------------------------------------------------------

/**
 * Notifie la suppression d'une location aux acteurs concernés : propriétaire,
 * membre, observers et validateurs.
 */
export const notifyDeletedRental = async (rental: Rental): Promise<void> => {
  const { ownerEmail, subMemberEmail, subMemberName, ownerName } = await getRentalActors(rental);
  const { ownerEmails, validatorEmails } = await getNotificationAudiences();
  const sentEmails = new Set<string>();
  const { startDate, endDate, guests } = getRentalDisplayInfo(rental);

  if (ownerEmail) {
    sendPush(
      [ownerEmail],
      "rental_deleted",
      PUSH_MESSAGES.rental.deletedTitle,
      PUSH_MESSAGES.rental.deletedForOwner({
        subMemberName,
        startDate,
        endDate,
        guests,
      })
    );
    sentEmails.add(ownerEmail);
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush(
      [subMemberEmail],
      "rental_deleted",
      PUSH_MESSAGES.rental.deletedTitle,
      PUSH_MESSAGES.rental.deletedForSubMember({
        startDate,
        endDate,
        guests,
      })
    );
    sentEmails.add(subMemberEmail);
  }

  const { validatorRecipients, ownerObserverRecipients } = getObserverRecipients({
    ownerEmails,
    validatorEmails,
    excludedEmails: sentEmails,
  });

  sendPush(
    ownerObserverRecipients,
    "rental_deleted",
    PUSH_MESSAGES.rental.deletedTitle,
    PUSH_MESSAGES.rental.deletedForOwners({
      subMemberName,
      ownerName,
      startDate,
      endDate,
      guests,
    })
  );

  sendPush(
    validatorRecipients,
    "rental_deleted",
    PUSH_MESSAGES.rental.deletedTitle,
    PUSH_MESSAGES.rental.deletedForValidators({
      subMemberName,
      ownerName,
      startDate,
      endDate,
      guests,
    })
  );
};
