// ============================================================
// types.ts — Source de vérité unique pour toutes les interfaces
// ============================================================

export type MemberRole = "admin" | "owner" | "sub_member" | "external";
export type MemberStatus = "family" | "friends" | "other";
export type RentalStatus = "pending" | "confirmed" | "rejected" | "completed";

// ------------------------------------------------------------
// Member
// ------------------------------------------------------------

export interface Member {
  id: string;
  /** Autorisation d'accès à l'application (whitelist) */
  isAllowed: boolean;
  /** Libellé éditable, ex: "Copine de Nicole" */
  label: string;
  firstName: string;
  lastName: string;
  role: MemberRole;
  status: MemberStatus;
  email: string;
  /** Avatar profil (Google) — optionnel */
  avatarUrl?: string;
  /** Adresse postale — optionnelle */
  address?: string;
  /** Lien vers le propriétaire parent (pour sub_member / external) */
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Rental
// ------------------------------------------------------------

export interface Rental {
  id: string;
  /** ISO date — par défaut dimanche midi */
  startDate: string;
  /** ISO date — par défaut dimanche midi suivant */
  endDate: string;
  /** Propriétaire principal */
  ownerId: string;
  /** Enfant / sous-membre / locataire */
  subMemberId?: string;
  /** Nombre de personnes */
  guestCount: number;
  /** Tarif libre */
  price: number;
  status: RentalStatus;
  /** Commentaires post-location */
  notes?: string;
  electricityStart?: number;
  electricityEnd?: number;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Errors
// ------------------------------------------------------------

export interface AppError {
  message: string;
  code?: string;
  context?: string;
}
