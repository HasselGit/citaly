import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.services.whatsapp import whatsapp_service
from app.core.config import settings

async def main():
    res = await whatsapp_service.send_template_message("1155769048", "hello_world", "en_US")
    print("\n--- META TEMPLATE RESPONSE ---")
    print(res)

asyncio.run(main())
