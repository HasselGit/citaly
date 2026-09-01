import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
user_id = "10243801506875989"

for endpoint in [
    f"https://graph.facebook.com/v18.0/{user_id}/businesses",
    f"https://graph.facebook.com/v18.0/{user_id}/whatsapp_business_accounts",
    f"https://graph.facebook.com/v18.0/{user_id}/accounts"
]:
    req = urllib.request.Request(endpoint, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"\nResult from {endpoint}:")
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"\nError {endpoint}: {e.code} -> {e.read().decode('utf-8')}")
