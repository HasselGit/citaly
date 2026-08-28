"""
Test exhaustivo: prueba múltiples formatos del número de teléfono
para encontrar el que Meta acepta en su lista autorizada.
"""
import asyncio
import httpx

TOKEN = "EAAdSPvHDhmcBSWrKJgVDHjGbnlnFIN3wikqPyVvSZCcgXVoB1u9rDUzaGdCWb3ZAHady2SHM6hOMBWExDAc4TRc1ZA9xmNPd2UMZAH8aD76lsMDvZClZC02Or5tisJ1T7hh0mNJ4pxxJLE8TgEOGc78HI9TcLZCC2ZCCZB4yPfUCptx0BdowiYL6XwAYegdY4JQZDZD"
PHONE_ID = "1234817073057013"
URL = f"https://graph.facebook.com/v18.0/{PHONE_ID}/messages"

# Todos los formatos posibles del número argentino 1155769048
FORMATOS = [
    ("Con 549 (formato estándar WA Argentina)", "5491155769048"),
    ("Sin 9 (solo país + área + número)",       "541155769048"),
    ("Solo 10 dígitos sin código país",         "1155769048"),
    ("Con +549",                                "+5491155769048"),
]

async def probar_formato(descripcion: str, numero: str):
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": numero,
        "type": "template",
        "template": {"name": "hello_world", "language": {"code": "en_US"}}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(URL, headers=headers, json=payload)
        status_str = "OK " if resp.status_code == 200 else "ERR"
        print(f"\n[{status_str}] [{descripcion}]")
        print(f"   Número enviado: {numero}")
        print(f"   Status: {resp.status_code}")
        body = resp.json()
        if resp.status_code == 200:
            print(f"   ¡ÉXITO! wamid: {body.get('messages', [{}])[0].get('id', 'N/A')}")
        else:
            error = body.get("error", {})
            print(f"   Error #{error.get('code')}: {error.get('message')}")

async def main():
    print("=" * 60)
    print("DIAGNÓSTICO: Probando formatos de número con Meta API")
    print("=" * 60)
    for desc, num in FORMATOS:
        await probar_formato(desc, num)
    print("\n" + "=" * 60)

asyncio.run(main())
