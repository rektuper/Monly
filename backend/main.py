import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import (CORSMiddleware)
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers.auth import (router as auth_router)
from routers.admin import (router as admin_router)
from routers.transactions import (router as transactions_router)
from routers.categories import (router as categories_router)
from routers.imports import (router as imports_router)
from routers.analytics import (router as analytics_router)
from routers.ai_router import (router as ai_router)
from routers.recommendations import (router as recommendations_router)
from routers.goals import (router as goals_router)
from routers.profile import (router as profile_router)
from routers.families import (router as families_router)
from core.db_migrate import run_migrations

import models

app = FastAPI()

Base.metadata.create_all(bind=engine)
run_migrations(engine)

_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
_allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        _default_origins,
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(transactions_router)
app.include_router(categories_router)
app.include_router(imports_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(recommendations_router)
app.include_router(goals_router)
app.include_router(profile_router)
app.include_router(families_router)

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "avatars").mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads",
)


@app.get("/")
def root():
    return {
        "message": "API running"
    }