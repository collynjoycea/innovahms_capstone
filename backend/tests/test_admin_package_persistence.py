import unittest
from unittest.mock import patch

from psycopg2.extras import Json

from backend import app as app_module
from backend.database import bootstrap as bootstrap_module


class FakeCursor:
    def __init__(self, result=None):
        self.result = result
        self.statement = None
        self.params = None
        self.statements = []
        self.closed = False

    def execute(self, statement, params=None):
        self.statement = statement
        self.params = params
        self.statements.append(statement)

    def fetchone(self):
        return self.result

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, cursor):
        self.fake_cursor = cursor
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self, **kwargs):
        return self.fake_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class AdminPackagePersistenceTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config["TESTING"] = True
        self.client = app_module.app.test_client()

    def test_package_create_saves_features_as_jsonb(self):
        cursor = FakeCursor({"id": 12, "name": "Premium", "slug": "premium"})
        connection = FakeConnection(cursor)

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_ensure_membership_tables"),
        ):
            response = self.client.post(
                "/api/admin/packages",
                json={
                    "name": "Premium",
                    "monthlyPrice": 1200,
                    "annualPrice": 12000,
                    "features": [" Rooms ", "Reports"],
                    "isActive": True,
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertIsInstance(cursor.params[6], Json)
        self.assertEqual(cursor.params[6].adapted, ["Rooms", "Reports"])
        self.assertTrue(connection.committed)

    def test_package_update_saves_features_as_jsonb(self):
        cursor = FakeCursor({"id": 12, "name": "Premium", "slug": "premium"})
        connection = FakeConnection(cursor)

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_ensure_membership_tables"),
        ):
            response = self.client.patch(
                "/api/admin/packages/12",
                json={
                    "name": "Premium",
                    "monthlyPrice": 1200,
                    "annualPrice": 12000,
                    "features": ["Rooms", "Reports"],
                    "isActive": True,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(cursor.params[6], Json)
        self.assertEqual(cursor.params[6].adapted, ["Rooms", "Reports"])
        self.assertTrue(connection.committed)

    def test_membership_bootstrap_migrates_legacy_features_array_to_jsonb(self):
        cursor = FakeCursor({"data_type": "ARRAY", "udt_name": "_text"})

        bootstrap_module.ensure_membership_tables(cursor)

        migration_sql = next(statement for statement in cursor.statements if "ALTER COLUMN features TYPE JSONB" in statement)
        self.assertIn("features TYPE JSONB", migration_sql)
        self.assertIn("USING COALESCE(to_jsonb(features), '[]'::jsonb)", migration_sql)
        self.assertNotIn("ARRAY(SELECT", migration_sql)
        self.assertIn("ALTER TABLE membership_packages ALTER COLUMN features DROP DEFAULT", cursor.statements)
        self.assertIn("ALTER TABLE membership_packages ALTER COLUMN features SET DEFAULT '[]'::jsonb", cursor.statements)

    def test_membership_package_seeding_does_not_overwrite_admin_edits(self):
        cursor = FakeCursor({"data_type": "jsonb"})

        with patch.object(app_module, "_ensure_membership_tables"):
            app_module._seed_membership_packages(cursor)

        seed_statements = [
            statement for statement in cursor.statements
            if "INSERT INTO membership_packages" in statement
        ]
        self.assertEqual(len(seed_statements), len(app_module.OWNER_PLAN_DEFINITIONS))
        self.assertTrue(all("ON CONFLICT (slug) DO NOTHING" in statement for statement in seed_statements))
        self.assertTrue(all("DO UPDATE SET" not in statement for statement in seed_statements))

    def test_admin_notifications_returns_database_errors_to_client(self):
        cursor = FakeCursor()
        connection = FakeConnection(cursor)

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_ensure_notification_tables", side_effect=RuntimeError("database unavailable")),
        ):
            response = self.client.get("/api/admin/notifications")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json()["error"], "database unavailable")

    def test_admin_notification_rejects_nonexistent_recipient(self):
        cursor = FakeCursor()
        connection = FakeConnection(cursor)

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_ensure_notification_tables"),
            patch.object(app_module, "_create_notification") as create_notification,
        ):
            response = self.client.post(
                "/api/admin/notifications",
                json={
                    "user_id": 42,
                    "user_type": "owner",
                    "type_key": "owner_system_maintenance",
                    "title": "Maintenance",
                    "message": "Maintenance scheduled.",
                },
            )

        self.assertEqual(response.status_code, 404)
        create_notification.assert_not_called()
        self.assertIn("FROM owners", cursor.statement)


if __name__ == "__main__":
    unittest.main()
