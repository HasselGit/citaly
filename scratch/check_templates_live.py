import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")
wabas = [
    {"name": "WABA TuTurno (965775717869143)", "id": "965775717869143"},
    {"name": "WABA Citaly (1006525879102174)", "id": "1006525879102174"}
]

for w in wabas:
    print(f"\n==========================================")
    print(f" Consultando WABA: {w['name']} (ID: {w['id']})")
    print(f"==========================================")
    url = f"https://graph.facebook.com/v18.0/{w['id']}/message_templates?limit=50"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            templates = data.get("data", [])
            if not templates:
                print(">> No hay plantillas creadas en esta WABA.")
                continue
                
            for t in templates:
                name = t.get("name")
                lang = t.get("language")
                status = t.get("status")
                category = t.get("category")
                print(f"  • [{status}] '{name}' | Idioma: {lang} | Categoria: {category}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f">> Error HTTP {e.code}: {err_body}")
    except Exception as e:
        print(f">> Error de conexion: {e}")
