import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
import urllib.request, json

load_dotenv()
token = os.getenv("WHATSAPP_TOKEN")
waba_id = os.getenv("WABA_ID", "1006525879102174")

url = f"https://graph.facebook.com/v18.0/{waba_id}/message_templates?limit=50"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("=== PLANTILLAS EN WABA ===")
        for t in data.get('data', []):
            print(f"Name: {t.get('name')} | Status: {t.get('status')} | Lang: {t.get('language')} | Category: {t.get('category')}")
            for comp in t.get('components', []):
                print(f"   [{comp.get('type')}]: {comp.get('text', '')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
