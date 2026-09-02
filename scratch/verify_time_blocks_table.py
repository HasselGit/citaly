import os, sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'time_blocks';")).fetchall()
    print("Columnas de time_blocks:", res)
