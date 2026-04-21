/**
 * emailService.ts — Wrapper fire-and-forget pour la Edge Function `send-email`.
 *
 * Même pattern que `pushService.ts` : appel non bloquant, erreurs loggées.
 */

import { logger } from "./logger";
import { supabase } from "./supabaseClient";
import type { EmailTemplate } from "./emailTemplates";

export interface InvokeEmailParams extends EmailTemplate {
  memberEmails: string[];
}

/**
 * Invoque la Edge Function `send-email` de manière fire-and-forget.
 * Ne lève jamais d'exception — les erreurs sont loggées via `logger`.
 */
export const invokeEmailSend = (params: InvokeEmailParams): void => {
  if (params.memberEmails.length === 0) return;

  logger.debug("emailService", "Dispatch send-email", {
    recipientCount: params.memberEmails.length,
    subject: params.subject,
  });

  supabase.functions
    .invoke("send-email", {
      body: {
        memberEmails: params.memberEmails,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
      },
    })
    .then(({ data, error }) => {
      if (error) {
        logger.error("[emailService] send-email error:", {
          subject: params.subject,
          recipientEmails: params.memberEmails,
          error,
        });
        return;
      }
      logger.debug("emailService", "send-email response", { data });
    })
    .catch((err: unknown) => {
      logger.error("[emailService] Erreur send-email:", err);
    });
};
