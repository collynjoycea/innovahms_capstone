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

    def test_extracts_nearest_weekday_and_next_weekday(self):
        today = date(2026, 10, 27)
        self.assertEqual(
            app_module._extract_chat_stay_dates('reserve next Friday', today),
            (date(2026, 10, 30), date(2026, 10, 31)),
        )
        self.assertEqual(
            app_module._extract_chat_stay_dates('sa susunod na biyernes', today),
            (date(2026, 10, 30), date(2026, 10, 31)),
        )

    def test_extracts_short_stay_durations(self):
        self.assertEqual(app_module._extract_chat_duration_hours('Queen room for 6 hours'), 6)
        self.assertEqual(app_module._extract_chat_duration_hours('3 oras sa kuwarto'), 3)
        self.assertEqual(app_module._extract_chat_duration_hours('six-hour stay'), 6)
        self.assertEqual(app_module._extract_chat_duration_hours('What is the 4-hour rate?'), 4)
        self.assertEqual(app_module._extract_chat_duration_hours('twenty four hours'), 24)
        self.assertIsNone(app_module._extract_chat_duration_hours('overnight'))
        self.assertIsNone(app_module._extract_chat_duration_hours('99 hours'))

    def test_detects_tagalog_and_booking_status_requests(self):
        self.assertTrue(app_module._chat_uses_tagalog('Magkano ang 3 oras na stay?'))
        self.assertFalse(app_module._chat_uses_tagalog('How much is a room for 3 hours?'))
        self.assertTrue(app_module._is_chat_booking_status_intent('Gusto ko malaman status ng booking ko'))
        self.assertTrue(app_module._is_chat_booking_status_intent('Check my reservation status'))
        self.assertTrue(app_module._is_chat_booking_status_intent('INV-ab12cd34'))
        self.assertEqual(app_module._extract_chat_booking_reference('Check status for inv-ab12cd34'), 'INV-AB12CD34')

    def test_keeps_nova_focused_on_hotel_questions(self):
        self.assertTrue(app_module._is_nova_hotel_related('Do you have parking?'))
        self.assertTrue(app_module._is_nova_hotel_related('Magandang umaga'))
        self.assertFalse(app_module._is_nova_hotel_related('What is the capital of France?'))


if __name__ == '__main__':
    unittest.main()