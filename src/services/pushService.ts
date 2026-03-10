import { logger } from "./logger";
import { supabase } from "./supabaseClient";

/**
 * Wrapper technique pour invoquer la Edge Function `send-push` de Supabase.
 *
 * - Logge l'appel et les éventuelles erreurs.
 * - Ne lève pas d'exception : les erreurs sont loggées côté `logger`.
 *
 * @param body - Payload transmis à la fonction Edge. Doit contenir au moins
 *   une propriété `payload` avec `type` / `title` optionnels et/ou `memberEmails`.
 */
export const invokeSendPush = (body: Record<string, unknown>): void => {
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
