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
}

/**
 * Récupère les permissions pour un utilisateur donné
 * Admin : tous les droits
 * Owner + isEditor=true : tous les droits sur locations & members
 * Owner + isEditor=false : lecture seule sur tout
 * Sub_member : calendrier seul, pas les détails
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
  };
};

/**
 * Helper pour vérifier une permission spécifique
 */
export const hasPermission = (
  member: Member | null,
  permission: keyof Permissions,
): boolean => {
  const permissions = getPermissions(member);
  return permissions[permission];
};

/**
 * Détermine si une location concerne directement un membre (i.e. ses propres données).
 * Peut être utilisé partout dans l'app pour restreindre la visibilité aux données personnelles.
 * - Admin / owner éditeur : toujours vrai (accès global)
 * - Owner non-éditeur : ses propres locations uniquement
 * - Sub_member : ses locations + les locations de son propriétaire parent
 */
export const isMemberRental = (
  member: Member | null,
  rental: Rental,
): boolean => {
  if (!member) return false;
  if (getPermissions(member).createWithAnyStatus) return true;
  if (member.role === "owner") return rental.ownerId === member.id;
  if (member.role === "sub_member") {
    return (
      rental.subMemberId === member.id || rental.ownerId === member.ownerId
    );
  }
  return false;
};
