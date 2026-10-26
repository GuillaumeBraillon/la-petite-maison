begin;

alter table public.financial_transactions
  add column owner_id uuid references public.members(id) on delete set null;

update public.financial_transactions transaction_row
set owner_id = coalesce(
  (select rental.owner_id from public.rentals rental where rental.id = transaction_row.rental_id),
  (
    select schedule.owner_id
    from public.owner_contribution_schedules schedule
    where schedule.id = transaction_row.contribution_schedule_id
  )
)
where transaction_row.owner_id is null
  and (transaction_row.rental_id is not null or transaction_row.contribution_schedule_id is not null);

create or replace function public.validate_financial_transaction_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_owner_id uuid;
begin
  if new.rental_id is not null then
    select owner_id
    into linked_owner_id
    from public.rentals
    where id = new.rental_id;

    if linked_owner_id is not null then
      new.owner_id := linked_owner_id;
    end if;
  elsif new.contribution_schedule_id is not null then
    select owner_id
    into linked_owner_id
    from public.owner_contribution_schedules
    where id = new.contribution_schedule_id;

    if linked_owner_id is null then
      raise exception 'La configuration de versements est introuvable.';
    end if;

    if new.owner_id is not null and new.owner_id <> linked_owner_id then
      raise exception 'Le propriétaire ne correspond pas à la configuration de versements.';
    end if;

    new.owner_id := linked_owner_id;
  elsif new.owner_id is not null and not exists (
    select 1
    from public.members eligible_owner
    where eligible_owner.id = new.owner_id
      and eligible_owner.role = 'owner'
      and eligible_owner.is_allowed = true
  ) then
    raise exception 'Le propriétaire sélectionné n’est pas autorisé.';
  end if;

  return new;
end;
$$;

create trigger trg_financial_transactions_validate_owner
before insert or update of owner_id, rental_id, contribution_schedule_id
on public.financial_transactions
for each row
execute function public.validate_financial_transaction_owner();

drop policy if exists "financial_transactions_insert_editors" on public.financial_transactions;
create policy "financial_transactions_insert_editors"
on public.financial_transactions
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
  and transaction_date is not null
  and recorded_by_member_id = public.current_member_id()
  and (
    owner_id is null
    or exists (
      select 1
      from public.members eligible_owner
      where eligible_owner.id = financial_transactions.owner_id
        and eligible_owner.role = 'owner'
        and eligible_owner.is_allowed = true
    )
  )
  and (
    contribution_schedule_id is null
    or exists (
      select 1
      from public.owner_contribution_schedules schedule
      where schedule.id = financial_transactions.contribution_schedule_id
        and schedule.owner_id = financial_transactions.owner_id
    )
  )
  and exists (
    select 1
    from public.financial_categories category
    where category.id = category_id
      and category.transaction_type = financial_transactions.transaction_type
      and category.is_active = true
      and lower(trim(category.name)) <> lower('Locations')
  )
);

drop policy if exists "financial_transactions_update_editors" on public.financial_transactions;
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
  and (
    owner_id is null
    or exists (
      select 1
      from public.members eligible_owner
      where eligible_owner.id = financial_transactions.owner_id
        and eligible_owner.role = 'owner'
        and eligible_owner.is_allowed = true
    )
  )
  and (
    contribution_schedule_id is null
    or exists (
      select 1
      from public.owner_contribution_schedules schedule
      where schedule.id = financial_transactions.contribution_schedule_id
        and schedule.owner_id = financial_transactions.owner_id
    )
  )
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
