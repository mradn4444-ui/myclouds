-- ============================================================
-- Migration 001 — Schéma initial MyCloud App
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Table principale : éléments du canvas (fichiers, notes, images...)
CREATE TABLE IF NOT EXISTS canvas_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('file', 'image', 'video', 'audio', 'note', 'document')),
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT,
  file_path   TEXT,
  file_url    TEXT,
  file_size   BIGINT,
  mime_type   TEXT,
  pos_x       FLOAT NOT NULL DEFAULT 100,
  pos_y       FLOAT NOT NULL DEFAULT 100,
  width       FLOAT NOT NULL DEFAULT 200,
  height      FLOAT NOT NULL DEFAULT 150,
  z_index     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canvas_items_user_id ON canvas_items(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_type ON canvas_items(type);
CREATE INDEX IF NOT EXISTS idx_canvas_items_updated ON canvas_items(updated_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canvas_items_updated_at
  BEFORE UPDATE ON canvas_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON canvas_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON canvas_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON canvas_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON canvas_items FOR DELETE
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'text/plain', 'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
