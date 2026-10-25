-- Diet Tracker data model (AGENTS.md, "Data model"). Four tables; every row
-- belongs to one Clerk user. user_id defaults to the `sub` claim of the
-- signed-in Clerk token, so the browser never sends it, and row-level
-- security lets a person touch only rows where user_id is their own id.

-- One row per person: the setup details (Profile in lib/profile.ts).
create table public.profiles (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  units text not null check (units in ('us', 'metric')),
  height_cm numeric not null check (height_cm > 0),
  weight_kg numeric not null check (weight_kg > 0),
  birth_date date not null,
  sex text not null check (sex in ('female', 'male', 'nonbinary')),
  activity text not null check (activity in ('sedentary', 'light', 'moderate', 'very')),
  allergies text[] not null default '{}',
  pattern text not null default 'everything'
    check (pattern in ('everything', 'vegetarian', 'pescatarian', 'vegan')),
  life_stage text not null default 'none'
    check (life_stage in ('none', 'pregnant1', 'pregnant2', 'pregnant3', 'breastfeeding06', 'breastfeeding712')),
  updated_at timestamptz not null default now()
);

-- Foods the person saved: from USDA search (per 100 g) or recipes they built
-- (per serving).
create table public.my_foods (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  kind text not null check (kind in ('usda', 'recipe')),
  name text not null check (char_length(name) between 1 and 200),
  fdc_id integer,
  nutrients jsonb not null default '{}',
  servings numeric check (servings > 0),
  ingredients jsonb,
  created_at timestamptz not null default now(),
  -- A USDA food has its fdc_id; a recipe has none.
  check ((kind = 'usda') = (fdc_id is not null)),
  -- Each USDA food is saved once per person.
  unique (user_id, fdc_id)
);

-- One row per food eaten (Entry in lib/storage.ts). Nutrients are copied when
-- logged, so later edits to a recipe never change past days.
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(name) between 1 and 200),
  amount numeric not null check (amount > 0),
  source text,
  nutrients jsonb not null default '{}',
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index log_entries_user_date on public.log_entries (user_id, date);

-- One row per day the person marked complete.
create table public.complete_days (
  user_id text not null default (auth.jwt() ->> 'sub'),
  date date not null,
  primary key (user_id, date)
);

-- Row-level security: the same rule on every table. `(select auth.jwt())` is
-- evaluated once per query instead of once per row.
alter table public.profiles enable row level security;
alter table public.my_foods enable row level security;
alter table public.log_entries enable row level security;
alter table public.complete_days enable row level security;

create policy "Own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "Own saved foods" on public.my_foods for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "Own log entries" on public.log_entries for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "Own complete days" on public.complete_days for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

-- Signed-out visitors (the anon role) get no access at all, even before RLS.
revoke all on public.profiles, public.my_foods, public.log_entries, public.complete_days from anon;
