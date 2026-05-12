import asyncio
import random
from sqlalchemy.orm import Session
from database.database import SessionLocal
from database.models import Subject, Topic, Question
from engine.teaching import generate_quiz

async def auto_generate_daily_questions():
    """Background task that runs continuously to generate daily questions slowly."""
    while True:
        try:
            db = SessionLocal()
            try:
                # 1. Check which subjects need questions today
                # For simplicity, we just generate 2 questions per subject slowly.
                subjects = db.query(Subject).all()
                if not subjects:
                    await asyncio.sleep(3600)
                    continue
                
                # Pick a random subject
                subject = random.choice(subjects)
                
                # Pick a random topic for this subject
                topics = db.query(Topic).filter(Topic.subject_id == subject.id).all()
                if not topics:
                    continue
                    
                topic = random.choice(topics)
                
                # Ask LLM for 1 question
                questions_data = generate_quiz(
                    subject=subject.name,
                    topic=topic.name,
                    count=1,
                    difficulty="mixed",
                    provider="auto"
                )
                
                if questions_data and len(questions_data) > 0:
                    q = questions_data[0]
                    if all(k in q for k in ["q", "a", "b", "c", "d", "ans"]):
                        options = [("A", q["a"]), ("B", q["b"]), ("C", q["c"]), ("D", q["d"])]
                        correct_key = q["ans"].upper()
                        correct_val = q.get(correct_key.lower(), q["a"])
                        
                        random.shuffle(options)
                        new_ans = "A"
                        for i, (_, val) in enumerate(options):
                            if val == correct_val:
                                new_ans = ["A", "B", "C", "D"][i]
                                break
                                
                        new_q = Question(
                            subject_id=subject.id,
                            topic_id=topic.id,
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
                            source="background_gen"
                        )
                        db.add(new_q)
                        db.commit()
                        print(f"DEBUG: Background Generator - SAVED 1 new question for {subject.name} -> {topic.name}")
            except Exception as e:
                db.rollback()
                print(f"Error in background generation inner: {e}")
            finally:
                db.close()
                
        except Exception as e:
            print(f"Error in background task: {e}")
            
        # Sleep for 15 minutes between each generation to avoid API limits
        # This will generate 96 questions in 24 hours (24 * 60 / 15 = 96)
        # Which is exactly ~2 per subject!
        await asyncio.sleep(15 * 60)
