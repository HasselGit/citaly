import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_number_id = "1284438344753210"
url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

# Probar diferentes variaciones
tests = [
    {
        "name": "hello_world",
        "lang": "en_US",
        "components": []
    },
    {
        "name": "citaly_confirmacion_v1",
        "lang": "es_AR",
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Hassel"},
                    {"type": "text", "text": "Dr. Alejandro Pérez"},
                    {"type": "text", "text": "Limpieza Dental"},
                    {"type": "text", "text": "04/09"},
                    {"type": "text", "text": "10:00"}
                ]
            }
        ]
    },
    {
        "name": "citaly_confirmacion_v1",
        "lang": "es",
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Hassel"},
                    {"type": "text", "text": "Dr. Alejandro Pérez"},
                    {"type": "text", "text": "Limpieza Dental"},
                    {"type": "text", "text": "04/09"},
                    {"type": "text", "text": "10:00"}
                ]
            }
        ]
    }
]

for t in tests:
    print(f"\n--- Probando plantilla: {t['name']} ({t['lang']}) ---")
    payload = {
        "messaging_product": "whatsapp",
        "to": "5491155769048",
        "type": "template",
        "template": {
            "name": t["name"],
            "language": {"code": t["lang"]}
        }
    }
    if t["components"]:
        payload["template"]["components"] = t["components"]

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        with urllib.request.urlopen(req) as resp:
            print("EXITO:", resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}:", e.read().decode('utf-8'))
