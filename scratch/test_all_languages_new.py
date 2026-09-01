import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_number_id = "1284438344753210"
url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

languages = ["es_AR", "es", "es_LA", "es_MX", "es_ES"]

for lang in languages:
    payload = {
        "messaging_product": "whatsapp",
        "to": "5491155769048",
        "type": "template",
        "template": {
            "name": "citaly_confirmacion_v1",
            "language": {"code": lang},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Hassel"},
                        {"type": "text", "text": "Dr. Alejandro Pérez"},
                        {"type": "text", "text": "Limpieza Dental"},
                        {"type": "text", "text": "05/09"},
                        {"type": "text", "text": "10:00"}
                    ]
                }
            ]
        }
    }
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        with urllib.request.urlopen(req) as resp:
            print(f"EXITO con idioma {lang}:", resp.read().decode('utf-8'))
            break
    except urllib.error.HTTPError as e:
        print(f"Fallo con idioma {lang} ({e.code}):", e.read().decode('utf-8'))
