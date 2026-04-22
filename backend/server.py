from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============= MODELS =============

class InsulinRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # ISO date YYYY-MM-DD
    time: str  # HH:MM
    glucose: float  # mg/dL
    fast_insulin_units: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InsulinCreate(BaseModel):
    date: str
    time: str
    glucose: float
    fast_insulin_units: Optional[float] = None
    notes: Optional[str] = None


class MealStatus(BaseModel):
    status: Optional[Literal["comeu_tudo", "comeu_metade", "nao_comeu"]] = None
    notes: Optional[str] = None


class FoodRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    cafe: Optional[MealStatus] = None
    lanche: Optional[MealStatus] = None
    almoco: Optional[MealStatus] = None
    lanche_tarde: Optional[MealStatus] = None
    janta: Optional[MealStatus] = None
    ceia: Optional[MealStatus] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FoodUpsert(BaseModel):
    date: str
    cafe: Optional[MealStatus] = None
    lanche: Optional[MealStatus] = None
    almoco: Optional[MealStatus] = None
    lanche_tarde: Optional[MealStatus] = None
    janta: Optional[MealStatus] = None
    ceia: Optional[MealStatus] = None


class WaterRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    amount_ml: int
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WaterCreate(BaseModel):
    date: str
    time: str
    amount_ml: int
    notes: Optional[str] = None


# ============= ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Elderly Care API"}


# ----- INSULIN -----
@api_router.post("/insulin", response_model=InsulinRecord)
async def create_insulin(data: InsulinCreate):
    record = InsulinRecord(**data.dict())
    doc = record.dict()
    await db.insulin.insert_one(doc)
    return record


@api_router.get("/insulin", response_model=List[InsulinRecord])
async def list_insulin(date: Optional[str] = None, limit: int = 500):
    query = {}
    if date:
        query["date"] = date
    docs = await db.insulin.find(query, {"_id": 0}).sort([("date", -1), ("time", -1)]).to_list(limit)
    return [InsulinRecord(**d) for d in docs]


@api_router.delete("/insulin/{record_id}")
async def delete_insulin(record_id: str):
    result = await db.insulin.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


# ----- FOOD -----
@api_router.post("/food", response_model=FoodRecord)
async def upsert_food(data: FoodUpsert):
    existing = await db.food.find_one({"date": data.date}, {"_id": 0})
    if existing:
        update_data = data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.food.update_one({"date": data.date}, {"$set": update_data})
        updated = await db.food.find_one({"date": data.date}, {"_id": 0})
        return FoodRecord(**updated)
    else:
        record = FoodRecord(**data.dict())
        await db.food.insert_one(record.dict())
        return record


@api_router.get("/food", response_model=List[FoodRecord])
async def list_food(date: Optional[str] = None, limit: int = 500):
    query = {}
    if date:
        query["date"] = date
    docs = await db.food.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return [FoodRecord(**d) for d in docs]


@api_router.delete("/food/{record_id}")
async def delete_food(record_id: str):
    result = await db.food.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


# ----- WATER -----
@api_router.post("/water", response_model=WaterRecord)
async def create_water(data: WaterCreate):
    record = WaterRecord(**data.dict())
    await db.water.insert_one(record.dict())
    return record


@api_router.get("/water", response_model=List[WaterRecord])
async def list_water(date: Optional[str] = None, limit: int = 500):
    query = {}
    if date:
        query["date"] = date
    docs = await db.water.find(query, {"_id": 0}).sort([("date", -1), ("time", -1)]).to_list(limit)
    return [WaterRecord(**d) for d in docs]


@api_router.delete("/water/{record_id}")
async def delete_water(record_id: str):
    result = await db.water.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


