-- 1. Campo sexo en ninos
ALTER TABLE ninos ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('M', 'F'));

-- 2. Campo desactivado_en en profiles (para saber cuándo se desactivó)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desactivado_en TIMESTAMPTZ;

-- 3. Tabla solicitudes_reset para restablecer contraseña
CREATE TABLE IF NOT EXISTS solicitudes_reset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resuelta_en TIMESTAMPTZ,
  resuelta_por UUID REFERENCES auth.users(id)
);

ALTER TABLE solicitudes_reset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gestiona solicitudes_reset" ON solicitudes_reset
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador') AND activo = true)
  );

CREATE POLICY "cualquiera inserta solicitud" ON solicitudes_reset
  FOR INSERT WITH CHECK (true);
