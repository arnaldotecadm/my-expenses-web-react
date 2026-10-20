import os
import logging
from pathlib import Path
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).parent / ".env")

REGION = os.environ["COGNITO_REGION"]
POOL_ID = os.environ["COGNITO_USER_POOL_ID"]
CLIENT_ID = os.environ["COGNITO_APP_CLIENT_ID"]
UPSTREAM = os.environ["UPSTREAM_API_URL"].rstrip("/")
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}"

jwks = PyJWKClient(f"{ISSUER}/.well-known/jwks.json", cache_jwk_set=True, lifespan=300)
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger("gateway")
logging.basicConfig(level=logging.INFO)

app = FastAPI()
api = APIRouter(prefix="/api")
http = httpx.AsyncClient(timeout=60)


def unauthorized(detail="Invalid authentication credentials"):
    return HTTPException(401, detail, headers={"WWW-Authenticate": "Bearer"})


def current_claims(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict[str, Any]:
    if not creds or creds.scheme.lower() != "bearer":
        raise unauthorized()
    try:
        key = jwks.get_signing_key_from_jwt(creds.credentials)
        claims = jwt.decode(
            creds.credentials, key.key, algorithms=["RS256"], audience=CLIENT_ID, issuer=ISSUER,
            options={"require": ["exp", "iss", "aud", "sub", "token_use"]},
        )
    except jwt.PyJWTError as exc:
        raise unauthorized() from exc
    if claims.get("token_use") != "id":
        raise unauthorized("ID token required")
    return claims


@api.get("/health")
async def health():
    return {"ok": True}


@api.get("/me")
async def me(claims: dict = Depends(current_claims)):
    return {"sub": claims["sub"], "email": claims.get("email"), "groups": claims.get("cognito:groups", [])}


@api.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(path: str, request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer),
                claims: dict = Depends(current_claims)):
    params = dict(request.query_params)
    headers = {"Authorization": f"Bearer {creds.credentials}"}
    account = params.pop("account", None)
    if account:
        headers["selectedAccount"] = account
    if ct := request.headers.get("content-type"):
        headers["Content-Type"] = ct
    body = await request.body()
    try:
        r = await http.request(request.method, f"{UPSTREAM}/{path}", params=params, headers=headers,
                               content=body or None)
    except httpx.HTTPError as exc:
        logger.error("Upstream error %s %s: %s", request.method, path, exc)
        raise HTTPException(502, "Upstream API unavailable") from exc
    return Response(content=r.content, status_code=r.status_code,
                    media_type=r.headers.get("content-type", "application/json"))


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    await http.aclose()
