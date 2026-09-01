import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_number_id = "1284438344753210"

url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

# 1. Probar enviar texto libre a un numero de prueba (ej: 5492302611163 o 5491155769048)
test_phone = "5492302640284" # o el numero receptor

payload_text = {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "5491155769048",
    "type": "text",
    "text": {"body": "Prueba de texto directo Citaly"}
}

# 2. Probar enviar PLANTILLA APROBADA citaly_confirmacion_v1
payload_template = {
    "messaging_product": "whatsapp",
    "to": "5491155769048",
    "type": "template",
    "template": {
        "name": "citaly_confirmacion_v1",
        "language": {"code": "es_AR"},
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
}

print("=== TEST 1: TEXTO LIBRE ===")
try:
    req = urllib.request.Request(url, data=json.dumps(payload_text).encode('utf-8'), headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req) as resp:
        print("Respuesta Texto:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"Error HTTP Texto {e.code}:", e.read().decode('utf-8'))

print("\n=== TEST 2: PLANTILLA APROBADA (citaly_confirmacion_v1) ===")
try:
    req = urllib.request.Request(url, data=json.dumps(payload_template).encode('utf-8'), headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req) as resp:
        print("Respuesta Plantilla:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"Error HTTP Plantilla {e.code}:", e.read().decode('utf-8'))
