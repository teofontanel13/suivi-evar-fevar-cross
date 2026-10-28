-- V3 isolated from V2. Run once in Supabase SQL Editor.
create table if not exists public.v3_cases (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 reference text not null,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 constraint v3_cases_reference_not_blank check (length(trim(reference)) > 0)
);
create unique index if not exists v3_cases_owner_reference_unique
 on public.v3_cases (owner_id, lower(trim(reference)));
alter table public.v3_cases enable row level security;
revoke all on public.v3_cases from anon;
grant select, insert, update, delete on public.v3_cases to authenticated;
drop policy if exists v3_cases_select_own on public.v3_cases;
drop policy if exists v3_cases_insert_own on public.v3_cases;
drop policy if exists v3_cases_update_own on public.v3_cases;
drop policy if exists v3_cases_delete_own on public.v3_cases;
create policy v3_cases_select_own on public.v3_cases for select to authenticated using (owner_id = (select auth.uid()));
create policy v3_cases_insert_own on public.v3_cases for insert to authenticated with check (owner_id = (select auth.uid()));
create policy v3_cases_update_own on public.v3_cases for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy v3_cases_delete_own on public.v3_cases for delete to authenticated using (owner_id = (select auth.uid()));