# ----- STATS -----
@api_router.get("/stats")
async def get_stats(days: int = 7):
    """Get aggregated stats for the last N days."""
    today = datetime.now(timezone.utc).date()
    start_date = (today - timedelta(days=days - 1)).isoformat()

    # Insulin stats
    insulin_docs = await db.insulin.find(
        {"date": {"$gte": start_date}}, {"_id": 0}
    ).to_list(1000)

    # Water stats - aggregated by day
    water_docs = await db.water.find(
        {"date": {"$gte": start_date}}, {"_id": 0}
    ).to_list(1000)

    water_by_date = {}
    for w in water_docs:
        water_by_date[w["date"]] = water_by_date.get(w["date"], 0) + w["amount_ml"]

    # Glucose by date (average)
    glucose_by_date = {}
    glucose_counts = {}
    for i in insulin_docs:
        d = i["date"]
        glucose_by_date[d] = glucose_by_date.get(d, 0) + i["glucose"]
        glucose_counts[d] = glucose_counts.get(d, 0) + 1
    glucose_avg_by_date = {
        d: round(glucose_by_date[d] / glucose_counts[d], 1) for d in glucose_by_date
    }

    # Food stats
    food_docs = await db.food.find(
        {"date": {"$gte": start_date}}, {"_id": 0}
    ).to_list(1000)

    meal_counts = {"comeu_tudo": 0, "comeu_metade": 0, "nao_comeu": 0}
    for f in food_docs:
        for meal in ["cafe", "lanche", "almoco", "lanche_tarde", "janta", "ceia"]:
            m = f.get(meal)
            if m and m.get("status"):
                meal_counts[m["status"]] = meal_counts.get(m["status"], 0) + 1

    # Build date range
    dates = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

    return {
        "dates": dates,
        "water_by_date": [water_by_date.get(d, 0) for d in dates],
        "glucose_by_date": [glucose_avg_by_date.get(d, 0) for d in dates],
        "meal_counts": meal_counts,
        "total_insulin_records": len(insulin_docs),
        "total_water_ml": sum(water_by_date.values()),
    }


# ----- ADMIN (password stored in settings collection) -----
DEFAULT_ADMIN_PASSWORD = "2255"
DEFAULT_WATER_GOAL = 2000
DEFAULT_PATIENT_NAME = "Vovó"


class PasswordIn(BaseModel):
    password: str


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


class SettingsIn(BaseModel):
    water_goal_ml: Optional[int] = None
    patient_name: Optional[str] = None


async def _get_setting(key: str, default):
    doc = await db.settings.find_one({"key": key}, {"_id": 0})
    if not doc:
        await db.settings.insert_one({"key": key, "value": default})
        return default
    return doc["value"]


async def _get_admin_password() -> str:
    return await _get_setting("admin_password", DEFAULT_ADMIN_PASSWORD)


@api_router.post("/admin/verify")
async def admin_verify(data: PasswordIn):
    current = await _get_admin_password()
    return {"ok": data.password == current}


@api_router.post("/admin/change-password")
async def admin_change(data: ChangePasswordIn):
    current = await _get_admin_password()
    if data.old_password != current:
        raise HTTPException(status_code=403, detail="Senha atual incorreta")
    if not data.new_password or len(data.new_password) < 3:
        raise HTTPException(status_code=400, detail="Nova senha muito curta")
    await db.settings.update_one(
        {"key": "admin_password"},
        {"$set": {"value": data.new_password}},
        upsert=True,
    )
    return {"ok": True}


@api_router.get("/settings")
async def get_settings():
    water = await _get_setting("water_goal_ml", DEFAULT_WATER_GOAL)
    name = await _get_setting("patient_name", DEFAULT_PATIENT_NAME)
    return {"water_goal_ml": water, "patient_name": name}


@api_router.post("/settings")
async def update_settings(data: SettingsIn):
    if data.water_goal_ml is not None:
        if data.water_goal_ml < 100 or data.water_goal_ml > 10000:
            raise HTTPException(status_code=400, detail="Meta inválida (100-10000 ml)")
        await db.settings.update_one(
            {"key": "water_goal_ml"},
            {"$set": {"value": data.water_goal_ml}},
            upsert=True,
        )
    if data.patient_name is not None:
        name = data.patient_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Nome inválido")
        await db.settings.update_one(
            {"key": "patient_name"},
            {"$set": {"value": name}},
            upsert=True,
        )
    return await get_settings()


# ----- INCONSISTENCIES (check today) -----
@api_router.get("/inconsistencies")
async def inconsistencies():
    now = datetime.now(timezone.utc) - timedelta(hours=3)  # Brazil time approx
    today = now.date().isoformat()
    hour = now.hour
    alerts = []

    food_today = await db.food.find_one({"date": today}, {"_id": 0})
    insulin_today = await db.insulin.find({"date": today}, {"_id": 0}).to_list(100)
    water_today = await db.water.find({"date": today}, {"_id": 0}).to_list(100)

    # Meal alerts
    meal_rules = [
        ("cafe", 10, "Café da manhã não registrado"),
        ("almoco", 14, "Almoço não registrado"),
        ("janta", 21, "Janta não registrada"),
    ]
    for key, threshold_hour, message in meal_rules:
        if hour >= threshold_hour:
            entry = (food_today or {}).get(key)
            if not entry or not entry.get("status"):
                alerts.append({"level": "warning", "message": message})

    # Glucose morning check
    if hour >= 10 and not insulin_today:
        alerts.append(
            {"level": "warning", "message": "Glicemia da manhã ainda não registrada"}
        )

    # Low water after 15h
    total_water = sum(w["amount_ml"] for w in water_today)
    if hour >= 15 and total_water < 500:
        alerts.append(
            {
                "level": "warning",
                "message": f"Pouca água até o momento ({total_water} ml)",
            }
        )

    return {"date": today, "alerts": alerts}


