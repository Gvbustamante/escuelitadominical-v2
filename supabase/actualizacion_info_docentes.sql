-- ============================================================
-- Migración: info adicional de docentes (email, whatsapp, hoja de vida)
-- Fecha: 2026-09-23
-- ============================================================

-- 1. Nuevas columnas en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hoja_vida_url text;

-- 2. Bucket de Storage para hojas de vida (público para lectura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hojas_vida', 'hojas_vida', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS del bucket
CREATE POLICY "Staff puede subir hojas de vida"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hojas_vida');

CREATE POLICY "Todos pueden ver hojas de vida"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hojas_vida');

CREATE POLICY "Staff puede borrar hojas de vida"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hojas_vida');
