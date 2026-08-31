-- ============================================================
-- PIECES BY P  |  Let the owner position each photo in its tile
-- Run once, on every project. Safe to re-run.
--
-- The shop grid crops photos to a fixed shape, and the crop defaults to
-- the middle of the image. That is wrong as often as it is right: a
-- necklace photographed slightly off-centre loses its pendant, and the
-- only fix was re-cropping the file and re-uploading it.
--
-- These two numbers are a focal point in percent — the part of the photo
-- that must stay visible when the tile crops. They feed CSS object-position
-- directly, so nothing is ever written to the image file: the original
-- upload is untouched and she can reposition as many times as she likes.
--
-- 50/50 is dead centre, which is exactly today's behaviour, so existing
-- photos look identical until she moves one.
--
-- No new RLS policy needed: rls.sql already grants the owner ALL on
-- product_images.
-- ============================================================

alter table product_images
  add column if not exists focal_x smallint not null default 50,
  add column if not exists focal_y smallint not null default 50,
  -- Zoom as a percentage. 100 = the photo exactly fills the tile.
  --
  -- Zoom is what makes panning work in both directions. At 100 a portrait
  -- photo in a square tile is already exactly as wide as the frame, so there
  -- is nothing hidden to the left or right to slide into view and only the
  -- vertical crop can be chosen. Above 100 the photo overflows on both axes
  -- and she can move it anywhere.
  add column if not exists zoom smallint not null default 100;

-- Percentages. Anything outside 0–100 would be a bug in the admin, not a
-- crop the owner chose, so the database refuses it.
alter table product_images
  drop constraint if exists product_images_focal_range;

alter table product_images
  add constraint product_images_focal_range
  check (
    focal_x between 0 and 100
    and focal_y between 0 and 100
    -- Past 3x, a phone photo of a small piece is visibly mushy. The admin
    -- stops at the same place.
    and zoom between 100 and 300
  );

-- Verify: expect three rows, all smallint (50 / 50 / 100)
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'product_images'
  and column_name in ('focal_x', 'focal_y', 'zoom')
order by column_name;
