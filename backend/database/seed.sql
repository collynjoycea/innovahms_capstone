-- Admin user
INSERT INTO admins (name, email, password_hash)
VALUES (
    'Admin',
    'admin@gmail.com',
    'scrypt:32768:8:1$8kvkgaKL4ZsT4rK1$5715ae3f7af53642f92e7fdf71466a5e7a13f0943fbcbc30fc0ec82122a714ad342ae637f3e66906d8351ac956c09d578a5f9a951d001cb1abb05b32814214a4'
)
ON CONFLICT (email) DO NOTHING;

-- Three current-day front desk arrivals with downpayments only.
DO $$
DECLARE
    hotel_id_value INTEGER;
    room_ids INTEGER[];
    customer_ids INTEGER[];
    reservation_index INTEGER;
BEGIN
    SELECT id INTO hotel_id_value FROM hotels ORDER BY id LIMIT 1;
    SELECT ARRAY_AGG(id ORDER BY id) INTO room_ids FROM (SELECT id FROM rooms WHERE hotel_id = hotel_id_value ORDER BY id LIMIT 3) x;
    SELECT ARRAY_AGG(id ORDER BY id) INTO customer_ids FROM (SELECT id FROM customers ORDER BY id LIMIT 3) y;
    IF hotel_id_value IS NOT NULL AND COALESCE(array_length(room_ids, 1), 0) >= 3 AND COALESCE(array_length(customer_ids, 1), 0) >= 3 THEN
        FOR reservation_index IN 1..3 LOOP
            INSERT INTO reservations (
                booking_number, customer_id, room_id, hotel_id, check_in_date, check_out_date,
                total_nights, total_amount, deposit_amount, payment_method, status, payment_status
            )
            SELECT
                'DEMO-DP-' || reservation_index || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD'),
                customer_ids[reservation_index], room_ids[reservation_index], hotel_id_value,
                CURRENT_DATE, CURRENT_DATE + 1, 1, 5000.00, 1500.00, 'cash', 'CONFIRMED', 'DOWNPAYMENT'
            WHERE NOT EXISTS (
                SELECT 1 FROM reservations r
                WHERE r.booking_number = 'DEMO-DP-' || reservation_index || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
            );
        END LOOP;
    END IF;
END $$;

-- Membership packages
INSERT INTO membership_packages (name, slug, description, monthly_price, annual_price, max_rooms, features, is_active)
VALUES
    ('Starter', 'starter', 'Perfect for small hotels just getting started', 2999.00, 29990.00, 10,
     '["Dashboard overview", "Room management", "Reservations and customers", "Guest reviews", "Up to 30 rooms"]'::jsonb,
     true),
    ('Professional', 'professional', 'Ideal for growing hotels with advanced needs', 5999.00, 59990.00, 50,
     '["Dashboard overview", "Room management", "Advanced reservations", "Staff management", "Inventory", "Housekeeping", "Reports", "Up to 50 rooms"]'::jsonb,
     true),
    ('Enterprise', 'enterprise', 'Full management suite with analytics and premium operator controls.', 50000.00, 540000.00, NULL,
     '["Everything in Pro", "Advanced reports", "Simulation tools", "Promotion management", "Unlimited rooms"]'::jsonb,
     true)
ON CONFLICT (slug) DO NOTHING;

-- Activate Enterprise for the demo owner so Enterprise features are available
-- when testing the owner subscription flow.
DO $$
DECLARE
    demo_hotel RECORD;
    enterprise_package RECORD;
    demo_hotel_found BOOLEAN;
    enterprise_package_found BOOLEAN;
