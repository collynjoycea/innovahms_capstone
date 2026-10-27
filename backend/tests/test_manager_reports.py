import unittest
from unittest.mock import patch

from backend import app as app_module


class FakeCursor:
    def __init__(self, manager, result_sets):
        self.manager = manager
        self.result_sets = list(result_sets)
        self.statements = []
        self.params = []

    def execute(self, statement, params=None):
        self.statements.append(statement)
        self.params.append(params)

    def fetchone(self):
        return self.manager

    def fetchall(self):
        return self.result_sets.pop(0)

    def close(self):
        pass


class FakeConnection:
    def __init__(self, cursor):
        self.fake_cursor = cursor

    def cursor(self, **kwargs):
        return self.fake_cursor

    def close(self):
        pass


class ManagerReportsDateValidationTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config['TESTING'] = True
        self.client = app_module.app.test_client()

    def test_manager_reports_requires_manager_id(self):
        response = self.client.get(
            '/api/manager/reports/manager-data',
            query_string={'from': '2026-10-01', 'to': '2026-10-31'},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('manager_id', response.get_json()['error'])

    def test_manager_reports_rejects_invalid_date(self):
        with patch.object(app_module, 'get_db_connection') as get_connection:
            response = self.client.get(
                '/api/manager/reports/manager-data',
                query_string={
                    'manager_id': 3,
                    'from': '2026-02-31',
                    'to': '2026-03-01',
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn('YYYY-MM-DD', response.get_json()['error'])
        get_connection.assert_not_called()

    def test_manager_reports_rejects_reversed_date_range(self):
        with patch.object(app_module, 'get_db_connection') as get_connection:
            response = self.client.get(
                '/api/manager/reports/manager-data',
                query_string={
                    'manager_id': 3,
                    'from': '2026-10-02',
                    'to': '2026-10-01',
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn('on or before', response.get_json()['error'])
        get_connection.assert_not_called()

    def test_manager_reports_returns_hotel_scoped_report_tables(self):
        cursor = FakeCursor(
            {'hotel_id': 12, 'owner_id': 9},
            [
                [{
                    'id': 5,
                    'booking_number': 'BK-5',
                    'guest_name': None,
                    'status': 'CHECKED_OUT',
                    'payment_status': 'FULLY_PAID',
                    'created_at': '2026-10-12T10:00:00',
                    'check_in_date': '2026-10-12',
                    'check_in_time': '14:30:00',
                    'check_out_date': '2026-10-13',
                    'check_out_time': '11:00:00',
                    'total_amount': 2500,
                    'deposit_amount': 500,
                    'amount_received': 2500,
                }],
                [{'id': 8, 'item_name': 'Soap', 'stock_level': 4, 'unit_cost': None}],
                [{'id': 11, 'item_id': 8, 'movement_type': 'IN', 'quantity': 4}],
                [{'id': 3, 'po_number': 'PO-3', 'total_amount': 80}],
            ],
        )
        connection = FakeConnection(cursor)

        with patch.object(app_module, 'get_db_connection', return_value=connection), patch.object(
            app_module, '_owner_feature_guard', return_value=(None, None)
        ):
            response = self.client.get(
                '/api/manager/reports/manager-data',
                query_string={
                    'manager_id': 3,
                    'from': '2026-10-01',
                    'to': '2026-10-31',
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['range'], {'from': '2026-10-01', 'to': '2026-10-31'})
        self.assertEqual(payload['summary']['totalRevenue'], 2500)
        self.assertEqual(payload['summary']['purchaseOrderTotal'], 80)
        self.assertIsNone(payload['revenue'][0]['guestName'])
        self.assertEqual(payload['revenue'][0]['recordDate'], '2026-10-12T10:00:00')
        self.assertEqual(payload['revenue'][0]['checkInTime'], '14:30:00')
        self.assertEqual(payload['revenue'][0]['checkOutTime'], '11:00:00')
        self.assertEqual(len(payload['inventory']), 1)
        self.assertIsNone(payload['inventory'][0]['unitCost'])
        self.assertEqual(len(payload['stockMovements']), 1)
        self.assertEqual(len(payload['purchaseOrders']), 1)
        self.assertIn('WHERE r.hotel_id = %s', cursor.statements[1])
        self.assertEqual(cursor.params[1], (12, '2026-10-01', '2026-10-31'))


if __name__ == '__main__':
    unittest.main()
