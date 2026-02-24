// ============================================================
// permissions.ts — Logique d'accès simple basée sur les rôles
// ============================================================

import type { Member } from "../types";

export interface Permissions {
  viewLocations: boolean;
  createLocations: boolean;
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
 * Sub_member / external : calendrier seul, pas les détails
 */
export const getPermissions = (member: Member | null): Permissions => {
  // Pas de membre = pas de droits
  if (!member) {
    return {
      viewLocations: false,
      createLocations: false,
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
      createLocations: isEditor,
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

  // Sub_member / external : calendrier seul
  return {
    viewLocations: false,
    createLocations: false,
    editLocations: false,
    deleteLocations: false,
    viewMembers: false,
    createMembers: false,
    editMembers: false,
    deleteMembers: false,
    viewCalendar: true,
    viewCalendarDetails: false,
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
