-- The "last order" feature was removed: ordering is no longer cut off by a time of day.
ALTER TABLE restaurant_settings DROP COLUMN IF EXISTS last_order_time;
