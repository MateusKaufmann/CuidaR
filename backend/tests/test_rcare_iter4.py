"""
RCare iteration 4 tests:
 - caregivers CRUD (name)
 - medicines CRUD (name + origin)
 - medicine-purchases CRUD linked to medicine_id
 - insulin/food/water accept optional caregiver field and return it on GET
 - /api/reports returns 'purchases' and insights.concerns includes
   'Sem registro de X no dia Y' for recent missing dates
 - DELETE medicine cascades to its purchases
"""
import os
import re
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/') + '/api'


# ================== CAREGIVERS ==================
class TestCaregivers:
    def test_create_list_delete(self):
        r = requests.post(f"{BASE}/caregivers", json={"name": "TEST_CG_iter4"})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        assert r.json()["name"] == "TEST_CG_iter4"
        try:
            lst = requests.get(f"{BASE}/caregivers")
            assert lst.status_code == 200
            assert any(c["id"] == cid and c["name"] == "TEST_CG_iter4"
                       for c in lst.json())
        finally:
            d = requests.delete(f"{BASE}/caregivers/{cid}")
            assert d.status_code == 200
            assert d.json() == {"ok": True}
        # verify gone
        lst2 = requests.get(f"{BASE}/caregivers")
        assert not any(c["id"] == cid for c in lst2.json())

    def test_empty_name_rejected(self):
        r = requests.post(f"{BASE}/caregivers", json={"name": "   "})
        assert r.status_code == 400

    def test_delete_not_found(self):
        r = requests.delete(f"{BASE}/caregivers/non-existent-id-xyz")
        assert r.status_code == 404


