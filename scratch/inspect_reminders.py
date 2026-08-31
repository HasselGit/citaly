import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
waba_id = "1006525879102174"

for name in ["citaly_recordatorio_24h_v1", "citaly_recordatorio_2h_v1"]:
    url = f"https://graph.facebook.com/v18.0/{waba_id}/message_templates?name={name}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"\n=== {name} ===")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
