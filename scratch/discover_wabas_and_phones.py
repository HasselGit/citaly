import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")

# Obtener todos los Business Managers y WABAs
url_me = "https://graph.facebook.com/v18.0/me/businesses"
req = urllib.request.Request(url_me, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        businesses = json.loads(resp.read().decode('utf-8'))
        print("Businesses:", json.dumps(businesses, indent=2))
        
        for b in businesses.get("data", []):
            b_id = b["id"]
            url_client_wabas = f"https://graph.facebook.com/v18.0/{b_id}/client_whatsapp_business_accounts"
            url_owned_wabas = f"https://graph.facebook.com/v18.0/{b_id}/owned_whatsapp_business_accounts"
            
            for w_url in [url_owned_wabas, url_client_wabas]:
                req_w = urllib.request.Request(w_url, headers={"Authorization": f"Bearer {token}"})
                try:
                    with urllib.request.urlopen(req_w) as resp_w:
                        w_data = json.loads(resp_w.read().decode('utf-8'))
                        print(f"\nWABAs en Business {b_id} ({w_url}):")
                        print(json.dumps(w_data, indent=2))
                        
                        for waba in w_data.get("data", []):
                            w_id = waba["id"]
                            # Obtener números de teléfono de esta WABA
                            url_phones = f"https://graph.facebook.com/v18.0/{w_id}/phone_numbers"
                            req_p = urllib.request.Request(url_phones, headers={"Authorization": f"Bearer {token}"})
                            try:
                                with urllib.request.urlopen(req_p) as resp_p:
                                    phones = json.loads(resp_p.read().decode('utf-8'))
                                    print(f"--> Phone numbers in WABA {w_id} ({waba.get('name')}):")
                                    print(json.dumps(phones, indent=2))
                            except Exception as ep:
                                print(f"Error phones for {w_id}: {ep}")
                                
                            # Obtener plantillas de esta WABA
                            url_tmpl = f"https://graph.facebook.com/v18.0/{w_id}/message_templates"
                            req_t = urllib.request.Request(url_tmpl, headers={"Authorization": f"Bearer {token}"})
                            try:
                                with urllib.request.urlopen(req_t) as resp_t:
                                    tmpls = json.loads(resp_t.read().decode('utf-8'))
                                    print(f"--> Templates in WABA {w_id} ({waba.get('name')}):")
                                    for tm in tmpls.get("data", []):
                                        print(f"    - {tm.get('name')} [{tm.get('language')}] -> {tm.get('status')}")
                            except Exception as et:
                                print(f"Error templates for {w_id}: {et}")
                except Exception as ew:
                    print(f"Error WABAs for {b_id}: {ew}")
except Exception as e:
    print(f"Error Businesses: {e}")
