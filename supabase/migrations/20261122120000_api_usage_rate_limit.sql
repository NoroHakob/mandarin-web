-- Per-user API rate limits (fixed windows), shared across all serverless instances.
-- Only the service role touches this: RLS is on with no policies, and the function below is
-- executable by service_role only.

create table if not exists public.api_usage (
  user_id uuid not null references auth.users on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, bucket, window_start)
);

-- Lets the occasional global cleanup sweep avoid a full table scan.
create index if not exists api_usage_window_start_idx on public.api_usage (window_start);

alter table public.api_usage enable row level security;
-- No policies on purpose. Also drop the default table grants Supabase gives these roles.
revoke all on table public.api_usage from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_user uuid,
  p_bucket text,
  p_window_seconds int,
  p_limit int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  if p_user is null or p_bucket is null or p_window_seconds is null or p_window_seconds <= 0
     or p_limit is null or p_limit < 0 then
    raise exception 'consume_rate_limit: invalid arguments';
  end if;

  -- Fixed window aligned to the epoch (e.g. 86400 s → UTC midnight).
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_usage as u (user_id, bucket, window_start, count)
  values (p_user, p_bucket, v_window_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = u.count + 1
  returning u.count into v_count;

  -- Opportunistic cleanup: this user's stale rows every call (primary-key range, cheap),
  -- plus a rare global sweep (index on window_start) for users who stopped calling.
  delete from public.api_usage
  where user_id = p_user and window_start < now() - interval '2 days';
  if random() < 0.01 then
    delete from public.api_usage where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_rate_limit(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(uuid, text, int, int) to service_role;
