import unittest
from unittest.mock import MagicMock, patch

from backend import app as app_module


class FakeCursor:
    def __init__(self, rows=()):
        self.rows = list(rows)
        self.statements = []
        self.closed = False

    def execute(self, statement, params=None):
        self.statements.append((statement, params))

    def fetchone(self):
        return self.rows.pop(0) if self.rows else None

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


class OwnerSubscriptionPayMongoTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config["TESTING"] = True
        self.client = app_module.app.test_client()

    def test_checkout_creates_paymongo_link_and_saves_pending_subscription(self):
        cursor = FakeCursor([
            {"id": 7, "first_name": "Owner", "last_name": "Test", "email": "owner@example.com"},
            {
                "id": 3,
                "name": "Starter",
                "slug": "starter",
                "monthly_price": 500,
                "annual_price": 5000,
                "is_active": True,
            },
            {"id": 19, "status": "PENDING", "payment_status": "PENDING"},
        ])
        connection = FakeConnection(cursor)
        paymongo_response = MagicMock()
        paymongo_response.ok = True
        paymongo_response.json.return_value = {
            "data": {
                "id": "link_test_123",
                "attributes": {"checkout_url": "https://checkout.paymongo.test/link_test_123"},
            }
        }

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_backfill_hotel_subscriptions"),
            patch.object(app_module, "_seed_membership_packages"),
            patch.object(app_module, "_get_owner_subscription", return_value=None),
            patch.object(app_module, "_resolve_owner_primary_hotel_id", return_value=None),
            patch.object(app_module, "_is_integration_enabled", return_value=True),
            patch.object(app_module.requests, "post", return_value=paymongo_response) as create_link,
            patch.dict("os.environ", {"PAYMONGO_SECRET_KEY": "sk_test_configured"}),
        ):
            response = self.client.post(
                "/api/owner/subscription/create-payment-link",
                json={"ownerId": 7, "packageId": 3, "billingCycle": "MONTHLY"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["checkoutUrl"], "https://checkout.paymongo.test/link_test_123")
        self.assertEqual(payload["linkId"], "link_test_123")
        self.assertFalse(payload["isSimulated"])
        self.assertEqual(create_link.call_args.args[0], "https://api.paymongo.com/v1/links")
        sent_payload = create_link.call_args.kwargs["json"]["data"]["attributes"]
        self.assertEqual(sent_payload["amount"], 50000)
        self.assertEqual(sent_payload["currency"], "PHP")
        insert_statement = cursor.statements[-1][0]
        self.assertIn("'PENDING', 'PENDING'", insert_statement)
        self.assertTrue(connection.committed)

    def test_checkout_keeps_existing_active_subscription_until_payment(self):
        cursor = FakeCursor([
            {"id": 7, "first_name": "Owner", "last_name": "Test", "email": "owner@example.com"},
            {
                "id": 3,
                "name": "Pro",
                "slug": "pro",
                "monthly_price": 900,
                "annual_price": 9000,
                "is_active": True,
            },
            {"id": 19, "status": "PENDING", "payment_status": "PENDING"},
        ])
        connection = FakeConnection(cursor)
        paymongo_response = MagicMock()
        paymongo_response.ok = True
        paymongo_response.json.return_value = {
            "data": {
                "id": "link_upgrade_123",
                "attributes": {"checkout_url": "https://checkout.paymongo.test/link_upgrade_123"},
            }
        }
        active_subscription = {"id": 10, "hotel_id": 44, "status": "ACTIVE"}

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_backfill_hotel_subscriptions"),
            patch.object(app_module, "_seed_membership_packages"),
            patch.object(app_module, "_get_owner_subscription", return_value=active_subscription),
            patch.object(app_module, "_is_integration_enabled", return_value=True),
            patch.object(app_module.requests, "post", return_value=paymongo_response),
            patch.dict("os.environ", {"PAYMONGO_SECRET_KEY": "sk_test_configured"}),
        ):
            response = self.client.post(
                "/api/owner/subscription/create-payment-link",
                json={"ownerId": 7, "packageId": 3, "billingCycle": "MONTHLY"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("VALUES (%s, NULL, %s", cursor.statements[-1][0])
        self.assertTrue(connection.committed)

    def test_verification_rejects_amount_mismatch_without_activation(self):
        cursor = FakeCursor([{
            "id": 19,
            "amount": 500,
            "payment_status": "PENDING",
            "paymongo_payment_id": "link_test_123",
        }])
        connection = FakeConnection(cursor)
        paymongo_response = MagicMock()
        paymongo_response.ok = True
        paymongo_response.json.return_value = {
            "data": {
                "attributes": {"status": "paid", "amount": 49999, "currency": "PHP"},
            }
        }

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_backfill_hotel_subscriptions"),
            patch.object(app_module, "_seed_membership_packages"),
            patch.object(app_module, "_is_integration_enabled", return_value=True),
            patch.object(app_module.requests, "get", return_value=paymongo_response),
        ):
            response = self.client.get(
                "/api/owner/subscription/verify/link_test_123?owner_id=7"
            )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(connection.committed)
        self.assertEqual(len(cursor.statements), 1)
        self.assertIn("amount or currency does not match", response.get_json()["error"])

    def test_paid_verification_activates_subscription(self):
        cursor = FakeCursor([{
            "id": 19,
            "amount": 500,
            "billing_cycle": "MONTHLY",
            "payment_status": "PENDING",
            "paymongo_payment_id": "link_test_123",
        }])
        connection = FakeConnection(cursor)
        paymongo_response = MagicMock()
        paymongo_response.ok = True
        paymongo_response.json.return_value = {
            "data": {
                "attributes": {"status": "paid", "amount": 50000, "currency": "PHP"},
            }
        }

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_backfill_hotel_subscriptions"),
            patch.object(app_module, "_seed_membership_packages"),
            patch.object(app_module, "_get_owner_subscription", return_value=None),
            patch.object(app_module, "_resolve_owner_primary_hotel_id", return_value=None),
            patch.object(app_module, "_subscription_cycle_dates", return_value=("2025-01-01", "2025-02-01")),
            patch.object(
                app_module,
                "_owner_subscription_success_response",
                side_effect=lambda *args: (app_module.jsonify({"status": "paid"}), 200),
            ),
            patch.object(app_module.requests, "get", return_value=paymongo_response),
        ):
            response = self.client.get(
                "/api/owner/subscription/verify/link_test_123?owner_id=7"
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("status = 'ACTIVE'", cursor.statements[-1][0])
        self.assertTrue(connection.committed)

    def test_paid_upgrade_replaces_the_active_subscription(self):
        cursor = FakeCursor([{
            "id": 19,
            "amount": 900,
            "billing_cycle": "MONTHLY",
            "payment_status": "PENDING",
            "paymongo_payment_id": "link_upgrade_123",
            "hotel_id": None,
        }])
        connection = FakeConnection(cursor)
        paymongo_response = MagicMock()
        paymongo_response.ok = True
        paymongo_response.json.return_value = {
            "data": {
                "attributes": {"status": "paid", "amount": 90000, "currency": "PHP"},
            }
        }

        with (
            patch.object(app_module, "get_db_connection", return_value=connection),
            patch.object(app_module, "_backfill_hotel_subscriptions"),
            patch.object(app_module, "_seed_membership_packages"),
            patch.object(
                app_module,
                "_get_owner_subscription",
                return_value={"id": 10, "hotel_id": 44, "status": "ACTIVE"},
            ),
            patch.object(app_module, "_subscription_cycle_dates", return_value=("2025-01-01", "2025-02-01")),
            patch.object(
                app_module,
                "_owner_subscription_success_response",
                side_effect=lambda *args: (app_module.jsonify({"status": "paid"}), 200),
            ),
            patch.object(app_module.requests, "get", return_value=paymongo_response),
        ):
            response = self.client.get(
                "/api/owner/subscription/verify/link_upgrade_123?owner_id=7"
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("status = 'CANCELLED'", cursor.statements[-2][0])
        self.assertIn("status = 'ACTIVE'", cursor.statements[-1][0])
        self.assertEqual(cursor.statements[-1][1][0], 44)


if __name__ == "__main__":
    unittest.main()
