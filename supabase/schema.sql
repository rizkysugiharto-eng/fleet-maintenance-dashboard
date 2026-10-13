-- =====================================================================
-- Skema database Fleet Maintenance Dashboard (Supabase / PostgreSQL)
--
-- Cara pakai: Supabase → SQL Editor → New query → tempel seluruh file ini → Run.
-- Aman dijalankan ulang (memakai "if not exists" / "or replace").
--
-- Aturan akses (Row Level Security):
--   • Semua orang (termasuk pengunjung tanpa login) boleh MEMBACA data → dashboard publik.
--   • Pengguna yang login (User) boleh menambah/mengubah work order dan HM.
--   • Hanya Admin yang boleh mengelola master unit, log PM, dan menghapus data.
-- =====================================================================

-- ---------- Tabel ----------

create table if not exists public.units (
  code         text primary key,
  site_id      text not null,
  type         text not null,
  brand        text,
  model        text,
  pm_interval  integer not null default 250 check (pm_interval > 0),
  ewh          numeric not null default 15 check (ewh > 0 and ewh <= 24),
  created_at   timestamptz not null default now()
);

create table if not exists public.work_orders (
  id            text primary key,
  site_id       text not null,
  unit_code     text not null references public.units (code) on update cascade,
  type          text not null check (type in ('PM', 'CM', 'BM', 'BAC')),
  status        text not null check (status in ('Open', 'In Progress', 'Waiting Part', 'Completed')),
  start_at      timestamp not null,          -- waktu lokal site (tanpa zona waktu)
  end_at        timestamp,                   -- kosong = unit masih dikerjakan
  component     text,
  problem       text,
  response_hours numeric check (response_hours >= 0), -- jam dari unit rusak sampai mekanik mulai (kosong = tidak tercatat)
  delay_reason  text,
  delay_hours   numeric not null default 0 check (delay_hours >= 0),
  cost          numeric not null default 0 check (cost >= 0),
  source        text not null default 'manual',
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  check (end_at is null or end_at > start_at)
);
create index if not exists work_orders_unit_idx on public.work_orders (unit_code);
-- Kolom tambahan versi 3 (aman untuk database yang dibuat dengan skema lama)
alter table public.work_orders add column if not exists response_hours numeric check (response_hours >= 0);
create index if not exists work_orders_start_idx on public.work_orders (start_at);

create table if not exists public.hm_logs (
  unit_code  text not null references public.units (code) on update cascade,
  date       date not null,
  hm         numeric not null check (hm >= 0),
  primary key (unit_code, date)
);

create table if not exists public.pm_logs (
  id         bigint generated always as identity primary key,
  site_id    text not null,
  unit_code  text not null references public.units (code) on update cascade,
  pm_type    text not null,
  hm_plan    numeric not null,
  hm_actual  numeric not null
);

-- Profil pengguna + peran (user / admin)
create table if not exists public.profiles (
  id     uuid primary key references auth.users (id) on delete cascade,
  email  text,
  role   text not null default 'user' check (role in ('user', 'admin'))
);

-- Setiap akun baru otomatis mendapat profil dengan peran 'user'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Akun yang sudah dibuat sebelum skema ini dijalankan juga diberi profil
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Hak akses ----------

grant usage on schema public to anon, authenticated;
grant select on public.units, public.work_orders, public.hm_logs, public.pm_logs to anon, authenticated;
grant insert, update, delete on public.units, public.work_orders, public.hm_logs, public.pm_logs to authenticated;
grant select on public.profiles to authenticated;

alter table public.units       enable row level security;
alter table public.work_orders enable row level security;
alter table public.hm_logs     enable row level security;
alter table public.pm_logs     enable row level security;
alter table public.profiles    enable row level security;

-- Hapus policy lama supaya file ini bisa dijalankan ulang
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('units', 'work_orders', 'hm_logs', 'pm_logs', 'profiles')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Baca: semua orang
create policy "baca publik" on public.units       for select using (true);
create policy "baca publik" on public.work_orders for select using (true);
create policy "baca publik" on public.hm_logs     for select using (true);
create policy "baca publik" on public.pm_logs     for select using (true);

-- Work order & HM: user yang login boleh menambah dan mengubah
create policy "user tambah WO"   on public.work_orders for insert to authenticated with check (true);
create policy "user ubah WO"     on public.work_orders for update to authenticated using (true) with check (true);
create policy "admin hapus WO"   on public.work_orders for delete to authenticated using (public.is_admin());
create policy "user tambah HM"   on public.hm_logs     for insert to authenticated with check (true);
create policy "user ubah HM"     on public.hm_logs     for update to authenticated using (true) with check (true);
create policy "admin hapus HM"   on public.hm_logs     for delete to authenticated using (public.is_admin());

-- Master unit & log PM: hanya admin
create policy "admin kelola unit"   on public.units   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin kelola log PM" on public.pm_logs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profil: setiap orang hanya bisa melihat profilnya sendiri
create policy "lihat profil sendiri" on public.profiles for select to authenticated using (id = auth.uid());

-- =====================================================================
-- Setelah membuat akun Anda (Authentication → Users → Add user),
-- jadikan akun itu Admin dengan menjalankan (ganti email-nya):
--
--   update public.profiles set role = 'admin' where email = 'email-anda@contoh.com';
-- =====================================================================
