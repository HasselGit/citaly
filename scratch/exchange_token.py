import asyncio, httpx, datetime

APP_ID = "2060755134547559"
APP_SECRET = "c47a243373e982f34fe4ac0f839cb0e4"
SHORT_TOKEN = "EAAdSPvHDhmcBSdwq8kYTwgoSMI4MVRXLAQwez2TKBmwh0Nj8iKZCFIxJRy5bX6RZCT7ons3l7su0tEGxIqp44351ySXhgYEgXj1Ic4a0fgyQBvsnEWLBqbdeQlZBffCM4TveMG39uiBNLhyob1pel52Ca9iqYWmY776xNbYZBvJERhBH4PokGeWjmtA2VfyGZAy6i9xI58NqQWrZCGabYFmUYBOQCcLZBZBZA4KMYkmyzSmzOwwULP8VinZCWZBhGjMiUZCw1Iutx4soQqMYlAtAAAZDZD"

async def main():
    async with httpx.AsyncClient() as c:
        r = await c.get(
            "https://graph.facebook.com/v18.0/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": APP_ID,
                "client_secret": APP_SECRET,
                "fb_exchange_token": SHORT_TOKEN
            }
        )
        print("Status:", r.status_code)
        data = r.json()
        if "access_token" in data:
            long_token = data["access_token"]
            expires_in = data.get("expires_in", 0)
            days = expires_in // 86400
            print(f"LONG-LIVED TOKEN ({days} dias):")
            print(long_token)
            
            # Verificar expiry del nuevo token
            r2 = await c.get(
                "https://graph.facebook.com/v18.0/debug_token",
                params={"input_token": long_token, "access_token": long_token}
            )
            d2 = r2.json().get("data", {})
            exp = d2.get("expires_at", 0)
            if exp:
                exp_dt = datetime.datetime.fromtimestamp(exp)
                print("Expira:", exp_dt.strftime("%d/%m/%Y %H:%M"))
        else:
            print("ERROR:", data)

asyncio.run(main())
