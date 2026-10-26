import unittest
from unittest.mock import patch

from backend import app as app_module


class OwnerForecastingTest(unittest.TestCase):
    def test_dashboard_periods_use_correct_buckets_and_next_periods(self):
        date_value = app_module.date(2026, 10, 26)

        self.assertEqual(app_module._period_bucket_key(date_value, "today"), "2026-10-26")
        self.assertEqual(app_module._period_bucket_key(date_value, "monthly"), "2026-10")
        self.assertEqual(app_module._period_bucket_key(date_value, "quarterly"), "2026-Q4")
        self.assertEqual(app_module._period_bucket_key(date_value, "yearly"), "2026")
        self.assertEqual(app_module._next_period_label("2026-Q4", "quarterly", 1), "2027-Q1")
        self.assertEqual(app_module._next_period_label("2026", "yearly", 1), "2027")

    def test_forecast_payload_supports_today_monthly_quarterly_and_yearly(self):
        periods = {
            "today": ("daily", 30, 7),
            "monthly": ("monthly", 24, 6),
            "quarterly": ("quarterly", 12, 4),
            "yearly": ("yearly", 5, 3),
        }

        for requested_period, (normalized_period, history_size, horizon) in periods.items():
            with self.subTest(period=requested_period):
                with patch.object(
                    app_module,
                    "_prophet_project",
                    side_effect=lambda labels, values, period, steps: [10.0] * steps,
                ) as project:
                    payload = app_module._build_forecast_payload([], 10, requested_period)

                self.assertEqual(payload["period"], normalized_period)
                self.assertEqual(payload["horizon"], horizon)
                self.assertEqual(len(payload["labels"]), history_size + horizon)
                self.assertEqual(len(payload["revenueSeries"]), history_size + horizon)
                self.assertEqual(len(payload["occupancySeries"]), history_size + horizon)
                self.assertEqual([call.args[2] for call in project.call_args_list], [normalized_period, normalized_period])


if __name__ == "__main__":
    unittest.main()
