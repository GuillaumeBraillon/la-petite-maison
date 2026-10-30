create policy "owner_contribution_schedules_delete_unrecorded_editors"
on public.owner_contribution_schedules
for delete
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and not exists (
    select 1
    from public.financial_transactions
    where financial_transactions.contribution_schedule_id = owner_contribution_schedules.id
  )
);
