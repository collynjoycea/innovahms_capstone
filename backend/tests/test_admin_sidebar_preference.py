import unittest
from unittest.mock import patch

from backend import app as app_module


class FakeCursor:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.statements = []
        self.params = []

    def execute(self, statement, params=None):
        self.statements.append(statement)
        self.params.append(params)

    def fetchone(self):
        return self.results.pop(0) if self.results else None

    def close(self):
        pass


class FakeConnection:
    def __init__(self, cursor):
        self.fake_cursor = cursor
        self.committed = False
        self.rolled_back = False

    def cursor(self, **kwargs):
        return self.fake_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


class AdminSidebarPreferenceTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config['TESTING'] = True
        self.client = app_module.app.test_client()

    def test_sidebar_preference_loads_saved_database_value(self):
        cursor = FakeCursor([{'id': 8}, {'sidebar_open': True}])
        connection = FakeConnection(cursor)

        with patch.object(app_module, 'get_db_connection', return_value=connection):
            response = self.client.get('/api/admin/8/sidebar-preference')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {'isOpen': True})
        self.assertIn('CREATE TABLE IF NOT EXISTS admin_preferences', cursor.statements[0])
        self.assertTrue(connection.committed)

    def test_sidebar_preference_saves_database_value(self):
        cursor = FakeCursor([{'id': 8}, {'sidebar_open': True}])
        connection = FakeConnection(cursor)

        with patch.object(app_module, 'get_db_connection', return_value=connection):
            response = self.client.put('/api/admin/8/sidebar-preference', json={'isOpen': True})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {'isOpen': True})
        self.assertEqual(cursor.params[-1], (8, True))
        self.assertIn('ON CONFLICT (admin_id)', cursor.statements[-1])
        self.assertTrue(connection.committed)

    def test_sidebar_preference_rejects_non_boolean_value(self):
        response = self.client.put('/api/admin/8/sidebar-preference', json={'isOpen': 'true'})

        self.assertEqual(response.status_code, 400)
        self.assertIn('boolean isOpen', response.get_json()['error'])


if __name__ == '__main__':
    unittest.main()
