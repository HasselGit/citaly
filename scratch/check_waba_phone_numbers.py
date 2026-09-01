import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")

for w_id in ["1006525879102174", "965775717869143"]:
    url = f"https://graph.facebook.com/v18.0/{w_id}/phone_numbers"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"\nPhone numbers for WABA {w_id}:")
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"\nError for WABA {w_id}: {e.code} -> {e.read().decode('utf-8')}")
