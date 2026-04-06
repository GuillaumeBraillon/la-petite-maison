import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ParsedChangelog } from "./services/changelogParser";

// ============================================================
// types.ts — Source de vérité unique pour toutes les interfaces
// ============================================================

export type MemberRole = "admin" | "owner" | "sub_member";
export type RentalStatus = "pending" | "confirmed" | "rejected" | "completed";
export type RentalStatusFilter = "all" | RentalStatus;
export type RentalPaymentFilter = "all" | "paid" | "unpaid";
export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_rejected"
  | "rental_completed"
  | "rental_deleted"
  | "rental_paid"
  | "request_pending"
  | "app_updated";

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
  /** Provider d'authentification Supabase (`google`, `email`, ...) */
  authProvider?: string;
  /** Avatar profil (Google) — optionnel */
  avatarUrl?: string;
  /** Date ISO de la dernière connexion — optionnel */
  lastLogin?: string;
  /** Adresse postale — optionnelle */
  address?: string;
  /** Lien vers le propriétaire parent (pour sub_member) */
  ownerId?: string;
  /** Pour role="owner" : true = peut valider locations&membres, false = lecture seule */
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
  /** Enfant / membre */
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
  /** Paiement confirmé par le validateur */
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}
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

// ------------------------------------------------------------
// Page props partagées
// ------------------------------------------------------------

export interface BasePageProps {
  currentMember?: Member;
  onRefresh: () => Promise<void>;
}

export interface MembersPageSharedProps extends BasePageProps {
  members: Member[];
}

export interface RentalsMembersPageSharedProps extends BasePageProps {
  rentals: Rental[];
  members: Member[];
}

export interface DashboardPageProps extends RentalsMembersPageSharedProps {
  onOpenRentalsWithStatus?: (status: RentalStatus, ownerId?: string) => void;
  onOpenRentalsWithPayment?: (payment: RentalPaymentFilter) => void;
}

export interface RentalsPageProps extends RentalsMembersPageSharedProps {
  initialStatusFilter?: RentalStatusFilter;
  initialOwnerFilter?: string | "all";
  initialPaymentFilter?: RentalPaymentFilter;
}

// ------------------------------------------------------------
// Form values partagées
// ------------------------------------------------------------

export type MemberFormValues = Omit<Member, "id" | "createdAt" | "updatedAt">;
export type RentalFormValues = Omit<Rental, "id" | "createdAt" | "updatedAt">;

export interface CreateSubMemberInput {
  firstName: string;
  lastName: string;
  label: string;
  role: "sub_member";
  ownerId?: string;
}

// ------------------------------------------------------------
// Component props partagées
// ------------------------------------------------------------

export interface CalendarViewProps {
  rentals: Rental[];
  members: Member[];
  onRentalClick?: (rental: Rental) => void;
  onCreateClick?: () => void;
  onDayClick?: (date: Date) => void;
}

export interface CalendarCellProps {
  date: Date;
  rentals: Rental[];
  memberIndex: Map<string, Member>;
  isToday: boolean;
  isCurrentMonth: boolean;
  onRentalClick?: (rental: Rental) => void;
  onDayClick?: (date: Date) => void;
}

export interface RentalBadgeProps {
  rental: Rental;
  owner?: Member;
  labelOverride?: string;
  cellDate?: Date;
  onClick?: (rental: Rental) => void;
}

export type AvatarSize = "xs" | "sm" | "md";
export type AvatarInitialSource = "firstName" | "lastName" | "all";

export interface AvatarProps {
  member?: Pick<Member, "firstName" | "lastName" | "avatarUrl">;
  owner?: Pick<Member, "firstName" | "lastName" | "avatarUrl">;
  subMember?: Pick<Member, "firstName" | "lastName" | "avatarUrl">;
  alt?: string;
  size?: AvatarSize;
  fallbackInitialSource?: AvatarInitialSource;
  className?: string;
  showFallback?: boolean;
}

export interface DashboardStatsProps {
  rentals: Rental[];
  members: Member[];
  currentMember?: Member;
  onStatusCardClick?: (status: RentalStatus, ownerId?: string) => void;
  onPaymentCardClick?: (payment: RentalPaymentFilter) => void;
}

