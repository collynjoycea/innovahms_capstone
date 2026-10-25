import unittest

from backend.database.bootstrap import ensure_guest_requests_table


class FakeCursor:
    def __init__(self):
        self.statements = []

    def execute(self, statement, params=None):
        self.statements.append(statement)


class GuestRequestsBootstrapTest(unittest.TestCase):
    def test_creates_guest_requests_table_and_indexes_if_missing(self):
        cursor = FakeCursor()

        ensure_guest_requests_table(cursor)

        self.assertEqual(len(cursor.statements), 3)
        table_statement = cursor.statements[0]
        self.assertIn("CREATE TABLE IF NOT EXISTS guest_requests", table_statement)
        for column in (
            "hotel_id",
            "reservation_id",
            "guest_name",
            "room_number",
            "item_name",
            "quantity",
            "status",
            "requested_by",
            "relayed_by",
            "hk_staff_id",
        ):
            self.assertIn(column, table_statement)
        self.assertIn("idx_guest_requests_hotel_status", cursor.statements[1])
        self.assertIn("idx_guest_requests_reservation", cursor.statements[2])


if __name__ == "__main__":
    unittest.main()
