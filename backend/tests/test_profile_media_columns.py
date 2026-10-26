import unittest

from backend.database.bootstrap import ensure_profile_media_columns


class FakeCursor:
    def __init__(self, missing_columns=()):
        self.missing_columns = set(missing_columns)
        self.statements = []
        self.params = []

    def execute(self, statement, params=None):
        self.statements.append(statement)
        self.params.append(params)

    def fetchone(self):
        params = self.params[-1]
        if params:
            table_name, column_name = params
            return None if (table_name, column_name) in self.missing_columns else (1,)
        return None


class ProfileMediaColumnsTest(unittest.TestCase):
    def test_skips_alter_statements_when_columns_already_exist(self):
        cursor = FakeCursor()

        ensure_profile_media_columns(cursor)

        self.assertFalse(any(statement.lstrip().startswith("ALTER TABLE") for statement in cursor.statements))

    def test_alters_only_missing_columns(self):
        cursor = FakeCursor(missing_columns={("staff", "profile_image")})

        ensure_profile_media_columns(cursor)

        alter_statements = [
            statement for statement in cursor.statements
            if statement.lstrip().startswith("ALTER TABLE")
        ]
        self.assertEqual(
            alter_statements,
            ["ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_image TEXT"],
        )


if __name__ == "__main__":
    unittest.main()
