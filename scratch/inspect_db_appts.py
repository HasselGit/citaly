import json, urllib.request

url = "https://citaly-six.vercel.app/api/v1/booking/appointments-list?tenant_id=demo-tenant-citaly-001"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        appts = data.get("appointments", [])
        print(f"Total appointments: {len(appts)}")
        for a in appts:
            print(f"- {a.get('start_time')} | Status: {a.get('status')} | Patient: {a.get('patient_name')} | Service: {a.get('service_name')} | Time: {a.get('time_str')}")
except Exception as e:
    print(f"Error: {e}")
