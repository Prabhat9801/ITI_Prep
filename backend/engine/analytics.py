"""Analytics engine for performance tracking."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.models import StudentProgress, Attempt, Question, Subject, Topic


class AnalyticsEngine:

    @staticmethod
    def get_overall_stats(db: Session) -> dict:
        total_attempted = db.query(func.sum(StudentProgress.total_questions_attempted)).scalar() or 0
        total_correct = db.query(func.sum(StudentProgress.correct_answers)).scalar() or 0
        accuracy = round((total_correct / total_attempted * 100), 1) if total_attempted > 0 else 0
        total_time = db.query(func.sum(StudentProgress.time_spent_seconds)).scalar() or 0
        
        weak_count = db.query(StudentProgress).filter(StudentProgress.is_weak_area == True).count()
        strong_count = db.query(StudentProgress).filter(StudentProgress.accuracy >= 75).count()
        
        total_db_questions = db.query(Question).count()
        
        return {
            "total_attempted": int(total_attempted),
            "total_correct": int(total_correct),
            "overall_accuracy": accuracy,
            "total_time_minutes": round(total_time / 60, 1),
            "weak_areas": weak_count,
            "strong_areas": strong_count,
            "total_db_questions": total_db_questions,
            "mastery_avg": round(
                db.query(func.avg(StudentProgress.mastery_score)).scalar() or 0, 1
            )
        }

    @staticmethod
    def get_subject_stats(db: Session) -> list:
        subjects = db.query(Subject).order_by(Subject.order_index).all()
        result = []
        for subj in subjects:
            progress = db.query(StudentProgress).filter(
                StudentProgress.subject_id == subj.id
            ).all()
            total_q = sum(p.total_questions_attempted for p in progress)
            total_c = sum(p.correct_answers for p in progress)
            acc = round((total_c / total_q * 100), 1) if total_q > 0 else 0
            mastery = round(sum(p.mastery_score for p in progress) / len(progress), 1) if progress else 0
            
            result.append({
                "id": subj.id,
                "name": subj.name,
                "name_hi": subj.name_hi,
                "icon": subj.icon,
                "color": subj.color,
                "total_attempted": total_q,
                "correct": total_c,
                "accuracy": acc,
                "mastery": mastery,
                "total_available": db.query(Question).filter(Question.subject_id == subj.id).count()
            })
        return result

    @staticmethod
    def get_weak_areas(db: Session) -> list:
        weak = db.query(StudentProgress).filter(
            StudentProgress.is_weak_area == True
        ).all()
        result = []
        for w in weak:
            topic = db.query(Topic).filter(Topic.id == w.topic_id).first()
            if topic:
                result.append({
                    "topic_id": w.topic_id,
                    "topic_name": topic.name,
                    "topic_name_hi": topic.name_hi,
                    "accuracy": w.accuracy,
                    "attempted": w.total_questions_attempted,
                    "mastery": w.mastery_score
                })
        return result

    @staticmethod
    def get_recent_attempts(db: Session, limit: int = 20) -> list:
        attempts = db.query(Attempt).order_by(Attempt.created_at.desc()).limit(limit).all()
        result = []
        for a in attempts:
            q = db.query(Question).filter(Question.id == a.question_id).first()
            result.append({
                "id": a.id,
                "question": q.question_text[:80] + "..." if q and len(q.question_text) > 80 else (q.question_text if q else ""),
                "selected": a.selected_answer,
                "correct": q.correct_answer if q else "",
                "is_correct": a.is_correct,
                "time_taken": a.time_taken_seconds,
                "date": a.created_at.isoformat() if a.created_at else ""
            })
        return result

    @staticmethod
    def get_daily_progress(db: Session) -> list:
        from datetime import datetime, timedelta
        result = []
        for i in range(15):
            day = datetime.now() - timedelta(days=14 - i)
            day_start = day.replace(hour=0, minute=0, second=0)
            day_end = day.replace(hour=23, minute=59, second=59)
            
            attempts = db.query(Attempt).filter(
                Attempt.created_at >= day_start,
                Attempt.created_at <= day_end
            ).all()
            
            total = len(attempts)
            correct = sum(1 for a in attempts if a.is_correct)
            
            result.append({
                "date": day.strftime("%d %b"),
                "total": total,
                "correct": correct,
                "accuracy": round((correct / total * 100), 1) if total > 0 else 0
            })
        return result

    @staticmethod
    def get_question_growth(db: Session) -> list:
        from datetime import datetime, timedelta
        result = []
        for i in range(15):
            day = datetime.now() - timedelta(days=14 - i)
            day_start = day.replace(hour=0, minute=0, second=0)
            day_end = day.replace(hour=23, minute=59, second=59)
            
            # Count by source
            sources = ['manual', 'background_gen', 'organic_quiz']
            counts = {}
            for s in sources:
                counts[s] = db.query(Question).filter(
                    Question.created_at >= day_start,
                    Question.created_at <= day_end,
                    Question.source == s
                ).count()
            
            total_today = sum(counts.values())
            
            result.append({
                "date": day.strftime("%d %b"),
                "total": total_today,
                "background": counts['background_gen'],
                "organic": counts['organic_quiz'],
                "manual": counts['manual']
            })
        return result
