import httpx
import re
from typing import Dict, Any, Optional
from app.core.config import settings

def normalize_whatsapp_phone(phone: str) -> str:
    """
    Normaliza cualquier formato de número argentino o internacional
    al estándar internacional E.164 requerido por Meta WhatsApp Cloud API (ej: 5492302640284).
    Limpia prefijos locales como '0', '15' y espacios/guiones.
    """
    if not phone:
        return ""
    digits = re.sub(r'\D', '', str(phone))
    if not digits:
        return ""

    # Quitar 00 inicial internacional
    if digits.startswith("00"):
        digits = digits[2:]

    # Si empieza con 54 (+54)
    if digits.startswith("54"):
        local = digits[2:]
        if local.startswith("9"):
            local = local[1:]
        if local.startswith("0"):
            local = local[1:]
    else:
        local = digits
        if local.startswith("0"):
            local = local[1:]

    # Remover prefijo celular argentino '15' interno si existe
    # Caso 12 dígitos: ej 11 15 xxxxxxxx, 221 15 xxxxxxx, 2302 15 xxxxxx
    if len(local) == 12:
        if local.startswith("11") and local[2:4] == "15":
            local = "11" + local[4:]
        elif local[3:5] == "15":
            local = local[:3] + local[5:]
        elif local[4:6] == "15":
            local = local[:4] + local[6:]

    # Caso 11 dígitos que arranca con 15
    if len(local) == 11 and local.startswith("15"):
        local = local[2:]

    # Si tiene 10 dígitos estándar argentino (código área + abonado), agregar prefijo 549
    if len(local) == 10:
        return f"549{local}"

    # Si ya tiene 13 dígitos y empieza con 549
    if len(digits) == 13 and digits.startswith("549"):
        return digits

    # Número internacional de otro país (ej: Uruguay 598..., Chile 56..., etc.)
    if len(digits) >= 11 and not digits.startswith("0"):
        return digits

    # Fallback con últimos 10 dígitos si es argentino
    if len(local) >= 10:
        return f"549{local[-10:]}"
    return digits

class WhatsAppService:
    def __init__(self):
        self.token = settings.WHATSAPP_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.base_url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"

    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "es_AR",
        parameters: Optional[list] = None,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envía un mensaje de plantilla oficial usando Meta Cloud API Graph v18.0+.
        Si la plantilla primaria falla, reintenta con la plantilla aprobada secundaria antes del fallback de texto.
        """
        clean_phone = normalize_whatsapp_phone(to_phone)

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
                print(f"[WARN WHATSAPP TEMPLATE] Template '{template_name}' status: {response.status_code}. Response: {response.text}")
                
                # Mapeo de plantillas secundarias aprobadas como fallback
                fallback_template_map = {
                    "prontoturno_confirmacion_v1": "citaly_confirmacion_v1",
                    "prontoturno_reprogramacion_v1": "citaly_reprogramacion_v1",
                    "prontoturno_cancelacion_v1": "citaly_cancelacion_v1",
                    "prontoturno_recordatorio_24h_v1": "citaly_recordatorio_24h_v1"
                }

                sec_template = fallback_template_map.get(template_name)
                if sec_template and sec_template != template_name:
                    print(f"[RETRY APPROVED TEMPLATE] Reintentando con plantilla aprobada secundaria '{sec_template}'...")
                    sec_payload = {
                        "messaging_product": "whatsapp",
                        "to": clean_phone,
                        "type": "template",
                        "template": {
                            "name": sec_template,
                            "language": {"code": language_code}
                        }
                    }
                    if parameters:
                        sec_payload["template"]["components"] = payload["template"]["components"]
                    
                    sec_response = await client.post(self.base_url, headers=headers, json=sec_payload)
                    if sec_response.status_code == 200:
                        print(f"[RETRY SUCCESS] Delivered via secondary template '{sec_template}'")
                        return sec_response.json()

                # Fallback final a texto plano si estamos dentro de ventana de conversación
                fallback_text = self._build_template_fallback_text(template_name, parameters, token)
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

    def _build_template_fallback_text(self, template_name: str, parameters: Optional[list], token: Optional[str] = None) -> Optional[str]:
        if not parameters:
            return None
        vals = [p.get("text", "") for p in parameters if isinstance(p, dict)]
        link_url = f"https://citaly-six.vercel.app/r/{token}" if token else "https://citaly-six.vercel.app"

        if template_name in ["prontoturno_confirmacion_v1", "citaly_confirmacion_v1", "citaly_confirma_v2"] and len(vals) >= 5:
            return (
                f"Hola {vals[0]}, te confirmamos tu turno en {vals[1]} para el tratamiento {vals[2]} el día {vals[3]} a las {vals[4]} hs.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: {link_url}\n\n"
                f"_¡Gracias por elegirnos! • ProntoTurno App_"
            )
        elif template_name in ["prontoturno_reprogramacion_v1", "citaly_reprogramacion_v1", "citaly_reprograma_v2"] and len(vals) >= 5:
            return (
                f"Hola {vals[0]}, te confirmamos que tu turno en {vals[1]} para {vals[2]} fue REPROGRAMADO con éxito para el día {vals[3]} a las {vals[4]} hs.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: {link_url}\n\n"
                f"_¡Gracias por elegirnos! • ProntoTurno App_"
            )
        elif template_name in ["prontoturno_cancelacion_v1", "citaly_cancelacion_v1", "citaly_cancela_v2"] and len(vals) >= 3:
            return (
                f"Hola {vals[0]}, te confirmamos que tu turno en {vals[1]} para el tratamiento {vals[2]} fue CANCELADO con éxito.\n\n"
                f"Muchas gracias por avisarnos con anticipación. Si querés volver a solicitar un turno podés hacerlo en: https://citaly-six.vercel.app\n\n"
                f"_¡Gracias por elegirnos! • ProntoTurno App_"
            )
        elif template_name in ["prontoturno_recordatorio_24h_v1", "citaly_recordatorio_24h_v1", "citaly_recordatorio_24h_v2"] and len(vals) >= 5:
            return (
                f"Hola {vals[0]}, te recordamos tu turno en {vals[1]} para el tratamiento {vals[2]} mañana {vals[3]} a las {vals[4]} hs.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: {link_url}\n\n"
                f"_¡Gracias por elegirnos! • ProntoTurno App_"
            )
        return None

    async def send_text_message(self, to_phone: str, text_body: str) -> Dict[str, Any]:
        """
        Envía un mensaje de texto directo usando Meta Cloud API Graph v18.0+.
        """
        clean_phone = normalize_whatsapp_phone(to_phone)

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
