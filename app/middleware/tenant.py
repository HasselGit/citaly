from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

class SubdomainTenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "")
        subdomain = None

        # Descomponer host: ej 'drperez.localhost:8000' o 'drperez.citaly.com'
        host_parts = host.split(":")
        domain_parts = host_parts[0].split(".")

        if len(domain_parts) >= 3 or (len(domain_parts) == 2 and "localhost" in host):
            potential_subdomain = domain_parts[0].lower()
            if potential_subdomain not in ["www", "api", "app", "localhost"]:
                subdomain = potential_subdomain

        # Permitir sobreescritura vía Header o Query Parameter para desarrollo/pruebas
        header_subdomain = request.headers.get("x-tenant-subdomain")
        query_subdomain = request.query_params.get("tenant")

        request.state.subdomain = header_subdomain or query_subdomain or subdomain or "demo"
        
        response = await call_next(request)
        return response
