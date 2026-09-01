import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")
waba_id = "1006525879102174"

url = f"https://graph.facebook.com/v18.0/{waba_id}/message_templates?limit=100"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode("utf-8"))
        templates = data.get("data", [])
        print(f"Total plantillas encontradas en Meta: {len(templates)}")
        for t in templates:
            print(f"\n--------------------------------------------------")
            print(f"Nombre: {t.get('name')}")
            print(f"Estado: {t.get('status')}")
            print(f"Idioma: {t.get('language')}")
            print(f"Categoría: {t.get('category')}")
            print(f"ID: {t.get('id')}")
            for comp in t.get('components', []):
                print(f"  [{comp.get('type')}]: {comp.get('text') or comp.get('buttons')}")
except Exception as e:
    print(f"Error: {e}")
