create extension if not exists pgcrypto;

create type public.user_role as enum ('client', 'admin', 'secretaria');
create type public.booking_status as enum ('upcoming', 'past', 'cancelled');
create type public.booking_admin_status as enum ('pending', 'confirmed', 'cancelled');
create type public.payment_status as enum ('pending', 'completed');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.hours_transaction_type as enum ('credit', 'debit', 'refund', 'adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'client',
  active boolean not null default true,
  profession text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  name text not null,
  capacity integer not null check (capacity > 0),
  price_per_hour numeric(12,2) not null check (price_per_hour >= 0),
  amenities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.hours_plans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  balance numeric(8,2) not null default 0 check (balance >= 0),
  total numeric(8,2) check (total > 0),
  renews_on date,
  payment_confirmed boolean,
  last_renewal_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  booking_date date not null,
  time_slot text not null,
  status public.booking_status not null default 'upcoming',
  admin_status public.booking_admin_status,
  payment_status public.payment_status,
  total numeric(12,2),
  hours_from_plan numeric(8,2),
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  assigned_to uuid references public.profiles(id) on delete set null,
  priority public.task_priority not null,
  due_date date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hours_plan_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  type public.hours_transaction_type not null,
  hours numeric(8,2) not null,
  balance_after numeric(8,2) not null check (balance_after >= 0),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb,
  occurred_at timestamptz not null default now()
);

create index bookings_user_id_idx on public.bookings(user_id);
create index bookings_room_date_idx on public.bookings(room_id, booking_date);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index hours_transactions_user_idx on public.hours_plan_transactions(user_id, created_at desc);
create index audit_logs_occurred_idx on public.audit_logs(occurred_at desc);

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.hours_plans enable row level security;
alter table public.bookings enable row level security;
alter table public.tasks enable row level security;
alter table public.hours_plan_transactions enable row level security;
alter table public.audit_logs enable row level security;

-- Policies intentionally arrive in next migration after role helper functions.
-- Never expose these tables remotely before policies are installed and tested.
