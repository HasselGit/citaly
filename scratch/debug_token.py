import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
app_id = "2060755134547559"
app_secret = "b46bfb7f8f6f598b049d56ea21c5f3e2" # de .env

url = f"https://graph.facebook.com/v18.0/debug_token?input_token={token}&access_token={app_id}|{app_secret}"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Debug token:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
