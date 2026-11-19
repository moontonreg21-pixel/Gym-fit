-- =============================================
-- FitZone Database Setup
-- Jalankan di Supabase SQL Editor
-- =============================================

-- 1. Tabel Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT ''
);

-- 2. Tabel Videos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  youtube_url TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty TEXT DEFAULT 'Pemula',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Exercises
CREATE TABLE IF NOT EXISTS public.exercises (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  instructions TEXT DEFAULT '',
  sets_reps TEXT DEFAULT '',
  difficulty TEXT DEFAULT 'Pemula'
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Categories: semua orang bisa baca
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

-- Categories: hanya authenticated user (admin) bisa insert/update/delete
CREATE POLICY "Categories are editable by authenticated users"
  ON public.categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Videos: semua orang bisa baca yang published
CREATE POLICY "Published videos are viewable by everyone"
  ON public.videos FOR SELECT
  USING (is_published = true);

-- Videos: authenticated user bisa baca semua (termasuk draft)
CREATE POLICY "Authenticated users can view all videos"
  ON public.videos FOR SELECT
  USING (auth.role() = 'authenticated');

-- Videos: hanya authenticated user bisa insert/update/delete
CREATE POLICY "Videos are editable by authenticated users"
  ON public.videos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Videos are updatable by authenticated users"
  ON public.videos FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Videos are deletable by authenticated users"
  ON public.videos FOR DELETE
  USING (auth.role() = 'authenticated');

-- Exercises: semua orang bisa baca
CREATE POLICY "Exercises are viewable by everyone"
  ON public.exercises FOR SELECT
  USING (true);

-- Exercises: hanya authenticated user bisa edit
CREATE POLICY "Exercises are editable by authenticated users"
  ON public.exercises FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- Seed Data
-- =============================================

-- Insert Categories
INSERT INTO public.categories (id, name, slug, description) VALUES
  ('chest', 'Chest', 'chest', 'Latihan untuk membangun otot dada.'),
  ('back', 'Back', 'back', 'Latihan untuk memperkuat punggung.'),
  ('shoulder', 'Shoulder', 'shoulder', 'Latihan otot bahu dan stabilitas.'),
  ('arms', 'Arms', 'arms', 'Latihan biceps dan triceps.'),
  ('abs', 'Abs', 'abs', 'Latihan inti dan otot perut.'),
  ('legs', 'Legs', 'legs', 'Latihan kaki dan tubuh bagian bawah.')
ON CONFLICT (id) DO NOTHING;

-- Insert Exercises
INSERT INTO public.exercises (id, name, category_id, instructions, sets_reps, difficulty) VALUES
  ('e1', 'Push Up', 'chest', '1. Posisikan telapak tangan sedikit lebih lebar dari bahu.
2. Luruskan tubuh dari kepala hingga tumit.
3. Turunkan dada secara terkontrol, lalu dorong kembali.', '3 set × 8–12 repetisi', 'Pemula'),
  ('e2', 'Bodyweight Squat', 'legs', '1. Berdiri dengan kaki selebar bahu.
2. Dorong pinggul ke belakang dan tekuk lutut.
3. Turun sesuai kemampuan, lalu berdiri kembali.', '3 set × 10–15 repetisi', 'Pemula'),
  ('e3', 'Plank', 'abs', '1. Topang tubuh dengan siku dan ujung kaki.
2. Jaga tubuh tetap lurus dan perut aktif.
3. Bernapas normal selama menahan posisi.', '3 set × 20–40 detik', 'Pemula')
ON CONFLICT (id) DO NOTHING;

-- Insert Videos
INSERT INTO public.videos (title, description, youtube_url, category_id, difficulty, is_published) VALUES
  ('Push Up untuk Pemula', 'Pelajari teknik dasar push up dengan posisi tubuh yang benar.', 'https://www.youtube.com/watch?v=IODxDxX7oi4', 'chest', 'Pemula', true),
  ('Latihan Punggung di Gym', 'Panduan dasar gerakan untuk melatih otot punggung.', 'https://www.youtube.com/watch?v=CAwf7n6luuc', 'back', 'Menengah', true),
  ('Leg Day Basics', 'Gerakan dasar untuk melatih otot kaki.', 'https://www.youtube.com/watch?v=U3HlEF_E9fo', 'legs', 'Pemula', true)
ON CONFLICT DO NOTHING;
