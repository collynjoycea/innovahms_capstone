ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS weekend_rate NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS use_day_rates BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS owner_discount_type VARCHAR(20) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS owner_discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate_3_hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate_6_hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate_12_hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate_9_hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate_24_hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weekend_rate_3_hours NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS weekend_rate_6_hours NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS weekend_rate_9_hours NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS weekend_rate_12_hours NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS weekend_rate_24_hours NUMERIC(12, 2);

UPDATE rooms
SET weekend_rate = price_per_night
WHERE weekend_rate IS NULL OR weekend_rate <= 0;

UPDATE rooms SET weekend_rate_3_hours = rate_3_hours WHERE weekend_rate_3_hours IS NULL;
UPDATE rooms SET weekend_rate_6_hours = rate_6_hours WHERE weekend_rate_6_hours IS NULL;
UPDATE rooms SET weekend_rate_9_hours = rate_9_hours WHERE weekend_rate_9_hours IS NULL;
UPDATE rooms SET weekend_rate_12_hours = rate_12_hours WHERE weekend_rate_12_hours IS NULL;
UPDATE rooms SET weekend_rate_24_hours = rate_24_hours WHERE weekend_rate_24_hours IS NULL;

ALTER TABLE rooms
    ALTER COLUMN weekend_rate SET DEFAULT 0,
    ALTER COLUMN weekend_rate SET NOT NULL,
    ALTER COLUMN weekend_rate_3_hours SET DEFAULT 0,
    ALTER COLUMN weekend_rate_3_hours SET NOT NULL,
    ALTER COLUMN weekend_rate_6_hours SET DEFAULT 0,
    ALTER COLUMN weekend_rate_6_hours SET NOT NULL,
    ALTER COLUMN weekend_rate_9_hours SET DEFAULT 0,
    ALTER COLUMN weekend_rate_9_hours SET NOT NULL,
    ALTER COLUMN weekend_rate_12_hours SET DEFAULT 0,
    ALTER COLUMN weekend_rate_12_hours SET NOT NULL,
    ALTER COLUMN weekend_rate_24_hours SET DEFAULT 0,
    ALTER COLUMN weekend_rate_24_hours SET NOT NULL;

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS room_discount_type VARCHAR(20) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS room_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
