from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
import calendar
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="My Expenses API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]
SHORT_MONTH = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---------------- Models ----------------
class Planning(BaseModel):
    uuid: Optional[str] = None
    accountUuid: Optional[str] = None
    date: str
    item: str
    amount: float
    payed: Optional[bool] = False
    amountPayed: Optional[float] = 0.0
    copiedOver: Optional[bool] = False


class Budget(BaseModel):
    uuid: Optional[str] = None
    accountUuid: Optional[str] = None
    name: str
    description: Optional[str] = ""
    amount: float
    onlyThisMonth: Optional[bool] = False
    categoryList: List[str] = []
    categoryListDetail: dict = {}


# ---------------- Helpers ----------------
async def get_transactions(account: Optional[str] = None):
    q = {}
    if account and account != "all":
        q["accountUuid"] = account
    return await db.transactions.find(q, {"_id": 0}).to_list(100000)


async def opening_balance(account: Optional[str] = None):
    q = {}
    if account and account != "all":
        q["uuid"] = account
    accts = await db.accounts.find(q, {"_id": 0}).to_list(1000)
    return sum(a.get("openingBalance", 0) for a in accts)


def ref_of(t):
    return t["date"][:7]


def month_label(ref):
    y, m = ref.split("-")
    return f"{MONTH_NAMES[int(m)]} {y}"


