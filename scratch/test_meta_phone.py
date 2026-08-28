import asyncio
import httpx
from app.core.config import settings

async def test_meta_send():
    token = settings.WHATSAPP_TOKEN
    phone_id = settings.WHATSAPP_PHONE_NUMBER_ID
    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Test 1: raw 1155769048
    payload1 = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "1155769048",
        "type": "text",
        "text": {"body": "Test desde Citaly"}
    }
    
    async with httpx.AsyncClient() as client:
        r1 = await client.post(url, headers=headers, json=payload1)
        print("TEST 1 (1155769048):", r1.status_code, r1.text)

    # Test 2: formatted 5491155769048
    payload2 = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "5491155769048",
        "type": "text",
        "text": {"body": "Test desde Citaly con 549"}
    }
    
    async with httpx.AsyncClient() as client:
        r2 = await client.post(url, headers=headers, json=payload2)
        print("TEST 2 (5491155769048):", r2.status_code, r2.text)

asyncio.run(test_meta_send())
