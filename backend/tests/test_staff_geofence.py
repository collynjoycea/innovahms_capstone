import os
import sys
import unittest
from unittest.mock import patch


os.environ['WERKZEUG_RUN_MAIN'] = 'false'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend import app as app_module


class StaffAttendanceGeofenceTest(unittest.TestCase):
    def test_school_coordinates_are_allowed(self):
        self.assertIsNone(app_module._staff_attendance_location_error({
            'latitude': 14.7495,
            'longitude': 121.0325,
        }))

    def test_coordinates_outside_school_radius_are_rejected(self):
        error, status = app_module._staff_attendance_location_error({
            'latitude': 14.7600,
            'longitude': 121.0400,
        })

        self.assertEqual(status, 403)
        self.assertEqual(error['allowedRadiusMeters'], 100)
        self.assertGreater(error['distanceMeters'], 100)

    def test_missing_coordinates_are_rejected_by_both_attendance_routes(self):
        client = app_module.app.test_client()
        with patch.object(app_module, 'get_db_connection') as get_db_connection:
            for route in ('/api/staff/time-in', '/api/staff/time-out'):
                response = client.post(route, json={'staffId': 1})
                self.assertEqual(response.status_code, 400)

        get_db_connection.assert_not_called()

    def test_off_campus_coordinates_are_rejected_before_database_access(self):
        client = app_module.app.test_client()
        payload = {'staffId': 1, 'latitude': 14.7600, 'longitude': 121.0400}
        with patch.object(app_module, 'get_db_connection') as get_db_connection:
            for route in ('/api/staff/time-in', '/api/staff/time-out'):
                response = client.post(route, json=payload)
                self.assertEqual(response.status_code, 403)

        get_db_connection.assert_not_called()


if __name__ == '__main__':
    unittest.main()