-- ============================================================
-- PIECES BY P  |  Dev seed data
-- Run this AFTER supabase/schema.sql, in a throwaway dev Supabase
-- project only. It fills in the site_settings copy (hero/about/contact)
-- that schema.sql's own seed leaves blank, and adds sample products
-- (matching the pieces-by-p-store.jsx preview) so the storefront has
-- something to render while building. Delete or ignore at launch —
-- Polly enters her own real copy and pieces through the admin.
-- ============================================================

update site_settings
set data = data || jsonb_build_object(
  'heroImageUrl', null,
  'hero', jsonb_build_object(
    'eyebrow', 'handmade, one at a time',
    'eyebrowScript', 'by Polly',
    'title', 'Colorful little pieces',
    'titleScript', 'worth collecting',
    'lede', 'Beaded necklaces, stacks, chokers, and charms, made to order in Anderson, South Carolina. Pick your piece, tell us your colors, and we''ll make it yours.',
    'cta', 'Shop the collection'
  ),
  'about', jsonb_build_object(
    'eyebrowScript', 'about',
    'title', 'Made by hand, one piece at a time',
    'body', 'Every piece is designed and strung by Polly in small batches. Choose your colors, add an initial or a charm, and each order is made just for you. Handmade to order, so most pieces ship within about a week.'
  ),
  'contact', jsonb_build_object(
    'heading', 'Custom orders, pop-ups, and hellos',
    'instagram', '@shop.piecesbyp',
    'email', 'hello@piecesbyp.co',
    'maker', 'Polly McCollum',
    'location', 'Anderson, South Carolina',
    'findus', 'local pop-ups and markets'
  )
)
where id = 1;

insert into products (name, category, price_cents, material, description, tag, charm, colors, custom, active, sort_order) values
('Sweetheart Strand', 'Necklaces', 4200, 'Glass & clay beads, 14k gold-fill heart', 'Candy pinks and reds with a puffy gold heart. Our most-loved everyday necklace, made to layer.', 'Bestseller', 'heart', '["#E4573B","#E7789A","#F2B8C6","#E4573B","#C79A3E"]', true, true, 10),
('Coastal Stack (set of 5)', 'Bracelets', 3800, 'Glass beads on stretch cord', 'Five stretch bracelets in beachy blues, coral, and cream. Wear the whole stack or split them up.', 'Bestseller', 'heart', '["#3E9DB0","#E4573B","#F5EFE2","#EBA9BE","#8FB98F"]', true, true, 20),
('Game Day Choker', 'Chokers', 2800, 'Clay beads, gold-fill accents', 'Pick your team colors. A short beaded choker that shows up loud on game day.', null, null, '["#E4573B","#2B2A24","#C79A3E","#FDFBF4"]', true, true, 30),
('Puffy Heart Necklace', 'Charms', 3400, 'Gold-fill heart on beaded chain', 'A single puffy gold heart on a fine beaded chain. Simple, sweet, goes with everything.', 'New', 'heart', '["#F5EFE2","#EAD7A8","#C79A3E"]', false, true, 40),
('Coral Reef Necklace', 'Necklaces', 4600, 'Disc beads, gold-fill heart', 'Warm coral and sunset tones in a graduated disc strand. Summer in a necklace.', 'New', 'heart', '["#E4573B","#EF8A6B","#E7789A","#F2C0A0"]', true, true, 50),
('Bluebell Layered Set', 'Necklaces', 5400, 'Glass beads, gold-fill coin & chain', 'A navy-and-turquoise beaded strand layered with a gold coin necklace. Two pieces, endless pairings.', null, 'coin', '["#2E4A7A","#3E9DB0","#7FB6C4","#C79A3E"]', false, true, 60),
('Color Pop Bangles (set of 4)', 'Bracelets', 3200, 'Coated beads on memory wire', 'Four skinny bangles in orange, pink, green, and blue. Instant color, stacks with anything.', null, null, '["#E58A2B","#E15E92","#8FB98F","#3E9DB0"]', true, true, 70),
('Pearl & Candy Choker', 'Chokers', 3000, 'Freshwater pearls & glass beads', 'Freshwater pearls with soft pink beads. A little sweet, a little classic.', null, null, '["#F5EFE2","#EBA9BE","#F2D7DE","#E7789A"]', false, true, 80),
('Initial Heart Charm', 'Charms', 2400, 'Gold-fill initial + heart', 'Your initial and a tiny heart on a beaded chain. The go-to gift, personalized just for her.', null, 'heart', '["#EADFC6","#C79A3E"]', true, true, 90),
('Sunny Day Stack (set of 3)', 'Bracelets', 3000, 'Glass & gold beads on stretch cord', 'Buttery yellows, cream, and gold. The stack that makes a white tee feel like an outfit.', null, null, '["#E9C85A","#FDFBF4","#C79A3E"]', false, true, 100),
('Blush Beaded Necklace', 'Necklaces', 4000, 'Clay beads, gold-fill heart', 'Soft blush and cream with a gold heart. Quiet enough for every day, pretty enough to notice.', null, 'heart', '["#EBA9BE","#F2D7DE","#F5EFE2","#C79A3E"]', true, true, 110),
('Star & Coin Necklace', 'Charms', 3600, 'Gold-fill star & coin on beads', 'A gold star and coin medallion on a deep-blue beaded chain. A little celestial, a little coastal.', null, 'star', '["#2E4A7A","#3E9DB0","#C79A3E"]', false, true, 120)
on conflict do nothing;
