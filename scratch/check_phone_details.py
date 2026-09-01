import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")
phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1284438344753210")

url = f"https://graph.facebook.com/v18.0/{phone_id}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode("utf-8"))
        print("Datos del Número en Meta:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error consultando phone_number_id: {e}")
