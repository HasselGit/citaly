import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("WHATSAPP_TOKEN")
url = f"https://graph.facebook.com/v18.0/debug_token?input_token={token}&access_token={token}"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
