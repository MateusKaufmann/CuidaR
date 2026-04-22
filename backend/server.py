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
