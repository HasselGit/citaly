import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
# Verificamos si podemos registrar la plantilla en la WABA o consultar qué plantillas tiene el número
phone_id = "1284438344753210"

url = f"https://graph.facebook.com/v18.0/{phone_id}/message_templates"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Message templates on phone endpoint:")
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode('utf-8')}")
