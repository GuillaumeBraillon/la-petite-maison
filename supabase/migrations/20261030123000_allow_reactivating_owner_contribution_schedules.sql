create or replace function public.guard_owner_contribution_schedule_deactivation()
returns trigger
language plpgsql
as $$
begin
  if old.is_active = false and new.is_active = true then
    new.deactivated_at := null;
  elsif old.is_active = true and new.is_active = false then
    new.deactivated_at := (now() at time zone 'Europe/Paris')::date;
  elsif old.is_active = false and new.deactivated_at is distinct from old.deactivated_at then
    raise exception 'La date de désactivation d’une configuration historique ne peut pas être modifiée.';
  end if;

  return new;
end;
$$;