export interface MemberFormProps {
  initialValues?: Partial<MemberFormValues>;
  members?: Member[];
  canEdit?: boolean;
  canToggleAuth?: boolean;
  onSubmit: (values: MemberFormValues) => Promise<void>;
  onAuthorize?: (email: string, values: MemberFormValues) => Promise<void>;
  onToggleAuthorization?: (isAllowed: boolean, values: MemberFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export interface MemberCardProps {
  member: Member;
  ownerName?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canSendPasswordReset?: boolean;
  onSendPasswordReset?: (member: Member) => void;
  sendingPasswordReset?: boolean;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

export interface MemberListProps {
  members: Member[];
  canEdit?: boolean;
  canDelete?: boolean;
  canSendPasswordReset?: boolean;
  onSendPasswordReset?: (member: Member) => void;
  sendingPasswordResetForId?: string | null;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

export interface RentalFormProps {
  initialValues?: Partial<RentalFormValues>;
  members: Member[];
  canEdit?: boolean;
  isEditing?: boolean;
  currentMember?: Member;
  onSubmit: (values: RentalFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  onCreateSubMember?: (data: CreateSubMemberInput) => Promise<Member>;
}

export interface RentalCardProps {
  rental: Rental;
  owner?: Member;
  subMember?: Member;
  canEdit?: boolean;
  canDelete?: boolean;
  canTogglePayment?: boolean;
  onClick?: (rental: Rental) => void;
  onEdit?: (rental: Rental) => void;
  onDelete?: (rental: Rental) => void;
  onTogglePayment?: (rental: Rental) => void;
}

export interface RentalListProps {
  rentals: Rental[];
  members: Member[];
  currentMember?: Member | null;
  onClick?: (rental: Rental) => void;
  onEdit?: (rental: Rental) => void;
  onDelete?: (rental: Rental) => void;
  onTogglePayment?: (rental: Rental) => void;
}

export interface RentalDetailProps {
  rental: Rental;
  owner?: Member;
  subMember?: Member;
  canEdit?: boolean;
  canDelete?: boolean;
  canEditStatus?: boolean;
  canTogglePayment?: boolean;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onStatusChange: (rentalId: string, newStatus: RentalStatus) => Promise<void>;
  onTogglePayment?: (rental: Rental) => void;
}

export interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  compact?: boolean;
}

export interface LoginViewProps {
  onLoginGoogle: () => void;
  onLoginEmail: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onResetPassword: (email: string) => void;
  loadingGoogle: boolean;
  loadingEmail: boolean;
  loadingSignUp: boolean;
  loadingReset: boolean;
  error?: string | null;
  info?: string | null;
}

export interface ResetPasswordViewProps {
  onSubmit: (password: string) => void;
  onContinue: () => void;
  loading: boolean;
  error?: string | null;
  success?: string | null;
}

export interface UnauthorizedViewProps {
  userEmail?: string;
  onLogout: () => void;
}

export interface ErrorDisplayProps {
  error: AppError;
  onDismiss?: () => void;
  className?: string;
}

export type FilterOption = { value: string; label: string };

export interface SelectControl {
  id: string;
  label: string;
  type: "select";
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  controls: SelectControl[];
  onReset?: () => void;
  label?: string;
}

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export interface NotificationToggleProps {
  className?: string;
  compact?: boolean;
}

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface ComboboxProps {
  label?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (id: string) => void;
  onCreate?: (searchText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface UserMenuProps {
  userEmail?: string;
  currentMember?: Member | null;
  onLogout: () => void;
  session: Session | null;
  appVersion?: string;
  className?: string;
  compact?: boolean;
}

export interface ErrorModalProps {
  error: AppError;
  onClose: () => void;
}

export interface WhatsNewModalProps {
  entries: ParsedChangelog[];
  onDismiss: () => void;
}

export interface UserInfoCardProps {
  currentMember?: Member | null;
  session: Session | null;
  onLogout: () => void;
  appVersion?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorProviderProps {
  children: ReactNode;
}

export interface ToastProviderProps {
  children: ReactNode;
}

export interface AppShellProps {
  session: Session;
}

// ------------------------------------------------------------
// Page publique
// ------------------------------------------------------------

export interface PublicPageContent {
  title: string;
  subtitle?: string;
  description?: string;
  practicalInfo?: string;
  updatedAt: string;
}

export interface PublicPageImage {
  id: string;
  storagePath: string;
  publicUrl: string;
  caption?: string;
  position: number;
  createdAt: string;
}

export type PublicPageData = {
  content: PublicPageContent;
  images: PublicPageImage[];
};

export interface PublicPageViewProps {
  content: PublicPageContent;
  images: PublicPageImage[];
  canEdit: boolean;
  hasSession: boolean;
  onEditClick: () => void;
}

export interface PublicPageEditorProps {
  content: PublicPageContent;
  images: PublicPageImage[];
  saving: boolean;
  onSave: (updates: Partial<Pick<PublicPageContent, "title" | "subtitle" | "description" | "practicalInfo">>) => Promise<void>;
  onAddImage: (file: File) => Promise<void>;
  onDeleteImage: (image: PublicPageImage) => Promise<void>;
  onCancel: () => void;
}

export interface PublicPageImageGridProps {
  images: PublicPageImage[];
  editMode?: boolean;
  uploading?: boolean;
  onAdd?: (file: File) => Promise<void>;
  onDelete?: (image: PublicPageImage) => Promise<void>;
}