# ================== MEDICINES ==================
class TestMedicines:
    def test_create_list_delete(self):
        payload = {"name": "TEST_MED_iter4", "origin": "TEST_SUS"}
        r = requests.post(f"{BASE}/medicines", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        mid = body["id"]
        assert body["name"] == "TEST_MED_iter4"
        assert body["origin"] == "TEST_SUS"
        try:
            lst = requests.get(f"{BASE}/medicines")
            assert lst.status_code == 200
            got = [m for m in lst.json() if m["id"] == mid]
            assert len(got) == 1
            assert got[0]["origin"] == "TEST_SUS"
        finally:
            d = requests.delete(f"{BASE}/medicines/{mid}")
            assert d.status_code == 200

    def test_missing_origin_rejected(self):
        r = requests.post(f"{BASE}/medicines", json={"name": "X", "origin": ""})
        assert r.status_code == 400

    def test_missing_name_rejected(self):
        r = requests.post(f"{BASE}/medicines", json={"name": "", "origin": "SUS"})
        assert r.status_code == 400


# ================== MEDICINE PURCHASES ==================
class TestMedicinePurchases:
    def _make_medicine(self):
        r = requests.post(f"{BASE}/medicines",
                          json={"name": "TEST_MED_P_iter4", "origin": "TEST"})
        assert r.status_code == 200
        return r.json()["id"]

    def test_create_list_delete_purchase(self):
        mid = self._make_medicine()
        try:
            p = requests.post(f"{BASE}/medicine-purchases", json={
                "medicine_id": mid, "date": "2026-01-10",
                "quantity": "2 caixas", "notes": "TEST_purchase",
                "caregiver": "Maria"
            })
            assert p.status_code == 200, p.text
            body = p.json()
            pid = body["id"]
            assert body["medicine_id"] == mid
            assert body["medicine_name"] == "TEST_MED_P_iter4"
            assert body["date"] == "2026-01-10"
            assert body["caregiver"] == "Maria"
            assert body["quantity"] == "2 caixas"

            # filter by medicine_id
            lst = requests.get(f"{BASE}/medicine-purchases",
                               params={"medicine_id": mid})
            assert lst.status_code == 200
            items = lst.json()
            assert any(x["id"] == pid for x in items)
            assert all(x["medicine_id"] == mid for x in items)

            d = requests.delete(f"{BASE}/medicine-purchases/{pid}")
            assert d.status_code == 200
            # verify gone
            lst2 = requests.get(f"{BASE}/medicine-purchases",
                                params={"medicine_id": mid})
            assert not any(x["id"] == pid for x in lst2.json())
        finally:
            requests.delete(f"{BASE}/medicines/{mid}")

    def test_purchase_invalid_medicine_id(self):
        r = requests.post(f"{BASE}/medicine-purchases", json={
            "medicine_id": "does-not-exist-xyz", "date": "2026-01-10"
        })
        assert r.status_code == 404

    def test_delete_medicine_cascades_to_purchases(self):
        mid = self._make_medicine()
        # create 2 purchases
        p1 = requests.post(f"{BASE}/medicine-purchases", json={
            "medicine_id": mid, "date": "2026-01-11"}).json()
        p2 = requests.post(f"{BASE}/medicine-purchases", json={
            "medicine_id": mid, "date": "2026-01-12"}).json()
        assert p1["id"] and p2["id"]

        # delete medicine -> purchases must go away
        d = requests.delete(f"{BASE}/medicines/{mid}")
        assert d.status_code == 200

        lst = requests.get(f"{BASE}/medicine-purchases",
                           params={"medicine_id": mid})
        assert lst.status_code == 200
        ids = [x["id"] for x in lst.json()]
        assert p1["id"] not in ids
        assert p2["id"] not in ids


# ================== CAREGIVER FIELD ON CORE RECORDS ==================
class TestCaregiverFieldOnRecords:
    def test_insulin_accepts_and_returns_caregiver(self):
        r = requests.post(f"{BASE}/insulin", json={
            "date": "2026-02-01", "time": "08:00", "glucose": 110,
            "caregiver": "Maria", "notes": "TEST_iter4"
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        assert r.json()["caregiver"] == "Maria"
        try:
            g = requests.get(f"{BASE}/insulin", params={"date": "2026-02-01"})
            item = [i for i in g.json() if i["id"] == rid][0]
            assert item["caregiver"] == "Maria"
        finally:
            requests.delete(f"{BASE}/insulin/{rid}")

    def test_food_accepts_and_returns_caregiver(self):
        r = requests.post(f"{BASE}/food", json={
            "date": "2026-02-02", "cafe": {"status": "comeu_tudo"},
            "caregiver": "João"
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        assert r.json()["caregiver"] == "João"
        try:
            g = requests.get(f"{BASE}/food", params={"date": "2026-02-02"})
            item = [i for i in g.json() if i["id"] == rid][0]
            assert item["caregiver"] == "João"
        finally:
            requests.delete(f"{BASE}/food/{rid}")

    def test_water_accepts_and_returns_caregiver(self):
        r = requests.post(f"{BASE}/water", json={
            "date": "2026-02-03", "time": "09:00", "amount_ml": 200,
            "caregiver": "Ana", "notes": "TEST_iter4"
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        assert r.json()["caregiver"] == "Ana"
        try:
            g = requests.get(f"{BASE}/water", params={"date": "2026-02-03"})
            item = [w for w in g.json() if w["id"] == rid][0]
            assert item["caregiver"] == "Ana"
        finally:
            requests.delete(f"{BASE}/water/{rid}")

    def test_insulin_without_caregiver_still_works(self):
        r = requests.post(f"{BASE}/insulin", json={
            "date": "2026-02-04", "time": "07:00", "glucose": 100
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        try:
            assert r.json().get("caregiver") is None
        finally:
            requests.delete(f"{BASE}/insulin/{rid}")


# ================== REPORTS (purchases + missing-data concerns) ==================
class TestReportsIter4:
    def test_reports_contains_purchases_key(self):
        r = requests.get(f"{BASE}/reports", params={"period": "week"})
        assert r.status_code == 200
        j = r.json()
        assert "purchases" in j
        assert isinstance(j["purchases"], list)
        assert "insights" in j
        assert "concerns" in j["insights"]
        assert "good" in j["insights"]  # ok if present, PDF just doesn't use

    def test_reports_purchases_populated(self):
        # create medicine + purchase inside today's range
        today = (datetime.now(timezone.utc) - timedelta(hours=3)).date().isoformat()
        m = requests.post(f"{BASE}/medicines",
                          json={"name": "TEST_REP_MED", "origin": "TEST"}).json()
        p = requests.post(f"{BASE}/medicine-purchases", json={
            "medicine_id": m["id"], "date": today, "caregiver": "Maria"
        }).json()
        try:
            r = requests.get(f"{BASE}/reports", params={"period": "week"})
            assert r.status_code == 200
            purchases = r.json()["purchases"]
            ids = [x["id"] for x in purchases]
            assert p["id"] in ids, f"purchase not in week report: {ids}"
            got = [x for x in purchases if x["id"] == p["id"]][0]
            assert got["caregiver"] == "Maria"
            assert got["medicine_name"] == "TEST_REP_MED"
        finally:
            requests.delete(f"{BASE}/medicine-purchases/{p['id']}")
            requests.delete(f"{BASE}/medicines/{m['id']}")

    def test_reports_missing_data_concerns(self):
        """For a custom past date range with NO data, each missing-record
        type should emit a 'Sem registro de X no dia Y' concern."""
        # pick 2 days in a far-past window so no records exist
        start = "2024-06-01"
        end = "2024-06-02"
        r = requests.get(f"{BASE}/reports", params={
            "period": "custom", "start": start, "end": end
        })
        assert r.status_code == 200
        concerns = r.json()["insights"]["concerns"]
        joined = " | ".join(concerns)
        # Uses DD/MM/YYYY format  e.g. "Sem registro de glicemia no dia 01/06/2024"
        assert re.search(r"Sem registro de glicemia no dia 01/06/2024", joined), joined
        assert re.search(r"Sem registro de água no dia 01/06/2024", joined), joined
        assert re.search(r"Sem registro de alimentação no dia 01/06/2024", joined), joined
        assert re.search(r"Sem registro de glicemia no dia 02/06/2024", joined), joined
