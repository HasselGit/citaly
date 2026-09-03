import httpx
import re
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
        # Limpiar y normalizar formato de teléfono a E.164
        digits = re.sub(r'\D', '', to_phone or '')
        if len(digits) == 10:
            clean_phone = f"549{digits}"
        elif len(digits) == 11 and digits.startswith("9"):
            clean_phone = f"54{digits}"
        elif len(digits) == 11 and digits.startswith("0"):
            clean_phone = f"549{digits[1:]}"
        else:
            clean_phone = digits

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
                print(f"[WARN WHATSAPP TEMPLATE] Template '{template_name}' status: {response.status_code}. Executing fallback...")
                fallback_text = self._build_template_fallback_text(template_name, parameters)
                if fallback_text:
                    fallback_res = await self.send_text_message(to_phone=to_phone, text_body=fallback_text)
                    if fallback_res.get("status") != "ERROR" and "messages" in fallback_res:
                        print(f"[FALLBACK SUCCESS] Message delivered directly via text fallback")
                        return fallback_res
                return {
                    "status": "ERROR",
                    "error_code": response.status_code,
                    "details": response.text
                }

    def _build_template_fallback_text(self, template_name: str, parameters: Optional[list]) -> Optional[str]:
        if not parameters:
            return None
        vals = [p.get("text", "") for p in parameters if isinstance(p, dict)]
        if template_name == "citaly_confirmacion_v1" and len(vals) >= 5:
            return (
                f"Hola {vals[0]}, te confirmamos tu turno en {vals[1]} para el tratamiento {vals[2]} el día {vals[3]} a las {vals[4]} hs.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: https://citaly-six.vercel.app\n\n"
                f"¡Gracias por elegirnos! • Citaly App"
            )
        elif template_name == "citaly_reprogramacion_v1" and len(vals) >= 5:
            return (
                f"Hola {vals[0]}, te confirmamos que tu turno en {vals[1]} para {vals[2]} fue REPROGRAMADO con éxito para el día {vals[3]} a las {vals[4]} hs.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: https://citaly-six.vercel.app\n\n"
                f"¡Gracias por elegirnos! • Citaly App"
            )
        elif template_name == "citaly_cancelacion_v1" and len(vals) >= 3:
            return (
                f"Hola {vals[0]}, te confirmamos que tu turno en {vals[1]} para el tratamiento {vals[2]} fue CANCELADO con éxito.\n\n"
                f"Muchas gracias por avisarnos con anticipación. Si querés volver a solicitar un turno podés hacerlo en: https://citaly-six.vercel.app\n\n"
                f"¡Gracias por elegirnos! • Citaly App"
            )
        elif template_name == "citaly_recordatorio_24h_v1" and len(vals) >= 5:
            return (
                f"Hola {vals[0]}, te recordamos tu turno en {vals[1]} para el tratamiento {vals[2]} mañana {vals[3]} a las {vals[4]} hs.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: https://citaly-six.vercel.app\n\n"
                f"¡Gracias por elegirnos! • Citaly App"
            )
        return None

    async def send_text_message(self, to_phone: str, text_body: str) -> Dict[str, Any]:
        """
        Envía un mensaje de texto directo usando Meta Cloud API Graph v18.0+.
        """
        digits = re.sub(r'\D', '', to_phone or '')
        if len(digits) == 10:
            clean_phone = f"549{digits}"
        elif len(digits) == 11 and digits.startswith("9"):
            clean_phone = f"54{digits}"
        elif len(digits) == 11 and digits.startswith("0"):
            clean_phone = f"549{digits[1:]}"
        else:
            clean_phone = digits

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

    async def send_confirmation_or_template(self, to_phone: str, text_body: str) -> Dict[str, Any]:
        """
        Intenta enviar el mensaje de texto formateado. Si Meta requiere plantilla por ventana de 24h,
        hace fallback automático a la plantilla 'citaly_confirmacion_v1' aprobada.
        """
        res = await self.send_text_message(to_phone, text_body)
        if res.get("status") == "ERROR" and "131047" in str(res.get("details", "")):
            print("[WHATSAPP FALLBACK] Ventana de 24h de Meta. Enviando plantilla 'citaly_confirmacion_v1'...")
            # Extraer nombre y datos básicos del texto para el template
            res = await self.send_template_message(to_phone, "citaly_confirmacion_v1", "es_AR")
        return res

whatsapp_service = WhatsAppService()
