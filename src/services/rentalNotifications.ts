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
import { formatDate, formatEuro, getDurationDays, normalizeEmail, pluralize } from "../utils/rentalUtils";
import { fetchCurrentMember } from "./api";
import { logger } from "./logger";
import { supabase } from "./supabaseClient";
import type { Rental, RentalStatus } from "../types";

type PushType = "rental_created" | "rental_confirmed" | "rental_rejected" | "request_pending" | "rental_completed" | "rental_deleted" | "rental_paid";

type NotificationActor = {
  actorName: string | null;
  actorEmail: string | null;
};

type NotificationActionKind = "created" | "confirmed" | "rejected" | "pending" | "completed" | "deleted" | "paid" | "unpaid";

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

const getActorFallbackName = (email: string | null): string | null => {
  if (!email) return null;
  const [localPart] = email.split("@");
  return localPart?.trim() || null;
};

const getCurrentNotificationActor = async (): Promise<NotificationActor> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logger.error("[rentalNotifications] getCurrentNotificationActor session:", error);
      return { actorName: null, actorEmail: null };
    }

    if (!session) {
      return { actorName: null, actorEmail: null };
    }

    const actorEmail = normalizeEmail(session.user.email);

    try {
      const currentMember = await fetchCurrentMember(session);
      if (currentMember) {
        const fullName = `${currentMember.firstName} ${currentMember.lastName}`.trim();
        return {
          actorName: fullName || currentMember.label.trim() || getActorFallbackName(actorEmail),
          actorEmail,
        };
      }
    } catch (memberError) {
      logger.error("[rentalNotifications] getCurrentNotificationActor member:", memberError);
    }

    const userMetadata = session.user.user_metadata;
    const metadataName =
      (typeof userMetadata.full_name === "string" && userMetadata.full_name.trim()) ||
      (typeof userMetadata.name === "string" && userMetadata.name.trim()) ||
      getActorFallbackName(actorEmail);

    return {
      actorName: metadataName || null,
      actorEmail,
    };
  } catch (unexpectedError) {
    logger.error("[rentalNotifications] getCurrentNotificationActor unexpected:", unexpectedError);
    return { actorName: null, actorEmail: null };
  }
};

const getActorNameForRecipient = (actor: NotificationActor, recipientEmail?: string | null): string | null => {
  if (!actor.actorName) return null;
  if (actor.actorEmail && normalizeEmail(recipientEmail) === actor.actorEmail) return null;
  return actor.actorName;
};

const getActorActionLabel = (action: NotificationActionKind): string => {
  switch (action) {
    case "created":
      return "Demande créée";
    case "confirmed":
      return "Séjour validé";
    case "rejected":
      return "Demande refusée";
    case "pending":
      return "Demande remise en attente";
    case "completed":
      return "Séjour clôturé";
    case "deleted":
      return "Location supprimée";
    case "paid":
      return "Paiement confirmé";
    case "unpaid":
      return "Paiement annulé";
  }
};