def week_of(day):
    return min(5, (int(day) - 1) // 7 + 1)


# ---------------- Accounts ----------------
@api_router.get("/account")
async def list_accounts():
    return await db.accounts.find({}, {"_id": 0}).to_list(1000)


@api_router.post("/account")
async def save_batch(payload: dict):
    """Import: save an account and its transactions."""
    acc_uuid = payload.get("uuid") or str(uuid.uuid4())
    label = payload.get("label", "Imported Account")
    currency = payload.get("currency", "BRL")
    opening = float(payload.get("openingBalance", 0) or 0)
    await db.accounts.update_one(
        {"uuid": acc_uuid},
        {"$set": {"uuid": acc_uuid, "label": label, "currency": currency,
                  "openingBalance": opening}},
        upsert=True,
    )
    txs = payload.get("transactions", []) or []
    inserted = 0
    for t in txs:
        doc = {
            "uuid": t.get("uuid") or str(uuid.uuid4()),
            "accountUuid": acc_uuid,
            "amount": float(t.get("amount", 0)),
            "category": (t.get("category") or "Uncategorized").split(":")[0],
            "subCategory": (t.get("category") or ":").split(":")[1] if ":" in (t.get("category") or "") else t.get("subCategory", ""),
            "date": t.get("date"),
            "payee": t.get("payee", ""),
            "comment": t.get("comment", t.get("payee", "")),
            "status": t.get("status", "UNRECONCILED"),
            "tags": t.get("tags", []),
        }
        await db.transactions.insert_one(doc)
        inserted += 1
    return {"message": f"Saved account '{label}' with {inserted} transactions."}


@api_router.post("/upload/parse/{filename}")
async def parse_file(filename: str, request: Request):
    import json
    body = await request.body()
    try:
        data = json.loads(body.decode("utf-8"))
    except Exception:
        return {"label": "", "currency": "BRL", "transactions": []}
    if isinstance(data, list):
        data = {"label": filename, "currency": "BRL", "transactions": data}
    data.setdefault("transactions", [])
    return data


# ---------------- Transactions ----------------
def _clean(t):
    return {
        "uuid": t.get("uuid"),
        "amount": t.get("amount"),
        "category": t.get("category"),
        "subCategory": t.get("subCategory"),
        "labelMain": t.get("category"),
        "labelSub": t.get("subCategory"),
        "date": t.get("date"),
        "payee": t.get("payee"),
        "comment": t.get("comment"),
        "status": t.get("status"),
        "tags": t.get("tags", []),
        "reference": ref_of(t),
    }


@api_router.get("/transaction/all-with-summary")
async def all_with_summary(account: Optional[str] = None):
    txs = await get_transactions(account)
    opening0 = await opening_balance(account)
    groups = {}
    for t in txs:
        groups.setdefault(ref_of(t), []).append(t)
    refs = sorted(groups.keys())
    running = opening0
    result = []
    for ref in refs:
        items = sorted(groups[ref], key=lambda x: x["date"])
        income = sum(i["amount"] for i in items if i["amount"] > 0)
        expense = sum(i["amount"] for i in items if i["amount"] < 0)
        opening = running
        total = opening + income + expense
        running = total
        result.append({
            "reference": ref,
            "summaryDTO": {
                "month": month_label(ref),
                "opening": round(opening, 2),
                "income": round(income, 2),
                "expense": round(expense, 2),
                "total": round(total, 2),
            },
            "transactionList": [_clean(i) for i in sorted(items, key=lambda x: x["date"], reverse=True)],
        })
    result.reverse()
    return result


@api_router.get("/transaction/summary-per-category")
async def summary_per_category(account: Optional[str] = None):
    txs = await get_transactions(account)
    refs = sorted({ref_of(t) for t in txs})[-6:]
    cats = {}
    for t in txs:
        if t["amount"] >= 0:
            continue
        r = ref_of(t)
        if r not in refs:
            continue
        cats.setdefault(t["category"], {}).setdefault(r, 0)
        cats[t["category"]][r] += t["amount"]
    out = []
    for cat, per in sorted(cats.items()):
        values = [{"nome": SHORT_MONTH[int(r.split("-")[1])], "valor": round(per.get(r, 0), 2)} for r in refs]
        out.append({"label": cat, "values": values})
    return out


@api_router.get("/transaction/totals-grouped-by-month")
async def totals_grouped(account: Optional[str] = None):
    txs = await get_transactions(account)
    opening0 = await opening_balance(account)
    groups = {}
    for t in txs:
        groups.setdefault(ref_of(t), []).append(t)
    refs = sorted(groups.keys())
    running = opening0
    out = []
    for ref in refs:
        income = sum(i["amount"] for i in groups[ref] if i["amount"] > 0)
        expense = sum(i["amount"] for i in groups[ref] if i["amount"] < 0)
        running += income + expense
        out.append({
            "yearMonth": ref,
            "income": round(income, 2),
            "expense": round(abs(expense), 2),
            "balance": round(running, 2),
        })
    return out


@api_router.get("/transaction/yearMonth")
async def year_month(account: Optional[str] = None):
    txs = await get_transactions(account)
    return sorted({ref_of(t) for t in txs}, reverse=True)


# ---------------- Analysis ----------------
def _week_breakdown(items):
    weeks = {}
    for t in items:
        w = week_of(t["date"].split("-")[2])
        weeks.setdefault(w, {"income": 0, "expense": 0})
        if t["amount"] > 0:
            weeks[w]["income"] += t["amount"]
        else:
            weeks[w]["expense"] += abs(t["amount"])
    return [{"week": w, "income": round(weeks[w]["income"], 2),
             "expense": round(weeks[w]["expense"], 2)} for w in sorted(weeks.keys())]


async def _current_month_obj(account, ref):
    txs = await get_transactions(account)
    items = [t for t in txs if ref_of(t) == ref]
    income = sum(i["amount"] for i in items if i["amount"] > 0)
    expense = sum(abs(i["amount"]) for i in items if i["amount"] < 0)
    return {
        "reference": ref,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "perWeekList": _week_breakdown(items),
    }


async def _latest_ref(account):
    txs = await get_transactions(account)
    refs = sorted({ref_of(t) for t in txs})
    return refs[-1] if refs else datetime.now().strftime("%Y-%m")


@api_router.get("/analise/current-month")
async def analise_current(account: Optional[str] = None):
    return await _current_month_obj(account, await _latest_ref(account))


@api_router.get("/analise/current-month/{year}/{month}")
async def analise_current_ym(year: int, month: int, account: Optional[str] = None):
    return await _current_month_obj(account, f"{year}-{month:02d}")


@api_router.get("/analise/month-analysis/{year}/{month}")
async def month_analysis(year: int, month: int, account: Optional[str] = None):
    return await _current_month_obj(account, f"{year}-{month:02d}")


@api_router.get("/analise/graph-last-4-month")
async def graph_last_4(account: Optional[str] = None):
    txs = await get_transactions(account)
    refs = sorted({ref_of(t) for t in txs})[-4:]
    out = []
    for ref in refs:
        items = [t for t in txs if ref_of(t) == ref]
        income = sum(i["amount"] for i in items if i["amount"] > 0)
        expense = sum(abs(i["amount"]) for i in items if i["amount"] < 0)
        out.append({"month": month_label(ref), "income": round(income, 2),
                    "expense": round(expense, 2)})
    return out


@api_router.get("/analise/month-analysis-comparison/{source}/{target}")
async def month_comparison(source: str, target: str, account: Optional[str] = None):
    txs = await get_transactions(account)

    def spend_by_cat(ref):
        d = {}
        for t in txs:
            if ref_of(t) == ref and t["amount"] < 0:
                d[t["category"]] = d.get(t["category"], 0) + abs(t["amount"])
        return d

    s = spend_by_cat(source)
    tg = spend_by_cat(target)
    cats = sorted(set(s.keys()) | set(tg.keys()))
    return [{"categoryName": c, "amount": round(s.get(c, 0), 2),
             "lastMonthAmount": round(tg.get(c, 0), 2)} for c in cats]


# ---------------- Category / Distribution ----------------
@api_router.get("/category/chart/{year}/{month}")
async def category_chart(year: int, month: int, account: Optional[str] = None):
    ref = f"{year}-{month:02d}"
    txs = await get_transactions(account)
    cats = {}
    for t in txs:
        if ref_of(t) != ref or t["amount"] >= 0:
            continue
        c = cats.setdefault(t["category"], {"amount": 0, "sub": {}})
        c["amount"] += abs(t["amount"])
        sub = t.get("subCategory") or "Other"
        c["sub"][sub] = c["sub"].get(sub, 0) + abs(t["amount"])
    out = []
    for name, v in sorted(cats.items(), key=lambda x: -x[1]["amount"]):
        out.append({
            "name": name,
            "amount": round(v["amount"], 2),
            "subCategoryList": [{"name": s, "amount": round(a, 2)}
                                for s, a in sorted(v["sub"].items(), key=lambda x: -x[1])],
        })
    return out


@api_router.get("/category")
async def list_categories(account: Optional[str] = None):
    txs = await get_transactions(account)
    names = sorted({t["category"] for t in txs})
    return [{"name": n} for n in names]


# ---------------- Budgets ----------------
async def _budget_spent(account, categories):
    ref = await _latest_ref(account)
    txs = await get_transactions(account)
    return sum(abs(t["amount"]) for t in txs
               if ref_of(t) == ref and t["amount"] < 0 and t["category"] in categories)


async def _budget_card(b, account):
    cats = b.get("categoryList", [])
    budgeted = float(b.get("amount", 0))
    spent = await _budget_spent(account, cats)
    reminder = budgeted - spent
    pct = (spent / budgeted * 100) if budgeted else 0
    return {
        "uuid": b.get("uuid"),
        "name": b.get("name"),
        "description": b.get("description", ""),
        "budgeted": round(budgeted, 2),
        "spent": round(spent, 2),
        "reminder": round(reminder, 2),
        "percentage": round(pct, 2),
        "categoryList": cats,
    }


@api_router.get("/budget/analysis")
async def budget_analysis_all(account: Optional[str] = None):
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(1000)
    return [await _budget_card(b, account) for b in budgets]


@api_router.get("/budget/analysis/{uuid}")
async def budget_analysis_detail(uuid: str, account: Optional[str] = None):
    b = await db.budgets.find_one({"uuid": uuid}, {"_id": 0})
    if not b:
        return {}
    card = await _budget_card(b, account)
    ref = await _latest_ref(account)
    txs = await get_transactions(account)
    detail = []
    for cat in b.get("categoryList", []):
        allocated = float(b.get("categoryListDetail", {}).get(cat, 0) or 0)
        spent = sum(abs(t["amount"]) for t in txs
                    if ref_of(t) == ref and t["amount"] < 0 and t["category"] == cat)
        detail.append({"name": cat, "amount": round(allocated, 2),
                       "spent": round(spent, 2), "reminder": round(allocated - spent, 2)})
    card["categoryDetailDTOList"] = detail
    return card


@api_router.get("/budget")
async def budget_list(account: Optional[str] = None):
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(1000)
    return [await _budget_card(b, account) for b in budgets]


@api_router.get("/budget/{uuid}")
async def budget_get(uuid: str):
    b = await db.budgets.find_one({"uuid": uuid}, {"_id": 0})
    return b or {}


@api_router.post("/budget")
async def budget_save(b: Budget):
    doc = b.model_dump()
    if not doc.get("uuid"):
        doc["uuid"] = str(uuid.uuid4())
    await db.budgets.update_one({"uuid": doc["uuid"]}, {"$set": doc}, upsert=True)
    return doc


# ---------------- Parties ----------------
async def _party_detail(account, payee):
    txs = await get_transactions(account)
    items = [t for t in txs if t.get("payee") == payee]
    items.sort(key=lambda x: x["date"], reverse=True)
    total = sum(t["amount"] for t in items)
    return {
        "transactionList": [{"date": t["date"], "comment": t.get("comment", ""),
                             "amount": t["amount"]} for t in items],
        "qtyTransactions": len(items),
        "amount": round(total, 2),
    }


@api_router.get("/party/names")
async def party_names(account: Optional[str] = None):
    txs = await get_transactions(account)
    return sorted({t["payee"] for t in txs if t.get("payee")})


@api_router.get("/party/{party}")
async def party_transactions(party: str, account: Optional[str] = None):
    return await _party_detail(account, party)


# ---------------- Tags ----------------
@api_router.get("/tag")
async def tag_names(account: Optional[str] = None):
    txs = await get_transactions(account)
    tags = set()
    for t in txs:
        for tag in t.get("tags", []):
            tags.add(tag)
    return sorted(tags)


@api_router.get("/tag/{tag}")
async def tag_transactions(tag: str, account: Optional[str] = None):
    txs = await get_transactions(account)
    items = [t for t in txs if tag in t.get("tags", [])]
    items.sort(key=lambda x: x["date"], reverse=True)
    total = sum(t["amount"] for t in items)
    return {
        "transactionList": [{"date": t["date"], "comment": t.get("comment", ""),
                             "amount": t["amount"]} for t in items],
        "qtyTransactions": len(items),
        "amount": round(total, 2),
    }


# ---------------- Planning ----------------
@api_router.get("/planning")
async def planning_all(account: Optional[str] = None):
    q = {}
    if account and account != "all":
        q["accountUuid"] = account
    return await db.plannings.find(q, {"_id": 0}).to_list(10000)


@api_router.put("/planning/copy-over/{year_month}")
async def planning_copy_over(year_month: str, account: Optional[str] = None):
    q = {"date": {"$regex": f"^{year_month}"}}
    if account and account != "all":
        q["accountUuid"] = account
    src = await db.plannings.find(q, {"_id": 0}).to_list(10000)
    y, m = map(int, year_month.split("-"))
    nm = 1 if m == 12 else m + 1
    ny = y + 1 if m == 12 else y
    nref = f"{ny}-{nm:02d}"
    created = 0
    for p in src:
        day = p["date"].split("-")[2]
        last = calendar.monthrange(ny, nm)[1]
        day = f"{min(int(day), last):02d}"
        new_date = f"{nref}-{day}"
        exists = await db.plannings.find_one({"date": new_date, "item": p["item"], "copiedOver": True})
        if exists:
            continue
        await db.plannings.insert_one({
            "uuid": str(uuid.uuid4()), "accountUuid": p.get("accountUuid"),
            "date": new_date, "item": p["item"], "amount": p["amount"],
            "payed": False, "amountPayed": 0.0, "copiedOver": True,
        })
        created += 1
    return {"message": f"Copied {created} events to {nref}"}


@api_router.delete("/planning/clean-up/{year_month}")
async def planning_clean_up(year_month: str, account: Optional[str] = None):
    q = {"date": {"$regex": f"^{year_month}"}, "copiedOver": True}
    if account and account != "all":
        q["accountUuid"] = account
    res = await db.plannings.delete_many(q)
    return {"message": f"Removed {res.deleted_count} copied events"}


@api_router.get("/planning/{uuid}")
async def planning_get(uuid: str):
    return await db.plannings.find_one({"uuid": uuid}, {"_id": 0}) or {}


@api_router.get("/planning/{start_date}/{end_date}")
async def planning_summary(start_date: str, end_date: str, account: Optional[str] = None):
    q = {"date": {"$gte": start_date, "$lte": end_date}}
    if account and account != "all":
        q["accountUuid"] = account
    items = await db.plannings.find(q, {"_id": 0}).to_list(10000)
    planned = sum(p["amount"] for p in items)
    already = sum(p.get("amountPayed", 0) for p in items if p.get("payed"))
    not_payed = sum(p["amount"] for p in items if not p.get("payed"))
    return {"planned": round(planned, 2), "alreadyPayed": round(already, 2),
            "notPayed": round(not_payed, 2)}


@api_router.post("/planning")
async def planning_save(p: Planning):
    doc = p.model_dump()
    if not doc.get("uuid"):
        doc["uuid"] = str(uuid.uuid4())
    await db.plannings.update_one({"uuid": doc["uuid"]}, {"$set": doc}, upsert=True)
    return doc


@api_router.delete("/planning/{uuid}")
async def planning_delete(uuid: str):
    await db.plannings.delete_one({"uuid": uuid})
    return {"message": "deleted"}


# ---------------- Statistics / Settings ----------------
@api_router.get("/statistics/user/records")
async def stats(account: Optional[str] = None):
    txs = await get_transactions(account)
    accts = await db.accounts.count_documents({})
    budgets = await db.budgets.count_documents({})
    plannings = await db.plannings.count_documents({})
    income = sum(t["amount"] for t in txs if t["amount"] > 0)
    expense = sum(abs(t["amount"]) for t in txs if t["amount"] < 0)
    categories = len({t["category"] for t in txs})
    tags = len({tag for t in txs for tag in t.get("tags", [])})
    return {
        "totalTransactions": len(txs),
        "totalAccounts": accts,
        "totalBudgets": budgets,
        "totalPlannings": plannings,
        "totalCategories": categories,
        "totalTags": tags,
        "totalIncome": round(income, 2),
        "totalExpense": round(expense, 2),
    }


@api_router.delete("/statistics/user/records")
async def delete_all():
    await db.transactions.delete_many({})
    return {"message": "All transactions deleted"}


@api_router.get("/")
async def root():
    return {"message": "My Expenses API"}


# ---------------- Seed ----------------
async def seed():
    if await db.accounts.count_documents({}) > 0:
        return
    rnd = random.Random(42)
    accounts = [
        {"uuid": str(uuid.uuid4()), "label": "Main Account", "currency": "BRL", "openingBalance": 3500.0},
        {"uuid": str(uuid.uuid4()), "label": "Savings", "currency": "BRL", "openingBalance": 12000.0},
    ]
    await db.accounts.insert_many([dict(a) for a in accounts])

    expense_catalog = [
        ("Food", "Groceries", ["Pão de Açúcar", "Carrefour", "Assaí"], (180, 520), ["Essential", "Monthly"]),
        ("Food", "Restaurants", ["iFood", "Outback", "Madero"], (35, 180), ["Leisure"]),
        ("Housing", "Rent", ["Imobiliária Vertice"], (2200, 2200), ["Essential", "Recurring"]),
        ("Housing", "Utilities", ["Enel", "Sabesp", "Comgás"], (90, 320), ["Essential", "Recurring"]),
        ("Transport", "Fuel", ["Shell", "Ipiranga"], (120, 300), ["Monthly"]),
        ("Transport", "Ride", ["Uber", "99"], (15, 70), ["Leisure"]),
        ("Health", "Pharmacy", ["Droga Raia", "Drogasil"], (30, 220), ["Essential"]),
        ("Health", "Gym", ["Smart Fit"], (99, 99), ["Recurring"]),
        ("Entertainment", "Streaming", ["Netflix", "Spotify", "Disney+"], (20, 56), ["Recurring", "Leisure"]),
        ("Entertainment", "Travel", ["LATAM", "Booking"], (400, 1800), ["Leisure", "Family"]),
        ("Shopping", "Clothes", ["Renner", "Zara"], (90, 450), ["Leisure"]),
        ("Shopping", "Electronics", ["Amazon", "Magazine Luiza"], (120, 900), ["Leisure"]),
        ("Education", "Courses", ["Udemy", "Alura"], (40, 300), ["Family"]),
    ]

    today = date.today()
    docs = []
    for acc in accounts:
        for back in range(7, -1, -1):
            y = today.year
            m = today.month - back
            while m <= 0:
                m += 12
                y -= 1
            last_day = calendar.monthrange(y, m)[1]
            # Salary
            docs.append({
                "uuid": str(uuid.uuid4()), "accountUuid": acc["uuid"],
                "amount": 8500.0 if acc["label"] == "Main Account" else 1500.0,
                "category": "Salary", "subCategory": "Net Salary",
                "date": f"{y}-{m:02d}-05",
                "payee": "TechCorp Ltda", "comment": "Monthly salary",
                "status": "RECONCILED", "tags": ["Monthly", "Recurring"],
            })
            if rnd.random() > 0.5:
                docs.append({
                    "uuid": str(uuid.uuid4()), "accountUuid": acc["uuid"],
                    "amount": round(rnd.uniform(500, 2500), 2),
                    "category": "Freelance", "subCategory": "Consulting",
                    "date": f"{y}-{m:02d}-{rnd.randint(10,20):02d}",
                    "payee": "Cliente Freela", "comment": "Side project payment",
                    "status": "RECONCILED", "tags": ["Leisure"],
                })
            n = rnd.randint(12, 20) if acc["label"] == "Main Account" else rnd.randint(4, 8)
            for _ in range(n):
                cat, sub, payees, (lo, hi), tags = rnd.choice(expense_catalog)
                docs.append({
                    "uuid": str(uuid.uuid4()), "accountUuid": acc["uuid"],
                    "amount": -round(rnd.uniform(lo, hi), 2),
                    "category": cat, "subCategory": sub,
                    "date": f"{y}-{m:02d}-{rnd.randint(1,last_day):02d}",
                    "payee": rnd.choice(payees), "comment": f"{sub} payment",
                    "status": rnd.choice(["RECONCILED", "UNRECONCILED"]),
                    "tags": rnd.sample(tags, k=min(len(tags), rnd.randint(1, 2))),
                })
    await db.transactions.insert_many(docs)

    main = accounts[0]["uuid"]
    budgets = [
        {"uuid": str(uuid.uuid4()), "accountUuid": main, "name": "Essentials",
         "description": "Core monthly living costs", "amount": 4000.0, "onlyThisMonth": False,
         "categoryList": ["Housing", "Food", "Health"],
         "categoryListDetail": {"Housing": 2500, "Food": 1000, "Health": 500}},
        {"uuid": str(uuid.uuid4()), "accountUuid": main, "name": "Lifestyle",
         "description": "Fun and discretionary spending", "amount": 1500.0, "onlyThisMonth": False,
         "categoryList": ["Entertainment", "Shopping"],
         "categoryListDetail": {"Entertainment": 800, "Shopping": 700}},
        {"uuid": str(uuid.uuid4()), "accountUuid": main, "name": "Mobility",
         "description": "Getting around the city", "amount": 600.0, "onlyThisMonth": False,
         "categoryList": ["Transport"], "categoryListDetail": {"Transport": 600}},
    ]
    await db.budgets.insert_many(budgets)

    ref = today.strftime("%Y-%m")
    last_day = calendar.monthrange(today.year, today.month)[1]
    plans = [
        ("Rent", 2200.0, 5, True), ("Electricity bill", 180.0, 10, True),
        ("Internet", 120.0, 12, False), ("Credit card", 1850.0, 15, False),
        ("Gym membership", 99.0, 8, True), ("Netflix", 55.9, 20, False),
        ("Car insurance", 320.0, 25, False),
    ]
    pdocs = []
    for item, amount, day, payed in plans:
        day = min(day, last_day)
        pdocs.append({
            "uuid": str(uuid.uuid4()), "accountUuid": main,
            "date": f"{ref}-{day:02d}", "item": item, "amount": amount,
            "payed": payed, "amountPayed": amount if payed else 0.0, "copiedOver": False,
        })
    await db.plannings.insert_many(pdocs)
    logger.info("Seeded database with demo data.")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
