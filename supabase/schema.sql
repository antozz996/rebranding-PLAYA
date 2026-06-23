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

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  booking_date date not null,
  time_slot text not null
    check (time_slot in ('MATTINA', 'POMERIGGIO', 'GIORNATA_INTERA')),
  adults integer not null check (adults between 1 and 20),
  children integer not null default 0 check (children between 0 and 20),
  area_preference text,
  client_notes text,
  staff_notes text,
  status text not null default 'RICHIESTA'
    check (status in (
      'RICHIESTA',
      'CONFERMATA',
      'RIFIUTATA',
      'ANNULLATA',
      'COMPLETATA',
      'NO_SHOW'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
