import json, urllib.request

url = "https://citaly-six.vercel.app/api/v1/booking/appointments"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"Total returned from /api/v1/booking/appointments: {len(data)}")
        for a in data:
            print(f"- {a.get('start_time')} | {a.get('status')} | {a.get('patient_name')} | was_rescheduled: {a.get('was_rescheduled')}")
except Exception as e:
    print(f"Error: {e}")
