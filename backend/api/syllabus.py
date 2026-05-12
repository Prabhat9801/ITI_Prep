"""Syllabus API routes - serves full syllabus with clickable topics."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Subject, Topic, Subtopic, StudyPlan
from engine.teaching import teach_topic
import json
import os

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus"])

# Load syllabus.json for rich topic data
_syllabus_json = None
def _load_syllabus_json():
    global _syllabus_json
    if _syllabus_json is None:
        syllabus_path = os.path.join(os.path.dirname(__file__), "..", "data", "syllabus.json")
        if os.path.exists(syllabus_path):
            with open(syllabus_path, 'r', encoding='utf-8') as f:
                _syllabus_json = json.load(f)
        else:
            _syllabus_json = {"syllabus": []}
    return _syllabus_json


@router.get("/subjects")
def get_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).order_by(Subject.order_index).all()
    return [{"id": s.id, "name": s.name, "name_hi": s.name_hi, "icon": s.icon,
             "color": s.color, "total_questions": s.total_questions} for s in subjects]


@router.get("/subjects/{subject_id}/topics")
def get_topics(subject_id: int, db: Session = Depends(get_db)):
    topics = db.query(Topic).filter(Topic.subject_id == subject_id).order_by(Topic.order_index).all()
    result = []
    for t in topics:
        subtopics = db.query(Subtopic).filter(Subtopic.topic_id == t.id).order_by(Subtopic.order_index).all()
        result.append({
            "id": t.id, "name": t.name, "name_hi": t.name_hi, "day": t.day_number,
            "subtopics": [{"id": st.id, "name": st.name, "name_hi": st.name_hi} for st in subtopics]
        })
    return result


@router.get("/topic/{topic_id}")
def get_topic_detail(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return {"error": "Topic not found"}
    subtopics = db.query(Subtopic).filter(Subtopic.topic_id == topic.id).all()
    subject = db.query(Subject).filter(Subject.id == topic.subject_id).first()
    return {
        "id": topic.id, "name": topic.name, "name_hi": topic.name_hi,
        "subject": {"id": subject.id, "name": subject.name, "icon": subject.icon, "color": subject.color} if subject else None,
        "day": topic.day_number,
        "subtopics": [{"id": st.id, "name": st.name, "name_hi": st.name_hi} for st in subtopics]
    }


@router.get("/teach/{topic_id}")
def teach(topic_id: int, level: str = "basic", provider: str = "auto", db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return {"error": "Topic not found"}
    content = teach_topic(topic.name, level, provider=provider)
    return {"topic": topic.name, "topic_hi": topic.name_hi, "level": level, "content": content}


@router.get("/study-plan")
def get_study_plan(db: Session = Depends(get_db)):
    plans = db.query(StudyPlan).order_by(StudyPlan.day_number).all()
    return [{
        "day": p.day_number, "title": p.title, "title_hi": p.title_hi,
        "type": p.plan_type, "target_questions": p.target_questions,
        "target_accuracy": p.target_accuracy, "is_completed": p.is_completed,
        "actual_accuracy": p.actual_accuracy
    } for p in plans]


@router.get("/full")
def get_full_syllabus(db: Session = Depends(get_db)):
    """Return the complete syllabus with database IDs for accurate AI matching."""
    subjects = db.query(Subject).order_by(Subject.order_index).all()
    result = []
    for s in subjects:
        units = []
        topics_list = db.query(Topic).filter(Topic.subject_id == s.id).order_by(Topic.order_index).all()
        for t in topics_list:
            subtopics = db.query(Subtopic).filter(Subtopic.topic_id == t.id).order_by(Subtopic.order_index).all()
            if subtopics:
                # Map to 'units' structure: Unit name is Topic name, topics are Subtopic names
                units.append({
                    "unit_title": t.name,
                    "unit_id": t.id,
                    "topics": [st.name for st in subtopics],
                    "topic_details": [{"id": st.id, "name": st.name} for st in subtopics]
                })
            else:
                # No subtopics, treat the topic as a standalone item
                units.append({
                    "unit_title": t.name,
                    "unit_id": t.id,
                    "topics": [t.name],
                    "topic_details": [{"id": None, "name": t.name}]
                })
        
        result.append({
            "subject_id": s.id,
            "subject_name": s.name,
            "name_hi": s.name_hi,
            "icon": s.icon,
            "color": s.color,
            "units": units if units else None,
            "topics": [t.name for t in topics_list] if not units else None
        })
    return {"syllabus": result}


@router.get("/subject-topics/{subject_name}")
def get_subject_topics_from_json(subject_name: str):
    """Get detailed topics for a subject from syllabus.json."""
    data = _load_syllabus_json()
    for subj in data.get("syllabus", []):
        if subj.get("subject_name", "").lower() == subject_name.lower():
            return subj
    # Fuzzy match
    for subj in data.get("syllabus", []):
        if subject_name.lower() in subj.get("subject_name", "").lower():
            return subj
    return {"subject_name": subject_name, "topics": [], "units": []}


@router.get("/teach-topic")
def teach_topic_by_name(subject: str, topic: str, level: str = "basic", provider: str = "auto"):
    """Teach a specific topic by name (from syllabus.json)."""
    content = teach_topic(f"{topic} (Subject: {subject})", level, provider=provider)
    return {"subject": subject, "topic": topic, "level": level, "content": content}
