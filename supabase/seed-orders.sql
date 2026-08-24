-- ============================================================
-- PIECES BY P  |  Sample orders (DEV ONLY)
-- Fake orders so the admin orders page can be seen working before
-- Stripe checkout exists. Once real orders start arriving, delete
-- these — the cleanup statement is at the bottom of this file.
--
-- NEVER run this on Polly's real project.
--
-- Dates are relative to now(), so the "Paid this week" total and the
-- newest-first ordering both look right whenever you run it.
-- ============================================================

with new_orders as (
  insert into orders (
    order_number, customer_name, customer_email, customer_phone, customer_instagram,
    address1, address2, city, state, zip,
    notes, subtotal_cents, shipping_cents, total_cents,
    payment_method, payment_status, fulfillment_status, paid_at, created_at
  ) values
    ('PBP-8K2QX', 'Emma Carter', 'emma.carter@email.com', '(864) 555-0110', 'emmacarter',
     '123 Maple St', 'Apt 2', 'Greenville', 'SC', '29601',
     null, 8000, 0, 8000, 'card', 'paid', 'new', now() - interval '4 hours', now() - interval '4 hours'),

    ('PBP-7M4RL', 'Ava Thompson', 'ava.t@email.com', '(864) 555-0148', 'ava.thompson',
     '88 Whitner St', null, 'Anderson', 'SC', '29621',
     'Please gift wrap if you can!', 5600, 0, 5600, 'card', 'paid', 'making', now() - interval '8 hours', now() - interval '8 hours'),

    ('PBP-6H9ZC', 'Sofia Nguyen', 'sofian@email.com', '(843) 555-0192', null,
     '410 King St', 'Unit 5', 'Charleston', 'SC', '29403',
     null, 3400, 500, 3900, 'card', 'pending', 'new', null, now() - interval '1 day'),

    ('PBP-6C1TD', 'Mia Rodriguez', 'mia.r@email.com', '(864) 555-0175', 'miarod',
     '27 Cleveland Ave', null, 'Greenville', 'SC', '29607',
     null, 7200, 0, 7200, 'card', 'paid', 'shipped', now() - interval '2 days', now() - interval '2 days'),

    ('PBP-5X8PU', 'Charlotte Bell', 'cbell@email.com', '(803) 555-0133', 'charlottebell',
     '915 Gervais St', null, 'Columbia', 'SC', '29201',
     null, 7000, 0, 7000, 'card', 'paid', 'making', now() - interval '3 days', now() - interval '3 days'),

    -- Venmo orders: settled off-site, so payment_status only changes when
    -- Polly presses "Mark paid" on the orders page.
    ('PBP-4V2NM', 'Harper Lewis', 'harper.l@email.com', '(864) 555-0164', 'harperlewis',
     '52 Fant St', null, 'Anderson', 'SC', '29621',
     'Paying by Venmo tonight!', 4600, 0, 4600, 'venmo', 'pending', 'new', null, now() - interval '6 hours'),

    ('PBP-3B7VE', 'Grace Miller', 'gracem@email.com', '(864) 555-0121', 'grace.miller',
     '740 N Main St', 'Apt 12', 'Greenville', 'SC', '29601',
     null, 3200, 500, 3700, 'venmo', 'pending', 'new', null, now() - interval '1 day'),

    ('PBP-2D5VP', 'Lily Foster', 'lily.foster@email.com', '(803) 555-0157', 'lilyfoster',
     '18 Devine St', null, 'Columbia', 'SC', '29205',
     'Met at the Anderson pop-up', 3000, 0, 3000, 'venmo', 'paid', 'making', now() - interval '2 days', now() - interval '2 days')
  on conflict (order_number) do nothing
  returning id, order_number
)
insert into order_items (order_id, product_name, unit_price_cents, quantity, customization, line_total_cents)
select o.id, i.product_name, i.unit_price_cents, i.quantity, i.customization, i.line_total_cents
from new_orders o
join (values
  ('PBP-8K2QX', 'Sweetheart Strand',          4200, 1, 'red + pink, initial E',              4200),
  ('PBP-8K2QX', 'Coastal Stack (set of 5)',   3800, 1, null,                                 3800),
  ('PBP-7M4RL', 'Game Day Choker',            2800, 2, 'orange + purple, Clemson colors',    5600),
  ('PBP-6H9ZC', 'Puffy Heart Necklace',       3400, 1, null,                                 3400),
  ('PBP-6C1TD', 'Initial Heart Charm',        2400, 3, 'initials M, K, and L (set of gifts)',7200),
  ('PBP-5X8PU', 'Blush Beaded Necklace',      4000, 1, null,                                 4000),
  ('PBP-5X8PU', 'Sunny Day Stack (set of 3)', 3000, 1, null,                                 3000),
  ('PBP-4V2NM', 'Coral Reef Necklace',        4600, 1, 'sunset oranges please',              4600),
  ('PBP-3B7VE', 'Color Pop Bangles (set of 4)',3200, 1, null,                                3200),
  ('PBP-2D5VP', 'Pearl & Candy Choker',       3000, 1, 'shorter length, 14in',               3000)
) as i(order_number, product_name, unit_price_cents, quantity, customization, line_total_cents)
  on i.order_number = o.order_number;


-- ------------------------------------------------------------
-- CLEANUP — run this on its own to remove the samples.
-- order_items are removed automatically (on delete cascade).
-- ------------------------------------------------------------
-- delete from orders where order_number in
--   ('PBP-8K2QX','PBP-7M4RL','PBP-6H9ZC','PBP-6C1TD','PBP-5X8PU',
--    'PBP-4V2NM','PBP-3B7VE','PBP-2D5VP');
