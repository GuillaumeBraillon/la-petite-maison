// ============================================================
// permissions.ts — Logique d'accès simple basée sur les rôles
// ============================================================

import type { Member, Rental } from "../types";

export interface Permissions {
  viewLocations: boolean;
  createLocations: boolean;
  /** true = peut choisir n'importe quel statut ; false = forcé à "pending" */
  createWithAnyStatus: boolean;
  /** true = possède au moins un périmètre d'édition sur les locations */
  editLocations: boolean;
  /** true = possède au moins un périmètre de suppression sur les locations */
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

export interface RentalActionPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canEditStatus: boolean;
  canTogglePayment: boolean;
}

/**
 * Récupère les permissions pour un utilisateur donné
 * Admin : tous les droits
 * Owner + isEditor=true : tous les droits sur les locations et les membres
 * Owner + isEditor=false : peut créer des demandes (pending) et agir sur les locations de son périmètre
 * Sub_member : peut créer des demandes, voir les locations globales, et agir uniquement sur ses propres locations
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
      editLocations: true,
      deleteLocations: true,
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
    editLocations: true,
    deleteLocations: true,
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
 * Détermine si une location est dans le périmètre d'action du membre connecté.
 * - Admin : accès global
 * - Owner éditeur : accès global
 * - Owner non éditeur : locations rattachées à son `ownerId`
 * - Sub_member : locations rattachées à son `subMemberId`
 */
export const isRentalInMemberScope = (member: Member | null, rental: Rental): boolean => {
  if (!member) return false;
  if (member.role === "admin") return true;
  if (member.role === "owner") return member.isEditor ? true : rental.ownerId === member.id;
  if (member.role === "sub_member") return rental.subMemberId === member.id;
  return false;
};

export const getRentalActionPermissions = (member: Member | null, rental: Rental): RentalActionPermissions => {
  if (!member) {
    return {
      canEdit: false,
      canDelete: false,
      canEditStatus: false,
      canTogglePayment: false,
    };
  }

  if (member.role === "admin") {
    return {
      canEdit: true,
      canDelete: true,
      canEditStatus: true,
      canTogglePayment: true,
    };
  }

  const inScope = isRentalInMemberScope(member, rental);
  const isOwnerEditor = member.role === "owner" && member.isEditor;
  const canValidateScopedRental = isOwnerEditor && inScope;

  return {
    canEdit: inScope,
    canDelete: inScope,
    canEditStatus: canValidateScopedRental,
    canTogglePayment: canValidateScopedRental,
  };
};

export const canCreateInlineSubMember = (member: Member | null): boolean => {
  if (!member) return false;
  return member.role === "admin" || member.role === "owner";
};
