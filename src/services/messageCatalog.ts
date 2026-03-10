/**
 * Catalogue des messages courts affichés en toast.
 *
 * Structure :
 * - `common` : messages génériques
 * - `rental`, `member`, `notification` : messages spécifiques par domaine
 *
 * Les entrées peuvent être des objets statiques `{ title, message }` ou des
 * fonctions retournant ces objets (utile pour injecter des données runtime).
 */
export const TOAST_MESSAGES = {
  common: {
    errorTitle: "Erreur",
  },
  rental: {
    updated: {
      title: "Location modifiée",
      message: "La location a été mise à jour.",
    },
    created: {
      title: "Demande envoyée",
      message: "La demande de location a été créée.",
    },
    saveError: {
      title: "Erreur",
      message: "Impossible d'enregistrer la location.",
    },
    deleted: {
      title: "Location supprimée",
      message: "La location a été supprimée.",
    },
    deleteError: {
      title: "Erreur",
      message: "Impossible de supprimer la location.",
    },
    statusUpdated: (statusLabel: string) => ({
      title: "Statut mis à jour",
      message: `Le statut est maintenant « ${statusLabel} ».`,
    }),
    statusError: {
      title: "Erreur",
      message: "Impossible de modifier le statut.",
    },
  },
  member: {
    updated: {
      title: "Membre modifié",
      message: "Le membre a été mis à jour.",
    },
    created: {
      title: "Membre créé",
      message: "Le membre a été ajouté.",
    },
    saveError: {
      title: "Erreur",
      message: "Impossible d'enregistrer le membre.",
    },
    /**
     * Message de toast après suppression d'un membre.
     * @param fullName - Nom complet du membre supprimé.
     */
    deleted: (fullName: string) => ({
      title: "Membre supprimé",
      message: `${fullName} a été supprimé.`,
    }),
    deleteError: {
      title: "Erreur",
      message: "Impossible de supprimer le membre.",
    },
    /**
     * Message de toast lorsque l'accès d'un utilisateur est autorisé.
     * @param fullName - Nom complet de l'utilisateur autorisé.
     */
    authorized: (fullName: string) => ({
      title: "Utilisateur autorisé",
      message: `${fullName} peut maintenant accéder à l'application.`,
    }),
    authorizeError: {
      title: "Erreur",
      message: "Impossible d'autoriser l'utilisateur.",
    },
    authUpdated: (isAllowed: boolean) => ({
      title: "Autorisation mise à jour",
      message: isAllowed ? "L'accès a été autorisé." : "L'accès a été retiré.",
    }),
    authUpdateError: {
      title: "Erreur",
      message: "Impossible de modifier l'autorisation.",
    },
    /**
     * Message de toast après envoi d'un email de réinitialisation.
     * @param fullName - Nom complet de la personne destinataire.
     */
    passwordResetSent: (fullName: string) => ({
      title: "Email envoyé",
      message: `Lien de réinitialisation envoyé à ${fullName}.`,
    }),
    passwordResetError: {
      title: "Erreur",
      message: "Impossible d'envoyer le lien de réinitialisation.",
    },
  },
  notification: {
    /**
     * Message de confirmation de suppression d'une notification.
     */
    deleted: {
      title: "Notification supprimée",
      message: "La notification a été supprimée.",
    },
    deleteError: {
      title: "Erreur",
      message: "Impossible de supprimer la notification.",
    },
  },
} as const;

