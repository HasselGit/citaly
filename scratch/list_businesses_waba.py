import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")

# Ver negocios accesibles
url = "https://graph.facebook.com/v18.0/me/businesses"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})

try:
    with urllib.request.urlopen(req) as res:
        businesses = json.loads(res.read().decode('utf-8'))
        print("Negocios encontrados:")
        print(json.dumps(businesses, indent=2))
        
        for b in businesses.get("data", []):
            b_id = b.get("id")
            # Listar WABAs de cada negocio
            url_wabas = f"https://graph.facebook.com/v18.0/{b_id}/client_whatsapp_business_accounts"
            url_owned = f"https://graph.facebook.com/v18.0/{b_id}/owned_whatsapp_business_accounts"
            for u in [url_wabas, url_owned]:
                try:
                    r_waba = urllib.request.Request(u, headers={"Authorization": f"Bearer {TOKEN}"})
                    with urllib.request.urlopen(r_waba) as res_w:
                        print(f"\nWABAs en negocio {b.get('name')} ({u}):")
                        print(res_w.read().decode('utf-8'))
                except Exception as ex:
                    pass
except Exception as e:
    print(f"Error: {e}")
