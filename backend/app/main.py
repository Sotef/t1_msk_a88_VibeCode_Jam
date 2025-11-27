from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.models.database import init_db, async_session_maker
from app.routers import interview, admin
from app.services.scibox_client import scibox_client
from app.services.auth import ensure_super_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Проверяем доступность внешних зависимостей до старта
    await scibox_client.check_health()
    await init_db()
    async with async_session_maker() as session:
        await ensure_super_admin(session)
    yield
    # Shutdown


app = FastAPI(
    title="Interview Platform API",
    description="AI-powered technical interview platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(interview.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"message": "Interview Platform API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