const appendActorToBody = (body: string, actorName: string | null, action: NotificationActionKind): string => {
  if (!actorName) return body;
  const actorLine = `${getActorActionLabel(action)} par ${actorName}.`;
  if (body.includes("\n")) {
    return `${body}\n\n${actorLine}`;
  }
  return `${body} ${actorLine}`;
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
  const actor = await getCurrentNotificationActor();

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
    appendActorToBody(
      PUSH_MESSAGES.rental.newRequestForValidators({
        subMemberName,
        ownerName,
        startDate,
        endDate,
        guests,
      }),
      actor.actorName,
      "created"
    )
  );

  sendPush(
    ownerObserverRecipients,
    "rental_created",
    PUSH_MESSAGES.rental.newRequestTitle,
    appendActorToBody(
      PUSH_MESSAGES.rental.newRequestForOwners({
        subMemberName,
        ownerName,
        startDate,
        endDate,
        guests,
      }),
      actor.actorName,
      "created"
    )
  );

  if (ownerEmail) {
    sendPush(
      [ownerEmail],
      "rental_created",
      PUSH_MESSAGES.rental.newRequestTitle,
      appendActorToBody(
        PUSH_MESSAGES.rental.newRequestForOwner({
          subMemberName,
          startDate,
          endDate,
          guests,
        }),
        getActorNameForRecipient(actor, ownerEmail),
        "created"
      )
    );
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush(
      [subMemberEmail],
      "rental_created",
      PUSH_MESSAGES.rental.newRequestTitle,
      appendActorToBody(
        PUSH_MESSAGES.rental.newRequestForSubMember({
          startDate,
          endDate,
          guests,
        }),
        getActorNameForRecipient(actor, subMemberEmail),
        "created"
      )
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
  const actor = await getCurrentNotificationActor();

  const sentEmails = new Set<string>();

  if (ownerEmail) {
    const ownerMessage = buildStatusMessage(rental, "owner", subMemberName);
    if (ownerMessage) {
      sendPush(
        [ownerEmail],
        ownerMessage.type,
        ownerMessage.title,
        appendActorToBody(
          ownerMessage.body,
          getActorNameForRecipient(actor, ownerEmail),
          rental.status === "confirmed" ? "confirmed" : rental.status === "rejected" ? "rejected" : "pending"
        )
      );
      sentEmails.add(ownerEmail);
    }
  }

  if (subMemberEmail && !sentEmails.has(subMemberEmail)) {
    const subMemberMessage = buildStatusMessage(rental, "sub_member", subMemberName);
    if (subMemberMessage) {
      sendPush(
        [subMemberEmail],
        subMemberMessage.type,
        subMemberMessage.title,
        appendActorToBody(
          subMemberMessage.body,
          getActorNameForRecipient(actor, subMemberEmail),
          rental.status === "confirmed" ? "confirmed" : rental.status === "rejected" ? "rejected" : "pending"
        )
      );
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
    appendActorToBody(
      PUSH_MESSAGES.rental.statusForOwnerObservers({
        subMemberName,
        ownerName,
        status: rental.status,
        startDate,
        endDate,
        guests,
      }),
      actor.actorName,
      rental.status === "confirmed" ? "confirmed" : rental.status === "rejected" ? "rejected" : "pending"
    )
  );

  sendPush(
    validatorRecipients,
    statusType,
    statusTitle,
    appendActorToBody(
      PUSH_MESSAGES.rental.statusForValidators({
        subMemberName,
        ownerName,
        status: rental.status,
        startDate,
        endDate,
        guests,
      }),
      actor.actorName,
      rental.status === "confirmed" ? "confirmed" : rental.status === "rejected" ? "rejected" : "pending"
    )
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
  const actor = await getCurrentNotificationActor();
  const sentEmails = new Set<string>();

  if (ownerEmail) {
    sendPush(
      [ownerEmail],
      "rental_completed",
      PUSH_MESSAGES.rental.completedTitle,
      appendActorToBody(buildCompletedBody(rental, "owner", subMemberName), getActorNameForRecipient(actor, ownerEmail), "completed")
    );
    sentEmails.add(ownerEmail);
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush(
      [subMemberEmail],
      "rental_completed",
      PUSH_MESSAGES.rental.completedTitle,
      appendActorToBody(buildCompletedBody(rental, "sub_member", subMemberName), getActorNameForRecipient(actor, subMemberEmail), "completed")
    );
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
    appendActorToBody(
      PUSH_MESSAGES.rental.completedForOwners({
        subMemberName,
        ownerName,
        startDate,
        endDate,
        guests: rental.guestCount,
        durationDays,
        total,
      }),
      actor.actorName,
      "completed"
    )
  );

  sendPush(
    validatorRecipients,
    "rental_completed",
    PUSH_MESSAGES.rental.completedTitle,
    appendActorToBody(
      PUSH_MESSAGES.rental.completedForValidators({
        subMemberName,
        ownerName,
        startDate,
        endDate,
        guests: rental.guestCount,
        durationDays,
        total,
      }),
      actor.actorName,
      "completed"
    )
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
  const actor = await getCurrentNotificationActor();
  const sentEmails = new Set<string>();
  const { startDate, endDate, guests } = getRentalDisplayInfo(rental);

  if (ownerEmail) {
    sendPush(
      [ownerEmail],
      "rental_deleted",
      PUSH_MESSAGES.rental.deletedTitle,
      appendActorToBody(
        PUSH_MESSAGES.rental.deletedForOwner({
          subMemberName,
          startDate,
          endDate,
          guests,
        }),
        getActorNameForRecipient(actor, ownerEmail),
        "deleted"
      )
    );
    sentEmails.add(ownerEmail);
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush(
      [subMemberEmail],
      "rental_deleted",
      PUSH_MESSAGES.rental.deletedTitle,
      appendActorToBody(
        PUSH_MESSAGES.rental.deletedForSubMember({
          startDate,
          endDate,
          guests,
        }),
        getActorNameForRecipient(actor, subMemberEmail),
        "deleted"
      )
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
    appendActorToBody(
      PUSH_MESSAGES.rental.deletedForOwners({
        subMemberName,
        ownerName,
        startDate,
        endDate,
        guests,
      }),
      actor.actorName,
      "deleted"
    )
  );

  sendPush(
    validatorRecipients,
    "rental_deleted",
    PUSH_MESSAGES.rental.deletedTitle,
    appendActorToBody(
      PUSH_MESSAGES.rental.deletedForValidators({
        subMemberName,
        ownerName,
        startDate,
        endDate,
        guests,
      }),
      actor.actorName,
      "deleted"
    )
  );
};

// ------------------------------------------------------------
// Déclencheur 5 — Basculement du paiement
// ------------------------------------------------------------

/**
 * Notifie le changement d'état du paiement d'une location.
 *
 * Notifications envoyées :
 * - propriétaire principal (message personnalisé)
 * - sous-membre si applicable (message personnalisé)
 * - tous les autres propriétaires observateurs (message broadcast)
 */
export const notifyPaymentToggled = async (rental: Rental): Promise<void> => {
  const { ownerEmail, subMemberEmail, subMemberName, ownerName } = await getRentalActors(rental);
  const { ownerEmails } = await getNotificationAudiences();
  const { startDate, endDate } = getRentalDisplayInfo(rental);
  const actor = await getCurrentNotificationActor();
  const sentEmails = new Set<string>();
  const title = rental.isPaid ? PUSH_MESSAGES.rental.paidTitle : PUSH_MESSAGES.rental.unpaidTitle;

  if (ownerEmail) {
    sendPush(
      [ownerEmail],
      "rental_paid",
      title,
      appendActorToBody(
        PUSH_MESSAGES.rental.paidForOwner({ subMemberName, startDate, endDate, isPaid: rental.isPaid }),
        getActorNameForRecipient(actor, ownerEmail),
        rental.isPaid ? "paid" : "unpaid"
      )
    );
    sentEmails.add(ownerEmail);
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    sendPush(
      [subMemberEmail],
      "rental_paid",
      title,
      appendActorToBody(
        PUSH_MESSAGES.rental.paidForSubMember({ startDate, endDate, isPaid: rental.isPaid }),
        getActorNameForRecipient(actor, subMemberEmail),
        rental.isPaid ? "paid" : "unpaid"
      )
    );
    sentEmails.add(subMemberEmail);
  }

  const ownerObserverRecipients = ownerEmails.filter((e) => !sentEmails.has(e));
  sendPush(
    ownerObserverRecipients,
    "rental_paid",
    title,
    appendActorToBody(
      PUSH_MESSAGES.rental.paidForOwners({ subMemberName, ownerName, startDate, endDate, isPaid: rental.isPaid }),
      actor.actorName,
      rental.isPaid ? "paid" : "unpaid"
    )
  );
};
