import os, requests, uuid
BASE = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001').rstrip('/') + '/api'
D = "2026-01-15"

def test_root():
    r = requests.get(f"{BASE}/"); assert r.status_code == 200

def test_insulin_crud():
    r = requests.post(f"{BASE}/insulin", json={"date": D, "time": "08:00", "glucose": 110, "fast_insulin_units": 4, "notes": "TEST"})
    assert r.status_code == 200, r.text
    j = r.json(); assert "_id" not in j; rid = j["id"]
    g = requests.get(f"{BASE}/insulin?date={D}").json()
    assert any(x["id"] == rid for x in g)
    assert requests.delete(f"{BASE}/insulin/{rid}").status_code == 200
    assert requests.delete(f"{BASE}/insulin/{uuid.uuid4()}").status_code == 404

def test_food_upsert():
    p = {"date": D, "cafe": {"status": "comeu_tudo", "notes": "TEST"}, "almoco": {"status": "comeu_metade"}}
    r = requests.post(f"{BASE}/food", json=p); assert r.status_code == 200, r.text
    j = r.json(); assert "_id" not in j; assert j["cafe"]["status"] == "comeu_tudo"
    # upsert update
    r2 = requests.post(f"{BASE}/food", json={"date": D, "janta": {"status": "nao_comeu"}})
    assert r2.status_code == 200
    g = requests.get(f"{BASE}/food?date={D}").json()
    assert len(g) == 1 and g[0]["janta"]["status"] == "nao_comeu" and g[0]["cafe"]["status"] == "comeu_tudo"

def test_water_crud():
    r = requests.post(f"{BASE}/water", json={"date": D, "time": "09:00", "amount_ml": 250, "notes": "TEST"})
    assert r.status_code == 200, r.text
    j = r.json(); assert "_id" not in j; rid = j["id"]
    assert any(x["id"] == rid for x in requests.get(f"{BASE}/water?date={D}").json())
    assert requests.delete(f"{BASE}/water/{rid}").status_code == 200
    assert requests.delete(f"{BASE}/water/{uuid.uuid4()}").status_code == 404

def test_stats():
    r = requests.get(f"{BASE}/stats?days=7"); assert r.status_code == 200
    j = r.json()
    for k in ["dates", "water_by_date", "glucose_by_date", "meal_counts", "total_insulin_records", "total_water_ml"]:
        assert k in j
    assert len(j["dates"]) == 7
