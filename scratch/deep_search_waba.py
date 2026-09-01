import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
url = "https://graph.facebook.com/v18.0/me?fields=id,name,businesses{id,name,whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
