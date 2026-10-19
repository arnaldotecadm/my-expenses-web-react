# Regression tests for My Expenses mock API (accounts, transactions, analysis, category, party, tag, planning, import)
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def main_acc(s):
    accs = s.get(f"{API}/account").json()
    m = [a for a in accs if a["label"] == "Main Account"]
    assert m, accs
    return m[0]["uuid"]


@pytest.fixture(scope="session")
def refs(s, main_acc):
    return s.get(f"{API}/transaction/yearMonth", params={"account": main_acc}).json()


# Accounts
def test_accounts(s):
    r = s.get(f"{API}/account")
    assert r.status_code == 200
    labels = [a["label"] for a in r.json()]
    assert "Main Account" in labels and "Savings" in labels
    assert all("_id" not in a for a in r.json())


# Transactions
def test_all_with_summary(s, main_acc):
    r = s.get(f"{API}/transaction/all-with-summary", params={"account": main_acc})
    assert r.status_code == 200
    d = r.json()
    assert len(d) >= 8
    g = d[0]
    assert set(g["summaryDTO"]) >= {"month", "opening", "income", "expense", "total"}
    # running balance consistency
    for i in range(len(d) - 1):
        assert abs(d[i]["summaryDTO"]["opening"] - d[i + 1]["summaryDTO"]["total"]) < 0.02
    sd = g["summaryDTO"]
    assert abs(sd["opening"] + sd["income"] + sd["expense"] - sd["total"]) < 0.02


def test_accounts_differ(s, main_acc):
    accs = s.get(f"{API}/account").json()
    sav = [a for a in accs if a["label"] == "Savings"][0]["uuid"]
    a = s.get(f"{API}/transaction/totals-grouped-by-month", params={"account": main_acc}).json()
    b = s.get(f"{API}/transaction/totals-grouped-by-month", params={"account": sav}).json()
    assert a != b


def test_summary_per_category(s, main_acc):
    d = s.get(f"{API}/transaction/summary-per-category", params={"account": main_acc}).json()
    assert d and "label" in d[0] and len(d[0]["values"]) == 6


def test_year_month(s, refs):
    assert refs == sorted(refs, reverse=True)
    assert all(re.match(r"^\d{4}-\d{2}$", r) for r in refs)


# Analysis
def test_current_month(s, main_acc, refs):
    d = s.get(f"{API}/analise/current-month", params={"account": main_acc}).json()
    assert d["reference"] == refs[0]
    y, m = refs[0].split("-")
    d2 = s.get(f"{API}/analise/month-analysis/{y}/{int(m)}", params={"account": main_acc}).json()
    assert d2["income"] == d["income"] and d2["expense"] == d["expense"]
    d3 = s.get(f"{API}/analise/current-month/{y}/{int(m)}", params={"account": main_acc}).json()
    assert d3["income"] == d["income"]
    assert abs(sum(w["expense"] for w in d["perWeekList"]) - d["expense"]) < 0.05


def test_last4(s, main_acc):
    d = s.get(f"{API}/analise/graph-last-4-month", params={"account": main_acc}).json()
    assert len(d) == 4 and set(d[0]) == {"month", "income", "expense"}


def test_comparison(s, main_acc, refs):
    d = s.get(f"{API}/analise/month-analysis-comparison/{refs[0]}/{refs[1]}", params={"account": main_acc}).json()
    assert d and set(d[0]) == {"categoryName", "amount", "lastMonthAmount"}


# Category
def test_category_chart(s, main_acc, refs):
    y, m = refs[0].split("-")
    d = s.get(f"{API}/category/chart/{y}/{int(m)}", params={"account": main_acc}).json()
    assert d
    for c in d:
        assert abs(sum(x["amount"] for x in c["subCategoryList"]) - c["amount"]) < 0.05
    cats = s.get(f"{API}/category", params={"account": main_acc}).json()
    assert {"name": "Salary"} in cats


