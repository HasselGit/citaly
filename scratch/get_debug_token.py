import os, json, urllib.request, urllib.parse
from dotenv import load_dotenv
load_dotenv()

user_token = os.getenv("WHATSAPP_TOKEN")
app_id = "2060755134547559"
app_secret = "b46bfb7f8f6f598b049d56ea21c5f3e2"

# 1. Obtener app access token
app_token_url = f"https://graph.facebook.com/oauth/access_token?client_id={app_id}&client_secret={app_secret}&grant_type=client_credentials"
try:
    with urllib.request.urlopen(app_token_url) as resp:
        app_token_data = json.loads(resp.read().decode('utf-8'))
        app_access_token = app_token_data.get("access_token")
        print("App Token obtenido con exito")
        
        # 2. Debuggear user token
        debug_url = f"https://graph.facebook.com/debug_token?input_token={user_token}&access_token={app_access_token}"
        with urllib.request.urlopen(debug_url) as resp_d:
            debug_data = json.loads(resp_d.read().decode('utf-8'))
            print("Debug User Token:")
            print(json.dumps(debug_data, indent=2))
except Exception as e:
    print(f"Error: {e}")
