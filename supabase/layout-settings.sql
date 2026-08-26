-- ============================================================
-- PIECES BY P  |  Layout settings
-- Run once per Supabase project, after schema.sql.
-- Adds the section show/hide + ordering controls, per-field font choices,
-- the accent colour preset, and the header logo settings to the
-- site_settings row, so the admin's site editor has something to read
-- and write.
--
-- Uses || so it only fills in what's missing and never clobbers
-- wording Polly has already edited. Safe to re-run.
-- ============================================================

update site_settings
set data = jsonb_build_object(
  'accent', 'coral',
  'fonts', '{}'::jsonb,
  'logoUrl', null,
  'logoHeight', 40,
  'photoShape', 'square',
  'photoFit', 'cover',
  'gridSize', 'medium',
  'heroSize', 'medium',
  'sections', jsonb_build_array(
    jsonb_build_object('id', 'hero',    'show', true),
    jsonb_build_object('id', 'shop',    'show', true),
    jsonb_build_object('id', 'about',   'show', true),
    jsonb_build_object('id', 'contact', 'show', true)
  )
) || data
where id = 1;
