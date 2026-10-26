

-- Core user tables
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owners (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    business_permit_path TEXT,
    bir_certificate_path TEXT,
    fire_safety_certificate_path TEXT,
    valid_id_path TEXT,
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    approval_status VARCHAR(20) DEFAULT 'PENDING',
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotel management
CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
    hotel_name VARCHAR(150) NOT NULL,
    hotel_address TEXT,
    hotel_code VARCHAR(20),
    hotel_email VARCHAR(100),
    contact_number VARCHAR(20),
    hotel_logo TEXT,
    hotel_building_image TEXT,
    hotel_description TEXT,
    hotel_highlights TEXT[],
    check_in_policy TEXT,
    check_out_policy TEXT,
    cancellation_policy TEXT,
    total_rooms INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_hotel_code UNIQUE (hotel_code)
);

-- Rooms and reservations
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    room_name VARCHAR(100),
    room_type VARCHAR(50) CHECK (room_type IN ('Single', 'Standard', 'Double', 'Suite', 'Deluxe', 'Family Room')),
    bed_type VARCHAR(50),
    description TEXT,
    amenities TEXT[],
    features TEXT[],
    highlights TEXT[],
    images TEXT[],
    max_adults INTEGER DEFAULT 2,
    max_children INTEGER DEFAULT 0,
    price_per_night DECIMAL(10, 2) NOT NULL,
    weekend_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    use_day_rates BOOLEAN NOT NULL DEFAULT FALSE,
    owner_discount_type VARCHAR(20) NOT NULL DEFAULT 'none',
    owner_discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    rate_3_hours DECIMAL(10, 2) DEFAULT 0,
    rate_6_hours DECIMAL(10, 2) DEFAULT 0,
    rate_9_hours DECIMAL(10, 2) DEFAULT 0,
    rate_12_hours DECIMAL(10, 2) DEFAULT 0,
    rate_24_hours DECIMAL(10, 2) DEFAULT 0,
    weekend_rate_3_hours DECIMAL(10, 2) DEFAULT 0,
    weekend_rate_6_hours DECIMAL(10, 2) DEFAULT 0,
    weekend_rate_9_hours DECIMAL(10, 2) DEFAULT 0,
    weekend_rate_12_hours DECIMAL(10, 2) DEFAULT 0,
    weekend_rate_24_hours DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance', 'Cleaning', 'Dirty', 'InProgress', 'Clean', 'Reserved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    guest_name VARCHAR(120),
    check_in DATE,
    check_out DATE,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL DEFAULT 0,
    total_amount_php NUMERIC(12,2) NOT NULL DEFAULT 0,
    deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    room_discount_type VARCHAR(20) NOT NULL DEFAULT 'none',
    room_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'DOWNPAYMENT',
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'paid', 'completed', 'cancelled')),
    origin_country VARCHAR(80),
    check_in_time TIME WITHOUT TIME ZONE,
    check_out_time TIME WITHOUT TIME ZONE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff and attendance
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'Hotel Manager',
        'Front Desk Operations',
        'Housekeeping & Maintenance',
        'Inventory & Supplies',
        'HR/Payroll Staff Management'
    )),
    employee_id VARCHAR(20) UNIQUE,
    hotel_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    date_hired DATE DEFAULT CURRENT_DATE,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    hotel_id INTEGER,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITHOUT TIME ZONE,
    clock_out TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    comment TEXT,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'hidden')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_hotel_id ON staff(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_id ON reviews(hotel_id);
