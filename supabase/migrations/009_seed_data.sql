-- supabase/migrations/009_seed_data.sql

-- === PUESTOS DE TRABAJO ===
INSERT INTO positions (name, description, requires_guard, guard_role) VALUES
  ('Auxilio Judicial', 'Actos de comunicación, custodia de sala, ejecuciones', true, 'auxilio'),
  ('Tramitador/a Procesal', 'Tramitación ordinaria, registro, notificaciones', true, 'tramitador'),
  ('Gestor/a Procesal', 'Tramitación cualificada de expedientes', true, 'gestor'),
  ('Letrado/a de la Administración de Justicia', 'LAJ - Dirección técnico-procesal', false, NULL),
  ('Juez/a', 'Titular del órgano judicial', false, NULL),
  ('Médico/a Forense', 'Peritaje médico-legal, compartido entre partidos judiciales', false, NULL);

-- === CONFIGURACIÓN ===
INSERT INTO app_settings (key, value, description) VALUES
  ('staff_per_guard', '3', 'Personas por guardia: 1 auxilio + 1 tramitador + 1 gestor'),
  ('guard_composition', '{"auxilio": 1, "tramitador": 1, "gestor": 1}', 'Composición obligatoria de cada guardia por categoría'),
  ('guard_start_day', 'friday', 'Día de inicio de la guardia'),
  ('guard_end_day', 'thursday', 'Día de fin de la guardia'),
  ('current_year', '2026', 'Año activo para gestión de guardias'),
  ('groq_model', 'llama-3.3-70b-versatile', 'Modelo de Groq para generación de guardias');

-- === FESTIVOS NACIONALES 2026 ===
INSERT INTO holidays (date, name, scope, year) VALUES
  ('2026-01-01', 'Año Nuevo', 'nacional', 2026),
  ('2026-01-06', 'Epifanía del Señor', 'nacional', 2026),
  ('2026-04-02', 'Jueves Santo', 'nacional', 2026),
  ('2026-04-03', 'Viernes Santo', 'nacional', 2026),
  ('2026-05-01', 'Fiesta del Trabajo', 'nacional', 2026),
  ('2026-08-15', 'Asunción de la Virgen', 'nacional', 2026),
  ('2026-10-12', 'Fiesta Nacional de España', 'nacional', 2026),
  ('2026-11-01', 'Todos los Santos', 'nacional', 2026),
  ('2026-12-06', 'Día de la Constitución', 'nacional', 2026),
  ('2026-12-08', 'Inmaculada Concepción', 'nacional', 2026),
  ('2026-12-25', 'Natividad del Señor', 'nacional', 2026);

-- === FESTIVO ARAGÓN ===
INSERT INTO holidays (date, name, scope, year) VALUES
  ('2026-04-23', 'San Jorge / Día de Aragón', 'aragon', 2026);
