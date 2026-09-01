import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")

# Buscamos en todas las posibles IDs de cuentas WABA asociadas
# En la captura de WhatsApp Manager, la WABA de TuTurno
# Probemos varias IDs conocidas o busquemos via graph API
known_wabas = [
    "965775717869143",
    "1006525879102174",
    "10243801506875989"
]

for w_id in known_wabas:
    url = f"https://graph.facebook.com/v18.0/{w_id}/message_templates"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"\n=== WABA {w_id} Plantillas ===")
            for t in data.get("data", []):
                print(f"  - {t.get('name')} ({t.get('language')}) -> ESTADO: {t.get('status')}")
    except urllib.error.HTTPError as e:
        print(f"WABA {w_id} Error {e.code}: {e.read().decode('utf-8')}")
