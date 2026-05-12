"""AI Provider & Quiz Generation API routes."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Question, Subject, Topic
from engine.ai_providers import get_available_providers, reload_providers
from engine.teaching import generate_quiz
import random

router = APIRouter(prefix="/api/ai", tags=["AI"])


class QuizRequest(BaseModel):
    subject: str
    topic: str
    count: int = 5
    difficulty: str = "mixed"
    provider: str = "auto"


@router.get("/providers")
def list_providers():
    """List all available AI providers."""
    providers = get_available_providers()
    return {"providers": providers, "count": len(providers)}


@router.post("/providers/reload")
def refresh_providers():
    """Reload providers from .env."""
    reload_providers()
    providers = get_available_providers()
    return {"message": "Providers reloaded", "providers": providers, "count": len(providers)}


@router.post("/generate-quiz")
def generate_quiz_endpoint(data: QuizRequest, db: Session = Depends(get_db)):
    """Generate AI-powered quiz questions for a topic."""
    questions = generate_quiz(
        subject=data.subject,
        topic=data.topic,
        count=data.count,
        difficulty=data.difficulty,
        provider=data.provider
    )
    
    if not questions:
        return {"questions": [], "error": "Failed to generate questions. Try a different AI provider."}
    
    # Shuffle options for each question
    processed = []
    for q in questions:
        if not all(k in q for k in ["q", "a", "b", "c", "d", "ans"]):
            continue
        
        options = [
            ("A", q["a"]),
            ("B", q["b"]),
            ("C", q["c"]),
            ("D", q["d"])
        ]
        correct_key = q["ans"].upper()
        correct_val = q.get(correct_key.lower(), q["a"])
        
        random.shuffle(options)
        new_ans = "A"
        for i, (_, val) in enumerate(options):
            if val == correct_val:
                new_ans = ["A", "B", "C", "D"][i]
                break
        
        processed.append({
            "q": q["q"],
            "option_a": options[0][1],
            "option_b": options[1][1],
            "option_c": options[2][1],
            "option_d": options[3][1],
            "correct_answer": new_ans,
            "difficulty": q.get("diff", "medium"),
            "level": q.get("lvl", "ITI"),
            "type": q.get("type", "concept"),
            "explanation": q.get("exp", ""),
            "why_wrong": q.get("why_wrong", ""),
        })
        
        # Save to DB to organically grow the question bank
        try:
            # Find subject and topic IDs
            subject_obj = db.query(Subject).filter(Subject.name.ilike(f"%{data.subject}%")).first()
            topic_obj = None
            if subject_obj:
                topic_obj = db.query(Topic).filter(Topic.subject_id == subject_obj.id, Topic.name.ilike(f"%{data.topic}%")).first()
            
            new_db_question = Question(
                subject_id=subject_obj.id if subject_obj else None,
                topic_id=topic_obj.id if topic_obj else None,
                question_text=q["q"],
                option_a=options[0][1],
                option_b=options[1][1],
                option_c=options[2][1],
                option_d=options[3][1],
                correct_answer=new_ans,
                difficulty=q.get("diff", "medium"),
                exam_level=q.get("lvl", "ITI"),
                question_type=q.get("type", "concept"),
                explanation=q.get("exp", ""),
                why_others_wrong=q.get("why_wrong", ""),
                source="organic_quiz"
            )
            db.add(new_db_question)
        except Exception as e:
            print(f"Error saving AI question to DB: {e}")
            
    try:
        db.commit()
        print(f"DEBUG: AI-Generated Quiz Organically SAVED {len(processed)} new questions to Database for {data.topic}")
    except Exception as e:
        db.rollback()
        print(f"Failed to commit new questions: {e}")
    
    return {"questions": processed, "count": len(processed), "subject": data.subject, "topic": data.topic}