BEGIN
    SELECT id, owner_id
    INTO demo_hotel
    FROM hotels
    WHERE hotel_code = 'DEMO-OWNER-01'
    ORDER BY id
    LIMIT 1;
    demo_hotel_found := FOUND;

    IF demo_hotel_found AND demo_hotel.owner_id IS NOT NULL THEN
        SELECT id, monthly_price
        INTO enterprise_package
        FROM membership_packages
        WHERE slug = 'enterprise' AND COALESCE(is_active, TRUE) = TRUE
        LIMIT 1;
        enterprise_package_found := FOUND;

        IF enterprise_package_found THEN
            INSERT INTO hotel_package_subscriptions (
                owner_id, hotel_id, package_id, billing_cycle, amount, status,
                payment_status, last_paid_at, starts_at, renewal_date, updated_at
            )
            VALUES (
                demo_hotel.owner_id, demo_hotel.id, enterprise_package.id, 'MONTHLY',
                enterprise_package.monthly_price, 'ACTIVE', 'PAID', NOW(),
                CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', NOW()
            )
            ON CONFLICT (hotel_id) DO UPDATE SET
                owner_id = EXCLUDED.owner_id,
                package_id = EXCLUDED.package_id,
                billing_cycle = EXCLUDED.billing_cycle,
                amount = EXCLUDED.amount,
                status = 'ACTIVE',
                payment_status = 'PAID',
                last_paid_at = NOW(),
                starts_at = CURRENT_DATE,
                renewal_date = CURRENT_DATE + INTERVAL '1 month',
                updated_at = NOW();
        END IF;
    END IF;
END $$;

-- Initialize loyalty for existing customers
INSERT INTO customer_loyalty (customer_id, points, tier, points_this_month)
SELECT c.id, 0, 'STANDARD', 0
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customer_loyalty cl WHERE cl.customer_id = c.id);

-- Cebu landmarks (sample data for first hotel)
DO $$
DECLARE
  hid INTEGER;
BEGIN
  SELECT id INTO hid FROM hotels ORDER BY id ASC LIMIT 1;
  IF hid IS NULL THEN
    RAISE EXCEPTION 'No hotels found. Please create an owner/hotel first.';
  END IF;

  -- Hotel location (UCC Congressional / Cebu City area)
  INSERT INTO vision_hotel_locations (hotel_id, label, lat, lng)
  VALUES (hid, 'University of Cebu - Congressional Campus (Cebu City)', 10.3247, 123.9091)
  ON CONFLICT DO NOTHING;

  -- Landmarks (name, category, lat, lng, sort_order)
  INSERT INTO vision_landmarks (hotel_id, name, category, lat, lng, sort_order)
  VALUES
    (hid,'SM City Cebu','Shopping',10.3110,123.9180,1),
    (hid,'Ayala Center Cebu','Shopping',10.3180,123.9049,2),
    (hid,'Cebu IT Park','District',10.3287,123.9067,3),
    (hid,'Sugbo Mercado','Food Market',10.3309,123.9060,4),
    (hid,'Waterfront Cebu City Hotel & Casino','Hotel',10.3302,123.9069,5),
    (hid,'Cebu Business Park','District',10.3189,123.9062,6),
    (hid,'Fuente Osmeña Circle','Landmark',10.3090,123.8910,7),
    (hid,'Colon Street','Landmark',10.2956,123.9012,8),
    (hid,'Magellan''s Cross','Historic',10.2929,123.9022,9),
    (hid,'Basilica Minore del Santo Niño','Historic',10.2934,123.9020,10),
    (hid,'Fort San Pedro','Historic',10.2933,123.9050,11),
    (hid,'Cebu Metropolitan Cathedral','Historic',10.2952,123.9025,12),
    (hid,'Cebu Taoist Temple','Temple',10.3340,123.8859,13),
    (hid,'Temple of Leah','Attraction',10.3727,123.8729,14),
    (hid,'Tops Lookout','Viewpoint',10.3725,123.8790,15),
    (hid,'Sirao Flower Garden','Attraction',10.3926,123.8681,16),
    (hid,'Casa Gorordo Museum','Museum',10.2966,123.9027,17),
    (hid,'Yap-Sandiego Ancestral House','Museum',10.2962,123.9022,18),
    (hid,'Cebu Ocean Park','Attraction',10.2797,123.8730,19),
    (hid,'Cebu Safari and Adventure Park','Attraction',10.7605,123.8950,20),
    (hid,'Mactan-Cebu International Airport','Airport',10.3094,123.9790,21),
    (hid,'Lapu-Lapu Shrine','Historic',10.2991,124.0054,22),
    (hid,'Mactan Newtown','District',10.2807,123.9788,23),
    (hid,'SkyPark at SM Seaside','Attraction',10.2819,123.8745,24),
    (hid,'SM Seaside City Cebu','Shopping',10.2810,123.8790,25)
  ON CONFLICT DO NOTHING;
END $$;

-- Update all hotels to Metro Manila locations
UPDATE hotels SET
    hotel_address = 'Makati City, Metro Manila, Philippines',
    latitude = 14.5547,
    longitude = 121.0244
