"""
VibeCode Jam Runner Service
Service for executing user code in isolated Docker containers
"""

from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="VibeCode Jam Runner",
    description="Code execution service with Docker isolation",
    version="0.1.0"
)

@app.get("/")
async def root():
    return {"message": "VibeCode Jam Runner", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# TODO: Implement code execution endpoints
# @app.post("/run")
# async def run_code(request: RunCodeRequest):
#     ...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

