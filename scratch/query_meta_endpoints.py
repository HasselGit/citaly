import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
import urllib.request, json

load_dotenv()
token = os.getenv("WHATSAPP_TOKEN")

for endpoint in ["me/businesses", "me/assigned_user_access_tokens", "10243801506875989/businesses", "965775717869143/message_templates"]:
    url = f"https://graph.facebook.com/v18.0/{endpoint}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"=== {endpoint} ===")
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"=== {endpoint} ERROR {e.code} ===")
        print(e.read().decode('utf-8'))
