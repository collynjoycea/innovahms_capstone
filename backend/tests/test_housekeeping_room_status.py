import os
import sys
import unittest
from unittest.mock import patch


os.environ['WERKZEUG_RUN_MAIN'] = 'false'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend import app as app_module


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows
        self.query = None
        self.params = None

    def execute(self, query, params=None):
        self.query = query
        self.params = params

    def fetchall(self):
        return self.rows

    def close(self):
        pass


class FakeConnection:
    def __init__(self, rows):
        self.cursor_instance = FakeCursor(rows)

    def cursor(self, **kwargs):
        return self.cursor_instance

    def close(self):
        pass


class HousekeepingRoomStatusTest(unittest.TestCase):
    def test_returns_room_data_and_status_counts_for_hotel(self):
        connection = FakeConnection([
            {'id': 2, 'room_number': '102', 'room_name': None, 'room_type': None, 'status': None},
            {'id': 1, 'room_number': '101', 'room_name': 'Garden Suite', 'room_type': 'Suite', 'status': 'Dirty'},
        ])

        with patch.object(app_module, 'get_db_connection', return_value=connection):
            response = app_module.app.test_client().get(
                '/api/housekeeping/room-status?hotel_id=7'
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            'rooms': [
                {
                    'id': 2,
                    'room_label': '102',
                    'room_type': 'Standard',
                    'room_name': '',
                    'status': 'Available',
                },
                {
                    'id': 1,
                    'room_label': '101',
                    'room_type': 'Suite',
                    'room_name': 'Garden Suite',
                    'status': 'Dirty',
                },
            ],
            'counts': {'Available': 1, 'Dirty': 1},
            'total': 2,
        })
        self.assertIn('WHERE hotel_id = %s', connection.cursor_instance.query)
        self.assertEqual(connection.cursor_instance.params, [7])

    def test_public_room_catalog_does_not_expose_room_numbers(self):
        connection = FakeConnection([{
            'id': 8,
            'hotel_id': 7,
            'room_number': '301',
            'room_name': 'Double Room',
            'room_type': 'Double',
            'bed_type': 'Queen',
            'price_per_night': 2800,
            'rate_3_hours': 0,
            'rate_6_hours': 0,
            'rate_12_hours': 0,
            'description': 'Sample Double room on the third floor.',
            'images': [],
            'amenities': [],
            'features': [],
            'highlights': [],
            'max_adults': 2,
            'max_children': 1,
            'status': 'Available',
            'hotel_name': 'Sample Hotel',
            'hotel_address': 'Sample address',
        }])

        with patch.object(app_module, 'get_db_connection', return_value=connection):
            response = app_module.app.test_client().get('/api/rooms')

        self.assertEqual(response.status_code, 200)
        room = response.get_json()['rooms'][0]
        self.assertEqual(room['roomType'], 'Double')
        self.assertEqual(room['description'], 'Sample Double room on the third floor.')
        self.assertNotIn('roomNumber', room)


if __name__ == '__main__':
    unittest.main()