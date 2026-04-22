"""
RCare iteration 3 tests: verify DD/MM/AAAA date format in insights,
admin password, core endpoints regression.
"""
import os
import re
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/') + '/api'
DEFAULT_PWD = "2255"
DDMMYYYY = re.compile(r"\b\d{2}/\d{2}/\d{4}\b")


def _seed_high_glucose():
    today = (datetime.now(timezone.utc) - timedelta(hours=3)).date()
    # use yesterday so both week and month include it
    seed_date = (today - timedelta(days=1)).isoformat()
    r = requests.post(
        f"{BASE}/insulin",
        json={"date": seed_date, "time": "07:30", "glucose": 250, "notes": "TEST_iter3"},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"], seed_date


class TestAdminPasswordDefault:
    def test_verify_default_password(self):
        r = requests.post(f"{BASE}/admin/verify", json={"password": DEFAULT_PWD})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_verify_wrong_password(self):
        r = requests.post(f"{BASE}/admin/verify", json={"password": "wrong"})
        assert r.status_code == 200
        assert r.json() == {"ok": False}


class TestCoreEndpointsRegression:
    """Ensure insulin/food/water continue to work."""

    def test_insulin_create_list_delete(self):
        payload = {"date": "2026-01-15", "time": "08:00", "glucose": 120.0,
                   "fast_insulin_units": 4, "notes": "TEST_iter3_core"}
        c = requests.post(f"{BASE}/insulin", json=payload)
        assert c.status_code == 200, c.text
        rid = c.json()["id"]
        try:
            lst = requests.get(f"{BASE}/insulin", params={"date": "2026-01-15"})
            assert lst.status_code == 200
            assert any(i["id"] == rid for i in lst.json())
        finally:
            d = requests.delete(f"{BASE}/insulin/{rid}")
            assert d.status_code == 200
            assert d.json() == {"ok": True}

    def test_food_upsert_list(self):
        payload = {"date": "2026-01-16", "cafe": {"status": "comeu_tudo"},
                   "almoco": {"status": "comeu_metade"}}
        r = requests.post(f"{BASE}/food", json=payload)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        try:
            lst = requests.get(f"{BASE}/food", params={"date": "2026-01-16"})
            assert lst.status_code == 200
            items = lst.json()
            assert len(items) >= 1
            got = [i for i in items if i["id"] == rid][0]
            assert got["cafe"]["status"] == "comeu_tudo"
        finally:
            requests.delete(f"{BASE}/food/{rid}")

    def test_water_create_list_delete(self):
        payload = {"date": "2026-01-17", "time": "09:00", "amount_ml": 250,
                   "notes": "TEST_iter3_core"}
        c = requests.post(f"{BASE}/water", json=payload)
        assert c.status_code == 200, c.text
        rid = c.json()["id"]
        try:
            lst = requests.get(f"{BASE}/water", params={"date": "2026-01-17"})
            assert lst.status_code == 200
            assert any(w["id"] == rid for w in lst.json())
        finally:
            d = requests.delete(f"{BASE}/water/{rid}")
            assert d.status_code == 200


class TestAssistantDateFormat:
    def test_assistant_insights_use_ddmmyyyy(self):
        rid, seed_date = _seed_high_glucose()
        try:
            r = requests.get(f"{BASE}/assistant")
            assert r.status_code == 200
            j = r.json()
            all_strings = (j["insights"].get("good", []) +
                           j["insights"].get("concerns", []))
            assert len(all_strings) > 0, "assistant returned no insights after seeding"
            # Every string referencing a date must use DD/MM/YYYY
            joined = " | ".join(all_strings)
            assert DDMMYYYY.search(joined), f"No DD/MM/YYYY found in: {joined}"
            # Must NOT contain ISO YYYY-MM-DD dates (check for 4-digit year leading)
            assert not re.search(r"\b\d{4}-\d{2}-\d{2}\b", joined), (
                f"ISO date leaked into insights: {joined}")

            # And the seeded date (yesterday) specifically must appear in DD/MM/YYYY
            expected = datetime.fromisoformat(seed_date).strftime("%d/%m/%Y")
            assert expected in joined, f"Expected {expected} inside: {joined}"
        finally:
            requests.delete(f"{BASE}/insulin/{rid}")


class TestReportsDateFormat:
    def test_reports_week_insights_use_ddmmyyyy(self):
        rid, seed_date = _seed_high_glucose()
        try:
            r = requests.get(f"{BASE}/reports", params={"period": "week"})
            assert r.status_code == 200
            j = r.json()
            all_strings = (j["insights"].get("good", []) +
                           j["insights"].get("concerns", []))
            assert len(all_strings) > 0
            joined = " | ".join(all_strings)
            assert DDMMYYYY.search(joined), f"No DD/MM/YYYY in: {joined}"
            assert not re.search(r"\b\d{4}-\d{2}-\d{2}\b", joined), (
                f"ISO leaked: {joined}")
            expected = datetime.fromisoformat(seed_date).strftime("%d/%m/%Y")
            assert expected in joined
        finally:
            requests.delete(f"{BASE}/insulin/{rid}")
