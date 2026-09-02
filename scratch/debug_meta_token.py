import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
import urllib.request, json

load_dotenv()
token = os.getenv("WHATSAPP_TOKEN")

url = f"https://graph.facebook.com/v18.0/debug_token?input_token={token}&access_token={token}"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Debug Token Data:", json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error Body:", e.read().decode('utf-8'))
