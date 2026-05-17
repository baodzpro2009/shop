create table if not exists public.sources (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  code text not null,
  zip_url text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

alter table public.sources enable row level security;

drop policy if exists "public read sources" on public.sources;
create policy "public read sources"
on public.sources
for select
to anon, authenticated
using (true);

drop policy if exists "admin insert sources" on public.sources;
create policy "admin insert sources"
on public.sources
for insert
to authenticated
with check (lower(auth.jwt()->>'email') in ('admin@example.com'));

drop policy if exists "admin upload source files" on storage.objects;
create policy "admin upload source files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sources'
  and lower(auth.jwt()->>'email') in ('admin@example.com')
);