WHERE id = 1;

UPDATE hotels SET
    hotel_address = 'Ermita, Manila, Metro Manila, Philippines',
    latitude = 14.5794,
    longitude = 120.9755
WHERE id = 2;

UPDATE hotels SET
    hotel_address = 'Novaliches, Quezon City, Metro Manila, Philippines',
    latitude = 14.6760,
    longitude = 121.0320
WHERE id = 12;

UPDATE hotels SET
    hotel_address = 'Lagro, Quezon City, Metro Manila, Philippines',
    latitude = 14.6760,
    longitude = 121.0320
WHERE id = 13;
INSERT INTO room_tours (room_id, panorama_url, initial_yaw, initial_pitch, initial_fov)
SELECT
    r.id,
    COALESCE(
        NULLIF(r.images[1], ''),
        CASE
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%single%' THEN '/images/standard-room.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%standard%' THEN '/images/standard-room.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%double%' THEN '/images/my-room-360.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%deluxe%' THEN '/images/deluxe-room.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%executive%' THEN '/images/executive-penthouse.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%penthouse%' THEN '/images/executive-penthouse.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%ocean%' THEN '/images/ocean-suite.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%suite%' THEN '/images/ocean-suite.jpg'
            ELSE '/images/deluxe-room.jpg'
        END
    ) AS panorama_url,
    0,
    0,
    1.57079632679
FROM rooms r
ON CONFLICT (room_id) DO UPDATE
SET
    panorama_url = EXCLUDED.panorama_url,
    initial_yaw = EXCLUDED.initial_yaw,
    initial_pitch = EXCLUDED.initial_pitch,
    initial_fov = EXCLUDED.initial_fov;

-- Notification types
INSERT INTO notification_types (type_key, name, description, category, priority, email_template, sms_template, push_template) VALUES
('system_maintenance', 'System Maintenance', 'Scheduled system maintenance notifications', 'SYSTEM', 'HIGH',
 'System maintenance scheduled for {{scheduled_time}}. System will be unavailable during this period.',
 'System maintenance at {{scheduled_time}}. Service interruption expected.',
 'System maintenance scheduled for {{scheduled_time}}'),
('admin_user_registration', 'New User Registration', 'New user registration alerts for admins', 'SYSTEM', 'NORMAL',
 'New {{user_type}} registered: {{user_name}} ({{user_email}})',
 'New {{user_type}} registered: {{user_name}}',
 'New {{user_type}} registered: {{user_name}}'),
('admin_payment_received', 'Payment Received', 'Payment received notifications for admins', 'PAYMENT', 'HIGH',
 'Payment received: PHP {{amount}} from {{payer_name}} for {{service_type}}',
 'Payment: PHP {{amount}} received from {{payer_name}}',
 'Payment received: PHP {{amount}} from {{payer_name}}'),
('owner_subscription_expiring', 'Subscription Expiring', 'Subscription renewal reminders for owners', 'PAYMENT', 'HIGH',
 'Your subscription expires on {{expiry_date}}. Renew now to avoid service interruption.',
 'Subscription expires {{expiry_date}}. Renew now.',
 'Subscription expires {{expiry_date}} - Renew now'),
('owner_new_booking', 'New Booking', 'New booking notifications for owners', 'BOOKING', 'NORMAL',
 'New booking: {{customer_name}} booked {{room_name}} for {{check_in_date}}',
 'New booking: {{customer_name}} - {{room_name}}',
 'New booking: {{customer_name}} - {{room_name}}'),
('owner_staff_task_completed', 'Staff Task Completed', 'Task completion notifications for owners', 'STAFF', 'NORMAL',
 '{{staff_name}} completed task: {{task_description}}',
 'Task completed: {{task_description}} by {{staff_name}}',
 'Task completed: {{task_description}}'),
('owner_low_inventory', 'Low Inventory Alert', 'Low inventory alerts for owners', 'INVENTORY', 'HIGH',
 'Low inventory alert: {{item_name}} ({{current_stock}} remaining)',
 'Low stock: {{item_name}} ({{current_stock}})',
 'Low stock: {{item_name}} ({{current_stock}})'),
