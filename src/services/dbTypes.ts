// ============================================================
// dbTypes.ts — Reflet exact des tables Supabase (snake_case)
// NE PAS utiliser ces types dans les composants React.
// Conversion via apiMappers.ts uniquement.
// ============================================================

export interface DbMember {
  id: string;
  auth_user_id: string | null;
  is_allowed: boolean;
  label: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string | null;
  auth_provider: string | null;
  avatar_url: string | null;
  address: string | null;
  last_login: string | null;
  last_inactive_reminder_at: string | null;
  owner_id: string | null;
  is_editor: boolean;
  email_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRental {
  id: string;
  start_date: string;
  end_date: string;
  owner_id: string;
  sub_member_id: string | null;
  guest_count: number;
  price: number;
  status: string;
  notes: string | null;
  electricity_cost: number | null;
  total_price: number | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFinancialCategory {
  id: string;
  transaction_type: string;
  name: string;
  is_system: boolean;
  is_active: boolean;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFinancialTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  transaction_date: string | null;
  category_id: string;
  description: string;
  source: string;
  owner_id: string | null;
  rental_id: string | null;
  rental_component: string | null;
  contribution_schedule_id: string | null;
  contribution_due_date: string | null;
  recorded_by_member_id: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOwnerContributionSchedule {
  id: string;
  owner_id: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string;
  payment_day: number;
  is_active: boolean;
  deactivated_at: string | null;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface DbUserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbPublicPage {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  practical_info: string | null;
  updated_at: string;
}

export interface DbPublicPageImage {
  id: string;
  storage_path: string;
  caption: string | null;
  position: number;
  created_at: string;
}

export interface DbFeedbackMessage {
  id: string;
  author_id: string | null;
  category: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFeedbackVote {
  id: string;
  message_id: string;
  member_id: string;
  value: number;
  created_at: string;
}
