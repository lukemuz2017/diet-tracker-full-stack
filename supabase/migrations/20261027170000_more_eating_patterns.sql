-- Two more eating patterns for the diet notes: keto and paleo.
alter table public.profiles drop constraint profiles_pattern_check;
alter table public.profiles
  add constraint profiles_pattern_check
  check (pattern in ('everything', 'vegetarian', 'pescatarian', 'vegan', 'keto', 'paleo'));
