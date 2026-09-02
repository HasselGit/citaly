import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from app.services.whatsapp import whatsapp_service

async def test_send():
    phone = "2302351341"
    template_params = [
        {"type": "text", "text": "Rober Steierd"},
        {"type": "text", "text": "Consultorio Odontológico Dr. Pérez"},
        {"type": "text", "text": "Endodoncia / Conducto"},
        {"type": "text", "text": "04/09"},
        {"type": "text", "text": "14:30"}
    ]
    print(f"Enviando plantilla citaly_confirmacion_v1 a {phone}...")
    res = await whatsapp_service.send_template_message(
        to_phone=phone,
        template_name="citaly_confirmacion_v1",
        language_code="es_AR",
        parameters=template_params
    )
    print("Resultado Meta:", res)

asyncio.run(test_send())
