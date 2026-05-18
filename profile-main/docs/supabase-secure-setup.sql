create table if not exists public.sources (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  code text not null,
  zip_url text,
  thumbnail_url text,
  demo_video_url text,
  download_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sources
  add column if not exists demo_video_url text;

alter table public.sources
  add column if not exists download_count bigint not null default 0;

alter table public.sources
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.site_metrics (
  metric_key text primary key,
  metric_value bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_metrics (metric_key, metric_value)
values ('page_views', 0)
on conflict (metric_key) do nothing;

alter table public.sources enable row level security;
alter table public.site_metrics enable row level security;

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

drop policy if exists "admin delete sources" on public.sources;
create policy "admin delete sources"
on public.sources
for delete
to authenticated
using (lower(auth.jwt()->>'email') in ('admin@example.com'));

drop policy if exists "admin update sources" on public.sources;
create policy "admin update sources"
on public.sources
for update
to authenticated
using (lower(auth.jwt()->>'email') in ('admin@example.com'))
with check (lower(auth.jwt()->>'email') in ('admin@example.com'));

drop policy if exists "admin read metrics" on public.site_metrics;
create policy "admin read metrics"
on public.site_metrics
for select
to authenticated
using (lower(auth.jwt()->>'email') in ('admin@example.com'));

drop policy if exists "admin upload source files" on storage.objects;
create policy "admin upload source files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sources'
  and lower(auth.jwt()->>'email') in ('admin@example.com')
);

drop policy if exists "admin delete source files" on storage.objects;
create policy "admin delete source files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sources'
  and lower(auth.jwt()->>'email') in ('admin@example.com')
);

create or replace function public.increment_source_download(p_source_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sources
  set download_count = coalesce(download_count, 0) + 1
  where id = p_source_id;
end;
$$;

create or replace function public.increment_site_page_view()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_metrics (metric_key, metric_value, updated_at)
  values ('page_views', 1, now())
  on conflict (metric_key)
  do update
    set metric_value = public.site_metrics.metric_value + 1,
        updated_at = now();
end;
$$;

grant execute on function public.increment_source_download(bigint) to anon, authenticated;
grant execute on function public.increment_site_page_view() to anon, authenticated;
