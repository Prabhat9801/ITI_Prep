from database.database import SessionLocal
from database.models import Subject, Question

db = SessionLocal()
try:
    subjects = db.query(Subject).all()
    print(f"Total Subjects: {len(subjects)}")
    for s in subjects:
        q_count = db.query(Question).filter(Question.subject_id == s.id).count()
        print(f"Subject: {s.name} (ID: {s.id}) - Questions: {q_count}")
finally:
    db.close()
