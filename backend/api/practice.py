"""Questions & Practice API routes."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Question, Attempt, PracticeSession, StudentProgress, MockTestResult, MockTestAnswer, WeakAreaLog, Subject, Topic
from engine.adaptive import AdaptiveEngine
from engine.teaching import explain_answer
from datetime import datetime
import json

router = APIRouter(prefix="/api/practice", tags=["Practice"])


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: str
    time_taken: int = 0


class SessionCreate(BaseModel):
    subject_id: int | None = None
    topic_id: int | None = None
    difficulty: str | None = None
    count: int = 10
    session_type: str = "practice"


class MockTestSubmit(BaseModel):
    total_questions: int = 100
    attempted: int = 0
    correct: int = 0
    wrong: int = 0
    skipped: int = 0
    raw_score: float = 0.0
    percentage: float = 0.0
    merit_score: float = 0.0
    category: str = "General"
    category_threshold: float = 40.0
    is_passed: bool = False
    time_taken_seconds: int = 0
    answers: list = []  # List of per-question answer dicts


@router.post("/start-session")
def start_session(data: SessionCreate, db: Session = Depends(get_db)):
    questions = AdaptiveEngine.select_questions(
        db, topic_id=data.topic_id, subject_id=data.subject_id,
        difficulty=data.difficulty, count=data.count
    )
    if not questions:
        return {"error": "No questions found", "questions": []}

    q_ids = [q.id for q in questions]
    session = PracticeSession(
        session_type=data.session_type,
        subject_id=data.subject_id,
        topic_id=data.topic_id,
        total_questions=len(questions),
        difficulty=data.difficulty or "mixed",
        question_ids=json.dumps(q_ids)
    )
    db.add(session)
    db.commit()

    return {
        "session_id": session.id,
        "total": len(questions),
        "questions": [{
            "id": q.id, "question": q.question_text,
            "option_a": q.option_a, "option_b": q.option_b,
            "option_c": q.option_c, "option_d": q.option_d,
            "difficulty": q.difficulty, "level": q.exam_level,
            "type": q.question_type
        } for q in questions]
    }


@router.get("/mock-test")
def start_mock_test(db: Session = Depends(get_db)):
    """Fetch 100 random questions for the full mock test and shuffle options."""
    import random
    questions = db.query(Question).order_by(func.random()).limit(100).all()
    if not questions:
        return {"error": "No questions found", "questions": []}
        
    shuffled_questions = []
    for q in questions:
        options = [
            ("A", q.option_a),
            ("B", q.option_b),
            ("C", q.option_c),
            ("D", q.option_d)
        ]
        correct_val = getattr(q, f"option_{q.correct_answer.lower()}")
        
        random.shuffle(options)
        new_ans = "A"
        for i, (_, val) in enumerate(options):
            if val == correct_val:
                new_ans = ["A", "B", "C", "D"][i]
                break
                
        shuffled_questions.append({
            "id": q.id, 
            "question": q.question_text,
            "option_a": options[0][1], 
            "option_b": options[1][1],
            "option_c": options[2][1], 
            "option_d": options[3][1],
            "correct_answer": new_ans, # We send it to frontend since frontend calculates the score locally at the end of the 120 mins
            "difficulty": q.difficulty, 
            "level": q.exam_level,
            "type": q.question_type,
            "subject_id": q.subject_id
        })
        
    return {
        "total": len(shuffled_questions),
        "questions": shuffled_questions
    }


@router.post("/submit-answer")
def submit_answer(data: AnswerSubmit, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == data.question_id).first()
    if not question:
        return {"error": "Question not found"}

    is_correct = data.selected_answer.upper() == question.correct_answer.upper()

    attempt = Attempt(
        question_id=question.id,
        selected_answer=data.selected_answer.upper(),
        is_correct=is_correct,
        time_taken_seconds=data.time_taken
    )
    db.add(attempt)

    AdaptiveEngine.update_progress(
        db, question.id, is_correct, data.time_taken,
        question.topic_id, question.subject_id
    )

    return {
        "is_correct": is_correct,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation or "",
        "why_others_wrong": question.why_others_wrong or "",
        "selected": data.selected_answer.upper()
    }


@router.get("/questions")
def get_questions(subject_id: int = None, topic_id: int = None,
                  difficulty: str = None, limit: int = 10,
                  db: Session = Depends(get_db)):
    query = db.query(Question)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if topic_id:
        query = query.filter(Question.topic_id == topic_id)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    
    questions = query.order_by(Question.times_shown.asc()).limit(limit).all()
    return [{
        "id": q.id, "question": q.question_text,
        "option_a": q.option_a, "option_b": q.option_b,
        "option_c": q.option_c, "option_d": q.option_d,
        "difficulty": q.difficulty, "level": q.exam_level, "type": q.question_type
    } for q in questions]


@router.get("/question-count")
def get_question_count(db: Session = Depends(get_db)):
    total = db.query(Question).count()
    by_diff = {}
    for d in ["easy", "medium", "hard"]:
        by_diff[d] = db.query(Question).filter(Question.difficulty == d).count()
    return {"total": total, "by_difficulty": by_diff}


@router.post("/mock-test/submit")
def submit_mock_test(data: MockTestSubmit, db: Session = Depends(get_db)):
    """Save mock test result with per-question answers and weak area analysis."""
    result = MockTestResult(
        total_questions=data.total_questions,
        attempted=data.attempted,
        correct=data.correct,
        wrong=data.wrong,
        skipped=data.skipped,
        raw_score=data.raw_score,
        percentage=data.percentage,
        merit_score=data.merit_score,
        category=data.category,
        category_threshold=data.category_threshold,
        is_passed=data.is_passed,
        time_taken_seconds=data.time_taken_seconds
    )
    db.add(result)
    db.flush()  # Get the ID before committing
    print(f"DEBUG: Saving Mock Test Result (ID: {result.id}) - Score: {data.percentage}%")
    
    # Save per-question answers
    topic_stats = {}  # {topic_name: {total: 0, correct: 0, subject_name: ''}}
    for ans in data.answers:
        # Look up subject and topic names from question ID
        subject_name = ans.get('subject_name', '')
        topic_name = ans.get('topic_name', '')
        if not subject_name and ans.get('question_id'):
            q = db.query(Question).filter(Question.id == ans['question_id']).first()
            if q:
                subj = db.query(Subject).filter(Subject.id == q.subject_id).first()
                topic = db.query(Topic).filter(Topic.id == q.topic_id).first()
                subject_name = subj.name if subj else ''
                topic_name = topic.name if topic else ''
        
        mock_answer = MockTestAnswer(
            mock_test_id=result.id,
            question_id=ans.get('question_id'),
            question_text=ans.get('question_text', ''),
            option_a=ans.get('option_a', ''),
            option_b=ans.get('option_b', ''),
            option_c=ans.get('option_c', ''),
            option_d=ans.get('option_d', ''),
            selected_answer=ans.get('selected_answer', 'skipped'),
            correct_answer=ans.get('correct_answer', ''),
            is_correct=ans.get('is_correct', False),
            explanation=ans.get('explanation', ''),
            why_others_wrong=ans.get('why_others_wrong', ''),
            subject_name=subject_name,
            topic_name=topic_name
        )
        db.add(mock_answer)
        
        # Aggregate topic-level stats for weak area analysis
        key = topic_name or 'General'
        if key not in topic_stats:
            topic_stats[key] = {'total': 0, 'correct': 0, 'subject_name': subject_name, 'topic_name': topic_name}
        topic_stats[key]['total'] += 1
        if ans.get('is_correct'):
            topic_stats[key]['correct'] += 1
        
    print(f"DEBUG: Saved {len(data.answers)} detailed answers for Mock Test {result.id}")
    
    # Analyze weak areas from this test and log evolution
    for t_name, stats in topic_stats.items():
        if stats['total'] == 0:
            continue
        acc = round((stats['correct'] / stats['total']) * 100, 1)
        
        # Determine status by checking previous logs
        prev_logs = db.query(WeakAreaLog).filter(
            WeakAreaLog.topic_name == t_name
        ).order_by(WeakAreaLog.created_at.desc()).limit(1).all()
        
        if acc >= 70:
            status = 'strong'
        elif prev_logs and prev_logs[0].accuracy_at_test < acc:
            status = 'improving'
        elif acc < 50:
            status = 'weak'
        else:
            status = 'improving'
        
        log = WeakAreaLog(
            topic_name=t_name,
            subject_name=stats['subject_name'],
            mock_test_id=result.id,
            accuracy_at_test=acc,
            total_in_test=stats['total'],
            correct_in_test=stats['correct'],
            status=status
        )
        db.add(log)
        print(f"DEBUG: WeakArea Evolution Logged - Topic: {t_name}, Acc: {acc}%, Status: {status}")
    
    db.commit()
    print(f"DEBUG: Mock Test {result.id} FULLY COMMITTED to Database.")
    return {"message": "Mock test saved with details", "id": result.id}


@router.get("/mock-test/history")
def get_mock_test_history(limit: int = 20, db: Session = Depends(get_db)):
    """Get mock test history for the student."""
    results = db.query(MockTestResult).order_by(MockTestResult.created_at.desc()).limit(limit).all()
    return [{
        "id": r.id,
        "total_questions": r.total_questions,
        "attempted": r.attempted,
        "correct": r.correct,
        "wrong": r.wrong,
        "skipped": r.skipped,
        "raw_score": r.raw_score,
        "percentage": r.percentage,
        "merit_score": r.merit_score,
        "category": r.category,
        "category_threshold": r.category_threshold,
        "is_passed": r.is_passed,
        "time_taken_seconds": r.time_taken_seconds,
        "date": r.created_at.isoformat() if r.created_at else ""
    } for r in results]


@router.get("/mock-test/{test_id}/detail")
def get_mock_test_detail(test_id: int, db: Session = Depends(get_db)):
    """Get per-question detail of a specific mock test."""
    result = db.query(MockTestResult).filter(MockTestResult.id == test_id).first()
    if not result:
        return {"error": "Test not found"}
    
    answers = db.query(MockTestAnswer).filter(MockTestAnswer.mock_test_id == test_id).all()
    
    return {
        "id": result.id,
        "total_questions": result.total_questions,
        "correct": result.correct,
        "wrong": result.wrong,
        "skipped": result.skipped,
        "raw_score": result.raw_score,
        "percentage": result.percentage,
        "merit_score": result.merit_score,
        "category": result.category,
        "is_passed": result.is_passed,
        "time_taken_seconds": result.time_taken_seconds,
        "date": result.created_at.isoformat() if result.created_at else "",
        "answers": [{
            "question_id": a.question_id,
            "question_text": a.question_text,
            "option_a": a.option_a,
            "option_b": a.option_b,
            "option_c": a.option_c,
            "option_d": a.option_d,
            "selected_answer": a.selected_answer,
            "correct_answer": a.correct_answer,
            "is_correct": a.is_correct,
            "explanation": a.explanation,
            "why_others_wrong": a.why_others_wrong,
            "subject_name": a.subject_name,
            "topic_name": a.topic_name
        } for a in answers]
    }


@router.get("/weak-area-evolution")
def get_weak_area_evolution(db: Session = Depends(get_db)):
    """Get weak area evolution across all mock tests. Shows improvement over time."""
    # Get all unique topic names from logs
    all_topics = db.query(WeakAreaLog.topic_name).distinct().all()
    
    evolution = []
    for (topic_name,) in all_topics:
        logs = db.query(WeakAreaLog).filter(
            WeakAreaLog.topic_name == topic_name
        ).order_by(WeakAreaLog.created_at.asc()).all()
        
        if not logs:
            continue
        
        first_acc = logs[0].accuracy_at_test
        latest_acc = logs[-1].accuracy_at_test
        latest_status = logs[-1].status
        
        # Calculate overall trend
        if latest_acc >= 70:
            overall_status = 'strong'
        elif latest_acc > first_acc:
            overall_status = 'improving'
        else:
            overall_status = 'weak'
        
        evolution.append({
            "topic_name": topic_name,
            "subject_name": logs[-1].subject_name,
            "first_accuracy": first_acc,
            "latest_accuracy": latest_acc,
            "improvement": round(latest_acc - first_acc, 1),
            "status": overall_status,
            "tests_appeared": len(logs),
            "history": [{
                "mock_test_id": l.mock_test_id,
                "accuracy": l.accuracy_at_test,
                "total": l.total_in_test,
                "correct": l.correct_in_test,
                "status": l.status,
                "date": l.created_at.isoformat() if l.created_at else ""
            } for l in logs]
        })
    
    # Sort: weak first, then improving, then strong
    status_order = {'weak': 0, 'improving': 1, 'strong': 2}
    evolution.sort(key=lambda x: (status_order.get(x['status'], 1), x['latest_accuracy']))
    
    return evolution
