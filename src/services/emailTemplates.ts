/**
 * emailTemplates.ts — Templates d'emails transactionnels (Brevo)
 *
 * Chaque fonction de template prend les données métier et retourne un objet
 * `{ subject, htmlContent, textContent }` prêt à être passé à `invokeEmailSend`.
 *
 * Les templates sont en HTML inline (compatible clients email) avec un style
 * épuré et cohérent avec la charte graphique de l'application.
 */

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

// ------------------------------------------------------------
// Layout HTML de base
// ------------------------------------------------------------

const BRAND_COLOR = "#2563eb";
const BRAND_NAME = "La Petite Maison";
const APP_URL = "https://lapetitemaison.guillaumebraillon.fr";

const wrapHtml = (title: string, bodyHtml: string): string => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:20px 28px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${BRAND_NAME}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                Vous recevez cet email car vous avez activé les notifications par email dans
                <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${BRAND_NAME}</a>.
                Pour les désactiver, ouvrez votre profil dans l'application.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const h1 = (text: string): string => `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">${text}</h1>`;

const paragraph = (text: string): string => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${text}</p>`;

const infoBox = (rows: Array<{ label: string; value: string }>): string => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;padding:12px 16px;margin:12px 0;">
    ${rows
      .map(
        (row) => `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#6b7280;width:40%;">${row.label}</td>
      <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${row.value}</td>
    </tr>`
      )
      .join("")}
  </table>`;

const ctaButton = (label: string, url: string): string =>
  `<a href="${url}" style="display:inline-block;margin-top:8px;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">${label}</a>`;

// ------------------------------------------------------------
// Templates métier
// ------------------------------------------------------------

export type NewRentalParams = {
  ownerName: string;
  subMemberName: string | null;
  startDate: string;
  endDate: string;
  guests: number;
  recipientRole: "owner" | "sub_member" | "validator" | "observer";
};

