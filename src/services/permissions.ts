// ============================================================
// permissions.ts — Logique d'accès simple basée sur les rôles
// ============================================================

import type { Member, Rental } from "../types";

export interface Permissions {
  viewLocations: boolean;
  createLocations: boolean;
  /** true = peut choisir n'importe quel statut ; false = forcé à "pending" */
  createWithAnyStatus: boolean;
  editLocations: boolean;
  deleteLocations: boolean;
  viewMembers: boolean;
  createMembers: boolean;
  editMembers: boolean;
  deleteMembers: boolean;
  viewCalendar: boolean;
  viewCalendarDetails: boolean;
  authorizeUsers: boolean;
  /** true = peut marquer une location comme payée (validateur uniquement) */
  togglePayment: boolean;
}

/**
 * Récupère les permissions pour un utilisateur donné
 * Admin : tous les droits
 * Owner + isEditor=true : tous les droits sur locations & members
 * Owner + isEditor=false : peut créer des demandes (pending), voir et éditer ses propres locations (champs limités)
 * Sub_member : voir le calendrier + détails, créer des demandes, éditer ses propres locations (champs limités)
 */
export const getPermissions = (member: Member | null): Permissions => {
  // Pas de membre = pas de droits
  if (!member) {
    return {
      viewLocations: false,
      createLocations: false,
      createWithAnyStatus: false,
      editLocations: false,
      deleteLocations: false,
      viewMembers: false,
      createMembers: false,
      editMembers: false,
      deleteMembers: false,
      viewCalendar: false,
      viewCalendarDetails: false,
      authorizeUsers: false,
      togglePayment: false,
    };
  }

  // Admin : tous les droits
  if (member.role === "admin") {
    return {
      viewLocations: true,
      createLocations: true,
      createWithAnyStatus: true,
      editLocations: true,
      deleteLocations: true,
      viewMembers: true,
      createMembers: true,
      editMembers: true,
      deleteMembers: true,
      viewCalendar: true,
      viewCalendarDetails: true,
      authorizeUsers: true,
      togglePayment: true,
    };
  }

  // Owner : dépend de isEditor
  if (member.role === "owner") {
    const isEditor = member.isEditor;
    return {
      viewLocations: true,
      createLocations: true, // non-éditeur peut créer des demandes (statut = pending)
      createWithAnyStatus: isEditor,
      editLocations: isEditor,
      deleteLocations: isEditor,
      viewMembers: true,
      createMembers: isEditor,
      editMembers: isEditor,
      deleteMembers: isEditor,
      viewCalendar: true,
      viewCalendarDetails: true,
      authorizeUsers: false,
      togglePayment: isEditor,
    };
  }
  // Sub_member : peut voir le calendrier + ses locations, et créer des demandes
  return {
    viewLocations: true,
    createLocations: true,
    createWithAnyStatus: false,
    editLocations: false,
    deleteLocations: false,
    viewMembers: false,
    createMembers: false,
    editMembers: false,
    deleteMembers: false,
    viewCalendar: true,
    viewCalendarDetails: true,
    authorizeUsers: false,
    togglePayment: false,
  };
};

/**
 * Helper pour vérifier une permission spécifique
 */
export const hasPermission = (member: Member | null, permission: keyof Permissions): boolean => {
  const permissions = getPermissions(member);
  return permissions[permission];
};

/**
 * Détermine si une location concerne directement un membre (i.e. ses propres données).
 * Peut être utilisé partout dans l'app pour restreindre la visibilité/édition aux données personnelles.
 * - Admin / owner éditeur : toujours vrai (accès global)
 * - Owner non-éditeur : ses propres locations uniquement (ownerId === member.id)
 * - Sub_member : uniquement les locations où il est membre (subMemberId === member.id)
 *   → ne doit PAS pouvoir accéder aux locations de son owner parent
 */
export const isMemberRental = (member: Member | null, rental: Rental): boolean => {
  if (!member) return false;
  if (getPermissions(member).createWithAnyStatus) return true;
  if (member.role === "owner") return rental.ownerId === member.id;
  if (member.role === "sub_member") {
    // Un `sub_member` ne doit pouvoir agir que sur SES propres locations (subMemberId).
    // Ne pas autoriser l'accès aux locations du owner pour éviter modification non souhaitée.
    return rental.subMemberId === member.id;
  }
  return false;
};
