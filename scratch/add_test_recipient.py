"""
Intenta agregar numero receptor al sandbox de Meta via API
usando el token de 59 dias ya cargado en Vercel.
"""
import asyncio, httpx

TOKEN = "EAAdSPvHDhmcBSY3vxZC9RBOaMqrySCswgQxX0FBmr0ZC2kLJZCUP2NoAMG9jPxrjIbVJZCjFBZCAAb92vlYGZByMFJTBh41jy3UttHagZCAq54SFZAkoP8W1dqh1k3JsFU2eeZAauIPFL0R52nNfohsOI29RgDJdWLJP0z7YY8N6dX7sb9V27AoK0BFLBdQZDZD"
PHONE_ID = "1234817073057013"

ENDPOINTS_TO_TRY = [
    f"https://graph.facebook.com/v20.0/{PHONE_ID}",
    f"https://graph.facebook.com/v21.0/{PHONE_ID}",
    f"https://graph.facebook.com/v18.0/{PHONE_ID}",
]

FIELDS_TO_TRY = [
    "test_recipient_phone_numbers",
    "allowed_test_phone_numbers",
    "test_recipients",
]

async def main():
    async with httpx.AsyncClient() as c:
        headers = {"Authorization": f"Bearer {TOKEN}"}

        print("=== Buscando campo para lista de receptores de prueba ===")
        for url in ENDPOINTS_TO_TRY[:1]:  # solo v20
            for field in FIELDS_TO_TRY:
                r = await c.get(url, params={"fields": field}, headers=headers)
                body = r.json()
                if "error" not in body or "nonexisting field" not in body.get("error", {}).get("message", ""):
                    print(f"ENCONTRADO: {field} -> {body}")
                else:
                    print(f"No existe: {field}")

        print("\n=== Intentando POST para agregar receptor ===")
        for version in ["v20.0", "v21.0"]:
            url = f"https://graph.facebook.com/{version}/{PHONE_ID}/test_recipients"
            r = await c.post(url, headers={**headers, "Content-Type": "application/json"},
                           json={"phone_number": "5491155769048"})
            print(f"{version}/test_recipients -> {r.status_code}: {r.text[:200]}")

        print("\n=== Enviando OTP verificacion al numero receptor ===")
        for version in ["v20.0", "v21.0"]:
            url = f"https://graph.facebook.com/{version}/{PHONE_ID}/request_code"
            r = await c.post(url, headers={**headers, "Content-Type": "application/json"},
                           json={"phone_number": "5491155769048", "code_method": "SMS"})
            print(f"{version}/request_code -> {r.status_code}: {r.text[:200]}")

asyncio.run(main())
