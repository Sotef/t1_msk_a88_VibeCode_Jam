"""
VibeCode Jam Backend API
FastAPI application for technical interview platform
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="VibeCode Jam API",
    description="API for technical interview platform with AI interviewer",
    version="0.1.0"
)

# CORS middleware
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "VibeCode Jam API", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# TODO: Import and include routers
# from api import interviews, chat, anti_cheat, reports
# app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
# app.include_router(chat.router, prefix="/api/interviews", tags=["chat"])
# app.include_router(anti_cheat.router, prefix="/api/interviews", tags=["anti-cheat"])
# app.include_router(reports.router, prefix="/api/interviews", tags=["reports"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

