-- ════════════════════════════════════════════════════════════════════════
-- Eleven Growth — initial schema
-- Tables: users, clients, invitations, social_accounts, social_account_tokens,
--         content, content_metrics, account_metrics, reports, sync_runs
-- Every table has RLS enabled. Clients can only ever read rows for their own
-- client_id; all writes to analytics tables happen server-side (service role).
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────
create type public.user_role as enum ('admin', 'client');
create type public.platform as enum ('youtube', 'instagram', 'tiktok', 'facebook', 'linkedin');
create type public.client_status as enum ('active', 'archived');
create type public.social_account_status as enum ('connected', 'expired', 'error', 'disconnected');
create type public.metrics_status as enum ('pending', 'ok', 'unavailable', 'error');
create type public.report_status as enum ('draft', 'published');

-- ─── updated_at helper ─────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Clients ───────────────────────────────────────────────────────────
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 200),
  company     text,
  email       text,
  industry    text,
  notes       text,
  status      public.client_status not null default 'active',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index clients_status_idx on public.clients(status);
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();

-- ─── Users (app profile for each auth user) ────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text not null,
  role        public.user_role not null default 'client',
  -- For client users: the single client workspace they belong to.
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index users_client_id_idx on public.users(client_id);
create unique index users_email_idx on public.users(lower(email));
create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();

-- ─── Invitations ───────────────────────────────────────────────────────
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  client_id   uuid references public.clients(id) on delete cascade,
  role        public.user_role not null default 'client',
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint client_invite_has_client check (role = 'admin' or client_id is not null)
);
create index invitations_email_idx on public.invitations(lower(email)) where accepted_at is null;
create index invitations_client_idx on public.invitations(client_id);

-- ─── Social accounts ───────────────────────────────────────────────────
create table public.social_accounts (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  platform            public.platform not null,
  platform_account_id text not null,
  account_name        text,
  account_handle      text,
  avatar_url          text,
  status              public.social_account_status not null default 'connected',
  scopes              text[],
  connected_by        uuid references auth.users(id) on delete set null,
  last_synced_at      timestamptz,
  last_sync_error     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (client_id, platform, platform_account_id)
);
create index social_accounts_client_idx on public.social_accounts(client_id);
create index social_accounts_platform_idx on public.social_accounts(platform, status);
create trigger social_accounts_updated_at before update on public.social_accounts for each row execute function public.set_updated_at();

-- OAuth credentials live in their own table with RLS ON and NO policies:
-- only the service role (server) can read or write them. Values are
-- AES-256-GCM encrypted by the application before they reach the database.
create table public.social_account_tokens (
  social_account_id        uuid primary key references public.social_accounts(id) on delete cascade,
  access_token_encrypted   text not null,
  refresh_token_encrypted  text,
  token_expires_at         timestamptz,
  updated_at               timestamptz not null default now()
);
create trigger social_account_tokens_updated_at before update on public.social_account_tokens for each row execute function public.set_updated_at();

