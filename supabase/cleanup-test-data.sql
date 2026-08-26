-- ============================================================
-- PIECES BY P  |  Remove test data before opening the shop
--
-- Run this on the LIVE project once testing is finished and before
-- the shop is announced.
--
-- Stripe TEST-mode payments need no cleanup — they live in a separate
-- ledger, never pay out, and never appear in live mode. Only the rows
-- these tests created in the real database matter, because they show up
-- in the admin looking like genuine orders to make and ship.
--
-- Each statement is listed separately so you can see what goes. Read
-- before running: this deletes rows permanently.
-- ============================================================

-- 1. See what is there first. Run this on its own and check the list.
select order_number, customer_name, customer_email, total_cents,
       payment_method, payment_status, created_at
from orders
order by created_at desc;

select id, name, email, left(body, 60) as body_start, created_at
from messages
order by created_at desc;


-- ------------------------------------------------------------
-- 2. Delete a specific test order by its number.
--    order_items are removed automatically (on delete cascade).
--    Replace the value with the order number you saw above.
-- ------------------------------------------------------------
-- delete from orders where order_number = 'PBP-XXXXX';


-- ------------------------------------------------------------
-- 3. Delete the automated setup-check message, if still present.
-- ------------------------------------------------------------
-- delete from messages where name = 'Setup Test - safe to delete';


-- ------------------------------------------------------------
-- 4. NUCLEAR: remove EVERY order and message.
--    Only safe before the shop has taken a single real order.
--    Once a real customer has ordered, use the targeted deletes above.
-- ------------------------------------------------------------
-- delete from orders;
-- delete from messages;


-- ------------------------------------------------------------
-- 5. Stock was reserved by the test orders, so counts are now low.
--    Put them back in the admin under Pieces, or set them here.
-- ------------------------------------------------------------
-- select name, stock from products where stock is not null order by name;
