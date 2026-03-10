import { logger } from "./logger";
import { supabase } from "./supabaseClient";
import { normalizeEmail } from "../utils/rentalUtils";
import type { Rental } from "../types";

/**
 * Services d'accès aux acteurs métier et aux audiences de notification.
 *
 * Fournit des helpers pour récupérer les noms/emails du propriétaire et du
 * sous-membre liés à une `Rental`, ainsi que les listes d'emails des
 * propriétaires observateurs et des validateurs (admins + owners éditeurs).
 */

export type RentalActors = {
  ownerName: string;
  subMemberName: string | null;
  ownerEmail: string | null;
  subMemberEmail: string | null;
};

export type NotificationAudiences = {
  ownerEmails: string[];
  validatorEmails: string[];
};

/**
 * Récupère les informations (nom, email) du propriétaire et du sous-membre
 * associés à une `rental` donnée.
 *
 * Retourne des valeurs par défaut (nom = "membre", email = null) en cas
 * d'erreur ou si l'acteur n'existe pas.
 *
 * @param rental - Objet `Rental` dont on extrait `ownerId` et `subMemberId`.
 */
export const getRentalActors = async (rental: Rental): Promise<RentalActors> => {
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

export const getNotificationAudiences = async (): Promise<NotificationAudiences> => {
  /**
   * Récupère les listes d'emails pour les audiences de notification.
   *
   * - `ownerEmails` : emails normalisés des propriétaires (role = "owner").
   * - `validatorEmails` : emails des admins et owners avec `is_editor = true`.
   *
   * En cas d'erreur, un objet vide est retourné et l'erreur est loggée.
   */
  const { data, error } = await supabase
    .from("members")
    .select("email, role, is_editor")
    .in("role", ["owner", "admin"])
    .eq("is_allowed", true)
    .not("email", "is", null);

  if (error) {
    logger.error("[rentalNotifications] getNotificationAudiences:", error);
    return { ownerEmails: [], validatorEmails: [] };
  }

  const rows = (data ?? []) as Array<{ email: string | null; role: string; is_editor: boolean }>;

  const ownerEmails = new Set<string>();
  const validatorEmails = new Set<string>();

  rows.forEach((row) => {
    const normalizedEmail = normalizeEmail(row.email);
    if (!normalizedEmail) return;

    if (row.role === "owner") {
      ownerEmails.add(normalizedEmail);
    }

    if (row.role === "admin" || (row.role === "owner" && row.is_editor)) {
      validatorEmails.add(normalizedEmail);
    }
  });

  return {
    ownerEmails: Array.from(ownerEmails),
    validatorEmails: Array.from(validatorEmails),
  };
};
