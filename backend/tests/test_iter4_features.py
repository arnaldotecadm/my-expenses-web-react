"""Iteration 4: planning mark-paid/move (reschedule) persistence + settings stats (non-destructive)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
API = BASE_URL.rstrip("/") + "/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def acc(s):
    accs = s.get(f"{API}/account").json()
    assert accs, "no accounts"
    return accs[0]["uuid"]


@pytest.fixture
def ev(s, acc):
    r = s.post(f"{API}/planning", json={"item": "TEST_Bill", "amount": 123.45, "date": "2026-10-05",
                                         "payed": False, "amountPayed": 0, "accountUuid": acc})
    assert r.status_code == 200
    d = r.json()
    yield d
    s.delete(f"{API}/planning/{d['uuid']}")


# Mark as paid (full amount) persists
def test_mark_paid(s, ev):
    r = s.post(f"{API}/planning", json={**ev, "payed": True, "amountPayed": ev["amount"]})
    assert r.status_code == 200
    g = s.get(f"{API}/planning/{ev['uuid']}").json()
    assert g["payed"] is True and g["amountPayed"] == 123.45
    # unmark
    s.post(f"{API}/planning", json={**ev, "payed": False, "amountPayed": 0})
    g = s.get(f"{API}/planning/{ev['uuid']}").json()
    assert g["payed"] is False and g["amountPayed"] == 0


# Reschedule (move date) keeps same uuid, no duplicate
def test_move(s, ev, acc):
    s.post(f"{API}/planning", json={**ev, "date": "2026-10-20"})
    g = s.get(f"{API}/planning/{ev['uuid']}").json()
    assert g["date"] == "2026-10-20"
    allp = s.get(f"{API}/planning", params={"account": acc}).json()
    assert len([p for p in allp if p["uuid"] == ev["uuid"]]) == 1


# Settings stats structure and consistency
def test_stats(s, acc):
    d = s.get(f"{API}/statistics/user/records", params={"account": acc}).json()
    for k in ["totalTransactions", "totalAccounts", "totalPlannings", "totalBudgets",
              "totalCategories", "totalTags", "totalIncome", "totalExpense"]:
        assert k in d
    assert d["totalAccounts"] == len(s.get(f"{API}/account").json())
    assert d["totalPlannings"] == len(s.get(f"{API}/planning", params={"account": "all"}).json())
    assert d["totalTransactions"] > 0
