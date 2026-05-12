"""Adaptive Learning Engine - adjusts difficulty based on student performance."""
from sqlalchemy.orm import Session
from database.models import StudentProgress, Question, Attempt
from sqlalchemy import func


class AdaptiveEngine:
    """Core adaptive learning engine that adjusts to student performance."""

    @staticmethod
    def get_next_difficulty(accuracy: float) -> str:
        if accuracy < 50:
            return "easy"
        elif accuracy < 75:
            return "medium"
        else:
            return "hard"

    @staticmethod
    def get_next_level(accuracy: float, current_level: str) -> str:
        levels = ["ITI", "Diploma", "B.Tech"]
        idx = levels.index(current_level) if current_level in levels else 0
        if accuracy > 80 and idx < 2:
            return levels[idx + 1]
        elif accuracy < 40 and idx > 0:
            return levels[idx - 1]
        return current_level

    @staticmethod
    def calculate_mastery(total_attempted: int, correct: int, streak: int) -> float:
        if total_attempted == 0:
            return 0.0
        accuracy = (correct / total_attempted) * 100
        streak_bonus = min(streak * 2, 20)
        volume_bonus = min(total_attempted * 0.5, 15)
        mastery = min(accuracy * 0.65 + streak_bonus + volume_bonus, 100)
        return round(mastery, 1)

    @staticmethod
    def is_weak_area(accuracy: float, total_attempted: int) -> bool:
        if total_attempted < 5:
            return False
        return accuracy < 50

    @staticmethod
    def get_topic_recommendation(db: Session) -> dict:
        """Get recommended next topic based on progress."""
        progress_records = db.query(StudentProgress).all()
        weak_topics = []
        untouched_topics = []
        strong_topics = []

        for p in progress_records:
            if p.total_questions_attempted == 0:
                untouched_topics.append(p)
            elif p.accuracy < 50:
                weak_topics.append(p)
            elif p.accuracy >= 75:
                strong_topics.append(p)

        if weak_topics:
            weakest = min(weak_topics, key=lambda x: x.accuracy)
            return {"action": "review", "topic_id": weakest.topic_id, "reason": "Weak area - needs review"}
        elif untouched_topics:
            first = untouched_topics[0]
            return {"action": "learn", "topic_id": first.topic_id, "reason": "New topic to learn"}
        else:
            return {"action": "advance", "topic_id": None, "reason": "All topics covered well!"}

    @staticmethod
    def select_questions(db: Session, topic_id: int = None, subject_id: int = None,
                         difficulty: str = None, count: int = 10) -> list:
        """Select questions based on adaptive criteria."""
        query = db.query(Question)
        if topic_id:
            query = query.filter(Question.topic_id == topic_id)
        if subject_id:
            query = query.filter(Question.subject_id == subject_id)
        if difficulty:
            query = query.filter(Question.difficulty == difficulty)
        
        # Prioritize less-seen questions
        questions = query.order_by(Question.times_shown.asc()).limit(count).all()
        return questions

    @staticmethod
    def update_progress(db: Session, question_id: int, is_correct: bool, 
                        time_taken: int, topic_id: int, subject_id: int):
        """Update student progress after answering a question."""
        progress = db.query(StudentProgress).filter(
            StudentProgress.topic_id == topic_id
        ).first()

        if not progress:
            progress = StudentProgress(
                topic_id=topic_id,
                subject_id=subject_id,
                total_questions_attempted=0,
                correct_answers=0,
                streak=0,
                time_spent_seconds=0
            )
            db.add(progress)

        progress.total_questions_attempted += 1
        if is_correct:
            progress.correct_answers += 1
            progress.streak += 1
        else:
            progress.streak = 0

        if progress.time_spent_seconds is None:
            progress.time_spent_seconds = 0
        progress.time_spent_seconds += time_taken
        if progress.total_questions_attempted > 0:
            progress.accuracy = round(
                (progress.correct_answers / progress.total_questions_attempted) * 100, 1
            )
        progress.mastery_score = AdaptiveEngine.calculate_mastery(
            progress.total_questions_attempted, progress.correct_answers, progress.streak
        )
        progress.is_weak_area = AdaptiveEngine.is_weak_area(
            progress.accuracy, progress.total_questions_attempted
        )
        progress.current_difficulty = AdaptiveEngine.get_next_difficulty(progress.accuracy)
        progress.current_level = AdaptiveEngine.get_next_level(
            progress.accuracy, progress.current_level
        )

        # Update question stats
        question = db.query(Question).filter(Question.id == question_id).first()
        if question:
            question.times_shown += 1
            if is_correct:
                question.times_correct += 1

        db.commit()
        return progress
