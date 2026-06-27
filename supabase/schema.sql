begin;

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select regexp_replace(trim(p_phone), '\D', '', 'g');
$$;

create or replace function public.abbreviate_name(p_full_name text)
returns text
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  v_clean text := regexp_replace(trim(p_full_name), '\s+', ' ', 'g');
  v_first text;
  v_last text;
  v_parts text[];
begin
  v_parts := regexp_split_to_array(v_clean, '\s+');
  v_first := coalesce(v_parts[1], '');
  v_last := coalesce(v_parts[array_length(v_parts, 1)], '');

  if array_length(v_parts, 1) is null or array_length(v_parts, 1) <= 1 then
    return v_first;
  end if;

  return v_first || ' ' || upper(left(v_last, 1)) || '.';
end;
$$;

create table if not exists public.staff_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff'
    check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.card_code_counters (
  card_year integer primary key,
  last_value bigint not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  phone_normalized text not null,
  email text,
  birth_date date,
  photo_path text,
  status text not null default 'DA_VERIFICARE'
    check (status in (
      'DA_VERIFICARE',
      'APPROVATO',
      'VIP',
      'IN_OSSERVAZIONE',
      'SOSPESO',
      'ARCHIVIATO'
    )),
  vip_level text not null default 'SILVER'
    check (vip_level in ('SILVER', 'GOLD', 'BLACK')),
  card_code text not null unique,
  referral_code text not null unique,
  privacy_accepted boolean not null default false,
  marketing_accepted boolean not null default false,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  phone_normalized text not null,
  card_code text not null,
  attempted_at timestamptz not null default now(),
  success boolean not null
);

