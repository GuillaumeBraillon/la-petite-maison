// ============================================================
// rentalNotifications.ts — Déclencheurs de notifications push
// Fire-and-forget : ne bloque jamais le flux CRUD principal
// ============================================================

import { supabase } from "./supabaseClient";
import { logger } from "./logger";
import { PUSH_MESSAGES } from "./messageCatalog";
import type { Rental, RentalStatus } from "../types";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const formatDate = (iso: string | undefined): string => {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

const pluralize = (count: number, singular: string, plural: string): string => (count <= 1 ? singular : plural);

const formatEuro = (value: number): string => `${value} €`;

const formatEuroPerDay = (value: number): string => `${value.toFixed(2)} €/j`;

const getDurationDays = (startIso: string, endIso: string): number => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const dayInMs = 1000 * 60 * 60 * 24;
  const diffInDays = (end - start) / dayInMs;
  return Math.max(1, Math.round(diffInDays));
};

const normalizeEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

/** Appel fire-and-forget vers l'Edge Function send-push. */
const invokeSendPush = (body: Record<string, unknown>): void => {
  const maybePayload = body.payload as { type?: unknown; title?: unknown } | undefined;
  const payloadType = typeof maybePayload?.type === "string" ? maybePayload.type : undefined;
  const payloadTitle = typeof maybePayload?.title === "string" ? maybePayload.title : undefined;
  const topic = typeof body.topic === "string" ? body.topic : undefined;

  const rawMemberEmails = (body as { memberEmails?: unknown }).memberEmails;
  const memberEmails = Array.isArray(rawMemberEmails) ? rawMemberEmails.filter((item): item is string => typeof item === "string") : [];

  logger.debug("rentalNotifications", "Dispatch send-push", {
    topic: topic ?? null,
    type: payloadType ?? null,
    title: payloadTitle ?? null,
    recipientCount: memberEmails.length,
    recipientEmails: memberEmails,
  });

  supabase.functions
    .invoke("send-push", { body })
    .then(({ data, error }) => {
      if (error) {
        logger.error("[rentalNotifications] send-push response error:", {
          type: payloadType ?? null,
          topic: topic ?? null,
          recipientEmails: memberEmails,
          error,
        });
        return;
      }

      const unresolvedMemberEmails =
        data &&
        typeof data === "object" &&
        "unresolvedMemberEmails" in data &&
        Array.isArray((data as { unresolvedMemberEmails?: unknown }).unresolvedMemberEmails)
          ? (data as { unresolvedMemberEmails: unknown[] }).unresolvedMemberEmails.filter((item): item is string => typeof item === "string")
          : [];

      if (unresolvedMemberEmails.length > 0) {
        logger.error("[rentalNotifications] send-push unresolved member emails:", {
          type: payloadType ?? null,
          topic: topic ?? null,
          recipientEmails: memberEmails,
          unresolvedMemberEmails,
        });
      }
    })
    .catch((err: unknown) => {
      logger.error("[rentalNotifications] Erreur send-push:", err);
    });
};

type RentalActors = {
  ownerName: string;
  subMemberName: string | null;
  ownerEmail: string | null;
  subMemberEmail: string | null;
};

const getRentalActors = async (rental: Rental): Promise<RentalActors> => {
  const memberIds = [rental.ownerId, rental.subMemberId].filter((id): id is string => Boolean(id));

  const { data, error } = await supabase.from("members").select("id, email, first_name, last_name").in("id", memberIds);

  if (error) {
    logger.error("[rentalNotifications] getRentalActors:", error);
    return {
      ownerName: "membre",
      subMemberName: null,
      ownerEmail: null,
      subMemberEmail: null,
    };
  }

  const members = (
    (data ?? []) as {
      id: string;
      email: string | null;
      first_name: string;
      last_name: string;
    }[]
  ).map((member) => ({
    ...member,
    fullName: `${member.first_name} ${member.last_name}`.trim(),
  }));

  const ownerMember = members.find((member) => member.id === rental.ownerId);
  const subMember = members.find((member) => member.id === rental.subMemberId);

  return {
    ownerName: ownerMember?.fullName || "membre",
    subMemberName: subMember?.fullName || null,
    ownerEmail: normalizeEmail(ownerMember?.email),
    subMemberEmail: normalizeEmail(subMember?.email),
  };
};

const getEditorEmails = async (): Promise<string[]> => {
  const { data, error } = await supabase.from("members").select("email").eq("is_editor", true).not("email", "is", null);

  if (error) {
    logger.error("[rentalNotifications] getEditorEmails:", error);
    return [];
  }

  return ((data ?? []) as { email: string | null }[]).map((item) => normalizeEmail(item.email)).filter((email): email is string => email !== null);
};

// ------------------------------------------------------------
// Déclencheur 1 — Nouvelle demande de location (createRental)
// Notifie tous les admins + owners editors
// ------------------------------------------------------------

