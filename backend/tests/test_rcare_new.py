"""
RCare iteration 2 tests: admin, settings, inconsistencies, reports, assistant.
Runs against EXPO_PUBLIC_BACKEND_URL (same URL mobile app uses).
"""
import os
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/') + '/api'
DEFAULT_PWD = "2255"


# ---------- ADMIN ----------
class TestAdmin:
    def test_verify_correct_password(self):
        r = requests.post(f"{BASE}/admin/verify", json={"password": DEFAULT_PWD})
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

    def test_verify_wrong_password(self):
        r = requests.post(f"{BASE}/admin/verify", json={"password": "0000"})
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": False}

    def test_change_password_and_restore(self):
        new_pwd = "9999"
        # change pwd
        r = requests.post(
            f"{BASE}/admin/change-password",
            json={"old_password": DEFAULT_PWD, "new_password": new_pwd},
        )
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

        # old pwd should now fail
        v_old = requests.post(f"{BASE}/admin/verify", json={"password": DEFAULT_PWD})
        assert v_old.json() == {"ok": False}

        # new pwd should succeed
        v_new = requests.post(f"{BASE}/admin/verify", json={"password": new_pwd})
        assert v_new.json() == {"ok": True}

        # wrong old password must be rejected
        bad = requests.post(
            f"{BASE}/admin/change-password",
            json={"old_password": "bogus", "new_password": "1111"},
        )
        assert bad.status_code == 403

        # RESTORE default password (critical so next tests don't break)
        restore = requests.post(
            f"{BASE}/admin/change-password",
            json={"old_password": new_pwd, "new_password": DEFAULT_PWD},
        )
        assert restore.status_code == 200
        assert requests.post(f"{BASE}/admin/verify", json={"password": DEFAULT_PWD}).json()["ok"] is True


# ---------- SETTINGS ----------
class TestSettings:
    def test_get_settings_has_fields(self):
        r = requests.get(f"{BASE}/settings")
        assert r.status_code == 200
        j = r.json()
        assert "water_goal_ml" in j
        assert "patient_name" in j
        assert isinstance(j["water_goal_ml"], int)
        assert isinstance(j["patient_name"], str)

    def test_update_and_persist_settings(self):
        # capture originals
        orig = requests.get(f"{BASE}/settings").json()
        try:
            upd = requests.post(
                f"{BASE}/settings",
                json={"water_goal_ml": 2500, "patient_name": "TEST_Maria"},
            )
            assert upd.status_code == 200, upd.text
            j = upd.json()
            assert j["water_goal_ml"] == 2500
            assert j["patient_name"] == "TEST_Maria"

            # verify persistence via GET
            g = requests.get(f"{BASE}/settings").json()
            assert g["water_goal_ml"] == 2500
            assert g["patient_name"] == "TEST_Maria"
        finally:
            # restore originals
            requests.post(
                f"{BASE}/settings",
                json={
                    "water_goal_ml": orig["water_goal_ml"],
                    "patient_name": orig["patient_name"],
                },
            )

    def test_invalid_water_goal(self):
        r = requests.post(f"{BASE}/settings", json={"water_goal_ml": 50})
        assert r.status_code == 400

    def test_invalid_empty_name(self):
        r = requests.post(f"{BASE}/settings", json={"patient_name": "   "})
        assert r.status_code == 400


# ---------- INCONSISTENCIES ----------
class TestInconsistencies:
    def test_inconsistencies_shape(self):
        r = requests.get(f"{BASE}/inconsistencies")
        assert r.status_code == 200
        j = r.json()
        assert "date" in j
        assert "alerts" in j
        assert isinstance(j["alerts"], list)
        for a in j["alerts"]:
            assert "level" in a and "message" in a


# ---------- REPORTS ----------
class TestReports:
    def _assert_report_shape(self, j, period):
        for k in ["period", "start", "end", "insulin", "food", "water", "insights"]:
            assert k in j, f"missing key {k} in period={period}"
        assert j["period"] == period
        assert "good" in j["insights"]
        assert "concerns" in j["insights"]
        assert isinstance(j["insulin"], list)
        assert isinstance(j["food"], list)
        assert isinstance(j["water"], list)

    def test_report_week(self):
        r = requests.get(f"{BASE}/reports", params={"period": "week"})
        assert r.status_code == 200
        self._assert_report_shape(r.json(), "week")

    def test_report_month(self):
        r = requests.get(f"{BASE}/reports", params={"period": "month"})
        assert r.status_code == 200
        self._assert_report_shape(r.json(), "month")

    def test_report_all(self):
        r = requests.get(f"{BASE}/reports", params={"period": "all"})
        assert r.status_code == 200
        j = r.json()
        self._assert_report_shape(j, "all")
        assert j["start"] == "0000-01-01"
        assert j["end"] == "9999-12-31"

    def test_report_custom(self):
        r = requests.get(
            f"{BASE}/reports",
            params={"period": "custom", "start": "2026-04-01", "end": "2026-04-22"},
        )
        assert r.status_code == 200
        j = r.json()
        self._assert_report_shape(j, "custom")
        assert j["start"] == "2026-04-01"
        assert j["end"] == "2026-04-22"


# ---------- ASSISTANT ----------
class TestAssistant:
    def test_assistant_weekly(self):
        r = requests.get(f"{BASE}/assistant")
        assert r.status_code == 200
        j = r.json()
        assert "start" in j and "end" in j
        assert "insights" in j
        assert "good" in j["insights"] and "concerns" in j["insights"]
        # range should be ~7 days
        s = datetime.fromisoformat(j["start"])
        e = datetime.fromisoformat(j["end"])
        assert (e - s).days == 6


# ---------- INSIGHTS real-data sanity (seed + check) ----------
class TestReportsInsights:
    """Seed a record that should trigger concerns/good insights, assert it shows up."""

    def test_high_glucose_flagged(self):
        # use a past date inside current month so 'month' includes it
        today = (datetime.now(timezone.utc) - timedelta(hours=3)).date()
        seed_date = today.replace(day=1).isoformat()
        create = requests.post(
            f"{BASE}/insulin",
            json={"date": seed_date, "time": "07:30", "glucose": 250, "notes": "TEST_rcare"},
        )
        assert create.status_code == 200
        rid = create.json()["id"]
        try:
            r = requests.get(f"{BASE}/reports", params={"period": "month"})
            assert r.status_code == 200
            concerns = " ".join(r.json()["insights"]["concerns"])
            assert "250" in concerns or "alta" in concerns.lower()
        finally:
            requests.delete(f"{BASE}/insulin/{rid}")
