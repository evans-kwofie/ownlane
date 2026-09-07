create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 320),
  name text check (char_length(name) <= 120),
  creator_type text check (char_length(creator_type) <= 80),
  source text not null default 'website' check (char_length(source) <= 80),
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

revoke all on table public.waitlist_signups from anon, authenticated;
grant insert on table public.waitlist_signups to anon, authenticated;

create policy "Public can join the waitlist"
on public.waitlist_signups
for insert
to anon, authenticated
with check (
  char_length(trim(email)) > 3
  and position('@' in email) > 1
);
