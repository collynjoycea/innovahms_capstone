import os
import sys
import unittest
from datetime import date


os.environ['WERKZEUG_RUN_MAIN'] = 'false'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend import app as app_module


class ChatbotRequestParsingTest(unittest.TestCase):
    def test_extracts_numeric_and_word_guest_counts(self):
        self.assertEqual(app_module._extract_chat_guest_count('room for 2 guests'), 2)
        self.assertEqual(app_module._extract_chat_guest_count('a room for two adults'), 2)
        self.assertEqual(app_module._extract_chat_guest_count('room para sa 3 tao'), 3)
        self.assertEqual(app_module._extract_chat_guest_count('room for four bisita'), 4)

    def test_extracts_explicit_date_range(self):
        self.assertEqual(
            app_module._extract_chat_stay_dates('Check 2026-10-20 to 2026-10-22', date(2026, 10, 12)),
            (date(2026, 10, 20), date(2026, 10, 22)),
        )

    def test_single_date_defaults_to_one_night(self):
        self.assertEqual(
            app_module._extract_chat_stay_dates('Available on 2026-10-20?', date(2026, 10, 12)),
            (date(2026, 10, 20), date(2026, 10, 21)),
        )

    def test_extracts_today_and_tomorrow_in_english_and_tagalog(self):
        today = date(2026, 10, 12)
        self.assertEqual(app_module._extract_chat_stay_dates('room tomorrow', today), (date(2026, 10, 13), date(2026, 10, 14)))
        self.assertEqual(app_module._extract_chat_stay_dates('room bukas', today), (date(2026, 10, 13), date(2026, 10, 14)))
        self.assertEqual(app_module._extract_chat_stay_dates('room tonight', today), (today, date(2026, 10, 13)))


if __name__ == '__main__':
    unittest.main()