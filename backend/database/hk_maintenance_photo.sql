-- Adds photo support to housekeeping maintenance reports so staff can attach
-- a captured/uploaded image of the issue ("Capture Image" button).
-- Note: app.py already applies this automatically (idempotent, ADD COLUMN IF NOT EXISTS)
-- the first time /api/housekeeping/maintenance is called — this file is just for
-- running it manually against the DB if you prefer.
ALTER TABLE hk_maintenance_reports ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Room Status Map: log of "before status change" verification photos.
-- app.py creates this table automatically the first time a photo-backed
-- status change happens — this is just for running it manually if you prefer.
CREATE TABLE IF NOT EXISTS hk_cleaning_photos (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    photo_url TEXT NOT NULL,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
