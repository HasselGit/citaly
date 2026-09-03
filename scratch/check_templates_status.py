import os
import json
import urllib.request
import urllib.error

# Read from .env
env_vars = {}
if os.path.exists('.env'):
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")

token = env_vars.get("WHATSAPP_TOKEN") or os.getenv("WHATSAPP_TOKEN")
phone_id = env_vars.get("WHATSAPP_PHONE_NUMBER_ID") or "1284438344753210"
waba_ids = ["985775717869143", "1006525879102174"]

headers = {"Authorization": f"Bearer {token}"}

print("==========================================")
print(" CREACIÓN DE PLANTILLAS OFICIALES PRONTOTURNO ")
print("==========================================")
def create_pronto_template(name, body_text, example_args):
    waba_id = "985775717869143"
    payload = {
        "name": name,
        "language": "es_AR",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": body_text,
                "example": {
                    "body_text": [example_args]
                }
            },
            {
                "type": "FOOTER",
                "text": "¡Gracias por elegirnos! • ProntoTurno App"
            }
        ]
    }
    req = urllib.request.Request(
        f"https://graph.facebook.com/v18.0/{waba_id}/message_templates",
        data=json.dumps(payload).encode('utf-8'),
        headers={**headers, "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[CREADO] {name}:", json.loads(resp.read().decode('utf-8')))
    except urllib.error.HTTPError as e:
        print(f"[ERROR] {name} ({e.code}):", e.read().decode('utf-8'))

create_pronto_template(
    "prontoturno_confirmacion_v1",
    "Hola {{1}}, te confirmamos tu turno en {{2}} para el tratamiento {{3}} el día {{4}} a las {{5}} hs.\n\n• Para cancelar: respondé CANCELAR a este mensaje.\n• Para reprogramar ingresá a: https://citaly-six.vercel.app",
    ["Hassel Espinosa", "Consultorio Dr. Alejandro Pérez", "Ortodoncia / Control", "Viernes 11/09", "15:30"]
)
create_pronto_template(
    "prontoturno_reprogramacion_v1",
    "Hola {{1}}, te confirmamos que tu turno en {{2}} para {{3}} fue REPROGRAMADO con éxito para el día {{4}} a las {{5}} hs.\n\n• Para cancelar: respondé CANCELAR a este mensaje.\n• Para reprogramar ingresá a: https://citaly-six.vercel.app",
    ["Hassel Espinosa", "Consultorio Dr. Alejandro Pérez", "Ortodoncia / Control", "Viernes 11/09", "15:30"]
)
create_pronto_template(
    "prontoturno_cancelacion_v1",
    "Hola {{1}}, te confirmamos que tu turno en {{2}} para el tratamiento {{3}} fue CANCELADO con éxito.\n\nMuchas gracias por avisarnos con anticipación. Si querés volver a solicitar un turno podés hacerlo en: https://citaly-six.vercel.app",
    ["Hassel Espinosa", "Consultorio Dr. Alejandro Pérez", "Ortodoncia / Control"]
)
create_pronto_template(
    "prontoturno_recordatorio_24h_v1",
    "Hola {{1}}, te recordamos tu turno en {{2}} para el tratamiento {{3}} mañana {{4}} a las {{5}} hs.\n\n• Para cancelar: respondé CANCELAR a este mensaje.\n• Para reprogramar ingresá a: https://citaly-six.vercel.app",
    ["Hassel Espinosa", "Consultorio Dr. Alejandro Pérez", "Ortodoncia / Control", "Viernes 11/09", "15:30"]
)

print("\n==========================================")
print(" LISTA COMPLETA DE PLANTILLAS Y ESTADOS   ")
print("==========================================")
waba_id = "985775717869143"
url = f"https://graph.facebook.com/v18.0/{waba_id}/message_templates?fields=name,status,language,category,id"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8')).get("data", [])
        for t in data:
            print(f"  • {t.get('name'):<30} | {t.get('language'):<6} | Status: {t.get('status')} | ID: {t.get('id')}")
except Exception as e:
    print("Error:", e)

print("\n==========================================")
print(" 3. TEST ENVÍO HELLO_WORLD (APPROVED)     ")
print("==========================================")
hw_payload = {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "5491155769048",
    "type": "template",
    "template": {
        "name": "hello_world",
        "language": {"code": "en_US"}
    }
}
try:
    req = urllib.request.Request(
        f"https://graph.facebook.com/v18.0/{phone_id}/messages",
        data=json.dumps(hw_payload).encode('utf-8'),
        headers={**headers, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Resultado hello_world send:", resp.status, json.loads(resp.read().decode('utf-8')))
except urllib.error.HTTPError as e:
    print(f"Error hello_world ({e.code}): {e.read().decode('utf-8')}")

print("\n==========================================")
print(" 4. TEST ENVÍO DE PLANTILLA V2 (NUEVA)    ")
print("==========================================")
test_payload = {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "5491155769048",
    "type": "template",
    "template": {
        "name": "citaly_confirma_v2",
        "language": {"code": "es_AR"},
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Hassel Espinosa"},
                    {"type": "text", "text": "Consultorio Dr. Alejandro Pérez"},
                    {"type": "text", "text": "Ortodoncia / Control"},
                    {"type": "text", "text": "Viernes 11/09"},
                    {"type": "text", "text": "15:30"}
                ]
            }
        ]
    }
}
try:
    req = urllib.request.Request(
        f"https://graph.facebook.com/v18.0/{phone_id}/messages",
        data=json.dumps(test_payload).encode('utf-8'),
        headers={**headers, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Resultado Envío citaly_confirma_v2:", resp.status, json.loads(resp.read().decode('utf-8')))
except urllib.error.HTTPError as e:
    print(f"Error Envío citaly_confirma_v2 ({e.code}): {e.read().decode('utf-8')}")

print("\n==========================================")
print(" 5. TEST ENVÍO DE PLANTILLA REAL          ")
print("==========================================")
test_payload = {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "5491155769048",
    "type": "template",
    "template": {
        "name": "citaly_confirmacion_v1",
        "language": {"code": "es_AR"},
        "components": [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Hassel Espinosa"},
                    {"type": "text", "text": "Consultorio Dr. Alejandro Pérez"},
                    {"type": "text", "text": "Ortodoncia / Control"},
                    {"type": "text", "text": "Viernes 11/09"},
                    {"type": "text", "text": "15:30"}
                ]
            }
        ]
    }
}
try:
    req = urllib.request.Request(
        f"https://graph.facebook.com/v18.0/{phone_id}/messages",
        data=json.dumps(test_payload).encode('utf-8'),
        headers={**headers, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Resultado Template send:", resp.status, json.loads(resp.read().decode('utf-8')))
except urllib.error.HTTPError as e:
    print(f"Error Envío Template ({e.code}): {e.read().decode('utf-8')}")

