"""Main FastAPI application for the ITS system."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database.database import init_db, SessionLocal
from database.seed import seed_database
from api.syllabus import router as syllabus_router
from api.practice import router as practice_router
from api.progress import router as progress_router
from api.chat import router as chat_router
from api.ai import router as ai_router
import os
import asyncio
from engine.background import auto_generate_daily_questions

app = FastAPI(
    title="BTSC ITI Electronics Mechanic - AI Tutoring System",
    description="AI-powered Intelligent Tutoring System for BTSC ITI Instructor exam",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(syllabus_router)
app.include_router(practice_router)
app.include_router(progress_router)
app.include_router(chat_router)
app.include_router(ai_router)


@app.on_event("startup")
def startup():
    init_db()
    db = SessionLocal()
    try:
        seeded = seed_database(db)
        if seeded:
            print("Database seeded successfully!")
        else:
            print("Database already has data.")
    finally:
        db.close()
        
    # Start the background question generator task
    asyncio.create_task(auto_generate_daily_questions())


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "BTSC ITS", "version": "2.0.0"}


# Serve frontend static files if they exist
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