('customer_booking_confirmed', 'Booking Confirmed', 'Booking confirmation for customers', 'BOOKING', 'HIGH',
 'Booking confirmed! Check-in: {{check_in_date}} at {{hotel_name}}. Reservation ID: {{booking_id}}',
 'Booking confirmed! Check-in: {{check_in_date}} at {{hotel_name}}',
 'Booking confirmed for {{check_in_date}} at {{hotel_name}}'),
('customer_checkin_reminder', 'Check-in Reminder', 'Check-in reminders for customers', 'BOOKING', 'NORMAL',
 'Reminder: Check-in tomorrow at {{hotel_name}}. Room {{room_number}} ready at {{checkin_time}}',
 'Check-in reminder: Tomorrow at {{hotel_name}}, Room {{room_number}}',
 'Check-in tomorrow at {{hotel_name}} - Room {{room_number}}'),
('customer_payment_due', 'Payment Due', 'Payment due notifications for customers', 'PAYMENT', 'HIGH',
 'Payment due: PHP {{amount}} for booking {{booking_id}}. Due date: {{due_date}}',
 'Payment due: PHP {{amount}} by {{due_date}}',
 'Payment due: PHP {{amount}} by {{due_date}}'),
('customer_loyalty_points', 'Loyalty Points Earned', 'Loyalty points notifications for customers', 'CUSTOMER', 'NORMAL',
 'You earned {{points}} loyalty points! Total points: {{total_points}}',
 'Earned {{points}} points! Total: {{total_points}}',
 'Earned {{points}} loyalty points! Total: {{total_points}}'),
('staff_task_assigned', 'Task Assigned', 'New task assignments for staff', 'STAFF', 'HIGH',
 'New task assigned: {{task_description}} in {{room_number}}. Priority: {{priority}}',
 'New task: {{task_description}} - {{room_number}}',
 'New task: {{task_description}} - {{room_number}}'),
('staff_shift_reminder', 'Shift Reminder', 'Shift schedule reminders for staff', 'STAFF', 'NORMAL',
 'Shift reminder: {{shift_date}} from {{start_time}} to {{end_time}}',
 'Shift: {{shift_date}} {{start_time}}-{{end_time}}',
 'Shift tomorrow: {{start_time}}-{{end_time}}'),
('staff_inventory_alert', 'Inventory Alert', 'Inventory alerts for staff', 'INVENTORY', 'HIGH',
 'Inventory alert: {{item_name}} stock is {{severity}}. Current: {{current_stock}}',
 '{{item_name}} stock {{severity}}: {{current_stock}}',
 '{{item_name}} stock {{severity}}: {{current_stock}}'),
('staff_maintenance_due', 'Maintenance Due', 'Maintenance reminders for staff', 'MAINTENANCE', 'NORMAL',
 'Maintenance due: {{equipment_name}} in {{location}}. Schedule service.',
 'Maintenance due: {{equipment_name}} - {{location}}',
 'Maintenance due: {{equipment_name}} - {{location}}')
ON CONFLICT (type_key) DO NOTHING;

-- Demo housekeeping login: hk.demo@innovahms.test / Housekeep@2026 / hotel code DEMO-OWNER-01.
DELETE FROM hk_tasks
WHERE assigned_to IN (
    SELECT id FROM staff WHERE email = 'hk.test@innovahms.test'
);
DELETE FROM staff WHERE email = 'hk.test@innovahms.test';

INSERT INTO staff (hotel_id, first_name, last_name, email, contact_number, password_hash, role, hotel_code, status)
SELECT h.id, 'Demo', 'Housekeeper', 'hk.demo@innovahms.test', '+639171234568',
       'scrypt:32768:8:1$XzClpKoX8RJJWvSk$f679f860f5027e6dd0193e02797e94017b9b273f6a74730b32381ac40aca37e54154beb56d00cd4f7c7661c6190c9da5745f95d0bbef5fd5d0efd22adec223f2',
       'Housekeeping & Maintenance', h.hotel_code, 'Active'
FROM hotels h
WHERE h.hotel_code = 'DEMO-OWNER-01'
ON CONFLICT (email) DO UPDATE SET
    hotel_id = EXCLUDED.hotel_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    contact_number = EXCLUDED.contact_number,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    hotel_code = EXCLUDED.hotel_code,
    status = EXCLUDED.status;

