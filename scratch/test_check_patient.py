import json
import urllib.request

url = "https://citaly-six.vercel.app/api/v1/booking/check-patient?phone=2302351341&service_id=srv-endodoncia"

try:
    with urllib.request.urlopen(url) as response:
        print(f"Status Code: {response.status}")
        body = response.read().decode('utf-8')
        print("Response JSON:", body)
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error Body:", e.read().decode('utf-8'))