create table if not exists public.beach_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1 check (version >= 1),
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beach_spots (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.beach_layouts(id) on delete cascade,
  spot_code text not null,
  label text,
  zone text,
  row_name text not null,
  sort_order integer not null default 0,
  base_umbrellas integer not null default 1 check (base_umbrellas between 0 and 20),
  base_sunbeds integer not null default 2 check (base_sunbeds between 0 and 20),
  base_status text not null default 'DISPONIBILE'
    check (base_status in ('DISPONIBILE', 'BLOCCATA', 'MANUTENZIONE', 'RISERVATA')),
  x numeric(10,2),
  y numeric(10,2),
  width numeric(10,2),
  height numeric(10,2),
  rotation numeric(10,2),
  shape text,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beach_spot_overrides (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.beach_spots(id) on delete cascade,
  service_date date not null,
  status text
    check (status is null or status in ('DISPONIBILE', 'BLOCCATA', 'MANUTENZIONE', 'RISERVATA')),
  umbrellas integer
    check (umbrellas is null or umbrellas between 0 and 20),
  sunbeds integer
    check (sunbeds is null or sunbeds between 0 and 20),
  admin_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  booking_date date not null,
  time_slot text not null
    check (time_slot in ('MATTINA', 'POMERIGGIO', 'GIORNATA_INTERA')),
  adults integer not null check (adults between 1 and 20),
  children integer not null default 0 check (children between 0 and 20),
  area_preference text,
  spot_id uuid references public.beach_spots(id) on delete set null,
  spot_code_snapshot text,
  umbrellas_snapshot integer,
  sunbeds_snapshot integer,
  client_notes text,
  staff_notes text,
  status text not null default 'RICHIESTA'
    constraint bookings_status_chk
    check (status in (
      'RICHIESTA',
      'CONFERMATA',
      'ARRIVATA',
      'RIFIUTATA',
      'ANNULLATA',
      'COMPLETATA',
      'NO_SHOW'
    )),
  constraint bookings_spot_snapshot_consistency_chk check (
    (
      spot_id is null
      and spot_code_snapshot is null
      and umbrellas_snapshot is null
      and sunbeds_snapshot is null
    )
    or (
      spot_id is not null
      and spot_code_snapshot is not null
      and umbrellas_snapshot is not null
      and sunbeds_snapshot is not null
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists spot_id uuid references public.beach_spots(id) on delete set null,
  add column if not exists spot_code_snapshot text,
  add column if not exists umbrellas_snapshot integer,
  add column if not exists sunbeds_snapshot integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_spot_snapshot_consistency_chk'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_spot_snapshot_consistency_chk
      check (
        (
          spot_id is null
          and spot_code_snapshot is null
          and umbrellas_snapshot is null
          and sunbeds_snapshot is null
        )
        or (
          spot_id is not null
          and spot_code_snapshot is not null
          and umbrellas_snapshot is not null
          and sunbeds_snapshot is not null
        )
      );
  end if;
end;
$$;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_client_id uuid not null references public.clients(id) on delete cascade,
  referred_full_name text not null,
  referred_phone text,
  referred_notes text,
  referred_client_id uuid references public.clients(id) on delete set null,
  status text not null default 'IN_VERIFICA'
    check (status in (
      'IN_VERIFICA',
      'APPROVATO',
      'NON_APPROVATO',
      'PROBLEMATICO'
    )),
  evaluation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warnings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reason text not null,
  description text,
  severity text not null
    check (severity in ('BASSA', 'MEDIA', 'ALTA', 'CRITICA')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.vip_bonuses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  vip_level text not null
    check (vip_level in ('SILVER', 'GOLD', 'BLACK')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists clients_phone_normalized_active_idx
  on public.clients (phone_normalized)
  where status <> 'ARCHIVIATO';

create unique index if not exists beach_layouts_name_version_idx
  on public.beach_layouts (name, version);

create unique index if not exists beach_layouts_single_active_idx
  on public.beach_layouts ((1))
  where is_active = true;

create unique index if not exists beach_spots_layout_spot_code_idx
  on public.beach_spots (layout_id, spot_code);

create unique index if not exists beach_spot_overrides_spot_date_idx
  on public.beach_spot_overrides (spot_id, service_date);

create index if not exists beach_spots_layout_sort_idx
  on public.beach_spots (layout_id, row_name, sort_order, spot_code);

create index if not exists beach_spots_zone_idx
  on public.beach_spots (zone);

create index if not exists beach_spot_overrides_service_date_idx
  on public.beach_spot_overrides (service_date);

create index if not exists clients_status_idx
  on public.clients (status);

create index if not exists clients_vip_level_idx
  on public.clients (vip_level);

create index if not exists clients_created_by_idx
  on public.clients (created_by);

create index if not exists client_sessions_client_id_idx
  on public.client_sessions (client_id);

create index if not exists client_sessions_expires_at_idx
  on public.client_sessions (expires_at);

create index if not exists login_attempts_phone_card_attempted_idx
  on public.login_attempts (phone_normalized, card_code, attempted_at desc);

create index if not exists bookings_client_date_idx
  on public.bookings (client_id, booking_date);

create index if not exists bookings_status_idx
  on public.bookings (status);

create index if not exists bookings_spot_booking_date_idx
  on public.bookings (spot_id, booking_date);

create unique index if not exists bookings_active_spot_day_idx
  on public.bookings (spot_id, booking_date)
  where spot_id is not null
    and status in ('RICHIESTA', 'CONFERMATA', 'ARRIVATA');

create index if not exists referrals_referrer_status_idx
  on public.referrals (referrer_client_id, status);

create index if not exists warnings_client_created_idx
  on public.warnings (client_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_staff(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_users su
    where su.id = p_user_id
      and su.role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_users su
    where su.id = p_user_id
      and su.role = 'admin'
  );
$$;

create or replace function public.generate_card_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_next bigint;
begin
  insert into public.card_code_counters as c (card_year, last_value, updated_at)
  values (v_year, 1, now())
  on conflict (card_year) do update
    set last_value = c.last_value + 1,
        updated_at = now()
  returning last_value into v_next;

  return format('FDA-%s-%s', v_year, lpad(v_next::text, 6, '0'));
end;
$$;

create or replace function public.generate_referral_code(p_full_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed text;
  v_candidate text;
  v_attempt integer := 0;
begin
  v_seed := upper(regexp_replace(split_part(trim(coalesce(p_full_name, 'VIP')), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  v_seed := left(nullif(v_seed, ''), 12);
  v_seed := coalesce(v_seed, 'VIP');

  loop
    v_attempt := v_attempt + 1;

    if v_attempt = 1 then
      v_candidate := format('FDA-%s-%s', v_seed, lpad(((floor(random() * 1000))::int)::text, 3, '0'));
    elsif v_attempt <= 8 then
      v_candidate := format(
        'FDA-%s-%s%s',
        v_seed,
        lpad(((floor(random() * 1000))::int)::text, 3, '0'),
        upper(substr(encode(gen_random_bytes(1), 'hex'), 1, 1))
      );
    else
      v_candidate := format('FDA-%s-%s', v_seed, upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6)));
    end if;

    perform pg_advisory_xact_lock(hashtext(v_candidate));

    exit when not exists (
      select 1
      from public.clients c
      where c.referral_code = v_candidate
    );

    if v_attempt > 15 then
      raise exception 'Unable to generate a unique referral code.';
    end if;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.prepare_client_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.full_name := regexp_replace(trim(new.full_name), '\s+', ' ', 'g');
  new.phone := trim(new.phone);
  new.phone_normalized := public.normalize_phone(new.phone);
  new.card_code := upper(trim(coalesce(new.card_code, '')));
  new.referral_code := upper(trim(coalesce(new.referral_code, '')));

  if new.phone_normalized = '' then
    raise exception 'Phone number is required.';
  end if;

  if new.status in ('APPROVATO', 'VIP') and new.birth_date is null then
    raise exception 'Birth date is required for approved VIP clients.';
  end if;

  if new.birth_date is not null and new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'VIP client must be an adult.';
  end if;

  if tg_op = 'INSERT' then
    if new.card_code = '' then
      new.card_code := public.generate_card_code();
    end if;

    if new.referral_code = '' then
      new.referral_code := public.generate_referral_code(new.full_name);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.card_code = '' then
      new.card_code := old.card_code;
    end if;

    if new.referral_code = '' then
      new.referral_code := old.referral_code;
    end if;
  end if;

  if new.created_by is null and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.prepare_login_attempt()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.phone := trim(new.phone);
  new.phone_normalized := public.normalize_phone(coalesce(new.phone_normalized, new.phone));
  new.card_code := upper(trim(new.card_code));
  return new;
end;
$$;

create or replace function public.prepare_referral()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.referred_full_name := regexp_replace(trim(new.referred_full_name), '\s+', ' ', 'g');
  new.referred_phone := nullif(trim(coalesce(new.referred_phone, '')), '');
  return new;
end;
$$;

create or replace function public.prepare_beach_layout_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.prepare_beach_spot_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.spot_code := upper(trim(new.spot_code));
  new.label := nullif(trim(coalesce(new.label, '')), '');
  new.zone := nullif(trim(coalesce(new.zone, '')), '');
  new.row_name := upper(trim(new.row_name));
  new.shape := nullif(lower(trim(coalesce(new.shape, ''))), '');

  if new.spot_code = '' then
    raise exception 'Spot code is required.';
  end if;

  if new.row_name = '' then
    raise exception 'Row name is required.';
  end if;

  return new;
end;
$$;

create or replace function public.prepare_beach_spot_override_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := upper(nullif(trim(coalesce(new.status, '')), ''));
  new.admin_note := nullif(trim(coalesce(new.admin_note, '')), '');

  if new.created_by is null and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clients_prepare on public.clients;
create trigger trg_clients_prepare
before insert or update on public.clients
for each row
execute function public.prepare_client_record();

drop trigger if exists trg_clients_touch_updated_at on public.clients;
create trigger trg_clients_touch_updated_at
before update on public.clients
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_bookings_touch_updated_at on public.bookings;
create trigger trg_bookings_touch_updated_at
before update on public.bookings
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_beach_layouts_prepare on public.beach_layouts;
create trigger trg_beach_layouts_prepare
before insert or update on public.beach_layouts
for each row
execute function public.prepare_beach_layout_record();

drop trigger if exists trg_beach_layouts_touch_updated_at on public.beach_layouts;
create trigger trg_beach_layouts_touch_updated_at
before update on public.beach_layouts
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_beach_spots_prepare on public.beach_spots;
create trigger trg_beach_spots_prepare
before insert or update on public.beach_spots
for each row
execute function public.prepare_beach_spot_record();

drop trigger if exists trg_beach_spots_touch_updated_at on public.beach_spots;
create trigger trg_beach_spots_touch_updated_at
before update on public.beach_spots
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_beach_spot_overrides_prepare on public.beach_spot_overrides;
create trigger trg_beach_spot_overrides_prepare
before insert or update on public.beach_spot_overrides
for each row
execute function public.prepare_beach_spot_override_record();

drop trigger if exists trg_beach_spot_overrides_touch_updated_at on public.beach_spot_overrides;
create trigger trg_beach_spot_overrides_touch_updated_at
before update on public.beach_spot_overrides
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_referrals_touch_updated_at on public.referrals;
create trigger trg_referrals_touch_updated_at
before update on public.referrals
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_login_attempts_prepare on public.login_attempts;
create trigger trg_login_attempts_prepare
before insert or update on public.login_attempts
for each row
execute function public.prepare_login_attempt();

drop trigger if exists trg_referrals_prepare on public.referrals;
create trigger trg_referrals_prepare
before insert or update on public.referrals
for each row
execute function public.prepare_referral();

create or replace function public.cleanup_expired_security_records()
returns table (
  deleted_sessions integer,
  deleted_login_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_sessions integer := 0;
  v_deleted_login_attempts integer := 0;
begin
  delete from public.client_sessions
  where expires_at <= now();

  get diagnostics v_deleted_sessions = row_count;

  delete from public.login_attempts
  where attempted_at < now() - interval '30 days';

  get diagnostics v_deleted_login_attempts = row_count;

  return query
  select v_deleted_sessions, v_deleted_login_attempts;
end;
$$;

create or replace function public.get_active_client_id(
  p_token uuid,
  p_allow_in_osservazione boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_status text;
begin
  select c.id, c.status
  into v_client_id, v_status
  from public.client_sessions cs
  join public.clients c on c.id = cs.client_id
  where cs.token = p_token
    and cs.expires_at > now()
  order by cs.created_at desc
  limit 1;

  if v_client_id is null then
    return null;
  end if;

  if v_status in ('DA_VERIFICARE', 'SOSPESO', 'ARCHIVIATO') then
    return null;
  end if;

  if v_status = 'IN_OSSERVAZIONE' and not p_allow_in_osservazione then
    return null;
  end if;

  return v_client_id;
end;
$$;

create or replace function public.client_login(
  p_card_code text,
  p_phone text
)
returns table (
  success boolean,
  message text,
  session_token uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_code text := upper(trim(coalesce(p_card_code, '')));
  v_phone_normalized text := public.normalize_phone(coalesce(p_phone, ''));
  v_client public.clients%rowtype;
  v_recent_failures integer := 0;
  v_session_token uuid := gen_random_uuid();
  v_expires_at timestamptz := now() + interval '24 hours';
begin
  perform public.cleanup_expired_security_records();

  if v_card_code = '' or v_phone_normalized = '' then
    insert into public.login_attempts (phone, phone_normalized, card_code, success)
    values (trim(coalesce(p_phone, '')), v_phone_normalized, v_card_code, false);

    return query
    select false, 'Credenziali non valide o accesso temporaneamente non disponibile.', null::uuid, null::timestamptz;
    return;
  end if;

  select count(*)
  into v_recent_failures
  from public.login_attempts la
  where (
      la.phone_normalized = v_phone_normalized
      or upper(la.card_code) = v_card_code
    )
    and la.success = false
    and la.attempted_at > now() - interval '15 minutes';

  if v_recent_failures >= 5 then
    insert into public.login_attempts (phone, phone_normalized, card_code, success)
    values (trim(coalesce(p_phone, '')), v_phone_normalized, v_card_code, false);

    return query
    select false, 'Credenziali non valide o accesso temporaneamente non disponibile.', null::uuid, null::timestamptz;
    return;
  end if;

  select *
  into v_client
  from public.clients c
  where upper(c.card_code) = v_card_code
    and c.phone_normalized = v_phone_normalized
  order by c.created_at desc
  limit 1;

  if v_client.id is null or v_client.status in ('DA_VERIFICARE', 'SOSPESO', 'ARCHIVIATO') then
    insert into public.login_attempts (phone, phone_normalized, card_code, success)
    values (trim(coalesce(p_phone, '')), v_phone_normalized, v_card_code, false);

    return query
    select false, 'Credenziali non valide o accesso temporaneamente non disponibile.', null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.login_attempts (phone, phone_normalized, card_code, success)
  values (trim(coalesce(p_phone, '')), v_phone_normalized, v_card_code, true);

  insert into public.client_sessions (client_id, token, expires_at)
  values (v_client.id, v_session_token, v_expires_at);

  return query
  select true, 'Accesso consentito.', v_session_token, v_expires_at;
end;
$$;

create or replace function public.get_client_profile(
  p_token uuid
)
returns table (
  client_id uuid,
  full_name text,
  display_name text,
  card_code text,
  vip_level text,
  status text,
  verify_url text,
  vip_bonuses jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  v_client_id := public.get_active_client_id(p_token, true);

  if v_client_id is null then
    raise exception 'Sessione cliente non valida o scaduta.';
  end if;

  return query
  select
    c.id,
    c.full_name,
    public.abbreviate_name(c.full_name),
    c.card_code,
    c.vip_level,
    c.status,
    '/vip-verify.html?code=' || c.card_code,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'title', b.title,
            'description', b.description,
            'vip_level', b.vip_level
          )
          order by b.created_at asc
        )
        from public.vip_bonuses b
        where b.active = true
          and b.vip_level = c.vip_level
      ),
      '[]'::jsonb
    ) as vip_bonuses
  from public.clients c
  where c.id = v_client_id;
end;
$$;

create or replace function public.get_booking_map_rows(
  p_booking_date date
)
returns table (
  layout_id uuid,
  layout_name text,
  spot_id uuid,
  spot_code text,
  label text,
  zone text,
  row_name text,
  sort_order integer,
  base_status text,
  override_id uuid,
  override_status text,
  umbrellas integer,
  sunbeds integer,
  admin_note text,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  rotation numeric,
  shape text,
  z_index integer,
  active_booking_id uuid,
  active_booking_status text,
  booking_client_id uuid,
  booking_client_name text,
  final_status text,
  is_bookable boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_layout as (
    select bl.id, bl.name
    from public.beach_layouts bl
    where bl.is_active = true
    order by bl.updated_at desc, bl.created_at desc
    limit 1
  )
  select
    al.id as layout_id,
    al.name as layout_name,
    bs.id as spot_id,
    bs.spot_code,
    coalesce(bs.label, bs.spot_code) as label,
    bs.zone,
    bs.row_name,
    bs.sort_order,
    bs.base_status,
    bo.id as override_id,
    bo.status as override_status,
    coalesce(bo.umbrellas, bs.base_umbrellas) as umbrellas,
    coalesce(bo.sunbeds, bs.base_sunbeds) as sunbeds,
    bo.admin_note,
    bs.x,
    bs.y,
    bs.width,
    bs.height,
    bs.rotation,
    bs.shape,
    bs.z_index,
    bk.id as active_booking_id,
    bk.status as active_booking_status,
    bk.client_id as booking_client_id,
    bc.full_name as booking_client_name,
    case
      when bk.id is not null then 'OCCUPATA'
      else coalesce(bo.status, bs.base_status)
    end as final_status,
    (
      bk.id is null
      and coalesce(bo.status, bs.base_status) = 'DISPONIBILE'
    ) as is_bookable
  from active_layout al
  join public.beach_spots bs
    on bs.layout_id = al.id
  left join public.beach_spot_overrides bo
    on bo.spot_id = bs.id
   and bo.service_date = p_booking_date
  left join lateral (
    select b.id, b.status, b.client_id
    from public.bookings b
    where b.spot_id = bs.id
      and b.booking_date = p_booking_date
      and b.status in ('RICHIESTA', 'CONFERMATA', 'ARRIVATA')
    order by b.created_at desc
    limit 1
  ) bk on true
  left join public.clients bc
    on bc.id = bk.client_id
  order by
    bs.row_name asc,
    bs.sort_order asc,
    bs.spot_code asc;
$$;

create or replace function public.get_booking_map_for_date(
  p_booking_date date
)
returns table (
  layout_id uuid,
  layout_name text,
  spot_id uuid,
  spot_code text,
  label text,
  zone text,
  row_name text,
  sort_order integer,
  umbrellas integer,
  sunbeds integer,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  rotation numeric,
  shape text,
  z_index integer,
  final_status text,
  is_bookable boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_booking_date is null then
    raise exception 'La data richiesta non e valida.';
  end if;

  return query
  select
    m.layout_id,
    m.layout_name,
    m.spot_id,
    m.spot_code,
    m.label,
    m.zone,
    m.row_name,
    m.sort_order,
    m.umbrellas,
    m.sunbeds,
    m.x,
    m.y,
    m.width,
    m.height,
    m.rotation,
    m.shape,
    m.z_index,
    m.final_status,
    m.is_bookable
  from public.get_booking_map_rows(p_booking_date) m;
end;
$$;

create or replace function public.admin_get_booking_map_for_date(
  p_booking_date date
)
returns table (
  layout_id uuid,
  layout_name text,
  spot_id uuid,
  spot_code text,
  label text,
  zone text,
  row_name text,
  sort_order integer,
  base_status text,
  override_id uuid,
  override_status text,
  umbrellas integer,
  sunbeds integer,
  admin_note text,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  rotation numeric,
  shape text,
  z_index integer,
  active_booking_id uuid,
  active_booking_status text,
  booking_client_id uuid,
  booking_client_name text,
  final_status text,
  is_bookable boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Operazione consentita solo allo staff autenticato.' using errcode = '42501';
  end if;

  if p_booking_date is null then
    raise exception 'La data richiesta non e valida.';
  end if;

  return query
  select
    m.layout_id,
    m.layout_name,
    m.spot_id,
    m.spot_code,
    m.label,
    m.zone,
    m.row_name,
    m.sort_order,
    m.base_status,
    m.override_id,
    m.override_status,
    m.umbrellas,
    m.sunbeds,
    m.admin_note,
    m.x,
    m.y,
    m.width,
    m.height,
    m.rotation,
    m.shape,
    m.z_index,
    m.active_booking_id,
    m.active_booking_status,
    m.booking_client_id,
    m.booking_client_name,
    m.final_status,
    m.is_bookable
  from public.get_booking_map_rows(p_booking_date) m;
end;
$$;

create or replace function public.admin_upsert_spot_override(
  p_spot_id uuid,
  p_service_date date,
  p_status text default null,
  p_umbrellas integer default null,
  p_sunbeds integer default null,
  p_admin_note text default null
)
returns table (
  override_id uuid,
  action text,
  status text,
  umbrellas integer,
  sunbeds integer,
  admin_note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := upper(nullif(trim(coalesce(p_status, '')), ''));
  v_admin_note text := nullif(trim(coalesce(p_admin_note, '')), '');
  v_override public.beach_spot_overrides%rowtype;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Operazione consentita solo allo staff autenticato.' using errcode = '42501';
  end if;

  if p_spot_id is null or p_service_date is null then
    raise exception 'Postazione e data sono obbligatorie.';
  end if;

  if not exists (
    select 1
    from public.beach_spots bs
    where bs.id = p_spot_id
  ) then
    raise exception 'La postazione selezionata non esiste.';
  end if;

  if v_status is not null and v_status not in ('DISPONIBILE', 'BLOCCATA', 'MANUTENZIONE', 'RISERVATA') then
    raise exception 'Lo stato override non e valido.';
  end if;

  if p_umbrellas is not null and (p_umbrellas < 0 or p_umbrellas > 20) then
    raise exception 'Il numero ombrelloni non e valido.';
  end if;

  if p_sunbeds is not null and (p_sunbeds < 0 or p_sunbeds > 20) then
    raise exception 'Il numero lettini non e valido.';
  end if;

  if v_status is null and p_umbrellas is null and p_sunbeds is null and v_admin_note is null then
    delete from public.beach_spot_overrides bo
    where bo.spot_id = p_spot_id
      and bo.service_date = p_service_date
    returning * into v_override;

    return query
    select v_override.id, 'CLEARED'::text, null::text, null::integer, null::integer, null::text;
    return;
  end if;

  insert into public.beach_spot_overrides (
    spot_id,
    service_date,
    status,
    umbrellas,
    sunbeds,
    admin_note,
    created_by
  )
  values (
    p_spot_id,
    p_service_date,
    v_status,
    p_umbrellas,
    p_sunbeds,
    v_admin_note,
    auth.uid()
  )
  on conflict (spot_id, service_date) do update
    set status = excluded.status,
        umbrellas = excluded.umbrellas,
        sunbeds = excluded.sunbeds,
        admin_note = excluded.admin_note,
        updated_at = now()
  returning * into v_override;

  return query
  select
    v_override.id,
    'UPSERTED'::text,
    v_override.status,
    v_override.umbrellas,
    v_override.sunbeds,
    v_override.admin_note;
end;
$$;

create or replace function public.create_booking_vip(
  p_token uuid,
  p_booking_date date,
  p_time_slot text,
  p_adults int,
  p_children int,
  p_area_preference text,
  p_notes text
)
returns table (
  booking_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_client_status text;
  v_booking_id uuid := gen_random_uuid();
begin
  v_client_id := public.get_active_client_id(p_token, false);

  if v_client_id is null then
    raise exception 'Sessione cliente non valida o non autorizzata.';
  end if;

  select c.status
  into v_client_status
  from public.clients c
  where c.id = v_client_id;

  if v_client_status not in ('APPROVATO', 'VIP') then
    raise exception 'La prenotazione VIP non e disponibile per lo stato corrente del profilo.';
  end if;

  if p_booking_date is null or p_booking_date < current_date then
    raise exception 'La data di prenotazione non e valida.';
  end if;

  if p_time_slot not in ('MATTINA', 'POMERIGGIO', 'GIORNATA_INTERA') then
    raise exception 'La fascia oraria non e valida.';
  end if;

  if p_adults is null or p_adults < 1 or p_adults > 20 then
    raise exception 'Il numero adulti non e valido.';
  end if;

  if p_children is null or p_children < 0 or p_children > 20 then
    raise exception 'Il numero bambini non e valido.';
  end if;

  insert into public.bookings (
    id,
    client_id,
    booking_date,
    time_slot,
    adults,
    children,
    area_preference,
    client_notes,
    status
  )
  values (
    v_booking_id,
    v_client_id,
    p_booking_date,
    p_time_slot,
    p_adults,
    p_children,
    nullif(trim(coalesce(p_area_preference, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    'RICHIESTA'
  );

  return query
  select v_booking_id, 'RICHIESTA'::text;
end;
$$;

create or replace function public.create_spot_booking(
  p_token uuid,
  p_booking_date date,
  p_spot_id uuid,
  p_adults int,
  p_children int default 0,
  p_client_notes text default null
)
returns table (
  booking_id uuid,
  status text,
  spot_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_client_status text;
  v_booking_id uuid := gen_random_uuid();
  v_map_row record;
begin
  v_client_id := public.get_active_client_id(p_token, false);

  if v_client_id is null then
    raise exception 'Sessione cliente non valida o non autorizzata.';
  end if;

  select c.status
  into v_client_status
  from public.clients c
  where c.id = v_client_id;

  if v_client_status not in ('APPROVATO', 'VIP') then
    raise exception 'La prenotazione VIP non e disponibile per lo stato corrente del profilo.';
  end if;

  if p_booking_date is null or p_booking_date < current_date then
    raise exception 'La data di prenotazione non e valida.';
  end if;

  if p_spot_id is null then
    raise exception 'La postazione selezionata non e valida.';
  end if;

  if p_adults is null or p_adults < 1 or p_adults > 20 then
    raise exception 'Il numero adulti non e valido.';
  end if;

  if p_children is null or p_children < 0 or p_children > 20 then
    raise exception 'Il numero bambini non e valido.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_spot_id::text), (p_booking_date - date '2000-01-01'));

  select *
  into v_map_row
  from public.get_booking_map_rows(p_booking_date) m
  where m.spot_id = p_spot_id
  limit 1;

  if not found then
    raise exception 'La postazione selezionata non esiste nel layout attivo.';
  end if;

  if not v_map_row.is_bookable or v_map_row.final_status <> 'DISPONIBILE' then
    raise exception 'La postazione selezionata non e piu disponibile.';
  end if;

  begin
    insert into public.bookings (
      id,
      client_id,
      booking_date,
      time_slot,
      adults,
      children,
      area_preference,
      spot_id,
      spot_code_snapshot,
      umbrellas_snapshot,
      sunbeds_snapshot,
      client_notes,
      status
    )
    values (
      v_booking_id,
      v_client_id,
      p_booking_date,
      'GIORNATA_INTERA',
      p_adults,
      p_children,
      nullif(trim(coalesce(v_map_row.zone, '')), ''),
      p_spot_id,
      v_map_row.spot_code,
      v_map_row.umbrellas,
      v_map_row.sunbeds,
      nullif(trim(coalesce(p_client_notes, '')), ''),
      'RICHIESTA'
    );
  exception
    when unique_violation then
      raise exception 'La postazione selezionata non e piu disponibile.';
  end;

  return query
  select v_booking_id, 'RICHIESTA'::text, v_map_row.spot_code;
end;
$$;

create or replace function public.create_referral_vip(
  p_token uuid,
  p_referred_full_name text,
  p_referred_phone text,
  p_referred_notes text default null
)
returns table (
  referral_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_client_status text;
  v_referral_id uuid := gen_random_uuid();
begin
  v_client_id := public.get_active_client_id(p_token, false);

  if v_client_id is null then
    raise exception 'Sessione cliente non valida o non autorizzata.';
  end if;

  select c.status
  into v_client_status
  from public.clients c
  where c.id = v_client_id;

  if v_client_status not in ('APPROVATO', 'VIP') then
    raise exception 'Il referral non e disponibile per lo stato corrente del profilo.';
  end if;

  if nullif(trim(coalesce(p_referred_full_name, '')), '') is null then
    raise exception 'Il nome dell''ospite e obbligatorio.';
  end if;

  insert into public.referrals (
    id,
    referrer_client_id,
    referred_full_name,
    referred_phone,
    referred_notes,
    status
  )
  values (
    v_referral_id,
    v_client_id,
    trim(p_referred_full_name),
    nullif(trim(coalesce(p_referred_phone, '')), ''),
    nullif(trim(coalesce(p_referred_notes, '')), ''),
    'IN_VERIFICA'
  );

  return query
  select v_referral_id, 'IN_VERIFICA'::text;
end;
$$;

create or replace function public.verify_client_by_staff(
  p_card_code text
)
returns table (
  client_id uuid,
  full_name text,
  phone text,
  card_code text,
  vip_level text,
  status text,
  photo_path text,
  warnings_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_code text := upper(trim(coalesce(p_card_code, '')));
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Operazione consentita solo allo staff autenticato.' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.full_name,
    c.phone,
    c.card_code,
    c.vip_level,
    c.status,
    c.photo_path,
    coalesce(w.warning_count, 0) as warnings_count
  from public.clients c
  left join (
    select wr.client_id as warning_client_id, count(*) as warning_count
    from public.warnings wr
    group by wr.client_id
  ) w on w.warning_client_id = c.id
  where upper(c.card_code) = v_card_code
  limit 1;
end;
$$;

commit;
