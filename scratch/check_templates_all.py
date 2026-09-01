import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
# Consultar si hay notificaciones o estado de la WABA
url = "https://graph.facebook.com/v18.0/1006525879102174?fields=id,name,message_templates{name,status,language,category}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Templates in 1006525879102174:")
        for t in data.get("message_templates", {}).get("data", []):
            print(f" - {t.get('name')} [{t.get('language')}] -> {t.get('status')}")
except Exception as e:
    print(f"Error: {e}")
