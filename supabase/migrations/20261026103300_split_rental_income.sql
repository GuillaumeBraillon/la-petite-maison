begin;

alter table public.financial_transactions
  add column rental_component text;

drop index public.financial_transactions_active_rental_unique_idx;
alter table public.financial_transactions
  drop constraint financial_transactions_source_link_chk;

insert into public.financial_transactions (
  transaction_type,
  amount,
  transaction_date,
  category_id,
  description,
  source,
  rental_id,
  rental_component,
  recorded_by_member_id,
  voided_at,
  created_at,
  updated_at
)
select
  financial_transaction.transaction_type,
  split.electricity_amount,
  financial_transaction.transaction_date,
  financial_transaction.category_id,
  concat('Électricité de location — ', financial_transaction.description),
  financial_transaction.source,
  financial_transaction.rental_id,
  'electricity',
  financial_transaction.recorded_by_member_id,
  financial_transaction.voided_at,
  financial_transaction.created_at,
  financial_transaction.updated_at
from public.financial_transactions financial_transaction
join public.rentals rental on rental.id = financial_transaction.rental_id
cross join lateral (
  select least(
    greatest(financial_transaction.amount, 0),
    greatest(round(coalesce(rental.electricity_cost, 0), 2), 0)
  ) as electricity_amount
) split
where financial_transaction.source = 'rental'
  and financial_transaction.rental_component is null
  and split.electricity_amount > 0;

update public.financial_transactions financial_transaction
set
  rental_component = 'rent',
  amount = greatest(financial_transaction.amount, 0)
    - least(
      greatest(financial_transaction.amount, 0),
      greatest(round(coalesce(rental.electricity_cost, 0), 2), 0)
    )
from public.rentals rental
where financial_transaction.source = 'rental'
  and financial_transaction.rental_component is null
  and financial_transaction.rental_id = rental.id;

update public.financial_transactions
set rental_component = 'rent'
where source = 'rental'
  and rental_id is null
  and rental_component is null;

alter table public.financial_transactions
  add constraint financial_transactions_source_link_chk
  check (
    (
      source = 'rental'
      and transaction_type = 'income'
      and rental_component is not null
      and rental_component in ('rent', 'electricity')
      and contribution_schedule_id is null
      and contribution_due_date is null
    )
    or (
      source = 'manual'
      and rental_id is null
      and rental_component is null
      and ((contribution_schedule_id is null) = (contribution_due_date is null))
      and (contribution_schedule_id is null or transaction_type = 'income')
    )
  );

create unique index financial_transactions_active_rental_component_unique_idx
  on public.financial_transactions(rental_id, rental_component)
  where source = 'rental'
    and rental_id is not null
    and rental_component is not null
    and voided_at is null;

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
  total_amount numeric(12, 2);
  electricity_amount numeric(12, 2);
  rental_amount numeric(12, 2);
  payment_date date;
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

  total_amount := greatest(coalesce(new.total_price, 0), 0);
  electricity_amount := least(total_amount, greatest(round(coalesce(new.electricity_cost, 0), 2), 0));
  rental_amount := total_amount - electricity_amount;

  if create_payment then
    payment_date := (now() at time zone 'Europe/Paris')::date;
  else
    select transaction_date
    into payment_date
    from public.financial_transactions
    where rental_id = new.id
      and source = 'rental'
      and rental_component = 'rent'
      and voided_at is null
    limit 1;

    payment_date := coalesce(payment_date, (now() at time zone 'Europe/Paris')::date);
  end if;

  insert into public.financial_transactions (
    transaction_type,
    amount,
    transaction_date,
    category_id,
    description,
    source,
    rental_id,
    rental_component,
    recorded_by_member_id
  )
  values (
    'income',
    rental_amount,
    payment_date,
    location_category_id,
    concat('Paiement de location — ', coalesce(owner_label, 'Propriétaire'), ' — ', to_char(new.start_date at time zone 'Europe/Paris', 'DD/MM/YYYY')),
    'rental',
    new.id,
    'rent',
    public.current_member_id()
  )
  on conflict (rental_id, rental_component)
    where source = 'rental' and rental_id is not null and rental_component is not null and voided_at is null
  do update set
    amount = excluded.amount,
    description = excluded.description,
    voided_at = null;

  if electricity_amount > 0 then
    insert into public.financial_transactions (
      transaction_type,
      amount,
      transaction_date,
      category_id,
      description,
      source,
      rental_id,
      rental_component,
      recorded_by_member_id
    )
    values (
      'income',
      electricity_amount,
      payment_date,
      location_category_id,
      concat('Électricité de location — ', coalesce(owner_label, 'Propriétaire'), ' — ', to_char(new.start_date at time zone 'Europe/Paris', 'DD/MM/YYYY')),
      'rental',
      new.id,
      'electricity',
      public.current_member_id()
    )
    on conflict (rental_id, rental_component)
      where source = 'rental' and rental_id is not null and rental_component is not null and voided_at is null
    do update set
      amount = excluded.amount,
      description = excluded.description,
      voided_at = null;
  else
    update public.financial_transactions
    set voided_at = now()
    where rental_id = new.id
      and source = 'rental'
      and rental_component = 'electricity'
      and voided_at is null;
  end if;

  return new;
end;
$$;

commit;
