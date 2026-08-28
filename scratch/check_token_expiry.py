import asyncio, httpx, datetime

TOKEN_SHORT = 'EAAdSPvHDhmcBSdwq8kYTwgoSMI4MVRXLAQwez2TKBmwh0Nj8iKZCFIxJRy5bX6RZCT7ons3l7su0tEGxIqp44351ySXhgYEgXj1Ic4a0fgyQBvsnEWLBqbdeQlZBffCM4TveMG39uiBNLhyob1pel52Ca9iqYWmY776xNbYZBvJERhBH4PokGeWjmtA2VfyGZAy6i9xI58NqQWrZCGabYFmUYBOQCcLZBZBZA4KMYkmyzSmzOwwULP8VinZCWZBhGjMiUZCw1Iutx4soQqMYlAtAAAZDZD'

async def main():
    async with httpx.AsyncClient() as c:
        r = await c.get(
            'https://graph.facebook.com/v18.0/debug_token',
            params={'input_token': TOKEN_SHORT, 'access_token': TOKEN_SHORT}
        )
        data = r.json().get('data', {})
        exp = data.get('expires_at', 0)
        if exp:
            exp_dt = datetime.datetime.fromtimestamp(exp)
            print("Token expira:", exp_dt.strftime("%d/%m/%Y %H:%M"))
        else:
            print("Token sin fecha de expiracion (permanente)")
        print("Tipo:", data.get("type"))
        print("Valido:", data.get("is_valid"))

asyncio.run(main())
