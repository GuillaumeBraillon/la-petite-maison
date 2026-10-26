begin;

create or replace function public.guard_financial_category_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id
    or new.transaction_type is distinct from old.transaction_type
    or new.is_system is distinct from old.is_system then
    raise exception 'L’identifiant, le type et le statut système d’une catégorie ne peuvent pas être modifiés.';
  end if;

  return new;
end;
$$;

create trigger trg_financial_categories_guard_identity
before update of id, transaction_type, is_system on public.financial_categories
for each row
execute function public.guard_financial_category_identity();

drop policy if exists "financial_categories_update_editors" on public.financial_categories;

create policy "financial_categories_update_editors"
on public.financial_categories
for update
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and not (
    transaction_type = 'income'
    and lower(trim(name)) in (lower('Locations'), lower('Versements des propriétaires'))
  )
)
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and not (
    transaction_type = 'income'
    and lower(trim(name)) in (lower('Locations'), lower('Versements des propriétaires'))
  )
);

commit;
