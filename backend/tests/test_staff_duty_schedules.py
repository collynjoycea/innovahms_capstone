import inspect
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path

from backend import app as app_module


class StaffDutyScheduleTest(unittest.TestCase):
    def test_front_desk_and_housekeeping_role_variants_are_schedulable(self):
        for role in (
            "Front Desk Operations",
            "Front Desk",
            "Frontdesk Staff",
            "Housekeeping & Maintenance",
            "Housekeeping",
        ):
            with self.subTest(role=role):
                self.assertTrue(app_module._is_schedulable_staff_role(role))

        self.assertFalse(app_module._is_schedulable_staff_role("Hotel Manager"))
        self.assertFalse(app_module._is_schedulable_staff_role("HR/Payroll Staff Management"))

    def test_schedule_input_accepts_future_and_overnight_shifts(self):
        shift_date = (date.today() + timedelta(days=1)).isoformat()
        schedule = app_module._parse_duty_schedule_input({
            "staffId": "17",
            "shiftDate": shift_date,
            "shiftStart": "22:00",
            "shiftEnd": "06:00",
            "taskDescription": "Front desk night coverage",
        })

        self.assertIsNotNone(schedule)
        self.assertEqual(schedule["staff_id"], 17)
        self.assertEqual(schedule["shift_start"], datetime.strptime("22:00", "%H:%M").time())
        self.assertEqual(schedule["shift_end"], datetime.strptime("06:00", "%H:%M").time())

    def test_schedule_input_rejects_invalid_or_past_values(self):
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        invalid_values = [
            {"staffId": 1, "shiftDate": tomorrow, "shiftStart": "06:00", "shiftEnd": "06:00", "taskDescription": "Duty"},
            {"staffId": 1, "shiftDate": tomorrow, "shiftStart": "06:00", "shiftEnd": "14:00", "taskDescription": " "},
            {"staffId": 1, "shiftDate": tomorrow, "shiftStart": "06:00", "shiftEnd": "14:00", "taskDescription": "x" * 501},
            {"staffId": 1, "shiftDate": (date.today() - timedelta(days=1)).isoformat(), "shiftStart": "06:00", "shiftEnd": "14:00", "taskDescription": "Duty"},
        ]
        for data in invalid_values:
            with self.subTest(data=data):
                self.assertIsNone(app_module._parse_duty_schedule_input(data))

    def test_schedule_schema_is_migrated_and_notifications_are_sent(self):
        backend_dir = Path(__file__).resolve().parents[1]
        migration = (backend_dir / "database" / "staff_duty_schedules.sql").read_text(encoding="utf-8")
        self.assertIn("CREATE TABLE IF NOT EXISTS staff_duty_schedules", migration)
        self.assertIn("REFERENCES staff(id) ON DELETE CASCADE", migration)

        create_source = inspect.getsource(app_module.manager_create_duty_schedule)
        update_source = inspect.getsource(app_module.manager_update_duty_schedule)
        staff_source = inspect.getsource(app_module.staff_get_duty_schedules)
        self.assertIn("_notify_staff_of_duty_schedule", create_source)
        self.assertIn("_notify_staff_of_duty_schedule", update_source)
        self.assertIn("WHERE staff_id = %s", staff_source)

    def test_manager_directory_uses_manager_hotel_and_schedule_table_is_optional_for_listing(self):
        directory_source = inspect.getsource(app_module.manager_staff_directory)
        context_source = inspect.getsource(app_module._manager_staff_context)
        payload_source = inspect.getsource(app_module._build_owner_staff_payload)

        self.assertIn("_manager_staff_context(cur, manager_id)", directory_source)
        self.assertIn("s.id = %s AND s.role = %s", context_source)
        self.assertIn("if _table_exists(cur, \"staff_duty_schedules\")", payload_source)


if __name__ == "__main__":
    unittest.main()
