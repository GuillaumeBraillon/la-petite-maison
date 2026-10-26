begin;

create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  name text not null check (length(trim(name)) > 0),
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, transaction_type)
);

create unique index financial_categories_name_unique_idx
  on public.financial_categories(transaction_type, lower(name));

create table public.owner_contribution_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.members(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  frequency text not null check (frequency in ('monthly', 'quarterly', 'annual')),
  start_date date not null,
  end_date date not null,
  payment_day smallint not null default 1 check (payment_day between 1 and 31),
  is_active boolean not null default true,
  deactivated_at date,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_contribution_schedules_date_order_chk check (end_date >= start_date)
);

create index owner_contribution_schedules_owner_idx
  on public.owner_contribution_schedules(owner_id, start_date, end_date);

create or replace function public.prevent_overlapping_owner_contribution_schedules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.owner_id::text));

  if new.is_active and exists (
    select 1
    from public.owner_contribution_schedules existing
    where existing.owner_id = new.owner_id
      and existing.id <> new.id
      and daterange(
        existing.start_date,
        case when existing.is_active then existing.end_date else coalesce(existing.deactivated_at, existing.end_date) end,
        '[]'
      ) && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'Ce propriétaire a déjà une configuration de versements active sur cette période.';
  end if;

  return new;
end;
$$;

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  amount numeric(12, 2) not null,
  transaction_date date,
  category_id uuid not null,
  description text not null default '',
  source text not null default 'manual' check (source in ('manual', 'rental')),
  rental_id uuid references public.rentals(id) on delete set null,
  contribution_schedule_id uuid references public.owner_contribution_schedules(id) on delete restrict,
  contribution_due_date date,
  recorded_by_member_id uuid references public.members(id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_category_type_fk
    foreign key (category_id, transaction_type)
    references public.financial_categories(id, transaction_type)
    on update restrict
    on delete restrict,
  constraint financial_transactions_amount_chk
    check (amount >= 0 and (amount > 0 or source = 'rental')),
  constraint financial_transactions_date_chk
    check (source = 'rental' or transaction_date is not null),
  constraint financial_transactions_source_link_chk
    check (
      (
        source = 'rental'
        and transaction_type = 'income'
        and contribution_schedule_id is null
        and contribution_due_date is null
      )
      or (
        source = 'manual'
        and rental_id is null
        and ((contribution_schedule_id is null) = (contribution_due_date is null))
        and (contribution_schedule_id is null or transaction_type = 'income')
      )
    )
);

create index financial_transactions_date_idx
  on public.financial_transactions(transaction_date)
  where voided_at is null;
create index financial_transactions_category_idx
  on public.financial_transactions(category_id);
create index financial_transactions_rental_idx
  on public.financial_transactions(rental_id)
  where rental_id is not null;
create unique index financial_transactions_active_rental_unique_idx
  on public.financial_transactions(rental_id)
  where source = 'rental' and voided_at is null;
create unique index financial_transactions_active_contribution_unique_idx
  on public.financial_transactions(contribution_schedule_id, contribution_due_date)
  where source = 'manual'
    and contribution_schedule_id is not null
    and voided_at is null;

create trigger trg_financial_categories_set_updated_at
before update on public.financial_categories
for each row
execute function public.set_updated_at();

create trigger trg_owner_contribution_schedules_set_updated_at
before update on public.owner_contribution_schedules
for each row
execute function public.set_updated_at();

create or replace function public.guard_owner_contribution_schedule_deactivation()
returns trigger
language plpgsql
as $$
begin
  if old.is_active = false and new.is_active = true then
    raise exception 'Une configuration de versements désactivée ne peut pas être réactivée.';
  end if;

  if old.is_active = true and new.is_active = false then
    new.deactivated_at := (now() at time zone 'Europe/Paris')::date;
  end if;

  if old.is_active = false and new.deactivated_at is distinct from old.deactivated_at then
    raise exception 'La date de désactivation d’une configuration historique ne peut pas être modifiée.';
  end if;

  return new;
end;
$$;

create trigger trg_owner_contribution_schedules_guard_deactivation
before update on public.owner_contribution_schedules
for each row
execute function public.guard_owner_contribution_schedule_deactivation();

create trigger trg_owner_contribution_schedules_prevent_overlap
before insert or update on public.owner_contribution_schedules
for each row
execute function public.prevent_overlapping_owner_contribution_schedules();

create trigger trg_financial_transactions_set_updated_at
before update on public.financial_transactions
for each row
execute function public.set_updated_at();

insert into public.financial_categories (transaction_type, name, is_system)
select seed.transaction_type, seed.name, true
from (
  values
    ('income', 'Locations'),
    ('income', 'Versements des propriétaires'),
    ('income', 'Autres revenus'),
    ('expense', 'Électricité'),
    ('expense', 'Impôts et taxes'),
    ('expense', 'Achats et équipements'),
    ('expense', 'Entretien et réparations'),
    ('expense', 'Autres dépenses')
) as seed(transaction_type, name)
where not exists (
  select 1
  from public.financial_categories existing
  where existing.transaction_type = seed.transaction_type
    and lower(existing.name) = lower(seed.name)
);

create or replace function public.financial_payment_date_from_notes(note_text text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  match_parts text[];
  candidate_date date;
  payment_date date;
begin
  for match_parts in
    select regexp_matches(
      coalesce(note_text, ''),
      'Payé le ([0-9]{2}/[0-9]{2}/[0-9]{4})',
      'g'
    )
  loop
    begin
      candidate_date := to_date(match_parts[1], 'DD/MM/YYYY');
      if to_char(candidate_date, 'DD/MM/YYYY') = match_parts[1] then
        payment_date := candidate_date;
      end if;
    exception
      when datetime_field_overflow or invalid_datetime_format then
        null;
    end;
  end loop;

  return payment_date;
end;
$$;

do $$
declare
  undated_paid_rentals integer;
begin
  select count(*)
  into undated_paid_rentals
  from public.rentals
  where is_paid = true
    and public.financial_payment_date_from_notes(notes) is null;

  if undated_paid_rentals > 0 then
    raise notice '% location(s) marquée(s) payée(s) ne contiennent pas de date reconnue dans notes; elles seront importées sans date et signalées dans Finances.',
      undated_paid_rentals;
  end if;
end;
$$;

insert into public.financial_transactions (
  transaction_type,
  amount,
  transaction_date,
  category_id,
  description,
  source,
  rental_id
)
select
  'income',
  coalesce(r.total_price, 0),
  public.financial_payment_date_from_notes(r.notes),
  category.id,
  concat('Paiement de location importé — ', owner.label, ' — ', to_char(r.start_date at time zone 'Europe/Paris', 'DD/MM/YYYY')),
  'rental',
  r.id
from public.rentals r
join public.members owner on owner.id = r.owner_id
cross join public.financial_categories category
where r.is_paid = true
  and category.transaction_type = 'income'
  and lower(category.name) = lower('Locations')
  and not exists (
    select 1
    from public.financial_transactions existing
    where existing.rental_id = r.id
      and existing.source = 'rental'
      and existing.voided_at is null
  );

create or replace function public.sync_rental_financial_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  location_category_id uuid;
  owner_label text;
  create_payment boolean;
begin
  select id
  into location_category_id
  from public.financial_categories
  where transaction_type = 'income'
    and lower(name) = lower('Locations')
  limit 1;

  if location_category_id is null then
    raise exception 'La catégorie financière « Locations » est introuvable.';
  end if;

  select label
  into owner_label
  from public.members
  where id = new.owner_id;

  if tg_op = 'INSERT' then
    if not new.is_paid then
      return new;
    end if;
    create_payment := true;
  else
    if old.is_paid and not new.is_paid then
      update public.financial_transactions
      set voided_at = now()
      where rental_id = new.id
        and source = 'rental'
        and voided_at is null;
      return new;
    end if;

    if not new.is_paid then
      return new;
    end if;

    create_payment := not old.is_paid;
  end if;

  if create_payment then
    insert into public.financial_transactions (
      transaction_type,
      amount,
      transaction_date,
      category_id,
      description,
      source,
      rental_id,
      recorded_by_member_id
    )
    values (
      'income',
      coalesce(new.total_price, 0),
      (now() at time zone 'Europe/Paris')::date,
      location_category_id,
      concat('Paiement de location — ', coalesce(owner_label, 'Propriétaire'), ' — ', to_char(new.start_date at time zone 'Europe/Paris', 'DD/MM/YYYY')),
      'rental',
      new.id,
      public.current_member_id()
    )
    on conflict (rental_id) where source = 'rental' and voided_at is null
    do update set
      amount = excluded.amount,
      transaction_date = excluded.transaction_date,
      voided_at = null;
    return new;
  end if;

  update public.financial_transactions
  set amount = coalesce(new.total_price, 0)
  where rental_id = new.id
    and source = 'rental'
    and voided_at is null;

  return new;
end;
$$;

create trigger trg_sync_rental_financial_transaction
after insert or update of is_paid, price, electricity_cost, total_price
on public.rentals
for each row
execute function public.sync_rental_financial_transaction();

alter table public.financial_categories enable row level security;
alter table public.owner_contribution_schedules enable row level security;
alter table public.financial_transactions enable row level security;

create policy "financial_categories_select_owners_admins"
on public.financial_categories
for select
using (
  public.current_member_is_allowed()
  and public.current_member_role() in ('admin', 'owner')
);

create policy "financial_categories_insert_editors"
on public.financial_categories
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and is_system = false
  and created_by_member_id = public.current_member_id()
);

create policy "financial_categories_update_editors"
on public.financial_categories
for update
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and is_system = false
)
with check (is_system = false);

