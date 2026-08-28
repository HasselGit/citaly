import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.services.whatsapp import whatsapp_service
from app.core.config import settings

print(f"DEBUG: WHATSAPP_TOKEN len: {len(settings.WHATSAPP_TOKEN)}")
print(f"DEBUG: PHONE_ID: '{settings.WHATSAPP_PHONE_NUMBER_ID}'")

async def main():
    res = await whatsapp_service.send_text_message("1155769048", "Hola Hassel, prueba directa de Citaly")
    print("\n--- META RESPONSE RESULT ---")
    print(res)

asyncio.run(main())
