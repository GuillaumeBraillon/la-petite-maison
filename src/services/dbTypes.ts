// ============================================================
// dbTypes.ts — Reflet exact des tables Supabase (snake_case)
// NE PAS utiliser ces types dans les composants React.
// Conversion via apiMappers.ts uniquement.
// ============================================================

export interface DbMember {
  id: string;
  is_allowed: boolean;
  label: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  email: string;
  avatar_url: string | null;
  address: string | null;
  owner_id: string | null;
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
  electricity_start: number | null;
  electricity_end: number | null;
  created_at: string;
  updated_at: string;
}
