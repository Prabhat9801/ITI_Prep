"""Progress & Analytics API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from engine.analytics import AnalyticsEngine
from engine.adaptive import AdaptiveEngine

router = APIRouter(prefix="/api/progress", tags=["Progress"])


@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    return AnalyticsEngine.get_overall_stats(db)


@router.get("/subjects")
def get_subject_progress(db: Session = Depends(get_db)):
    return AnalyticsEngine.get_subject_stats(db)


@router.get("/weak-areas")
def get_weak_areas(db: Session = Depends(get_db)):
    return AnalyticsEngine.get_weak_areas(db)


@router.get("/recent")
def get_recent(limit: int = 20, db: Session = Depends(get_db)):
    return AnalyticsEngine.get_recent_attempts(db, limit)


@router.get("/daily")
def get_daily(db: Session = Depends(get_db)):
    return AnalyticsEngine.get_daily_progress(db)


@router.get("/recommendation")
def get_recommendation(db: Session = Depends(get_db)):
    return AdaptiveEngine.get_topic_recommendation(db)


@router.get("/question-growth")
def get_question_growth(db: Session = Depends(get_db)):
    return AnalyticsEngine.get_question_growth(db)
