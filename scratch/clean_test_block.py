import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    conn.execute(text("DELETE FROM time_blocks WHERE id = 'test-block-15oct';"))
    conn.commit()
    print("Test block limpiado.")
