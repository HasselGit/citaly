import json, urllib.request

url = "https://citaly-six.vercel.app/api/v1/booking/appointments"
payload = {
    "tenant_id": "demo-tenant-citaly-001",
    "service_id": "srv-extraccion", # Extraccion Muela de Juicio
    "start_time": "2026-09-08T16:00:00",
    "patient_full_name": "Hassel Espinosa",
    "patient_whatsapp": "1155769048"
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        body = response.read().decode('utf-8')
        print("Response JSON:", body)
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error Body:", e.read().decode('utf-8'))
