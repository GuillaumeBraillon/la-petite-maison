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
    deleted: (fullName: string) => ({
      title: "Membre supprimé",
      message: `${fullName} a été supprimé.`,
    }),
    deleteError: {
      title: "Erreur",
      message: "Impossible de supprimer le membre.",
    },
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
  rental: {
    newRequestTitle: "Nouvelle demande de location",
    newRequestForEditors: (params: {
      subMemberName: string | null;
      ownerName: string;
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { subMemberName, ownerName, startDate, endDate, guests } = params;
      if (subMemberName) {
        return `Nouvelle demande de ${subMemberName} via ${ownerName}, du ${startDate} au ${endDate} (${guests}). Elle est en attente de validation.`;
      }
      return `Nouvelle demande de ${ownerName}, du ${startDate} au ${endDate} (${guests}). Elle est en attente de validation.`;
    },
    newRequestForOwner: (params: {
      subMemberName: string | null;
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { subMemberName, startDate, endDate, guests } = params;
      if (subMemberName) {
        return `La demande de ${subMemberName}, du ${startDate} au ${endDate} (${guests}), est en attente de validation.`;
      }
      return `Votre demande du ${startDate} au ${endDate} (${guests}) est en attente de validation.`;
    },
    newRequestForSubMember: (params: {
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { startDate, endDate, guests } = params;
      return `Votre demande du ${startDate} au ${endDate} (${guests}) est en attente de validation.`;
    },
    statusConfirmedTitle: "Séjour confirmé",
    statusRejectedTitle: "Demande refusée",
    statusPendingTitle: "Demande en attente",
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
    completedHeader: (params: {
      recipient: "owner" | "sub_member";
      subMemberName: string | null;
    }): string => {
      const { recipient, subMemberName } = params;
      if (recipient === "owner" && subMemberName) {
        return `Séjour de ${subMemberName}`;
      }
      return "Votre séjour";
    },
    deletedTitle: "Location supprimée",
    deletedForOwner: (params: {
      subMemberName: string | null;
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { subMemberName, startDate, endDate, guests } = params;
      if (subMemberName) {
        return `La location de ${subMemberName}, du ${startDate} au ${endDate} (${guests}), a été supprimée.`;
      }
      return `Votre location du ${startDate} au ${endDate} (${guests}) a été supprimée.`;
    },
    deletedForSubMember: (params: {
      startDate: string;
      endDate: string;
      guests: string;
    }): string => {
      const { startDate, endDate, guests } = params;
      return `Votre location du ${startDate} au ${endDate} (${guests}) a été supprimée.`;
    },
  },
} as const;
