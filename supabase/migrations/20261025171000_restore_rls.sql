-- Undoes 20261025170000_break_rls_on_purpose.sql: back to "a person sees and
-- changes only their own log entries". The Playwright test failed while the
-- broken policy was in place (user A's meals showed user B's food) and
-- passes again with this one.
drop policy "BROKEN: everyone sees every entry" on public.log_entries;

create policy "Own log entries" on public.log_entries for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));
