-- Jalankan seluruh SQL ini di Supabase Dashboard > SQL Editor.
-- Buat akun admin melalui Authentication > Users, lalu ubah role profilnya menjadi 'admin'.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  instructions text not null,
  sets_reps text default '',
  difficulty text not null default 'Pemula',
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  youtube_url text not null,
  category_id uuid references public.categories(id) on delete set null,
  difficulty text not null default 'Pemula',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.exercises enable row level security;
alter table public.videos enable row level security;

drop policy if exists "Profiles can be read by owner or admin" on public.profiles;
create policy "Profiles can be read by owner or admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories
for select to anon, authenticated using (true);
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read exercises" on public.exercises;
create policy "Public can read exercises" on public.exercises
for select to anon, authenticated using (true);
drop policy if exists "Admins manage exercises" on public.exercises;
create policy "Admins manage exercises" on public.exercises
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read published videos" on public.videos;
create policy "Public can read published videos" on public.videos
for select to anon, authenticated using (is_published = true or public.is_admin());
drop policy if exists "Admins manage videos" on public.videos;
create policy "Admins manage videos" on public.videos
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Contoh data kategori awal:
insert into public.categories (name, slug, description) values
('Chest', 'chest', 'Latihan untuk membangun otot dada.'),
('Back', 'back', 'Latihan untuk memperkuat punggung.'),
('Shoulder', 'shoulder', 'Latihan otot bahu dan stabilitas.'),
('Arms', 'arms', 'Latihan biceps dan triceps.'),
('Abs', 'abs', 'Latihan inti dan otot perut.'),
('Legs', 'legs', 'Latihan kaki dan tubuh bagian bawah.')
on conflict (slug) do nothing;

-- Setelah membuat user admin di Authentication > Users, jalankan query ini
-- dengan UUID user yang sesuai:
-- insert into public.profiles (id, role)
-- values ('GANTI_DENGAN_UUID_USER', 'admin')
-- on conflict (id) do update set role = 'admin';