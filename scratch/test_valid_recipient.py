import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_number_id = "1284438344753210"
url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

# Probamos enviar a otro número de prueba diferente al emisor
test_destination = "5492302351341" # Número de prueba

payload = {
    "messaging_product": "whatsapp",
    "to": test_destination,
    "type": "template",
    "template": {
        "name": "citaly_confirmacion_v1",
        "language": {"code": "es_AR"},
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Carlos"},
                    {"type": "text", "text": "Dr. Alejandro Pérez"},
                    {"type": "text", "text": "Consulta General"},
                    {"type": "text", "text": "01/09"},
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
        data = json.loads(resp.read().decode('utf-8'))
        print("[EXITO COMPLETO] Mensaje de plantilla enviado:")
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"[ERROR {e.code}]:", e.read().decode('utf-8'))
