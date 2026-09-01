import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_number_id = "1284438344753210"
url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

templates_to_test = [
    {
        "name": "citaly_confirmacion_v1",
        "params": ["Carlos", "Dr. Alejandro Pérez", "Consulta General", "01/09", "10:00"]
    },
    {
        "name": "citaly_reprogramacion_v1",
        "params": ["Carlos", "Dr. Alejandro Pérez", "Consulta General", "02/09", "11:00"]
    },
    {
        "name": "citaly_recordatorio_24h_v1",
        "params": ["Carlos", "Dr. Alejandro Pérez", "Consulta General", "03/09", "12:00"]
    },
    {
        "name": "citaly_cancelacion_v1",
        "params": ["Carlos", "Dr. Alejandro Pérez", "Consulta General"]
    }
]

for t in templates_to_test:
    print(f"\n--- Probando {t['name']} ---")
    payload = {
        "messaging_product": "whatsapp",
        "to": "5492302640284",
        "type": "template",
        "template": {
            "name": t["name"],
            "language": {"code": "es_AR"},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": p} for p in t["params"]]
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
            print(f"[EXITO] {t['name']} APROBADA Y ENVIADA:")
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"[ERROR] {t['name']} Error {e.code}:", e.read().decode('utf-8'))
