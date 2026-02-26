// ============================================================
// rentalNotifications.ts — Déclencheurs de notifications push
// Fire-and-forget : ne bloque jamais le flux CRUD principal
// ============================================================

import { supabase } from "./supabaseClient";
import { logger } from "./logger";
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

const pluralize = (count: number, singular: string, plural: string): string =>
  count <= 1 ? singular : plural;

/** Appel fire-and-forget vers l'Edge Function send-push. */
const invokeSendPush = (body: Record<string, unknown>): void => {
  supabase.functions.invoke("send-push", { body }).catch((err: unknown) => {
    logger.error("[rentalNotifications] Erreur send-push:", err);
  });
};

/** Résout les emails des membres concernés par une location. */
const getMemberEmails = async (memberIds: string[]): Promise<string[]> => {
  const ids = memberIds.filter(Boolean);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("members")
    .select("email")
    .in("id", ids)
    .not("email", "is", null);

  if (error) {
    logger.error("[rentalNotifications] getMemberEmails:", error);
    return [];
  }

  return ((data ?? []) as { email: string }[])
    .map((m) => m.email)
    .filter(Boolean);
};

// ------------------------------------------------------------
// Déclencheur 1 — Nouvelle demande de location (createRental)
// Notifie tous les admins + owners editors
// ------------------------------------------------------------

export const notifyNewRental = async (rental: Rental): Promise<void> => {
  // Récupère le nom du owner pour le message
  const { data } = await supabase
    .from("members")
    .select("first_name, last_name")
    .eq("id", rental.ownerId)
    .single();

  const ownerName = data
    ? `${(data as { first_name: string; last_name: string }).first_name} ${(data as { first_name: string; last_name: string }).last_name}`
    : "membre";

  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const guests = `${rental.guestCount} ${pluralize(rental.guestCount, "personne", "personnes")}`;

  invokeSendPush({
    topic: "admins_and_owner_editors",
    payload: {
      type: "rental_created",
      title: "Nouvelle demande de location",
      body: `Nouvelle demande de ${ownerName} du ${sd} au ${ed} (${guests})`,
    },
  });
};

// ------------------------------------------------------------
// Déclencheur 2 — Changement de statut (updateRental)
// Notifie le owner + le subMember si applicable
// ------------------------------------------------------------

type StatusMessage = {
  title: string;
  body: string;
  type:
    | "rental_confirmed"
    | "rental_rejected"
    | "request_pending"
    | "rental_completed";
};

const buildStatusMessage = (rental: Rental): StatusMessage | null => {
  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const guests = `${rental.guestCount} ${pluralize(rental.guestCount, "personne", "personnes")}`;

  switch (rental.status) {
    case "confirmed":
      return {
        type: "rental_confirmed",
        title: "Séjour confirmé !",
        body: `Votre séjour du ${sd} au ${ed} pour ${guests} est confirmé !`,
      };
    case "rejected":
      return {
        type: "rental_rejected",
        title: "Demande refusée",
        body: `Votre demande du ${sd} au ${ed} pour ${guests} a été refusée`,
      };
    case "pending":
      return {
        type: "request_pending",
        title: "Demande en attente",
        body: `Votre demande du ${sd} au ${ed} pour ${guests} est en attente de validation`,
      };
    default:
      return null;
  }
};

export const notifyStatusChange = async (
  rental: Rental,
  previousStatus?: RentalStatus,
): Promise<void> => {
  // Guard : évite une notification si le statut n'a pas réellement changé
  if (previousStatus !== undefined && rental.status === previousStatus) return;

  const msg = buildStatusMessage(rental);
  if (!msg) return; // "completed" est géré par notifyCompleted

  const memberIds = [rental.ownerId, rental.subMemberId].filter(
    (id): id is string => Boolean(id),
  );
  const memberEmails = await getMemberEmails(memberIds);
  if (memberEmails.length === 0) return;

  invokeSendPush({
    memberEmails,
    payload: {
      type: msg.type,
      title: msg.title,
      body: msg.body,
    },
  });
};

// ------------------------------------------------------------
// Déclencheur 3 — Clôture de location (status → completed)
// Notifie le owner + le subMember avec le récapitulatif détaillé
// ------------------------------------------------------------

const buildCompletedBody = (rental: Rental): string => {
  const sd = formatDate(rental.startDate);
  const ed = formatDate(rental.endDate);
  const asd = rental.actualStartDate
    ? formatDate(rental.actualStartDate)
    : null;
  const aed = rental.actualEndDate ? formatDate(rental.actualEndDate) : null;

  const datesChanged = Boolean(asd && aed && (asd !== sd || aed !== ed));

  const lines: string[] = [];
  lines.push(`Dates prévues : ${sd} → ${ed}`);
  if (datesChanged) {
    lines.push(`Dates réelles : ${asd} → ${aed}`);
  }
  lines.push("");
  lines.push(`Location : ${rental.price}€`);
  if (rental.electricityCost !== undefined && rental.electricityCost !== null) {
    lines.push(`Consommation électrique : ${rental.electricityCost}€`);
  }
  const total = rental.totalPrice ?? rental.price;
  lines.push(`Total : ${total}€`);

  return lines.join("\n");
};

export const notifyCompleted = async (rental: Rental): Promise<void> => {
  const memberIds = [rental.ownerId, rental.subMemberId].filter(
    (id): id is string => Boolean(id),
  );
  const memberEmails = await getMemberEmails(memberIds);
  if (memberEmails.length === 0) return;

  invokeSendPush({
    memberEmails,
    payload: {
      type: "rental_completed",
      title: "Séjour terminé — Récapitulatif",
      body: buildCompletedBody(rental),
    },
  });
};