export const notifyNewRental = async (rental: Rental): Promise<void> => {
  const { ownerName, subMemberName, ownerEmail, subMemberEmail } = await getRentalActors(rental);
  const editorEmails = await getEditorEmails();

  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const guests = `${rental.guestCount} ${pluralize(rental.guestCount, "personne", "personnes")}`;

  const excludedPersonalRecipients = new Set([ownerEmail, subMemberEmail].filter((email): email is string => email !== null));

  const editorRecipients = Array.from(new Set(editorEmails.filter((email) => !excludedPersonalRecipients.has(email))));

  if (editorRecipients.length > 0) {
    invokeSendPush({
      memberEmails: editorRecipients,
      payload: {
        type: "rental_created",
        title: PUSH_MESSAGES.rental.newRequestTitle,
        body: PUSH_MESSAGES.rental.newRequestForEditors({
          subMemberName,
          ownerName,
          startDate: sd,
          endDate: ed,
          guests,
        }),
      },
    });
  }

  if (ownerEmail) {
    invokeSendPush({
      memberEmails: [ownerEmail],
      payload: {
        type: "rental_created",
        title: PUSH_MESSAGES.rental.newRequestTitle,
        body: PUSH_MESSAGES.rental.newRequestForOwner({
          subMemberName,
          startDate: sd,
          endDate: ed,
          guests,
        }),
      },
    });
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    invokeSendPush({
      memberEmails: [subMemberEmail],
      payload: {
        type: "rental_created",
        title: PUSH_MESSAGES.rental.newRequestTitle,
        body: PUSH_MESSAGES.rental.newRequestForSubMember({
          startDate: sd,
          endDate: ed,
          guests,
        }),
      },
    });
  }
};

// ------------------------------------------------------------
// Déclencheur 2 — Changement de statut (updateRental)
// Notifie le owner + le subMember si applicable
// ------------------------------------------------------------

type StatusMessage = {
  title: string;
  body: string;
  type: "rental_confirmed" | "rental_rejected" | "request_pending" | "rental_completed";
};

const buildStatusMessage = (rental: Rental, recipient: "owner" | "sub_member", subMemberName: string | null): StatusMessage | null => {
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

export const notifyStatusChange = async (rental: Rental, previousStatus?: RentalStatus): Promise<void> => {
  // Guard : évite une notification si le statut n'a pas réellement changé
  if (previousStatus !== undefined && rental.status === previousStatus) return;

  const { ownerEmail, subMemberEmail, subMemberName } = await getRentalActors(rental);

  const sentEmails = new Set<string>();

  if (ownerEmail) {
    const ownerMessage = buildStatusMessage(rental, "owner", subMemberName);

    if (ownerMessage) {
      invokeSendPush({
        memberEmails: [ownerEmail],
        payload: {
          type: ownerMessage.type,
          title: ownerMessage.title,
          body: ownerMessage.body,
        },
      });
      sentEmails.add(ownerEmail);
    }
  }

  if (subMemberEmail) {
    if (!sentEmails.has(subMemberEmail)) {
      const subMemberMessage = buildStatusMessage(rental, "sub_member", subMemberName);
      if (subMemberMessage) {
        invokeSendPush({
          memberEmails: [subMemberEmail],
          payload: {
            type: subMemberMessage.type,
            title: subMemberMessage.title,
            body: subMemberMessage.body,
          },
        });
      }
    }
  }
};

// ------------------------------------------------------------
// Déclencheur 3 — Clôture de location (status → completed)
// Notifie le owner + le subMember avec le récapitulatif détaillé
// ------------------------------------------------------------

const buildCompletedBody = (rental: Rental, recipient: "owner" | "sub_member", subMemberName: string | null): string => {
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
  lines.push(`Durée : ${durationDays} ${pluralize(durationDays, "jour", "jours")}`);
  lines.push(`Nombre de personnes : ${rental.guestCount}`);
  lines.push(`Location : ${formatEuro(rental.price)}`);
  if (rental.electricityCost !== undefined && rental.electricityCost !== null) {
    lines.push(`Consommation électrique : ${formatEuro(rental.electricityCost)} (${formatEuroPerDay(electricityPerDay ?? 0)})`);
  }
  const total = rental.totalPrice ?? rental.price;
  lines.push(`Total : ${formatEuro(total)}`);

  return lines.join("\n");
};

export const notifyCompleted = async (rental: Rental): Promise<void> => {
  const { ownerEmail, subMemberEmail, subMemberName } = await getRentalActors(rental);

  if (ownerEmail) {
    invokeSendPush({
      memberEmails: [ownerEmail],
      payload: {
        type: "rental_completed",
        title: PUSH_MESSAGES.rental.completedTitle,
        body: buildCompletedBody(rental, "owner", subMemberName),
      },
    });
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    invokeSendPush({
      memberEmails: [subMemberEmail],
      payload: {
        type: "rental_completed",
        title: PUSH_MESSAGES.rental.completedTitle,
        body: buildCompletedBody(rental, "sub_member", subMemberName),
      },
    });
  }
};

export const notifyDeletedRental = async (rental: Rental): Promise<void> => {
  const { ownerEmail, subMemberEmail, subMemberName } = await getRentalActors(rental);

  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const guests = `${rental.guestCount} ${pluralize(rental.guestCount, "personne", "personnes")}`;

  if (ownerEmail) {
    invokeSendPush({
      memberEmails: [ownerEmail],
      payload: {
        type: "rental_deleted",
        title: PUSH_MESSAGES.rental.deletedTitle,
        body: PUSH_MESSAGES.rental.deletedForOwner({
          subMemberName,
          startDate: sd,
          endDate: ed,
          guests,
        }),
      },
    });
  }

  if (subMemberEmail && subMemberEmail !== ownerEmail) {
    invokeSendPush({
      memberEmails: [subMemberEmail],
      payload: {
        type: "rental_deleted",
        title: PUSH_MESSAGES.rental.deletedTitle,
        body: PUSH_MESSAGES.rental.deletedForSubMember({
          startDate: sd,
          endDate: ed,
          guests,
        }),
      },
    });
  }
};
