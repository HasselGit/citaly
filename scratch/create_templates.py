import asyncio, httpx

TOKEN = "EAAdSPvHDhmcBSY3vxZC9RBOaMqrySCswgQxX0FBmr0ZC2kLJZCUP2NoAMG9jPxrjIbVJZCjFBZCAAb92vlYGZByMFJTBh41jy3UttHagZCAq54SFZAkoP8W1dqh1k3JsFU2eeZAauIPFL0R52nNfohsOI29RgDJdWLJP0z7YY8N6dX7sb9V27AoK0BFLBdQZDZD"
WABA_NEW = "965775717869143"
WABA_OLD = "1006525879102174"

# Plantillas a crear
TEMPLATES = [
    {
        "name": "citaly_confirmacion",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": "Hola {{1}}, te confirmamos tu turno en {{2}} para {{3}} el día {{4}}.\n\nSi no podés asistir, respondé CANCELAR a este mensaje.\nPara reprogramar: {{5}}"
            }
        ]
    },
    {
        "name": "citaly_recordatorio_24h",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": "Hola {{1}}, te recordamos tu turno en {{2}} para {{3}} mañana a las {{4}}.\n\nSi no podés asistir, respondé CANCELAR.\nPara reprogramar: {{5}}"
            }
        ]
    },
    {
        "name": "citaly_recordatorio_2h",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": "Hola {{1}}, en 2 horas tenés turno en {{2}} para {{3}} a las {{4}}.\n\nSi no podés asistir, respondé CANCELAR.\nPara reprogramar: {{5}}"
            }
        ]
    }
]

async def main():
    async with httpx.AsyncClient() as c:
        headers = {"Authorization": f"Bearer {TOKEN}"}

        # Ver plantillas existentes
        for waba_id in [WABA_NEW, WABA_OLD]:
            r = await c.get(
                f"https://graph.facebook.com/v18.0/{waba_id}/message_templates",
                headers=headers
            )
            data = r.json()
            templates = data.get("data", [])
            print(f"\nWABA {waba_id}: {len(templates)} plantillas")
            for t in templates:
                print(f"  - {t['name']} | {t['status']} | {t['category']}")

        # Crear plantillas en WABA nuevo
        print(f"\n=== Creando plantillas en WABA {WABA_NEW} ===")
        for tmpl in TEMPLATES:
            r = await c.post(
                f"https://graph.facebook.com/v18.0/{WABA_NEW}/message_templates",
                headers={**headers, "Content-Type": "application/json"},
                json=tmpl
            )
            result = r.json()
            if "id" in result:
                print(f"OK: {tmpl['name']} -> id={result['id']} status={result.get('status')}")
            else:
                print(f"ERROR {tmpl['name']}: {result}")

asyncio.run(main())
