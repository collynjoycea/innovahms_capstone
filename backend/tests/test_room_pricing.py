import inspect
import unittest
from datetime import date
from pathlib import Path

from werkzeug.datastructures import MultiDict

from backend import app as app_module


class RoomPricingTest(unittest.TestCase):
    def test_room_pricing_bootstrap_adds_missing_discount_columns(self):
        class FakeCursor:
            def __init__(self):
                self.queries = []

            def execute(self, query, params=None):
                self.queries.append(query)

            def fetchall(self):
                return []

        cursor = FakeCursor()
        app_module.db_bootstrap.ensure_room_pricing_columns(cursor)
        statements = "\n".join(cursor.queries)

        self.assertIn("ADD COLUMN IF NOT EXISTS owner_discount_type", statements)
        self.assertIn("ADD COLUMN IF NOT EXISTS room_discount_type", statements)
        self.assertIn("ADD COLUMN IF NOT EXISTS room_discount_amount", statements)
        self.assertIn("weekend_rate = price_per_night", statements)

    def test_room_number_duplicate_check_scopes_to_hotel_and_excludes_current_room(self):
        class FakeCursor:
            def __init__(self):
                self.queries = []

            def execute(self, query, params):
                self.queries.append((query, params))

            def fetchone(self):
                return {"id": 12}

        cursor = FakeCursor()
        error = app_module._room_number_error(cursor, 4, " 101 ", 9)

        self.assertEqual(error, "A room with this number already exists in this hotel.")
        self.assertEqual(cursor.queries[0][1], (4,))
        self.assertIn("LOWER(BTRIM(room_number)) = LOWER(%s)", cursor.queries[1][0])
        self.assertIn("AND id <> %s", cursor.queries[1][0])
        self.assertEqual(cursor.queries[1][1], (4, "101", 9))

    def test_weekday_weekend_rates_and_flat_discount_are_calculated_per_booking(self):
        result = app_module._calculate_room_stay_pricing(
            date(2026, 10, 30),
            date(2026, 11, 2),
            1000,
            1500,
            "fixed",
            50,
        )

        self.assertEqual([night["dayType"] for night in result["nightlyRates"]], ["weekday", "weekend", "weekend"])
        self.assertEqual([night["rate"] for night in result["nightlyRates"]], [1000, 1500, 1500])
        self.assertEqual(result["baseAmount"], 4000)
        self.assertEqual(result["discountAmount"], 50)
        self.assertEqual(result["subtotalAmount"], 3950)

    def test_flat_rates_ignore_weekend_rate_when_day_rates_are_disabled(self):
        result = app_module._calculate_room_stay_pricing(
            date(2026, 10, 30),
            date(2026, 11, 2),
            1000,
            1500,
            "none",
            0,
            False,
        )

        self.assertEqual([night["rate"] for night in result["nightlyRates"]], [1000, 1000, 1000])
        self.assertEqual(result["baseAmount"], 3000)

    def test_duration_rate_uses_selected_weekday_or_weekend_category(self):
        room = {
            "use_day_rates": True,
            "rate_9_hours": 900,
            "weekend_rate_9_hours": 1200,
            "rate_24_hours": 1800,
            "weekend_rate_24_hours": 2200,
        }

        self.assertEqual(app_module._room_duration_rate(room, 9, date(2026, 10, 30)), 900)
        self.assertEqual(app_module._room_duration_rate(room, 9, date(2026, 10, 31)), 1200)
        self.assertEqual(app_module._room_duration_rate(room, 24, date(2026, 10, 31)), 2200)
        room["use_day_rates"] = False
        self.assertEqual(app_module._room_duration_rate(room, 24, date(2026, 10, 31)), 1800)

    def test_percentage_discount_and_discount_cap(self):
        percent_result = app_module._calculate_room_stay_pricing(
            date(2026, 10, 26),
            date(2026, 10, 27),
            1000,
            1500,
            "percentage",
            10,
        )
        capped_result = app_module._calculate_room_stay_pricing(
            date(2026, 10, 26),
            date(2026, 10, 27),
            1000,
            1500,
            "fixed",
            1200,
        )

        self.assertEqual(percent_result["discountAmount"], 100)
        self.assertEqual(percent_result["subtotalAmount"], 900)
        self.assertEqual(capped_result["discountAmount"], 1000)
        self.assertEqual(capped_result["subtotalAmount"], 0)

    def test_room_pricing_form_validation(self):
        values, error = app_module._room_pricing_form_values(MultiDict([
            ("useDayRates", "true"),
            ("weekdayRate", "1200"),
            ("weekendRate", "1500"),
            ("ownerDiscountType", "percentage"),
            ("ownerDiscountValue", "15"),
        ]))
        self.assertIsNone(error)
        self.assertEqual(values["weekday_rate"], 1200)
        self.assertEqual(values["weekend_rate"], 1500)
        self.assertTrue(values["use_day_rates"])
        self.assertEqual(values["owner_discount_type"], "percentage")
        self.assertEqual(values["owner_discount_value"], 15)
        self.assertEqual(values["rate_9_hours"], 0)
        self.assertEqual(values["weekend_rate_24_hours"], 0)

        values, error = app_module._room_pricing_form_values(MultiDict([
            ("useDayRates", "true"),
            ("weekdayRate", "1200"),
        ]))
        self.assertIsNone(values)
        self.assertIn("Weekend rate must be greater than zero", error)

        values, error = app_module._room_pricing_form_values(MultiDict([
            ("weekdayRate", "1200"),
            ("weekendRate", "1500"),
            ("ownerDiscountType", "percentage"),
            ("ownerDiscountValue", "101"),
        ]))
        self.assertIsNone(values)
        self.assertIn("cannot exceed 100%", error)

    def test_room_rates_and_booking_discount_are_persisted_and_returned(self):
        root = Path(__file__).resolve().parents[1]
        migration = (root / "database" / "room_pricing.sql").read_text(encoding="utf-8")
        app_source = (root / "app.py").read_text(encoding="utf-8")
        self.assertIn("ADD COLUMN IF NOT EXISTS weekend_rate", migration)
        self.assertIn("ADD COLUMN IF NOT EXISTS use_day_rates", migration)
        self.assertIn("ADD COLUMN IF NOT EXISTS rate_9_hours", migration)
        self.assertIn("ADD COLUMN IF NOT EXISTS rate_24_hours", migration)
        self.assertIn("ADD COLUMN IF NOT EXISTS room_discount_amount", migration)
        self.assertIn("_calculate_room_stay_pricing(", inspect.getsource(app_module.create_reservation))
        self.assertIn("_calculate_room_discount(", inspect.getsource(app_module.create_reservation))
        self.assertIn("weekend_rate", inspect.getsource(app_module.get_rooms_catalog))
        self.assertIn("weekendRate24Hours", inspect.getsource(app_module.get_rooms_catalog))
        update_source = inspect.getsource(app_module.update_room)
        self.assertIn("owner_discount_type = %s", update_source)
        self.assertIn("owner_discount_value = %s", update_source)
        self.assertIn("RETURNING id, owner_discount_type, owner_discount_value", update_source)
        self.assertIn("room_discount_amount", app_source)


if __name__ == "__main__":
    unittest.main()
