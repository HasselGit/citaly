import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
waba_id = "985775717869143"

url = f"https://graph.facebook.com/v18.0/{waba_id}/message_templates?fields=name,status,language,components"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8")).get("data", [])
        for t in data:
            name = t.get("name")
            lang = t.get("language")
            status = t.get("status")
            print("="*60)
            print(f"TEMPLATE: {name} ({lang}) - Status: {status}")
            for c in t.get("components", []):
                ctype = c.get("type")
                print(f"  [{ctype}]")
                if "text" in c:
                    print(f"    Text: {c['text']}")
                if "buttons" in c:
                    print(f"    Buttons: {c['buttons']}")
except Exception as e:
    print(f"Error: {e}")
