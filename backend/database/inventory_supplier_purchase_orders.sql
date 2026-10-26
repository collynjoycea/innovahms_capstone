-- Run once on existing databases before deploying the API without runtime DDL.
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200) DEFAULT '',
    email VARCHAR(200) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (hotel_id, name)
);

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    UNIQUE (po_id, item_id)
);

-- Pricing columns added for item guest charges and PO payment tracking
ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE purchase_order_items
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE guest_requests
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE guest_requests
    ADD COLUMN IF NOT EXISTS total_charge NUMERIC(10,2) NOT NULL DEFAULT 0;