-- ─── Content ───────────────────────────────────────────────────────────
create table public.content (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients(id) on delete cascade,
  social_account_id    uuid references public.social_accounts(id) on delete set null,
  platform             public.platform not null,
  platform_content_id  text,
  url                  text not null,
  title                text,
  thumbnail_url        text,
  content_type         text,
  published_at         timestamptz,
  metrics_status       public.metrics_status not null default 'pending',
  last_synced_at       timestamptz,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index content_unique_platform_id on public.content(client_id, platform, platform_content_id) where platform_content_id is not null;
create unique index content_unique_url on public.content(client_id, url) where platform_content_id is null;
create index content_client_published_idx on public.content(client_id, published_at desc);
create index content_account_idx on public.content(social_account_id);
create index content_platform_idx on public.content(platform);
create trigger content_updated_at before update on public.content for each row execute function public.set_updated_at();

-- ─── Content metrics: one CUMULATIVE snapshot per content per day ──────
-- NULL = the platform did not provide this metric ("Not available"). Never 0-filled.
create table public.content_metrics (
  id                bigint generated always as identity primary key,
  content_id        uuid not null references public.content(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  recorded_on       date not null,
  recorded_at       timestamptz not null default now(),
  views             bigint check (views >= 0),
  likes             bigint check (likes >= 0),
  comments          bigint check (comments >= 0),
  shares            bigint check (shares >= 0),
  -- Followers/subscribers the platform attributes to THIS content (e.g. YouTube subscribersGained per video).
  followers_gained  bigint check (followers_gained >= 0),
  source            text not null,
  unique (content_id, recorded_on)
);
create index content_metrics_client_day_idx on public.content_metrics(client_id, recorded_on);
create index content_metrics_content_day_idx on public.content_metrics(content_id, recorded_on desc);

-- ─── Account metrics: channel/profile level, one row per account per day ─
create table public.account_metrics (
  id                 bigint generated always as identity primary key,
  social_account_id  uuid not null references public.social_accounts(id) on delete cascade,
  client_id          uuid not null references public.clients(id) on delete cascade,
  platform           public.platform not null,
  recorded_on        date not null,
  recorded_at        timestamptz not null default now(),
  followers_total    bigint,  -- point-in-time total (e.g. channel subscriberCount)
  followers_gained   bigint,  -- gained during that day
  followers_lost     bigint,  -- lost during that day
  views              bigint,  -- channel views during that day
  source             text not null,
  unique (social_account_id, recorded_on)
);
create index account_metrics_client_day_idx on public.account_metrics(client_id, recorded_on);

-- ─── Reports ───────────────────────────────────────────────────────────
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  month             date not null check (extract(day from month) = 1),
  status            public.report_status not null default 'draft',
  total_posts       integer,
  total_views       bigint,
  followers_gained  bigint,
  -- Frozen, fully computed report payload so a sent report never changes later.
  data              jsonb not null default '{}'::jsonb,
  pdf_url           text,
  generated_by      uuid references auth.users(id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (client_id, month)
);
create index reports_client_month_idx on public.reports(client_id, month desc);
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();

-- ─── Sync runs (observability) ─────────────────────────────────────────
create table public.sync_runs (
  id                 bigint generated always as identity primary key,
  social_account_id  uuid references public.social_accounts(id) on delete cascade,
  platform           public.platform,
  trigger            text not null default 'cron',
  status             text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  items_synced       integer not null default 0,
  warnings           text[],
  error              text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz
);
create index sync_runs_account_idx on public.sync_runs(social_account_id, started_at desc);

-- ─── Latest snapshot per content (respects RLS of the caller) ──────────
create view public.content_latest_metrics with (security_invoker = true) as
  select distinct on (content_id) *
  from public.content_metrics
  order by content_id, recorded_on desc;

-- Baseline snapshot per content: the latest one strictly before a date.
create or replace function public.content_metric_baselines(p_before date, p_client_ids uuid[] default null)
returns setof public.content_metrics
language sql stable security invoker set search_path = '' as $$
  select distinct on (cm.content_id) cm.*
  from public.content_metrics cm
  where cm.recorded_on < p_before
    and (p_client_ids is null or cm.client_id = any(p_client_ids))
  order by cm.content_id, cm.recorded_on desc;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- Authorization helpers (SECURITY DEFINER so policies don't recurse on users)
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$$;

create or replace function public.current_client_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.client_id from public.users u where u.id = auth.uid() and u.role = 'client';
$$;

create or replace function public.can_access_client(p_client_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (p_client_id is not null and p_client_id = public.current_client_id());
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_client_id() from public;
revoke all on function public.can_access_client(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- New auth user → public.users row. Role/client come ONLY from a pending
-- invitation created by an admin — never from user-supplied metadata.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations%rowtype;
begin
  select * into inv from public.invitations
   where lower(email) = lower(new.email) and accepted_at is null
   order by created_at desc limit 1;

  insert into public.users (id, email, name, role, client_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(inv.role, 'client'),
    inv.client_id
  )
  on conflict (id) do nothing;

  if inv.id is not null then
    update public.invitations set accepted_at = now() where id = inv.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════
alter table public.users                 enable row level security;
alter table public.clients               enable row level security;
alter table public.invitations           enable row level security;
alter table public.social_accounts       enable row level security;
alter table public.social_account_tokens enable row level security;
alter table public.content               enable row level security;
alter table public.content_metrics       enable row level security;
alter table public.account_metrics       enable row level security;
alter table public.reports               enable row level security;
alter table public.sync_runs             enable row level security;

-- users: read self (admins read all); users may only change their own name.
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Column-level grant: role and client_id can never be changed from the browser.
-- Role/workspace changes go through server actions using the service role.
revoke update on public.users from authenticated;
grant update (name) on public.users to authenticated;

-- clients
create policy clients_select on public.clients for select to authenticated
  using (public.can_access_client(id));
create policy clients_admin_insert on public.clients for insert to authenticated
  with check (public.is_admin());
create policy clients_admin_update on public.clients for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy clients_admin_delete on public.clients for delete to authenticated
  using (public.is_admin());

-- invitations: admins only
create policy invitations_admin_all on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- social accounts: readable by the owning client; managed by admins (OAuth writes use service role)
create policy social_accounts_select on public.social_accounts for select to authenticated
  using (public.can_access_client(client_id));
create policy social_accounts_admin_update on public.social_accounts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy social_accounts_admin_delete on public.social_accounts for delete to authenticated
  using (public.is_admin());

-- social_account_tokens: intentionally NO policies → inaccessible to anon/authenticated.
revoke all on public.social_account_tokens from anon, authenticated;

-- content
create policy content_select on public.content for select to authenticated
  using (public.can_access_client(client_id));
create policy content_admin_insert on public.content for insert to authenticated
  with check (public.is_admin());
create policy content_admin_update on public.content for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy content_admin_delete on public.content for delete to authenticated
  using (public.is_admin());

-- metrics: read-only for users; written only by the sync job (service role)
create policy content_metrics_select on public.content_metrics for select to authenticated
  using (public.can_access_client(client_id));
create policy account_metrics_select on public.account_metrics for select to authenticated
  using (public.can_access_client(client_id));

-- reports: admins see all; clients see only PUBLISHED reports for their own workspace
create policy reports_select on public.reports for select to authenticated
  using (public.is_admin() or (client_id = public.current_client_id() and status = 'published'));
create policy reports_admin_insert on public.reports for insert to authenticated
  with check (public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy reports_admin_delete on public.reports for delete to authenticated
  using (public.is_admin());

-- sync runs: admins only
create policy sync_runs_admin_select on public.sync_runs for select to authenticated
  using (public.is_admin());

-- Anonymous users get nothing.
revoke all on all tables in schema public from anon;

-- ─── Storage: private bucket for generated PDFs ────────────────────────
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Object path convention: {client_id}/{yyyy-mm}.pdf
create policy reports_storage_read on storage.objects for select to authenticated
  using (
    bucket_id = 'reports'
    and (
      public.is_admin()
      or exists (
        select 1 from public.reports r
        where r.client_id::text = (storage.foldername(name))[1]
          and r.client_id = public.current_client_id()
          and r.status = 'published'
      )
    )
  );