export const newRentalTemplate = ({ ownerName, subMemberName, startDate, endDate, guests, recipientRole }: NewRentalParams): EmailTemplate => {
  const guestLabel = `${guests} personne${guests > 1 ? "s" : ""}`;
  const who = subMemberName ? `${subMemberName} (via ${ownerName})` : ownerName;

  const isPersonal = recipientRole === "owner" || recipientRole === "sub_member";
  const subject = "Nouvelle demande de location — La Petite Maison";

  let headlineText: string;
  let introText: string;

  if (recipientRole === "sub_member") {
    headlineText = "Votre demande a été envoyée";
    introText = `Votre demande de location est bien enregistrée et <strong>en attente de validation</strong>.`;
  } else if (recipientRole === "owner" && subMemberName) {
    headlineText = "Demande de location enregistrée";
    introText = `La demande de <strong>${subMemberName}</strong> est bien enregistrée et <strong>en attente de validation</strong>.`;
  } else if (recipientRole === "owner") {
    headlineText = "Votre demande a été envoyée";
    introText = `Votre demande de location est bien enregistrée et <strong>en attente de validation</strong>.`;
  } else {
    headlineText = "Nouvelle demande de location";
    introText = `Une nouvelle demande de <strong>${who}</strong> vient d'être soumise. Elle est en attente de validation.`;
  }

  const infoRows = [
    { label: "Du", value: startDate },
    { label: "Au", value: endDate },
    { label: "Personnes", value: guestLabel },
  ];
  if (!isPersonal) {
    infoRows.unshift({ label: "Demandeur", value: who });
  }

  const bodyHtml = `
    ${h1(headlineText)}
    ${paragraph(introText)}
    ${infoBox(infoRows)}
    ${paragraph("Connectez-vous à l'application pour consulter les détails.")}
    ${ctaButton("Voir la demande", `${APP_URL}?view=rentals&status=pending`)}
  `;

  const textContent = [
    headlineText,
    "",
    introText.replace(/<[^>]*>/g, ""),
    "",
    isPersonal ? "" : `Demandeur : ${who}`,
    `Du : ${startDate}`,
    `Au : ${endDate}`,
    `Personnes : ${guestLabel}`,
    "",
    `Voir la demande : ${APP_URL}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, htmlContent: wrapHtml(subject, bodyHtml), textContent };
};

// ------------------------------------------------------------

export type StatusChangeParams = {
  ownerName: string;
  subMemberName: string | null;
  startDate: string;
  endDate: string;
  guests: number;
  status: "confirmed" | "rejected" | "pending";
  recipientRole: "owner" | "sub_member" | "validator" | "observer";
};

const STATUS_LABELS: Record<StatusChangeParams["status"], string> = {
  confirmed: "confirmé",
  rejected: "refusé",
  pending: "remis en attente",
};

const STATUS_SUBJECTS: Record<StatusChangeParams["status"], string> = {
  confirmed: "Séjour confirmé — La Petite Maison",
  rejected: "Demande refusée — La Petite Maison",
  pending: "Demande remise en attente — La Petite Maison",
};

export const statusChangeTemplate = ({ ownerName, subMemberName, startDate, endDate, guests, status, recipientRole }: StatusChangeParams): EmailTemplate => {
  const guestLabel = `${guests} personne${guests > 1 ? "s" : ""}`;
  const who = subMemberName ? `${subMemberName} (via ${ownerName})` : ownerName;
  const statusLabel = STATUS_LABELS[status];
  const subject = STATUS_SUBJECTS[status];
  const isPersonal = recipientRole === "owner" || recipientRole === "sub_member";

  let headlineText: string;
  let introText: string;

  if (status === "confirmed") {
    headlineText = "Votre séjour est confirmé 🎉";
    if (recipientRole === "sub_member") {
      introText = `Bonne nouvelle ! Votre séjour à La Petite Maison a été <strong>confirmé</strong>.`;
    } else if (recipientRole === "owner" && subMemberName) {
      introText = `Bonne nouvelle ! Le séjour de <strong>${subMemberName}</strong> a été <strong>confirmé</strong>.`;
    } else if (recipientRole === "owner") {
      introText = `Bonne nouvelle ! Votre séjour à La Petite Maison a été <strong>confirmé</strong>.`;
    } else {
      headlineText = `Séjour confirmé`;
      introText = `Le séjour de <strong>${who}</strong> a été <strong>${statusLabel}</strong>.`;
    }
  } else if (status === "rejected") {
    headlineText = "Demande refusée";
    if (recipientRole === "sub_member") {
      introText = `Votre demande de séjour a été <strong>refusée</strong>. Contactez les propriétaires pour en savoir plus.`;
    } else if (recipientRole === "owner" && subMemberName) {
      introText = `La demande de <strong>${subMemberName}</strong> a été <strong>refusée</strong>.`;
    } else if (recipientRole === "owner") {
      introText = `Votre demande de séjour a été <strong>refusée</strong>. Contactez les propriétaires pour en savoir plus.`;
    } else {
      introText = `Le séjour de <strong>${who}</strong> a été <strong>${statusLabel}</strong>.`;
    }
  } else {
    headlineText = "Demande remise en attente";
    if (isPersonal) {
      introText = `Votre demande de séjour a été remise <strong>en attente</strong> de validation.`;
    } else {
      introText = `Le séjour de <strong>${who}</strong> a été <strong>${statusLabel}</strong>.`;
    }
  }

  const infoRows = [
    { label: "Du", value: startDate },
    { label: "Au", value: endDate },
    { label: "Personnes", value: guestLabel },
  ];
  if (!isPersonal) {
    infoRows.unshift({ label: "Concernant", value: who });
  }

  const bodyHtml = `
    ${h1(headlineText)}
    ${paragraph(introText)}
    ${infoBox(infoRows)}
    ${ctaButton("Voir dans l'application", `${APP_URL}?view=rentals&status=${status}`)}
  `;

  const textContent = [
    headlineText,
    "",
    introText.replace(/<[^>]*>/g, ""),
    "",
    isPersonal ? "" : `Concernant : ${who}`,
    `Du : ${startDate}`,
    `Au : ${endDate}`,
    `Personnes : ${guestLabel}`,
    "",
    `Voir dans l'application : ${APP_URL}?view=rentals&status=${status}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, htmlContent: wrapHtml(subject, bodyHtml), textContent };
};

// ------------------------------------------------------------

export type CompletedParams = {
  ownerName: string;
  subMemberName: string | null;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  guests: number;
  durationDays: number;
  total: string;
  electricityCost?: string;
  recipientRole: "owner" | "sub_member" | "validator" | "observer";
};

export const completedTemplate = ({
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
  recipientRole,
}: CompletedParams): EmailTemplate => {
  const guestLabel = `${guests} personne${guests > 1 ? "s" : ""}`;
  const who = subMemberName ? `${subMemberName} (via ${ownerName})` : ownerName;
  const isPersonal = recipientRole === "owner" || recipientRole === "sub_member";
  const subject = "Séjour clôturé — La Petite Maison";

  const headlineText = isPersonal ? "Récapitulatif de votre séjour" : `Séjour clôturé — ${who}`;
  const introText = isPersonal
    ? `Votre séjour à La Petite Maison est maintenant <strong>clôturé</strong>. Voici le récapitulatif.`
    : `Le séjour de <strong>${who}</strong> est clôturé.`;

  const infoRows: Array<{ label: string; value: string }> = [];
  if (!isPersonal) infoRows.push({ label: "Locataire", value: who });
  infoRows.push({ label: "Dates prévues", value: `${startDate} → ${endDate}` });
  if (actualStartDate && actualStartDate !== startDate) {
    infoRows.push({ label: "Arrivée réelle", value: actualStartDate });
  }
  if (actualEndDate && actualEndDate !== endDate) {
    infoRows.push({ label: "Départ réel", value: actualEndDate });
  }
  infoRows.push({ label: "Durée", value: `${durationDays} jour${durationDays > 1 ? "s" : ""}` });
  infoRows.push({ label: "Personnes", value: guestLabel });
  if (electricityCost) infoRows.push({ label: "Électricité", value: electricityCost });
  infoRows.push({ label: "Total", value: total });

  const bodyHtml = `
    ${h1(headlineText)}
    ${paragraph(introText)}
    ${infoBox(infoRows)}
    ${ctaButton("Voir dans l'application", `${APP_URL}?view=rentals&status=completed`)}
  `;

  const textContent = [
    headlineText,
    "",
    introText.replace(/<[^>]*>/g, ""),
    "",
    ...infoRows.map((r) => `${r.label} : ${r.value}`),
    "",
    `Voir dans l'application : ${APP_URL}?view=rentals&status=completed`,
  ].join("\n");

  return { subject, htmlContent: wrapHtml(subject, bodyHtml), textContent };
};

// ------------------------------------------------------------

export type DeletedRentalParams = {
  ownerName: string;
  subMemberName: string | null;
  startDate: string;
  endDate: string;
  guests: number;
  recipientRole: "owner" | "sub_member" | "validator" | "observer";
};

export const deletedRentalTemplate = ({ ownerName, subMemberName, startDate, endDate, guests, recipientRole }: DeletedRentalParams): EmailTemplate => {
  const guestLabel = `${guests} personne${guests > 1 ? "s" : ""}`;
  const who = subMemberName ? `${subMemberName} (via ${ownerName})` : ownerName;
  const isPersonal = recipientRole === "owner" || recipientRole === "sub_member";
  const subject = "Location supprimée — La Petite Maison";

  const headlineText = isPersonal ? "Votre location a été supprimée" : `Location supprimée — ${who}`;
  const introText = isPersonal
    ? `Votre location du <strong>${startDate}</strong> au <strong>${endDate}</strong> a été supprimée.`
    : `La location de <strong>${who}</strong> du <strong>${startDate}</strong> au <strong>${endDate}</strong> a été supprimée.`;

  const infoRows: Array<{ label: string; value: string }> = [];
  if (!isPersonal) infoRows.push({ label: "Concernait", value: who });
  infoRows.push({ label: "Du", value: startDate });
  infoRows.push({ label: "Au", value: endDate });
  infoRows.push({ label: "Personnes", value: guestLabel });

  const bodyHtml = `
    ${h1(headlineText)}
    ${paragraph(introText)}
    ${infoBox(infoRows)}
    ${ctaButton("Voir le calendrier", `${APP_URL}?view=calendar`)}
  `;

  const textContent = [
    headlineText,
    "",
    introText.replace(/<[^>]*>/g, ""),
    "",
    ...infoRows.map((r) => `${r.label} : ${r.value}`),
    "",
    `Voir le calendrier : ${APP_URL}`,
  ].join("\n");

  return { subject, htmlContent: wrapHtml(subject, bodyHtml), textContent };
};
