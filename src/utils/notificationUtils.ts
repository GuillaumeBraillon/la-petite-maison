/**
 * Calcule et deduplique les listes de destinataires observers.
 *
 * - `validatorRecipients` : validateurs (admins + owners editeurs) sans les exclus.
 * - `ownerObserverRecipients` : proprietaires observateurs (owners) exclus des validateurs et des exclus.
 *
 * @param params.ownerEmails - Liste brute des emails de owners.
 * @param params.validatorEmails - Liste brute des emails de validateurs.
 * @param params.excludedEmails - Ensemble d'emails a exclure (deja notifies personnellement).
 * @returns Objet contenant `validatorRecipients` et `ownerObserverRecipients`.
 */
export const getObserverRecipients = (params: {
  ownerEmails: string[];
  validatorEmails: string[];
  excludedEmails: Set<string>;
}): { validatorRecipients: string[]; ownerObserverRecipients: string[] } => {
  const { ownerEmails, validatorEmails, excludedEmails } = params;

  const validatorRecipients = Array.from(new Set(validatorEmails.filter((email) => !excludedEmails.has(email))));
  const ownerObserverRecipients = Array.from(new Set(ownerEmails.filter((email) => !excludedEmails.has(email) && !validatorRecipients.includes(email))));

  return { validatorRecipients, ownerObserverRecipients };
};
