from database.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Check if column exists first (SQLite specific)
            res = conn.execute(text("PRAGMA table_info(questions)"))
            columns = [row[1] for row in res]
            
            if 'source' not in columns:
                conn.execute(text("ALTER TABLE questions ADD COLUMN source VARCHAR(50) DEFAULT 'manual'"))
                conn.commit()
                print("Column 'source' added successfully!")
            else:
                print("Column 'source' already exists.")
        except Exception as e:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
