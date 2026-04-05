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
  avatar_url: string | null;
  address: string | null;
  last_login: string | null;
  owner_id: string | null;
  is_editor: boolean;
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
