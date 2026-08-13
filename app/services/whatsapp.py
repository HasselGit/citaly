import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

class WhatsAppService:
    def __init__(self):
        self.token = settings.WHATSAPP_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.base_url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"

    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "es",
        parameters: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Envía un mensaje de plantilla oficial usando Meta Cloud API Graph v18.0+.
        Si las credenciales no están configuradas en .env, entra en modo SIMULACIÓN.
        """
        # Limpiar formato de teléfono
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")

        # Si no hay token de Meta configurado en desarrollo, simulamos el envío exitoso
        if not self.token or not self.phone_number_id or self.token == "YOUR_META_WHATSAPP_API_TOKEN":
            print(f"[SIMULACIÓN WHATSAPP] Enviando plantilla '{template_name}' a {clean_phone}")
            return {
                "status": "SIMULATED",
                "messages": [{"id": f"wamid.simulated_{clean_phone}_12345"}]
            }

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code}
            }
        }

        if parameters:
            payload["template"]["components"] = [
                {
                    "type": "body",
                    "parameters": parameters
                }
            ]

        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR WHATSAPP API] Status: {response.status_code}, Body: {response.text}")
                return {
                    "status": "ERROR",
                    "error_code": response.status_code,
                    "details": response.text
                }

    async def send_text_message(self, to_phone: str, text_body: str) -> Dict[str, Any]:
        """
        Envía un mensaje de texto directo usando Meta Cloud API Graph v18.0+.
        """
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")

        if not self.token or not self.phone_number_id or self.token == "YOUR_META_WHATSAPP_API_TOKEN":
            print(f"[SIMULACIÓN WHATSAPP TEXTO] a {clean_phone}: '{text_body}'")
            return {
                "status": "SIMULATED",
                "messages": [{"id": f"wamid.simulated_text_{clean_phone}_12345"}]
            }

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": text_body
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR WHATSAPP API TEXTO] Status: {response.status_code}, Body: {response.text}")
                return {
                    "status": "ERROR",
                    "error_code": response.status_code,
                    "details": response.text
                }

whatsapp_service = WhatsAppService()
