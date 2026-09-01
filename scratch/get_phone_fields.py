import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_id = "1284438344753210"

url = f"https://graph.facebook.com/v18.0/{phone_id}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Default Phone fields:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