-- Demo manager login: manager.demo@innovahms.test / Manager@2026 / hotel code DEMO-OWNER-01.
INSERT INTO staff (hotel_id, first_name, last_name, email, contact_number, password_hash, role, hotel_code, status)
SELECT h.id, 'Demo', 'Manager', 'manager.demo@innovahms.test', '+639171234569',
       'scrypt:32768:8:1$q6QotZYl0B0l3SCm$8d4919a4461d74c44c309e5eefdfe328974f7c9e5ddac6222afd2d755930ee8a2f1f540c0ab23517fe2c70f1651c6f02740409724efca2d5d1f1e93e6f081c28',
       'Hotel Manager', h.hotel_code, 'Active'
FROM hotels h
WHERE h.hotel_code = 'DEMO-OWNER-01'
ON CONFLICT (email) DO UPDATE SET
    hotel_id = EXCLUDED.hotel_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    contact_number = EXCLUDED.contact_number,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    hotel_code = EXCLUDED.hotel_code,
    status = EXCLUDED.status;

-- Rooms: allow housekeeping statuses. After front desk check-out a room is set to 'Dirty'
-- and must go Dirty -> InProgress -> Clean -> Available before it can be booked again.
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'rooms'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE rooms DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
        CHECK (status IN ('Available','Occupied','Maintenance','Cleaning','Dirty','InProgress','Clean','Reserved')) NOT VALID;
END $$;