# ----- REPORTS: period-based aggregation + insights -----
def _period_range(period: str, start: Optional[str], end: Optional[str]):
    today = (datetime.now(timezone.utc) - timedelta(hours=3)).date()
    if period == "week":
        s = today - timedelta(days=6)
        return s.isoformat(), today.isoformat()
    if period == "month":
        s = today.replace(day=1)
        return s.isoformat(), today.isoformat()
    if period == "all":
        return "0000-01-01", "9999-12-31"
    if period == "custom" and start and end:
        return start, end
    return today.isoformat(), today.isoformat()


def _fmt_br(iso_date: str) -> str:
    """Format YYYY-MM-DD to DD/MM/YYYY."""
    try:
        y, m, d = iso_date.split("-")
        return f"{d}/{m}/{y}"
    except Exception:
        return iso_date


def _build_insights(insulin, food, water):
    good = []
    concerns = []

    # Water per day
    water_by_date = {}
    for w in water:
        water_by_date[w["date"]] = water_by_date.get(w["date"], 0) + w["amount_ml"]
    for d, total in water_by_date.items():
        if total >= 1500:
            good.append(f"Bastante água no dia {_fmt_br(d)} ({total} ml)")
        elif total < 800 and total > 0:
            concerns.append(f"Pouca água no dia {_fmt_br(d)} ({total} ml)")

    # Glucose anomalies
    for i in insulin:
        g = i["glucose"]
        if g > 180:
            concerns.append(
                f"Glicemia alta no dia {_fmt_br(i['date'])} às {i['time']} ({g} mg/dL)"
            )
        elif g < 70:
            concerns.append(
                f"Glicemia baixa no dia {_fmt_br(i['date'])} às {i['time']} ({g} mg/dL)"
            )
        elif 80 <= g <= 140:
            good.append(
                f"Glicemia ideal no dia {_fmt_br(i['date'])} às {i['time']} ({g} mg/dL)"
            )

    # Meals
    meal_labels = {
        "cafe": "café da manhã",
        "lanche": "lanche",
        "almoco": "almoço",
        "lanche_tarde": "lanche da tarde",
        "janta": "janta",
        "ceia": "ceia",
    }
    for f in food:
        missed = []
        full = []
        for k, lbl in meal_labels.items():
            m = f.get(k)
            if m and m.get("status") == "nao_comeu":
                missed.append(lbl)
            if m and m.get("status") == "comeu_tudo":
                full.append(lbl)
        if missed:
            concerns.append(
                f"No dia {_fmt_br(f['date'])}, não comeu: {', '.join(missed)}"
            )
        if len(full) >= 5:
            good.append(
                f"Dia {_fmt_br(f['date'])}: ótima alimentação ({len(full)} refeições completas)"
            )

    return {"good": good[:20], "concerns": concerns[:20]}


@api_router.get("/reports")
async def get_report(
    period: str = "week",
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    s, e = _period_range(period, start, end)
    insulin = await db.insulin.find(
        {"date": {"$gte": s, "$lte": e}}, {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(5000)
    food = await db.food.find(
        {"date": {"$gte": s, "$lte": e}}, {"_id": 0}
    ).sort("date", 1).to_list(5000)
    water = await db.water.find(
        {"date": {"$gte": s, "$lte": e}}, {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(5000)

    insights = _build_insights(insulin, food, water)

    return {
        "period": period,
        "start": s,
        "end": e,
        "insulin": insulin,
        "food": food,
        "water": water,
        "insights": insights,
    }


@api_router.get("/assistant")
async def assistant():
    today = (datetime.now(timezone.utc) - timedelta(hours=3)).date()
    s = (today - timedelta(days=6)).isoformat()
    e = today.isoformat()
    insulin = await db.insulin.find({"date": {"$gte": s, "$lte": e}}, {"_id": 0}).to_list(2000)
    food = await db.food.find({"date": {"$gte": s, "$lte": e}}, {"_id": 0}).to_list(2000)
    water = await db.water.find({"date": {"$gte": s, "$lte": e}}, {"_id": 0}).to_list(2000)
    insights = _build_insights(insulin, food, water)
    return {"start": s, "end": e, "insights": insights}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
