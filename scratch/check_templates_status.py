import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
waba_ids = ["1006525879102174", "965775717869143", "1284438344753210"]

for waba_id in waba_ids:
    print(f"\n--- Probando ID: {waba_id} ---")
    url = f"https://graph.facebook.com/v18.0/{waba_id}/message_templates"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            data = json.loads(body).get("data", [])
            print(f"Éxito! Total plantillas: {len(data)}")
            for t in data:
                print(f"  • {t.get('name'):<32} -> ESTADO: {t.get('status')} ({t.get('language')})")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")