# Parties & Tags
def test_party(s, main_acc):
    names = s.get(f"{API}/party/names", params={"account": main_acc}).json()
    assert "TechCorp Ltda" in names
    d = s.get(f"{API}/party/TechCorp Ltda", params={"account": main_acc}).json()
    assert d["qtyTransactions"] >= 8 and d["amount"] > 0


def test_tags(s, main_acc):
    tags = s.get(f"{API}/tag", params={"account": main_acc}).json()
    assert "Essential" in tags
    d = s.get(f"{API}/tag/Essential", params={"account": main_acc}).json()
    assert d["qtyTransactions"] == len(d["transactionList"]) and d["amount"] < 0


# Planning CRUD
def test_planning_crud(s, main_acc):
    body = {"accountUuid": main_acc, "date": "2026-10-28", "item": "TEST_bill", "amount": 77.5, "payed": False}
    c = s.post(f"{API}/planning", json=body).json()
    uid = c["uuid"]
    g = s.get(f"{API}/planning/{uid}").json()
    assert g["item"] == "TEST_bill" and g["amount"] == 77.5
    c["payed"] = True
    c["amountPayed"] = 77.5
    s.post(f"{API}/planning", json=c)
    assert s.get(f"{API}/planning/{uid}").json()["payed"] is True
    summ = s.get(f"{API}/planning/2026-10-01/2026-10-31", params={"account": main_acc}).json()
    assert set(summ) == {"planned", "alreadyPayed", "notPayed"}
    s.delete(f"{API}/planning/{uid}")
    assert s.get(f"{API}/planning/{uid}").json() == {}


def test_planning_validation(s):
    r = s.post(f"{API}/planning", json={"item": "x"})
    assert r.status_code == 422


def test_copy_over_and_clean(s, main_acc):
    r = s.put(f"{API}/planning/copy-over/2026-10", params={"account": main_acc})
    assert r.status_code == 200 and "Copied" in r.json()["message"]
    r2 = s.delete(f"{API}/planning/clean-up/2026-11", params={"account": main_acc})
    assert r2.status_code == 200 and "Removed" in r2.json()["message"]
    left = [p for p in s.get(f"{API}/planning", params={"account": main_acc}).json()
            if p["date"].startswith("2026-11") and p.get("copiedOver")]
    assert left == []


# Import
def test_parse_and_save(s):
    payload = '{"label":"TEST_Imported","openingBalance":100,"transactions":[{"date":"2026-10-03","payee":"TEST_Shop","category":"Food:Groceries","amount":-50,"tags":["TEST"]}]}'
    p = s.post(f"{API}/upload/parse/test.json", data=payload, headers={"Content-Type": "application/json"}).json()
    assert p["label"] == "TEST_Imported" and len(p["transactions"]) == 1
    r = s.post(f"{API}/account", json=p).json()
    assert "1 transactions" in r["message"]
    acc = [a for a in s.get(f"{API}/account").json() if a["label"] == "TEST_Imported"][-1]
    txs = s.get(f"{API}/transaction/all-with-summary", params={"account": acc["uuid"]}).json()
    t = txs[0]["transactionList"][0]
    assert t["category"] == "Food" and t["subCategory"] == "Groceries"


def test_import_missing_date_does_not_break(s):
    # Transactions with missing date would crash ref_of() on every endpoint
    r = s.post(f"{API}/account", json={"label": "TEST_NoDate", "transactions": [{"payee": "x", "amount": -1}]})
    accs = s.get(f"{API}/account").json()
    acc = [a for a in accs if a["label"] == "TEST_NoDate"][-1]["uuid"]
    g = s.get(f"{API}/transaction/all-with-summary", params={"account": acc})
    assert r.status_code in (400, 422) or g.status_code == 200


def test_stats(s, main_acc):
    d = s.get(f"{API}/statistics/user/records", params={"account": main_acc}).json()
    assert d["totalTransactions"] > 0
