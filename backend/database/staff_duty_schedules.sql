CREATE TABLE IF NOT EXISTS staff_duty_schedules (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    task_description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (shift_start <> shift_end)
);

CREATE INDEX IF NOT EXISTS idx_staff_duty_schedules_staff_date
    ON staff_duty_schedules (staff_id, shift_date, shift_start);
CREATE INDEX IF NOT EXISTS idx_staff_duty_schedules_hotel_date
    ON staff_duty_schedules (hotel_id, shift_date, shift_start);