export const PUSH_MESSAGES = {
  memberAccess: {
    pendingTitle: "Nouvel utilisateur en attente",
    /**
     * Corps de notification pour un nouvel utilisateur en attente.
     * @param params.fullName - Nom complet si disponible, sinon null.
     * @param params.email - Email de l'utilisateur.
     */
    pendingBody: (params: { fullName: string | null; email: string }): string => {
      const { fullName, email } = params;
      if (fullName && fullName.trim().length > 0) {
        return `${fullName} (${email}) a rejoint l'application et attend une autorisation.`;
      }
      return `${email} a rejoint l'application et attend une autorisation.`;
    },
  },
  rental: {
    contextLabel: (params: { subMemberName: string | null; ownerName: string }): string => {
      const { subMemberName, ownerName } = params;
      if (subMemberName) return `${subMemberName} (propriétaire: ${ownerName})`;
      return ownerName;
    },
    newRequestTitle: "Nouvelle demande de location",
    /**
     * Message pour les éditeurs (utilisé en interne pour résumer une demande).
     */
    newRequestForEditors: (params: { subMemberName: string | null; ownerName: string; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests } = params;
      if (subMemberName) {
        return `Nouvelle demande de ${subMemberName} via ${ownerName}, du ${startDate} au ${endDate} (${guests}). Elle est en attente de validation.`;
      }
      return `Nouvelle demande de ${ownerName}, du ${startDate} au ${endDate} (${guests}). Elle est en attente de validation.`;
    },
    /**
     * Message destiné au propriétaire principal pour sa demande.
     */
    newRequestForOwner: (params: { subMemberName: string | null; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, startDate, endDate, guests } = params;
      if (subMemberName) {
        return `La demande de ${subMemberName}, du ${startDate} au ${endDate} (${guests}), est en attente de validation.`;
      }
      return `Votre demande du ${startDate} au ${endDate} (${guests}) est en attente de validation.`;
    },
    /**
     * Message destiné au sous-membre demandeur.
     */
    newRequestForSubMember: (params: { startDate: string; endDate: string; guests: string }): string => {
      const { startDate, endDate, guests } = params;
      return `Votre demande du ${startDate} au ${endDate} (${guests}) est en attente de validation.`;
    },
    /**
     * Message broadcast aux propriétaires (observers) annonçant une nouvelle demande.
     */
    newRequestForOwners: (params: { subMemberName: string | null; ownerName: string; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      return `Nouvelle demande pour ${target}, du ${startDate} au ${endDate} (${guests}).`;
    },
    /**
     * Message destiné aux validateurs (admins + owners éditeurs) avec demande de validation.
     */
    newRequestForValidators: (params: { subMemberName: string | null; ownerName: string; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      return `Nouvelle demande pour ${target}, du ${startDate} au ${endDate} (${guests}). Validation requise.`;
    },
    statusConfirmedTitle: "Séjour confirmé",
    statusRejectedTitle: "Demande refusée",
    statusPendingTitle: "Demande en attente",
    /**
     * Message pour les propriétaires observateurs décrivant le changement de statut.
     */
    statusForOwnerObservers: (params: {
      subMemberName: string | null;
      ownerName: string;
      status: "pending" | "confirmed" | "rejected";
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { subMemberName, ownerName, status, startDate, endDate, guests } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      if (status === "confirmed") {
        return `Le séjour de ${target}, du ${startDate} au ${endDate} (${guests}), est confirmé.`;
      }
      if (status === "rejected") {
        return `La demande de ${target}, du ${startDate} au ${endDate} (${guests}), a été refusée.`;
      }
      return `La demande de ${target}, du ${startDate} au ${endDate} (${guests}), est en attente de validation.`;
    },
    /**
     * Message pour les validateurs décrivant le changement de statut et l'action requise le cas échéant.
     */
    statusForValidators: (params: {
      subMemberName: string | null;
      ownerName: string;
      status: "pending" | "confirmed" | "rejected";
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { subMemberName, ownerName, status, startDate, endDate, guests } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      if (status === "confirmed") {
        return `Le séjour de ${target}, du ${startDate} au ${endDate} (${guests}), est confirmé.`;
      }
      if (status === "rejected") {
        return `La demande de ${target}, du ${startDate} au ${endDate} (${guests}), a été refusée.`;
      }
      return `La demande de ${target}, du ${startDate} au ${endDate} (${guests}), est en attente. Action de validation requise.`;
    },
    /**
     * Préfixe réutilisable pour construire le corps des messages de statut
     * en distinguant le destinataire (owner / sub_member).
     */
    statusBodyPrefix: (params: {
      recipient: "owner" | "sub_member";
      subMemberName: string | null;
      startDate: string;
      endDate: string;
      guests: string;
    }): { demand: string; stay: string } => {
      const { recipient, subMemberName, startDate, endDate, guests } = params;
      const demand =
        subMemberName && recipient === "owner"
          ? `La demande de ${subMemberName}, du ${startDate} au ${endDate}, pour ${guests}`
          : `Votre demande du ${startDate} au ${endDate}, pour ${guests}`;
      const stay =
        subMemberName && recipient === "owner"
          ? `Le séjour de ${subMemberName}, du ${startDate} au ${endDate}, pour ${guests}`
          : `Votre séjour du ${startDate} au ${endDate}, pour ${guests}`;
      return { demand, stay };
    },
    completedTitle: "Séjour terminé — Récapitulatif",
    /**
     * En-tête pour le message de récapitulatif de fin de séjour selon le destinataire.
     */
    completedHeader: (params: { recipient: "owner" | "sub_member"; subMemberName: string | null }): string => {
      const { recipient, subMemberName } = params;
      if (recipient === "owner" && subMemberName) {
        return `Séjour de ${subMemberName}`;
      }
      return "Votre séjour";
    },
    /**
     * Message récapitulatif envoyé aux propriétaires observateurs après clôture.
     */
    completedForOwners: (params: {
      subMemberName: string | null;
      ownerName: string;
      startDate: string;
      endDate: string;
      guests: number;
      durationDays: number;
      total: string;
    }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests, durationDays, total } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      return `Séjour terminé pour ${target}, du ${startDate} au ${endDate} (${durationDays} nuit${durationDays > 1 ? "s" : ""}, ${guests} pers.). Total: ${total}.`;
    },
    /**
     * Message récapitulatif envoyé aux validateurs après clôture.
     */
    completedForValidators: (params: {
      subMemberName: string | null;
      ownerName: string;
      startDate: string;
      endDate: string;
      guests: number;
      durationDays: number;
      total: string;
    }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests, durationDays, total } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      return `Séjour clôturé pour ${target}, du ${startDate} au ${endDate} (${durationDays} nuit${durationDays > 1 ? "s" : ""}, ${guests} pers.). Total final: ${total}.`;
    },
    deletedTitle: "Location supprimée",
    /**
     * Message pour le propriétaire principal lorsque sa location est supprimée.
     */
    deletedForOwner: (params: { subMemberName: string | null; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, startDate, endDate, guests } = params;
      if (subMemberName) {
        return `La location de ${subMemberName}, du ${startDate} au ${endDate} (${guests}), a été supprimée.`;
      }
      return `Votre location du ${startDate} au ${endDate} (${guests}) a été supprimée.`;
    },
    /**
     * Message pour le sous-membre lorsque sa location est supprimée.
     */
    deletedForSubMember: (params: { startDate: string; endDate: string; guests: string }): string => {
      const { startDate, endDate, guests } = params;
      return `Votre location du ${startDate} au ${endDate} (${guests}) a été supprimée.`;
    },
    /**
     * Message broadcast aux propriétaires annonçant la suppression d'une location.
     */
    deletedForOwners: (params: { subMemberName: string | null; ownerName: string; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      return `La location de ${target}, du ${startDate} au ${endDate} (${guests}), a été supprimée.`;
    },
    /**
     * Message envoyé aux validateurs lorsqu'une location est supprimée.
     */
    deletedForValidators: (params: { subMemberName: string | null; ownerName: string; startDate: string; endDate: string; guests: string }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests } = params;
      const target = subMemberName ? `${subMemberName} via ${ownerName}` : ownerName;
      return `Suppression de location: ${target}, du ${startDate} au ${endDate} (${guests}).`;
    },
  },
} as const;
