# Gateway tests: Cognito JWT verification + read-only proxy to upstream My Expenses API.
# READ-ONLY: never call DELETE / POST / PUT against real data.
import os
import pytest
import requests
from pycognito import Cognito

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
POOL = "eu-north-1_SvrSoIYDY"
CLIENT = "2hsdfb6vb1fmq7p2apbucov6lq"
EMAIL = "arnaldotecadm@hotmail.com"
PWD = "ADMINar98"
T = 60


@pytest.fixture(scope="module")
def tokens():
    u = Cognito(POOL, CLIENT, username=EMAIL, user_pool_region="eu-north-1")
    u.authenticate(password=PWD)
    return {"id": u.id_token, "access": u.access_token}


@pytest.fixture(scope="module")
def auth(tokens):
    return {"Authorization": f"Bearer {tokens['id']}"}


@pytest.fixture(scope="module")
def accounts(auth):
    r = requests.get(f"{BASE_URL}/api/account", headers=auth, timeout=T)
    assert r.status_code == 200, r.text
    return r.json()


# Health / auth rejection
def test_health_no_token():
    r = requests.get(f"{BASE_URL}/api/health", timeout=T)
    assert r.status_code == 200 and r.json() == {"ok": True}


def test_account_no_token_401():
    assert requests.get(f"{BASE_URL}/api/account", timeout=T).status_code == 401


def test_account_invalid_token_401():
    r = requests.get(f"{BASE_URL}/api/account", headers={"Authorization": "Bearer abc.def.ghi"}, timeout=T)
    assert r.status_code == 401


def test_account_tampered_token_401(tokens):
    t = tokens["id"]
    bad = t[:-5] + ("AAAAA" if not t.endswith("AAAAA") else "BBBBB")
    r = requests.get(f"{BASE_URL}/api/account", headers={"Authorization": f"Bearer {bad}"}, timeout=T)
    assert r.status_code == 401


def test_access_token_rejected(tokens):
    r = requests.get(f"{BASE_URL}/api/me", headers={"Authorization": f"Bearer {tokens['access']}"}, timeout=T)
    assert r.status_code == 401


def test_me_no_token_401():
    assert requests.get(f"{BASE_URL}/api/me", timeout=T).status_code == 401


def test_delete_without_token_rejected():
    # gateway must reject before forwarding (no token => nothing reaches upstream)
    r = requests.delete(f"{BASE_URL}/api/statistics/user/records", timeout=T)
    assert r.status_code == 401


# Authenticated reads
def test_me_valid(auth):
    r = requests.get(f"{BASE_URL}/api/me", headers=auth, timeout=T)
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == EMAIL and isinstance(d["sub"], str) and d["sub"]


def test_accounts_real(accounts):
    assert isinstance(accounts, list) and len(accounts) >= 1
    assert any("activo" in str(a).lower() for a in accounts)
    assert all(a.get("uuid") or a.get("id") for a in accounts)


def _acc_uuid(accounts, needle):
    for a in accounts:
        if needle.lower() in str(a).lower():
            return a.get("uuid") or a.get("id")
    return None


def test_year_month_with_account(auth, accounts):
    uid = _acc_uuid(accounts, "Activo")
    r = requests.get(f"{BASE_URL}/api/transaction/yearMonth", params={"account": uid}, headers=auth, timeout=T)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list) and len(r.json()) > 0
    print("yearMonth sample:", r.json()[:3])


def test_year_month_bpi(auth, accounts):
    uid = _acc_uuid(accounts, "BPI")
    if not uid:
        pytest.skip("no BPI account")
    r = requests.get(f"{BASE_URL}/api/transaction/yearMonth", params={"account": uid}, headers=auth, timeout=T)
    assert r.status_code == 200 and isinstance(r.json(), list)


@pytest.mark.parametrize("path", [
    "/transaction/totals-grouped-by-month",
    "/transaction/summary-per-category",
    "/analise/graph-last-4-month",
    "/party/names",
    "/tag",
    "/planning",
])
def test_read_endpoints(auth, accounts, path):
    uid = _acc_uuid(accounts, "Activo")
    r = requests.get(f"{BASE_URL}/api{path}", params={"account": uid}, headers=auth, timeout=T)
    assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:200]}"
    assert isinstance(r.json(), (list, dict))


def test_statistics(auth):
    r = requests.get(f"{BASE_URL}/api/statistics/user/records", headers=auth, timeout=T)
    assert r.status_code == 200, r.text
    print("STATS:", r.json())
