// ============================================================
// types.ts — Source de vérité unique pour toutes les interfaces
// ============================================================

export type MemberRole = "admin" | "owner" | "sub_member";
export type RentalStatus = "pending" | "confirmed" | "rejected" | "completed";
export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_rejected"
  | "rental_reminder"
  | "rental_completed"
  | "request_pending";

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
  /** Enfant / sous-membre */
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
  /** Total final (tarif location + coût électrique) — modifiable en clôture */
  totalPrice?: number;
  /** Date de début réelle (si différente de la date prévue — départ anticipé, arrivée tardive…) */
  actualStartDate?: string;
  /** Date de fin réelle (si différente de la date prévue) */
  actualEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Push notifications
// ------------------------------------------------------------

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  isRead: boolean;
  createdAt: string;
}

// ------------------------------------------------------------
// Errors
// ------------------------------------------------------------

export interface AppError {
  message: string;
  code?: string;
  context?: string;
}
