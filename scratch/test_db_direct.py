from sqlalchemy import create_engine, text

# Test Direct Connection Host
direct_url = "postgresql://postgres.edkmkcxdtzygjjgvxgcq:upTG6VI40VexlJ9a@db.edkmkcxdtzygjjgvxgcq.supabase.co:5432/postgres"

print("Testing direct host connection to Supabase...")
try:
    engine = create_engine(direct_url, connect_args={"connect_timeout": 10})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1")).fetchone()
        print(f"SUCCESS DIRECT HOST: {res}")
except Exception as e:
    print(f"FAILED DIRECT HOST: {e}")

# Test Session Pooler Host on Port 6543
pooler_url = "postgresql://postgres.edkmkcxdtzygjjgvxgcq:upTG6VI40VexlJ9a@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
print("Testing pooler host on port 6543...")
try:
    engine = create_engine(pooler_url, connect_args={"connect_timeout": 10})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1")).fetchone()
        print(f"SUCCESS POOLER 6543: {res}")
except Exception as e:
    print(f"FAILED POOLER 6543: {e}")
