# FitZone — Gym & Workout Guide

Starter website React + TypeScript + Tailwind CSS + Supabase. Video menggunakan URL YouTube, jadi file video tidak diunggah ke Supabase Storage.

## Fitur yang tersedia
- Landing page FitZone dengan desain gelap hitam-merah.
- Halaman panduan latihan otot dan kategori.
- Halaman video YouTube dengan pencarian dan filter kategori.
- Login admin menggunakan Supabase Auth.
- Form tambah/edit/hapus video YouTube.
- Thumbnail video otomatis dari YouTube.
- SQL schema dan Row Level Security (RLS).

## 1. Persiapan
Pastikan Node.js versi 18 atau lebih baru sudah terpasang.

Ekstrak ZIP, buka folder `fitzone-gym` di VS Code/Antigravity, lalu jalankan:

```bash
npm install
```

## 2. Jalankan mode tampilan awal
```bash
npm run dev
```
Buka alamat lokal yang ditampilkan Vite. Data contoh pada tampilan awal hanya data demo lokal; perubahan admin baru benar-benar tersimpan setelah Supabase dikonfigurasi.

## 3. Hubungkan Supabase
1. Buat project di https://supabase.com/.
2. Buka SQL Editor di dashboard Supabase.
3. Salin dan jalankan seluruh isi `supabase/schema.sql`.
4. Salin file `.env.example` menjadi `.env.local`.
5. Isi URL project dan anon/public key dari Supabase Project Settings > API.

Contoh `.env.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Jangan pernah memasukkan `service_role` key ke frontend atau membagikannya ke publik.

Setelah mengubah `.env.local`, restart server `npm run dev`.

## 4. Buat akun admin
1. Buka Supabase > Authentication > Users.
2. Tambahkan user dengan email dan password admin.
3. Salin UUID user tersebut.
4. Di SQL Editor, jalankan query berikut dengan UUID milik admin:

```sql
insert into public.profiles (id, role)
values ('UUID_USER_ADMIN', 'admin')
on conflict (id) do update set role = 'admin';
```

Akun baru tidak otomatis menjadi admin. Hanya user dengan `profiles.role = 'admin'` yang dapat mengelola data melalui kebijakan RLS.

## 5. Build untuk deployment
```bash
npm run build
```
Hasil build berada di folder `dist`. Deploy folder ini ke hosting static atau Vercel.

## Catatan penting
- URL YouTube harus berupa link `youtube.com/watch?v=...`, `youtu.be/...`, atau link embed YouTube.
- Beberapa video mungkin tidak mengizinkan pemutaran embed dari website lain.
- Starter ini sudah menghubungkan operasi CRUD video ke Supabase. Form pengelolaan kategori dan panduan latihan dapat ditambahkan sebagai pengembangan berikutnya.
- Sebelum dipakai publik, lengkapi halaman kebijakan privasi, validasi konten, dan pengujian akses admin.
