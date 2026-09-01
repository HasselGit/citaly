import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1284438344753210")
TEST_TO = "5491155769048" # Número de prueba

url = f"https://graph.facebook.com/v18.0/{PHONE_ID}/messages"

payload = {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": TEST_TO,
    "type": "template",
    "template": {
        "name": "citaly_confirmacion_v1",
        "language": {"code": "es_AR"},
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Hassel"},
                    {"type": "text", "text": "TuTurno"},
                    {"type": "text", "text": "Ortodoncia"},
                    {"type": "text", "text": "Martes 01/09"},
                    {"type": "text", "text": "10:00"}
                ]
            }
        ]
    }
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        print("✅ Envío de plantilla exitoso:")
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"❌ Error HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"❌ Error: {e}")
