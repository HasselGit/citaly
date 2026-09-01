import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")

# Ver todas las WABAs a las que tiene acceso el token
url = "https://graph.facebook.com/v18.0/debug_token?input_token=" + TOKEN
# O listar negocios
url_me = "https://graph.facebook.com/v18.0/me?fields=id,name,businesses"
req = urllib.request.Request(url_me, headers={"Authorization": f"Bearer {TOKEN}"})

try:
    with urllib.request.urlopen(req) as res:
        print("Perfil del token:")
        print(res.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")

# Consultar WABA directa del número
url_phone = "https://graph.facebook.com/v18.0/1284438344753210?fields=id,whatsapp_business_management,whatsapp_business_account"
req2 = urllib.request.Request(url_phone, headers={"Authorization": f"Bearer {TOKEN}"})
try:
    with urllib.request.urlopen(req2) as res:
        print("\nWABA asociada al número:")
        print(res.read().decode('utf-8'))
except Exception as e:
    print(f"Error WABA del número: {e}")
