"""Database models for the Intelligent Tutoring System."""
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, 
    ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base
import enum


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ExamLevel(str, enum.Enum):
    ITI = "ITI"
    DIPLOMA = "Diploma"
    BTECH = "B.Tech"


class QuestionType(str, enum.Enum):
    CONCEPT = "concept"
    APPLICATION = "application"
    NUMERICAL = "numerical"
    STATEMENT = "statement"


# ─── Subject Model ───
class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    name_hi = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="📘")
    color = Column(String(20), default="#4F46E5")
    order_index = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    
    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="subject")


# ─── Topic Model ───
class Topic(Base):
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    name = Column(String(300), nullable=False)
    name_hi = Column(String(300), nullable=True)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    day_number = Column(Integer, nullable=True)  # Which day in 15-day plan
    
    subject = relationship("Subject", back_populates="topics")
    subtopics = relationship("Subtopic", back_populates="topic", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="topic")
    created_at = Column(DateTime, server_default=func.now())


# ─── Subtopic Model ───
class Subtopic(Base):
    __tablename__ = "subtopics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    name = Column(String(300), nullable=False)
    name_hi = Column(String(300), nullable=True)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    
    # Teaching content in 3 levels
    content_basic = Column(Text, nullable=True)     # ITI level
    content_intermediate = Column(Text, nullable=True)  # Diploma level
    content_advanced = Column(Text, nullable=True)   # B.Tech level
    
    topic = relationship("Topic", back_populates="subtopics")
    questions = relationship("Question", back_populates="subtopic")
    created_at = Column(DateTime, server_default=func.now())


# ─── Question Model ───
class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    subtopic_id = Column(Integer, ForeignKey("subtopics.id"), nullable=True)
    
    question_text = Column(Text, nullable=False)
    question_text_hi = Column(Text, nullable=True)
    
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    
    correct_answer = Column(String(1), nullable=False)  # A, B, C, D
    
    explanation = Column(Text, nullable=True)
    explanation_hi = Column(Text, nullable=True)
    why_others_wrong = Column(Text, nullable=True)
    
    difficulty = Column(String(20), default="medium")
    exam_level = Column(String(20), default="ITI")
    question_type = Column(String(20), default="concept")
    
    times_shown = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    source = Column(String(50), default="manual")  # background_gen, organic_quiz, manual
    
    created_at = Column(DateTime, server_default=func.now())
    
    subject = relationship("Subject", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")
    subtopic = relationship("Subtopic", back_populates="questions")
    attempts = relationship("Attempt", back_populates="question")


# ─── Student Progress Model ───
class StudentProgress(Base):
    __tablename__ = "student_progress"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    subtopic_id = Column(Integer, ForeignKey("subtopics.id"), nullable=True)
    
    total_questions_attempted = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    
    current_difficulty = Column(String(20), default="easy")
    current_level = Column(String(20), default="ITI")
    
    time_spent_seconds = Column(Integer, default=0)
    last_studied = Column(DateTime, nullable=True)
    mastery_score = Column(Float, default=0.0)  # 0-100
    
    is_weak_area = Column(Boolean, default=False)
    streak = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ─── Attempt Model ───
class Attempt(Base):
    __tablename__ = "attempts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    
    selected_answer = Column(String(1), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_taken_seconds = Column(Integer, default=0)
    
    session_type = Column(String(50), default="practice")  # practice, test, mock
    
    created_at = Column(DateTime, server_default=func.now())
    
    question = relationship("Question", back_populates="attempts")


# ─── Practice Session Model ───
class PracticeSession(Base):
    __tablename__ = "practice_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_type = Column(String(50), default="practice")  # practice, mock_test, daily_test
    subject_id = Column(Integer, nullable=True)
    topic_id = Column(Integer, nullable=True)
    
    total_questions = Column(Integer, default=0)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    total_time_seconds = Column(Integer, default=0)
    
    difficulty = Column(String(20), default="mixed")
    is_completed = Column(Boolean, default=False)
    
    question_ids = Column(Text, nullable=True)  # JSON array of question IDs
    
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


# ─── Study Plan Model ───
class StudyPlan(Base):
    __tablename__ = "study_plan"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    day_number = Column(Integer, nullable=False)
    title = Column(String(300), nullable=False)
    title_hi = Column(String(300), nullable=True)
    description = Column(Text, nullable=True)
    
    subject_ids = Column(Text, nullable=True)  # JSON array
    topic_ids = Column(Text, nullable=True)    # JSON array
    
    target_questions = Column(Integer, default=50)
    target_accuracy = Column(Float, default=70.0)
    
    is_completed = Column(Boolean, default=False)
    actual_accuracy = Column(Float, nullable=True)
    
    plan_type = Column(String(50), default="learning")  # learning, practice, mock, revision
    
    created_at = Column(DateTime, server_default=func.now())


# ─── Chat History Model ───
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    topic_context = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())


# ─── Mock Test Result Model ───
class MockTestResult(Base):
    __tablename__ = "mock_test_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    total_questions = Column(Integer, default=100)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    wrong = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    
    raw_score = Column(Float, default=0.0)       # correct - (wrong * 0.25)
    percentage = Column(Float, default=0.0)
    merit_score = Column(Float, default=0.0)      # raw_score * 0.75
    
    category = Column(String(50), default="General")
    category_threshold = Column(Float, default=40.0)
    is_passed = Column(Boolean, default=False)
    
    time_taken_seconds = Column(Integer, default=0)  # Actual time used
    
    created_at = Column(DateTime, server_default=func.now())
    
    answers = relationship("MockTestAnswer", back_populates="mock_test", cascade="all, delete-orphan")


# ─── Mock Test Answer (Per-Question Detail) ───
class MockTestAnswer(Base):
    __tablename__ = "mock_test_answers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    mock_test_id = Column(Integer, ForeignKey("mock_test_results.id"), nullable=False)
    question_id = Column(Integer, nullable=True)
    
    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=True)
    option_b = Column(Text, nullable=True)
    option_c = Column(Text, nullable=True)
    option_d = Column(Text, nullable=True)
    
    selected_answer = Column(String(10), nullable=True)  # A/B/C/D or 'skipped'
    correct_answer = Column(String(1), nullable=False)
    is_correct = Column(Boolean, default=False)
    
    explanation = Column(Text, nullable=True)
    why_others_wrong = Column(Text, nullable=True)
    
    subject_name = Column(String(200), nullable=True)
    topic_name = Column(String(300), nullable=True)
    
    mock_test = relationship("MockTestResult", back_populates="answers")


# ─── Weak Area Evolution Log ───
class WeakAreaLog(Base):
    __tablename__ = "weak_area_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_name = Column(String(300), nullable=False)
    subject_name = Column(String(200), nullable=True)
    
    mock_test_id = Column(Integer, ForeignKey("mock_test_results.id"), nullable=True)
    accuracy_at_test = Column(Float, default=0.0)  # Accuracy in THIS test for this topic
    total_in_test = Column(Integer, default=0)      # How many Qs of this topic appeared
    correct_in_test = Column(Integer, default=0)    # How many correct
    
    status = Column(String(20), default="weak")  # weak, improving, strong
    
    created_at = Column(DateTime, server_default=func.now())
