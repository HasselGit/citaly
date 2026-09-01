import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
phone_number_id = "1284438344753210"

# Consultar información del Phone Number ID
url = f"https://graph.facebook.com/v18.0/{phone_number_id}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,account_mode"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Phone info:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error Phone info: {e}")

# Consultar WABA al que pertenece el token
url_wabas = "https://graph.facebook.com/v18.0/me?fields=id,name,accounts{id,name}"
req2 = urllib.request.Request(url_wabas, headers={"Authorization": f"Bearer {token}"})
try:
    with urllib.request.urlopen(req2) as resp:
        data2 = json.loads(resp.read().decode('utf-8'))
        print("\nAccounts info:")
        print(json.dumps(data2, indent=2))
except Exception as e:
    print(f"Error Accounts: {e}")
