"""
Envía OTP de verificación al número receptor para agregarlo
a la lista autorizada del sandbox de Meta via API.
"""
import asyncio, httpx

TOKEN = "EAAdSPvHDhmcBSY3vxZC9RBOaMqrySCswgQxX0FBmr0ZC2kLJZCUP2NoAMG9jPxrjIbVJZCjFBZCAAb92vlYGZByMFJTBh41jy3UttHagZCAq54SFZAkoP8W1dqh1k3JsFU2eeZAauIPFL0R52nNfohsOI29RgDJdWLJP0z7YY8N6dX7sb9V27AoK0BFLBdQZDZD"
PHONE_ID = "1234817073057013"

async def main():
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

    print("Solicitando OTP para agregar 5491155769048 a la lista autorizada...")
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"https://graph.facebook.com/v20.0/{PHONE_ID}/request_code",
            headers=headers,
            json={
                "phone_number": "5491155769048",
                "language": "es"
            }
        )
        print(f"Status: {r.status_code}")
        print(f"Respuesta: {r.json()}")

asyncio.run(main())
