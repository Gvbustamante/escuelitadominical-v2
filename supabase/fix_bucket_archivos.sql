-- Agrega columna "bucket" a actividad_archivos y devocional_archivos
-- para que archivos vinculados desde el Drive usen el bucket correcto.
-- Los archivos normales siguen en 'actividades'; los del Drive usan 'drive'.

ALTER TABLE public.actividad_archivos
  ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'actividades';

ALTER TABLE public.devocional_archivos
  ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'actividades';