-- Allow Standard, Single, and Family Room types in older databases.
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'rooms'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%room_type%'
    LOOP
        EXECUTE format('ALTER TABLE rooms DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_check
        CHECK (room_type IN ('Single','Double','Suite','Deluxe','Standard','Family Room')) NOT VALID;
END $$;

-- Remove the demo room/task samples that used to overlap real hotel records.
DO $$
DECLARE hid INTEGER;
BEGIN
    SELECT id INTO hid FROM hotels WHERE hotel_code = 'DEMO-OWNER-01' ORDER BY id LIMIT 1;

    IF hid IS NOT NULL THEN
        DELETE FROM hk_tasks
        WHERE hotel_id = hid
          AND staff_name = 'Demo Housekeeper'
          AND notes = 'Demo task - prepare room for the next check-in';

        DELETE FROM rooms
        WHERE hotel_id = hid
          AND (
              UPPER(room_number) IN ('DP-1', 'DP-2')
              OR (
                  room_number IN ('101', '102', '103', '201', '202', '203', '301', '302', '303', '401', '402', '403', '501', '502', '503')
                  AND description IN (
                      'Comfortable standard room on Floor 1 with a city view.',
                      'Compact single room on Floor 1, suited for solo stays.',
                      'Bright double room on Floor 1 with space for a small family.',
                      'Quiet single room on Floor 2 with essential comforts.',
                      'Family room on Floor 2 with added sleeping space.',
                      'Twin standard room on Floor 2 for friends or family.',
                      'Spacious double room on Floor 3 with a seating corner.',
                      'Upgraded deluxe room on Floor 3 with premium furnishings.',
                      'Well-appointed single room on Floor 3 for a restful stay.',
                      'High-floor deluxe room on Floor 4 with a city outlook.',
                      'One-bedroom suite on Floor 4 with a separate lounge area.',
                      'Comfortable family room on Floor 4 with extra guest capacity.',
                      'Top-floor suite on Floor 5 with a lounge and premium amenities.',
                      'Top-floor double room on Floor 5 with room for up to three guests.',
                      'Corner deluxe room on Floor 5 with enhanced comfort and city views.'
                  )
              )
              OR (
                  room_number = 'STD-101'
                  AND room_name = 'Standard Room'
                  AND description = 'Comfortable sample Standard room for room search and booking demos.'
              )
          )
          AND NOT EXISTS (
              SELECT 1 FROM reservations
              WHERE reservations.room_id = rooms.id
          );
    END IF;
END $$;

-- Sample guest requests for the front desk and housekeeping request boards.
DO $$
DECLARE
    hid INTEGER;
    rid INTEGER;
    cid INTEGER;
    requester_id INTEGER;
    hk_id INTEGER;
    room_label VARCHAR(50);
    reservation_id_value INTEGER;
    towel_id INTEGER;
    water_id INTEGER;
BEGIN
    SELECT id INTO hid FROM hotels ORDER BY id LIMIT 1;
    SELECT id, room_number INTO rid, room_label FROM rooms WHERE hotel_id = hid ORDER BY id LIMIT 1;
    SELECT id INTO cid FROM customers ORDER BY id LIMIT 1;
    SELECT id INTO requester_id FROM staff WHERE hotel_id = hid ORDER BY id LIMIT 1;
    SELECT id INTO hk_id FROM staff WHERE hotel_id = hid AND role ILIKE '%housekeeping%' ORDER BY id LIMIT 1;

    IF hid IS NOT NULL AND rid IS NOT NULL AND cid IS NOT NULL THEN
        INSERT INTO inventory_items
            (hotel_id, sku_id, item_name, category, unit, stock_level, min_stock, max_stock, reorder_point)
        VALUES
            (hid, 'DEMO-TOWEL', 'Bath Towel', 'Linen', 'pcs', 24, 8, 40, 10),
            (hid, 'DEMO-WATER', 'Bottled Water', 'Guest Supplies', 'bottles', 30, 10, 60, 12)
        ON CONFLICT (sku_id) DO UPDATE SET hotel_id = EXCLUDED.hotel_id;

        SELECT id INTO towel_id FROM inventory_items WHERE sku_id = 'DEMO-TOWEL';
        SELECT id INTO water_id FROM inventory_items WHERE sku_id = 'DEMO-WATER';

        INSERT INTO reservations (
            booking_number, customer_id, room_id, hotel_id, check_in_date, check_out_date,
            total_nights, total_amount, deposit_amount, payment_method, status, payment_status
        )
        VALUES (
            'DEMO-GUEST-REQUEST-' || hid, cid, rid, hid, CURRENT_DATE, CURRENT_DATE + 1,
            1, 5000.00, 5000.00, 'cash', 'CHECKED_IN', 'PAID'
        )
        ON CONFLICT (booking_number) DO NOTHING;

        SELECT id INTO reservation_id_value
        FROM reservations
        WHERE booking_number = 'DEMO-GUEST-REQUEST-' || hid;

        IF reservation_id_value IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM guest_requests WHERE reservation_id = reservation_id_value
        ) THEN
            INSERT INTO guest_requests
                (hotel_id, reservation_id, guest_name, room_number, inventory_id, item_name,
                 quantity, priority, notes, status, requested_by, relayed_by, hk_staff_id,
                 relayed_at, started_at, delivered_at)
            SELECT hid, reservation_id_value,
                   COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''), room_label,
                   towel_id, 'Bath Towel', 2, 'NORMAL', 'Demo request waiting for front desk relay.',
                   'RECEIVED', requester_id, NULL, NULL, NULL, NULL, NULL
            FROM customers c WHERE c.id = cid;

            INSERT INTO guest_requests
                (hotel_id, reservation_id, guest_name, room_number, inventory_id, item_name,
                 quantity, priority, notes, status, requested_by, relayed_by, relayed_at)
            SELECT hid, reservation_id_value,
                   COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''), room_label,
                   water_id, 'Bottled Water', 2, 'HIGH', 'Demo request already relayed to housekeeping.',
                   'RELAYED', requester_id, requester_id, NOW() - INTERVAL '8 minutes'
            FROM customers c WHERE c.id = cid;

            INSERT INTO guest_requests
                (hotel_id, reservation_id, guest_name, room_number, inventory_id, item_name,
                 quantity, priority, notes, status, requested_by, relayed_by, hk_staff_id,
                 relayed_at, started_at)
            SELECT hid, reservation_id_value,
                   COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''), room_label,
                   NULL, 'Baby Crib', 1, 'URGENT', 'Demo custom request currently being prepared.',
                   'IN_PROGRESS', requester_id, requester_id, hk_id,
                   NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '7 minutes'
            FROM customers c WHERE c.id = cid;

            INSERT INTO guest_requests
                (hotel_id, reservation_id, guest_name, room_number, item_name,
                 quantity, priority, notes, status, requested_by, relayed_by, hk_staff_id,
                 relayed_at, started_at, delivered_at)
            SELECT hid, reservation_id_value,
                   COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''), room_label,
                   'Extra Pillow', 1, 'NORMAL', 'Demo custom request completed without inventory deduction.',
                   'DELIVERED', requester_id, requester_id, hk_id,
                   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '40 minutes'
            FROM customers c WHERE c.id = cid;
        END IF;
    END IF;
END $$;