create policy "financial_categories_delete_editors"
on public.financial_categories
for delete
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and is_system = false
);

create policy "owner_contribution_schedules_select_owners_admins"
on public.owner_contribution_schedules
for select
using (
  public.current_member_is_allowed()
  and public.current_member_role() in ('admin', 'owner')
);

create policy "owner_contribution_schedules_insert_editors"
on public.owner_contribution_schedules
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and created_by_member_id = public.current_member_id()
  and exists (
    select 1
    from public.members eligible_owner
    where eligible_owner.id = owner_contribution_schedules.owner_id
      and eligible_owner.role = 'owner'
      and eligible_owner.is_allowed = true
  )
);

create policy "owner_contribution_schedules_update_editors"
on public.owner_contribution_schedules
for update
using (public.current_member_is_admin() or public.current_member_is_owner_editor())
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and exists (
    select 1
    from public.members eligible_owner
    where eligible_owner.id = owner_contribution_schedules.owner_id
      and eligible_owner.role = 'owner'
      and eligible_owner.is_allowed = true
  )
);

create policy "financial_transactions_select_owners_admins"
on public.financial_transactions
for select
using (
  public.current_member_is_allowed()
  and public.current_member_role() in ('admin', 'owner')
);

create policy "financial_transactions_insert_editors"
on public.financial_transactions
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
  and transaction_date is not null
  and recorded_by_member_id = public.current_member_id()
  and exists (
    select 1
    from public.financial_categories category
    where category.id = category_id
      and category.transaction_type = financial_transactions.transaction_type
      and category.is_active = true
      and lower(trim(category.name)) <> lower('Locations')
  )
);

create policy "financial_transactions_update_editors"
on public.financial_transactions
for update
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
)
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
  and transaction_date is not null
  and exists (
    select 1
    from public.financial_categories category
    where category.id = category_id
      and category.transaction_type = financial_transactions.transaction_type
      and category.is_active = true
      and lower(trim(category.name)) <> lower('Locations')
  )
);

commit;
