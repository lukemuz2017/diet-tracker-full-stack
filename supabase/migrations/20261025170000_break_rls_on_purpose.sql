-- ON PURPOSE, for the brief's "watch the test fail first": replaces the
-- log_entries policy with one that lets any signed-in person read and write
-- every row. Reverted by the next migration (20261025171000_restore_rls.sql).
drop policy "Own log entries" on public.log_entries;

create policy "BROKEN: everyone sees every entry" on public.log_entries for all to authenticated
  using (true)
  with check (true);
