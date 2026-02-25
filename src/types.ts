// ============================================================
// types.ts — Source de vérité unique pour toutes les interfaces
// ============================================================

export type MemberRole = "admin" | "owner" | "sub_member";
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
  /** Email — optionnel */
  email?: string;
  /** Avatar profil (Google) — optionnel */
  avatarUrl?: string;
  /** Date ISO de la dernière connexion — optionnel */
  lastLogin?: string;
  /** Adresse postale — optionnelle */
  address?: string;
  /** Lien vers le propriétaire parent (pour sub_member) */
  ownerId?: string;
  /** Pour role="owner" : true = peut éditer locations&membres, false = lecture seule */
  isEditor: boolean;
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
  /** Coût électricité (€) */
  electricityCost?: number;
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
