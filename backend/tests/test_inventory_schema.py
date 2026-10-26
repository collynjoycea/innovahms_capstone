import inspect
import unittest
from pathlib import Path

from backend import app as app_module


class InventorySchemaTest(unittest.TestCase):
    def test_supplier_schema_is_migrated_outside_request_handlers(self):
        backend_dir = Path(__file__).resolve().parents[1]
        app_source = (backend_dir / "app.py").read_text(encoding="utf-8")
        migration = (backend_dir / "database" / "inventory_supplier_purchase_orders.sql").read_text(encoding="utf-8")

        self.assertNotIn("_ensure_supplier_purchase_tables", app_source)
        self.assertIn("CREATE TABLE IF NOT EXISTS suppliers", migration)
        self.assertIn("ALTER TABLE inventory_items", migration)
        self.assertIn("CREATE TABLE IF NOT EXISTS purchase_order_items", migration)

    def test_inventory_read_endpoints_do_not_run_notification_schema_or_creation(self):
        for endpoint in (app_module.inv_dashboard, app_module.inv_low_stock):
            with self.subTest(endpoint=endpoint.__name__):
                source = inspect.getsource(endpoint)
                self.assertNotIn("_ensure_notification_tables", source)
                self.assertNotIn("_seed_notification_types", source)
                self.assertNotIn("_notify_daily_low_stock", source)


if __name__ == "__main__":
    unittest.main()
